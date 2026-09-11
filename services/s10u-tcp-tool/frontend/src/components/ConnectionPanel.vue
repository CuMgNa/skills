<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { api } from '../api'
import { clone, connectedDuration, connectionLabel, isConnectionActive } from '../helpers'
import { confirm, refreshSaved, run, saved, snapshot } from '../store'
import type { ConnectInput, Device, Environment, SavedId } from '../types'
const emit = defineEmits<{device: [id: string, iccid: string]}>()
const environmentId = ref<SavedId | ''>(''), deviceId = ref<SavedId | ''>('')
const form = reactive<ConnectInput>({environment_name:'临时环境',device_id:'2016001000',host:'127.0.0.1',port:9000,practice:false,keep_seconds:0,reconnect:false,reconnect_interval:3,reconnect_attempts:3})
const active = computed(() => isConnectionActive(snapshot.value?.connection))
const busy = ref(false), configOpen = ref(false), saveBusy = ref(false)
const environment = reactive<Environment>({name:'',host:'127.0.0.1',port:9000})
const device = reactive<Device>({name:'',environment_id:'',device_id:'',iccid:''})
const devices = computed(() => saved.value.devices.filter(item => String(item.environment_id) === String(environmentId.value)))
const connection = computed(() => snapshot.value?.connection)
const now = ref(Date.now())
const clock = setInterval(() => { now.value = Date.now() },1000)
onBeforeUnmount(() => clearInterval(clock))
const duration = computed(() => connection.value?.status === 'connected' ? connectedDuration(connection.value.connected_at,now.value) : '—')
function selectEnvironment(id: SavedId | '') {
  const selected = saved.value.environments.find(item => item.id === id)
  deviceId.value = ''; form.device_id = ''; emit('device', '', '')
  if (selected) Object.assign(form, {host:selected.host,port:selected.port,environment_name:selected.name,environment_id:selected.id,practice:false})
  else { delete form.environment_id; form.environment_name = '临时环境' }
}
function selectDevice(id: SavedId | '') {
  const selected = devices.value.find(item => item.id === id)
  if (selected) { form.device_id = selected.device_id; emit('device', selected.device_id, selected.iccid) }
}
function selectPractice() {
  const p = snapshot.value?.practice
  if (!p?.running) return
  environmentId.value = ''; deviceId.value = ''; delete form.environment_id
  Object.assign(form,{host:p.host,port:p.port,environment_name:'本地练习',practice:true})
}
async function connect() {
  if (!form.host.trim() || !form.device_id.trim()) return
  busy.value = true
  try { await run(() => api.connect(clone(form)), '连接请求已提交；不会自动发送上行') } finally { busy.value = false }
}
async function disconnect() { busy.value = true; try { await run(() => api.disconnect(),'已断开并取消待发送回复') } finally { busy.value = false } }
function editEnvironment(item?: Environment) { Object.assign(environment, {id:undefined,name:'',host:'127.0.0.1',port:9000}, item ? clone(item) : {}) }
function editDevice(item?: Device) { Object.assign(device, {id:undefined,name:'',environment_id:environmentId.value,device_id:'',iccid:''}, item ? clone(item) : {}) }
async function saveEnvironment() {
  if (!environment.name.trim() || !environment.host.trim()) return
  if (environment.id !== undefined && !await confirm('覆盖此环境配置？当前连接不受影响；重新选择后才会使用新配置。')) return
  saveBusy.value = true
  try { await run(async () => { await api.save('environments',clone(environment)); await refreshSaved() }, '环境已保存到 SQLite') } finally { saveBusy.value = false }
}
async function saveDevice() {
  if (!device.name.trim() || !device.device_id.trim() || device.environment_id === '') return
  if (device.id !== undefined && !await confirm('覆盖此设备配置？当前连接不受影响。')) return
  saveBusy.value = true
  try { await run(async () => { await api.save('devices',clone(device)); await refreshSaved() }, '设备已保存到 SQLite') } finally { saveBusy.value = false }
}
watch(() => snapshot.value?.connection.session_id, () => {
  const c = connection.value
  if (c?.status === 'connected') emit('device', c.device_id, saved.value.devices.find(d => d.device_id === c.device_id && String(d.environment_id) === String(c.environment_id))?.iccid ?? '')
}, {immediate:true})
</script>
<template>
  <section class="panel connection-panel" aria-label="环境设备连接管理">
    <div class="section-heading"><h2>环境与设备连接</h2><div class="inline-actions"><el-tag :type="connection?.status === 'connected' ? 'success' : 'info'">{{ connectionLabel(connection?.status || 'disconnected') }}</el-tag><el-button data-testid="manage-config" @click="configOpen = true">配置管理</el-button></div></div>
    <el-form label-position="top" class="connection-grid" @submit.prevent>
      <el-form-item label="环境配置"><el-select v-model="environmentId" aria-label="环境配置" data-testid="environment-select" :disabled="active" placeholder="临时环境 / 选择已保存" clearable @change="selectEnvironment"><el-option v-for="item in saved.environments" :key="item.id" :label="item.name" :value="item.id!"/></el-select></el-form-item>
      <el-form-item label="设备配置"><el-select v-model="deviceId" aria-label="设备配置" data-testid="device-select" :disabled="active" placeholder="选择设备" clearable @change="selectDevice"><el-option v-for="item in devices" :key="item.id" :label="`${item.name} · ${item.device_id}`" :value="item.id!"/></el-select></el-form-item>
      <el-form-item label="目标主机"><el-input v-model="form.host" aria-label="目标主机" data-testid="host" :disabled="active || form.practice"/></el-form-item>
      <el-form-item label="端口"><el-input-number v-model="form.port" aria-label="端口" data-testid="port" :min="1" :max="65535" :disabled="active || form.practice" controls-position="right"/></el-form-item>
      <el-form-item label="设备 ID"><el-input v-model="form.device_id" aria-label="连接设备 ID" data-testid="connection-device-id" :disabled="active" @change="emit('device', form.device_id, '')"/></el-form-item>
      <div class="connect-buttons"><el-button type="primary" data-testid="connect" :loading="busy" :disabled="active || !form.host.trim() || !form.device_id.trim()" @click="connect">连接 TCP</el-button><el-button data-testid="disconnect" :disabled="!active || busy" @click="disconnect">断开</el-button></div>
    </el-form>
    <div class="connection-footer"><span v-if="active">实际连接 {{ connection?.environment_name }} · {{ connection?.host }}:{{ connection?.port }} · 设备 {{ connection?.device_id }} · 已连接时长 <code data-testid="connected-duration">{{ duration }}</code> · 会话 <code>{{ connection?.session_id }}</code></span><span v-else>切换环境或设备前必须断开旧连接。页面刷新、WS 重连只同步状态，不发起 TCP 连接。</span></div>
    <p v-if="connection?.reason" class="hint">连接说明：{{ connection.reason }}</p>
    <el-collapse><el-collapse-item title="连接选项与本地练习" name="advanced">
      <div class="advanced-row"><label>保持秒数（0 不限）<el-input-number v-model="form.keep_seconds" aria-label="保持秒数" :min="0" :disabled="active"/></label><label>断线自动重连 <el-switch v-model="form.reconnect" aria-label="断线自动重连" :disabled="active"/></label><label>重连间隔 / 秒<el-input-number v-model="form.reconnect_interval" aria-label="重连间隔" :min="1" :disabled="active"/></label><label>重试次数<el-input-number v-model="form.reconnect_attempts" aria-label="重试次数" :min="0" :max="100" :disabled="active"/></label></div>
      <div class="practice-row"><strong>本地 TCP 练习服务</strong><span>{{ snapshot?.practice.running ? `${snapshot.practice.host}:${snapshot.practice.port}` : '未启动' }}</span><el-button data-testid="practice-start" :disabled="snapshot?.practice.running" @click="run(() => api.practiceStart(), '本地练习服务已启动')">启动练习服务</el-button><el-button data-testid="practice-select" :disabled="!snapshot?.practice.running || active" @click="selectPractice">选择此练习连接</el-button><el-button data-testid="practice-stop" :disabled="!snapshot?.practice.running" @click="run(() => api.practiceStop(), '练习服务已停止')">停止练习服务</el-button><el-button v-if="form.practice && !active" @click="form.practice = false">退出练习目标</el-button></div>
      <p class="hint">练习服务通过真实 localhost TCP 收发；启动不等于连接，需选择后手动连接。停止服务会终止该练习连接。</p>
    </el-collapse-item></el-collapse>
  </section>
  <el-dialog v-model="configOpen" title="环境 / 设备配置 · SQLite 持久化" width="min(1000px, 95vw)">
    <div class="config-columns"><section><div class="section-heading"><h3>环境配置</h3><el-button @click="editEnvironment()">新建环境</el-button></div><el-table :data="saved.environments" size="small" max-height="200"><el-table-column prop="name" label="名称"/><el-table-column label="目标"><template #default="{row}">{{ row.host }}:{{ row.port }}</template></el-table-column><el-table-column label="操作" width="70"><template #default="{row}"><el-button link @click="editEnvironment(row)">编辑</el-button></template></el-table-column></el-table>
      <el-form label-position="top"><el-form-item label="环境名称"><el-input v-model="environment.name" aria-label="环境名称" data-testid="saved-environment-name"/></el-form-item><el-form-item label="主机地址"><el-input v-model="environment.host" aria-label="环境主机地址"/></el-form-item><el-form-item label="端口"><el-input-number v-model="environment.port" :min="1" :max="65535" aria-label="环境端口"/></el-form-item><el-button type="primary" data-testid="save-environment" :loading="saveBusy" @click="saveEnvironment">{{ environment.id === undefined ? '保存新环境' : '覆盖环境配置' }}</el-button></el-form>
    </section><section><div class="section-heading"><h3>设备配置</h3><el-button @click="editDevice()">新建设备</el-button></div><el-table :data="saved.devices" size="small" max-height="200"><el-table-column prop="name" label="名称"/><el-table-column prop="device_id" label="设备 ID"/><el-table-column label="操作" width="70"><template #default="{row}"><el-button link @click="editDevice(row)">编辑</el-button></template></el-table-column></el-table>
      <el-form label-position="top"><el-form-item label="设备名称"><el-input v-model="device.name" aria-label="设备名称"/></el-form-item><el-form-item label="归属环境"><el-select v-model="device.environment_id" aria-label="归属环境"><el-option v-for="item in saved.environments" :key="item.id" :label="item.name" :value="item.id!"/></el-select></el-form-item><el-form-item label="设备 ID"><el-input v-model="device.device_id" aria-label="保存设备 ID"/></el-form-item><el-form-item label="ICCID"><el-input v-model="device.iccid" aria-label="保存 ICCID"/></el-form-item><el-button type="primary" data-testid="save-device" :loading="saveBusy" @click="saveDevice">{{ device.id === undefined ? '保存新设备' : '覆盖设备配置' }}</el-button></el-form>
    </section></div>
  </el-dialog>
</template>
