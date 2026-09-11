import { describe, expect, it, vi } from 'vitest'
import { canReply, clone, connectedDuration, createSnapshotPump, defaultPolicy, isConnectionActive, rawChunk, singleFlight, statusBits, updateStatusBit, validateBackfill } from '../../src/helpers'
import type { Connection, Downlink, Draft } from '../../src/types'
const connection = {status:'connected',session_id:'current'} as Connection
const record = (status: string, session = 'current') => ({status,session_id:session}) as Downlink
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r }); return {promise,resolve} }
describe('status HEX linkage preserves unknown bits', () => {
  it('reads unsigned 32-bit values without JS signed coercion', () => { expect(statusBits('80010001')).toEqual([0,16,31]) })
  it('toggles only requested bit, retaining unlisted high bits', () => { expect(updateStatusBit('80010000',0,true)).toBe('80010001'); expect(updateStatusBit('80010001',16,false)).toBe('80000001') })
  it('does not normalize malformed raw values silently', () => { expect(() => updateStatusBit('unknown',0,true)).toThrow(); expect(statusBits('FFFFFFFFF')).toEqual([]) })
})
describe('connection/session guards', () => {
  it('allows only pending/cancelled current-session records', () => { expect(canReply(record('pending'),connection)).toBe(true); expect(canReply(record('cancelled'),connection)).toBe(true); for (const status of ['scheduled','sending','replied','ignored','failed']) expect(canReply(record(status),connection)).toBe(false) })
  it('never sends old-session records or disconnected records', () => { expect(canReply(record('pending','old'),connection)).toBe(false); expect(canReply(record('pending'),{...connection,status:'disconnected'})).toBe(false) })
  it('locks environment switching throughout connection/reconnection', () => { for (const status of ['connected','connecting','reconnecting']) expect(isConnectionActive({...connection,status})).toBe(true); expect(isConnectionActive()).toBe(false); expect(isConnectionActive({...connection,status:'disconnected'})).toBe(false) })
})
describe('lossless draft handling', () => {
  it('refuses partial mapping instead of dropping unknown data', () => { expect(() => validateBackfill({draft:null})).toThrow('未知') })
  it('deep clones repeats without modifying source samples', () => { const draft = {command:'UD',fields:{bases:[{id:'1'}],status:'80000000'}} as unknown as Draft; const candidate = validateBackfill({draft}); (candidate.fields.bases as {id:string}[])[0]!.id = 'changed'; expect((draft.fields.bases as {id:string}[])[0]!.id).toBe('1'); expect(clone(draft)).toEqual(draft) })
  it('defaults delay to zero and manual mode', () => { expect(defaultPolicy()).toMatchObject({mode:'manual',delay:0,action:'normal'}) })
})
describe('connected duration display', () => {
  it('shows elapsed time without protocol writes', () => { expect(connectedDuration('2026-09-09T00:00:00Z',Date.parse('2026-09-09T01:02:03Z'))).toBe('01:02:03') })
  it('does not invent duration for invalid clocks', () => { expect(connectedDuration(undefined,Date.now())).toBe('—'); expect(connectedDuration('bad',Date.now())).toBe('—'); expect(connectedDuration('2026-09-09T00:00:00Z',0)).toBe('00:00:00') })
})
describe('raw TCP chunk display does not pretend a complete packet', () => {
  it('preserves byte count and non-ASCII byte escapes', () => { expect(rawChunk('RX raw chunk (exact bytes): 5b 33 47 ff')).toEqual({hex:'5B 33 47 FF',text:'[3G\\xff',length:4}) })
  it('only labels explicit backend raw chunk events', () => { expect(rawChunk('Connected')).toBeNull(); expect(rawChunk('RX raw chunk (exact bytes): abc')).toBeNull() })
})
describe('single-flight authentication coordination', () => {
  it('shares in-flight work then permits a later recovery', async () => {
    const gate = deferred(), action = vi.fn(() => gate.promise), recover = singleFlight(action)
    const a = recover(), b = recover(); expect(a).toBe(b); await Promise.resolve(); expect(action).toHaveBeenCalledTimes(1)
    gate.resolve(); await a; await recover(); expect(action).toHaveBeenCalledTimes(2)
  })
  it('clears failed work to permit a later retry', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined), recover = singleFlight(action)
    await expect(recover()).rejects.toThrow('offline'); await recover(); expect(action).toHaveBeenCalledTimes(2)
  })
})
describe('authoritative snapshot invalidation pump', () => {
  it('coalesces notifications while fetching and refetches once when dirty', async () => {
    const gate = deferred(); const fetcher = vi.fn().mockImplementationOnce(() => gate.promise).mockResolvedValue(undefined)
    const errors = vi.fn(), pump = createSnapshotPump(fetcher,errors)
    const pending = pump.invalidate(); await pump.invalidate(); await pump.invalidate(); expect(fetcher).toHaveBeenCalledTimes(1)
    gate.resolve(); await pending; expect(fetcher).toHaveBeenCalledTimes(2); expect(errors).not.toHaveBeenCalled()
  })
  it('captures notifications during the dirty follow-up fetch', async () => {
    const first = deferred(), second = deferred(); const fetcher = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise).mockResolvedValue(undefined)
    const pump = createSnapshotPump(fetcher,vi.fn()), pending = pump.invalidate(); void pump.invalidate(); first.resolve(); await Promise.resolve(); void pump.invalidate(); second.resolve(); await pending; expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('reports failure and allows next invalidation to recover', async () => {
    const error = new Error('offline'), fetcher = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined), report = vi.fn(), pump = createSnapshotPump(fetcher,report)
    await pump.invalidate(); expect(report).toHaveBeenCalledWith(error); await pump.invalidate(); expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('stops pending follow-up work on dispose', async () => {
    const gate = deferred(), fetcher = vi.fn(() => gate.promise), pump = createSnapshotPump(fetcher,vi.fn()); const pending = pump.invalidate(); void pump.invalidate(); pump.stop(); gate.resolve(); await pending; await pump.invalidate(); expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
