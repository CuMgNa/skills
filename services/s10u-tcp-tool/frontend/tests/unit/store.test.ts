import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Metadata, Snapshot } from '../../src/types'
vi.mock('element-plus',() => ({ElMessage:{success:vi.fn(),error:vi.fn()},ElMessageBox:{confirm:vi.fn()}}))
class FakeSocket {
  static instances: FakeSocket[] = []
  onopen: (() => void) | null = null
  onclose: ((event: {code:number}) => void) | null = null
  onmessage: ((event: {data:string}) => void) | null = null
  onerror: (() => void) | null = null
  send = vi.fn(); close = vi.fn()
  constructor(public url: string) { FakeSocket.instances.push(this) }
}
const metadata = {uplinks:[],downlinks:[],groups:[],defaults:{},samples:[],status_bits:[]} as Metadata
const state = {run_id:'one',seq:0,connection:{status:'disconnected',session_id:null},logs:[],policies:{},downlinks:[],practice:{running:false},dropped_logs:0} as unknown as Snapshot
let dispose = () => {}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); FakeSocket.instances = []; vi.stubGlobal('location',{protocol:'http:',host:'127.0.0.1:8765'}); vi.stubGlobal('WebSocket',FakeSocket) })
afterEach(() => { dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function setup() {
  const {api,ApiError} = await import('../../src/api')
  const bootstrap = vi.spyOn(api,'bootstrap').mockImplementation(async () => { api.token = `token-${bootstrap.mock.calls.length}`; return metadata })
  const getState = vi.spyOn(api,'state').mockResolvedValue(state)
  vi.spyOn(api,'saved').mockResolvedValue({environments:[],devices:[],samples:[]})
  const connect = vi.spyOn(api,'connect'), send = vi.spyOn(api,'send')
  const store = await import('../../src/store'); dispose = store.dispose; await store.initialize()
  return {api,ApiError,bootstrap,getState,connect,send,store}
}
describe('WS and credential recovery never replay writes', () => {
  it('only shows live sync after authenticated changed notification', async () => {
    const {store,connect,send} = await setup(), socket = FakeSocket.instances[0]!
    socket.onopen?.(); expect(store.socketStatus.value).toBe('等待同步鉴权')
    socket.onmessage?.({data:JSON.stringify({type:'changed',seq:1})}); expect(store.socketStatus.value).toBe('实时同步')
    expect(connect).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled()
  })
  it('recovers a rotated token on state 401 without reconnecting TCP', async () => {
    const {store,ApiError,getState,bootstrap,connect,send} = await setup()
    getState.mockRejectedValueOnce(new ApiError(401,'token expired')).mockResolvedValue({...state,run_id:'two'})
    await store.refresh()
    expect(bootstrap).toHaveBeenCalledTimes(2); expect(store.snapshot.value?.run_id).toBe('two'); expect(FakeSocket.instances).toHaveLength(2)
    expect(connect).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled()
  })
  it('recovers an authenticated WS rejection then subscribes with new token', async () => {
    const {bootstrap,store,connect,send} = await setup()
    FakeSocket.instances[0]!.onclose?.({code:1008}); await vi.advanceTimersByTimeAsync(1500)
    expect(bootstrap).toHaveBeenCalledTimes(2)
    const next = FakeSocket.instances.at(-1)!; next.onopen?.(); expect(next.send).toHaveBeenCalledWith(JSON.stringify({token:'token-2'}))
    expect(store.socketStatus.value).not.toBe('实时同步'); expect(connect).not.toHaveBeenCalled(); expect(send).not.toHaveBeenCalled()
  })
  it('failed mutation is surfaced once even when authentication is recovered', async () => {
    const {store,ApiError,bootstrap} = await setup(), action = vi.fn().mockRejectedValue(new ApiError(401,'expired'))
    await store.run(action)
    expect(action).toHaveBeenCalledTimes(1); expect(bootstrap).toHaveBeenCalledTimes(2)
  })
})
