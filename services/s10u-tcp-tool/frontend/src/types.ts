export type RawMode = 'text' | 'hex'
export type Command = 'LK' | 'iccid' | 'UD' | 'UD2' | 'AL'
export interface RepeatedRow { [key: string]: string }
export interface Draft {
  command: string; manufacturer: string; device_id: string
  time_mode: 'realtime' | 'fixed'; timezone_offset: string
  fields: Record<string, string | RepeatedRow[]>
}
export interface Field { key: string; label: string; value?: unknown; unit?: string; hint?: string }
export interface Packet {
  hex: string; text: string; command: string | null; manufacturer: string | null; device_id: string | null
  declared_length: number | null; actual_length: number | null
  fields: Field[]; warnings: string[]; errors: string[]; draft: Draft | null
}
export interface Metadata {
  uplinks: {command: string; label: string}[]; downlinks: {command: string; label: string}[]
  groups: {key: string; label: string; fields: Field[]}[]
  defaults: Record<string, Draft>; samples: {command: string; label: string; raw: string; note?: string}[]
  status_bits: {bit: number; label: string}[]
}
export interface Policy { mode: 'auto' | 'manual'; action: 'normal' | 'reject' | 'ignore'; delay: number; version: string; raw: string; raw_mode: RawMode }
export interface Connection { status: string; session_id: string | null; environment_id?: number | string | null; environment_name: string; device_id: string; host: string; port: number; connected_at?: string; reason?: string; practice: boolean }
export interface Log { id: string | number; time: string; direction: 'tx' | 'rx' | 'event' | 'practice'; session_id: string | null; environment_name: string; device_id: string; message: string; packet?: Packet }
export interface Downlink { id: string | number; time: string; session_id: string; packet: Packet; status: string; message?: string; scheduled_at?: string; reply_packet?: Packet }
export interface Practice { running: boolean; host: string; port: number; client_connected: boolean }
export interface Snapshot { run_id: string; seq: number; connection: Connection; practice: Practice; logs: Log[]; downlinks: Downlink[]; policies: Record<string, Policy>; dropped_logs: number }
export type SavedId = string | number
export interface Environment { id?: SavedId; name: string; host: string; port: number }
export interface Device { id?: SavedId; name: string; environment_id: SavedId | ''; device_id: string; iccid: string }
export interface Sample { id?: SavedId; name: string; command: string; draft: Draft }
export interface Saved { environments: Environment[]; devices: Device[]; samples: Sample[] }
export interface ConnectInput { environment_id?: SavedId; environment_name: string; device_id: string; host: string; port: number; practice: boolean; keep_seconds: number; reconnect: boolean; reconnect_interval: number; reconnect_attempts: number }
export interface SendInput { operation_id: string; session_id: string; draft?: Draft; raw?: {value: string; mode: RawMode}; confirm_warnings: boolean }
