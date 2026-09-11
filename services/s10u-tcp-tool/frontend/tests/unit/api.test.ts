import { describe, expect, it, vi } from 'vitest'
import { Api, ApiError } from '../../src/api'
import type { Draft, SendInput } from '../../src/types'
function harness(response: Response) { const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response); const api = new Api(fetcher); api.token = 'local-token'; return {api,fetcher} }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}})
describe('FastAPI contract', () => {
  it('preserves native fetch global receiver rather than binding to Api instance', async () => {
    const original = globalThis.fetch
    let receiver: unknown
    globalThis.fetch = function (this: unknown) { receiver = this; return Promise.resolve(json({seq:1})) } as typeof fetch
    try { await new Api().state(); expect(receiver).toBe(globalThis) } finally { globalThis.fetch = original }
  })
  it('bootstraps token and does not automatically connect or send', async () => { const {api,fetcher} = harness(json({token:'new-token',metadata:{uplinks:[]}})); api.token = ''; await api.bootstrap(); expect(api.token).toBe('new-token'); expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0]![0]).toBe('/api/bootstrap') })
  it('fetches authoritative state with Bearer auth', async () => { const {api,fetcher} = harness(json({run_id:'r',seq:2})); expect(await api.state()).toEqual({run_id:'r',seq:2}); expect(fetcher).toHaveBeenCalledWith('/api/state',expect.objectContaining({method:'GET',headers:{Authorization:'Bearer local-token'},cache:'no-store'})) })
  it('preview posts exact draft structure', async () => { const draft = {command:'LK',fields:{steps:'0'}} as unknown as Draft; const {api,fetcher} = harness(json({hex:'00'})); await api.preview(draft); expect(fetcher.mock.calls[0]![1]?.body).toBe(JSON.stringify({draft})) })
  it('raw parse preserves whitespace and mode', async () => { const {api,fetcher} = harness(json({draft:null})); await api.parse(' [unknown]\n','text'); expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({value:' [unknown]\n',mode:'text'}) })
  it('never automatically retries a warning conflict or network failure', async () => { const {api,fetcher} = harness(json({detail:{warnings:['bad LEN']}},409)); const input: SendInput = {operation_id:'op',session_id:'s',raw:{value:'00 FF',mode:'hex'},confirm_warnings:false}; await expect(api.send(input)).rejects.toMatchObject({status:409,detail:{warnings:['bad LEN']}}); expect(fetcher).toHaveBeenCalledTimes(1) })
  it('keeps operation and session identifiers for explicit confirmation', async () => { const {api,fetcher} = harness(json({status:'sent'})); const input: SendInput = {operation_id:'stable',session_id:'captured-session',raw:{value:'[bad]',mode:'text'},confirm_warnings:true}; await api.send(input); expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual(input) })
  it('exports with auth fetch/blob and encoded session filter', async () => { const {api,fetcher} = harness(new Response('logs',{headers:{'Content-Type':'text/plain'}})); expect(await (await api.export('text','s /1')).text()).toBe('logs'); expect(fetcher).toHaveBeenCalledWith('/api/export?format=text&session_id=s+%2F1',expect.objectContaining({headers:{Authorization:'Bearer local-token'}})) })
  it('reports export auth failure instead of downloading an error', async () => { const {api} = harness(json({detail:'unauthorized'},401)); await expect(api.export('json')).rejects.toBeInstanceOf(ApiError) })
  it('saves SQLite item with optional id rather than delete or implicit replacement', async () => { const {api,fetcher} = harness(json({id:7})); await api.save('environments',{id:7,name:'local',host:'127.0.0.1',port:9000}); expect(fetcher.mock.calls[0]![0]).toBe('/api/saved/environments'); expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({id:7}) })
  it('practice sends actual server writer command', async () => { const {api,fetcher} = harness(json({packet:{}})); await api.practiceSend('VERNO','','device'); expect(fetcher.mock.calls[0]![0]).toBe('/api/practice/send'); expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({command:'VERNO',parameter:'',device_id:'device'}) })
})
