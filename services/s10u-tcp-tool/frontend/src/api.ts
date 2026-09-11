import type { ConnectInput, Downlink, Draft, Metadata, Packet, Policy, Practice, RawMode, Saved, SendInput, Snapshot } from './types'
export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) { super(typeof detail === 'string' ? detail : JSON.stringify(detail)); this.name = 'ApiError' }
}
export class Api {
  token = ''
  constructor(private fetcher: typeof fetch = (...args) => globalThis.fetch(...args)) {}
  async request<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.fetcher(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}), ...(body === undefined ? {} : {'Content-Type': 'application/json'}) },
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    })
    if (!response.ok) { const data = await response.json().catch(() => ({detail: response.statusText})); throw new ApiError(response.status, data.detail ?? data) }
    return response.json() as Promise<T>
  }
  async bootstrap() { const data = await this.request<{token: string; metadata: Metadata}>('/bootstrap'); this.token = data.token; return data.metadata }
  state() { return this.request<Snapshot>('/state') }
  saved() { return this.request<Saved>('/saved') }
  save<T>(kind: keyof Saved, item: T) { return this.request<T>(`/saved/${kind}`, item) }
  connect(input: ConnectInput) { return this.request('/connect', input) }
  disconnect() { return this.request('/disconnect', {}) }
  preview(draft: Draft) { return this.request<Packet>('/preview', {draft}) }
  parse(value: string, mode: RawMode) { return this.request<Packet>('/parse', {value, mode}) }
  send(input: SendInput) { return this.request<{log_id: string; packet: Packet; status: string}>('/send', input) }
  policy(command: string, policy: Policy) { return this.request<Policy>(`/policies/${encodeURIComponent(command)}`, policy) }
  reply(id: string | number, policy: Omit<Policy, 'mode'>) { return this.request<Downlink>(`/downlinks/${id}/reply`, policy) }
  cancel(id: string | number) { return this.request<Downlink>(`/downlinks/${id}/cancel`, {}) }
  practiceStart() { return this.request<Practice>('/practice/start', {}) }
  practiceStop() { return this.request('/practice/stop', {}) }
  practiceSend(command: string, parameter: string, device_id: string) { return this.request<{packet: Packet}>('/practice/send', {command, parameter, device_id}) }
  async export(format: 'json' | 'text', sessionId = '') {
    const params = new URLSearchParams({format}); if (sessionId) params.set('session_id', sessionId)
    const response = await this.fetcher(`/api/export?${params}`, {headers: {Authorization: `Bearer ${this.token}`}, credentials: 'same-origin', cache: 'no-store'})
    if (!response.ok) throw new ApiError(response.status, '日志导出失败')
    return response.blob()
  }
}
export const api = new Api()
