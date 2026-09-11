import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, ApiError } from './api'
import { createSnapshotPump, singleFlight } from './helpers'
import type { Metadata, Saved, Snapshot } from './types'
export const metadata = ref<Metadata>()
export const snapshot = ref<Snapshot>()
export const saved = ref<Saved>({environments: [], devices: [], samples: []})
export const loadError = ref('')
export const socketStatus = ref('未连接')
export const loading = ref(true)
export const exportedMarker = ref('')
export const logMarker = computed(() => `${snapshot.value?.run_id}:${snapshot.value?.logs.at(-1)?.id ?? ''}`)
export const unexported = computed(() => !!snapshot.value?.logs.length && exportedMarker.value !== logMarker.value)
export async function confirm(message: string, title = '确认操作') { try { await ElMessageBox.confirm(message, title, {confirmButtonText:'确认',cancelButtonText:'取消',type:'warning'}); return true } catch { return false } }
export async function run(action: () => Promise<unknown>, success = '') {
  try { await action(); if (success) ElMessage.success(success); await refresh() }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) { try { await recoverAuthentication() } catch { /* recovery reports its own connection status */ } }
    ElMessage.error(error instanceof Error ? error.message : String(error))
  }
}
export async function refreshSaved() { saved.value = await api.saved() }
function report(error: unknown) { loadError.value = error instanceof Error ? error.message : String(error) }
const bootstrap = singleFlight(async () => { metadata.value = await api.bootstrap() })
// Credentials may rotate after a backend restart. Only idempotent reads are recovered;
// failed user writes and TCP connects are NEVER replayed.
const recoverAuthentication = singleFlight(async () => {
  socketStatus.value = '重新验证本地会话'
  await bootstrap()
  const [state, configurations] = await Promise.all([api.state(), api.saved()])
  snapshot.value = state; saved.value = configurations; loadError.value = ''
  openSocket()
})
const pump = createSnapshotPump(async () => {
  try { snapshot.value = await api.state(); loadError.value = '' }
  catch (error) { if (error instanceof ApiError && error.status === 401) await recoverAuthentication(); else throw error }
}, report)
export const refresh = pump.invalidate
let socket: WebSocket | undefined, retry: ReturnType<typeof setTimeout> | undefined, stopped = false
function closeSocket() {
  if (socket) { socket.onclose = null; socket.onmessage = null; socket.onopen = null; socket.onerror = null; socket.close(); socket = undefined }
}
function scheduleReconnect(auth: boolean) {
  clearTimeout(retry)
  retry = setTimeout(() => {
    if (stopped) return
    if (auth) void recoverAuthentication().catch(error => { report(error); scheduleReconnect(true) })
    else openSocket()
  },1500)
}
function openSocket() {
  if (stopped) return
  clearTimeout(retry); closeSocket()
  socketStatus.value = '同步连接中'
  const current = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/events`)
  socket = current
  current.onopen = () => { current.send(JSON.stringify({token: api.token})); socketStatus.value = '等待同步鉴权'; void refresh() }
  current.onmessage = event => { try { const data = JSON.parse(event.data); if (data.type === 'changed') { socketStatus.value = '实时同步'; void refresh() } } catch { /* non-state messages are ignored */ } }
  current.onerror = () => { socketStatus.value = '同步异常' }
  current.onclose = event => {
    if (!stopped) { socketStatus.value = '同步重连中（不会自动连接 TCP）'; scheduleReconnect(event.code === 1008 || event.code === 4401) }
  }
}
export async function initialize() {
  loading.value = true
  try { await bootstrap(); await Promise.all([refreshSaved(), refresh()]); openSocket() }
  catch (error) { report(error) }
  finally { loading.value = false }
}
export function dispose() { stopped = true; clearTimeout(retry); closeSocket(); pump.stop() }
