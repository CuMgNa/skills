import type { Connection, Downlink, Draft, Policy } from './types'
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
export const defaultPolicy = (): Policy => ({mode: 'manual', action: 'normal', delay: 0, version: 'S10U-SIM-1.0', raw: '', raw_mode: 'text'})
export function statusBits(hex: string): number[] {
  if (!/^[0-9a-fA-F]{1,8}$/.test(hex)) return []
  const value = BigInt(`0x${hex}`)
  return Array.from({length: 32}, (_, bit) => bit).filter(bit => (value & (1n << BigInt(bit))) !== 0n)
}
export function updateStatusBit(hex: string, bit: number, enabled: boolean): string {
  if (!/^[0-9a-fA-F]{1,8}$/.test(hex)) throw new Error('状态必须为 1 至 8 位 HEX；请先修正原始状态值')
  const value = BigInt(`0x${hex}`), mask = 1n << BigInt(bit)
  return (enabled ? value | mask : value & ~mask).toString(16).toUpperCase().padStart(8, '0')
}
export function canReply(record: Downlink, connection: Connection): boolean {
  return connection.status === 'connected' && !!connection.session_id && record.session_id === connection.session_id && ['pending', 'cancelled'].includes(record.status)
}
export function isConnectionActive(connection?: Connection): boolean { return !!connection && ['connected', 'connecting', 'reconnecting'].includes(connection.status) }
export function validateBackfill(packet: {draft: Draft | null}): Draft {
  if (!packet.draft) throw new Error('存在未知、缺失或无法完整映射的字段，禁止反填；原始输入已保留，可直接使用 raw 发送。')
  return clone(packet.draft)
}
/** Coalesce invalidations without losing a notification received during a fetch. */
export function createSnapshotPump(fetchSnapshot: () => Promise<void>, onError: (error: unknown) => void) {
  let running = false, dirty = false, stopped = false
  const invalidate = async () => {
    if (stopped) return
    dirty = true
    if (running) return
    running = true
    try {
      while (dirty && !stopped) {
        dirty = false
        try { await fetchSnapshot() } catch (error) { onError(error) }
      }
    } finally { running = false }
  }
  return {invalidate, stop: () => { stopped = true }}
}
export function connectedDuration(connectedAt: string | undefined, now: number): string {
  if (!connectedAt || !Number.isFinite(Date.parse(connectedAt))) return '—'
  const total = Math.max(0,Math.floor((now - Date.parse(connectedAt)) / 1000))
  const hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), seconds = total % 60
  return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`
}
export function rawChunk(message: string): {hex: string; text: string; length: number} | null {
  const match = /(?:RX raw chunk \(exact bytes\)|Practice RX raw chunk):\s*([\da-fA-F ]*)$/.exec(message)
  if (!match) return null
  const pairs = match[1]!.trim().split(/\s+/).filter(Boolean)
  if (pairs.some(pair => !/^[\da-fA-F]{2}$/.test(pair))) return null
  const bytes = pairs.map(pair => Number.parseInt(pair,16))
  return {hex: pairs.join(' ').toUpperCase(), length:bytes.length, text:bytes.map(byte => byte >= 32 && byte <= 126 || [9,10,13].includes(byte) ? String.fromCharCode(byte) : `\\x${byte.toString(16).padStart(2,'0')}`).join('')}
}
export function singleFlight<T>(action: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined
  return () => pending ??= Promise.resolve().then(action).finally(() => { pending = undefined })
}
export function connectionLabel(status: string): string { return ({connected:'已连接', connecting:'连接中', reconnecting:'等待重连', disconnected:'未连接', error:'连接异常'} as Record<string, string>)[status] ?? status }
export function recordLabel(status: string): string { return ({pending:'待处理', manual:'待手动回复', received:'已接收', scheduled:'延迟等待中', replied:'已回复', sent:'已发送', ignored:'已忽略', cancelled:'已取消', failed:'失败', rejected:'已拒绝', stale:'旧会话'} as Record<string, string>)[status] ?? status }
