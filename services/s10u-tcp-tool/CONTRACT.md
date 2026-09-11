# S10U Tool internal contract

This file coordinates the first implementation. Only localhost verification is authorized. Five uplinks are manually sent once; no automatic uplink on connect/reconnect. Seven downlinks simulate replies only.

## Protocol Python module API

`from s10u_tool.protocol import metadata, encode, parse, from_raw, normal_reply, Framer`

- `metadata() -> dict`: `{uplinks: [{command,label}], downlinks: [{command,label}], groups: [{key,label,fields:[{key,label,unit?,hint?}]}], defaults: {LK:draft,iccid:draft,UD:draft,UD2:draft,AL:draft}, samples:[{command,label,raw,note}], status_bits:[{bit,label}]}`. Position groups used by UD/UD2/AL. Fields are strings (including numbers). Repeated `bases` and `wifi` rendered separately.
- draft: `{command, manufacturer:'3G', device_id:'2016001000', time_mode:'realtime'|'fixed', timezone_offset:'+08:00', fields:{...}}`. Position scalar keys: `date,time,valid,latitude,ns,longitude,ew,speed,direction,altitude,satellites,signal,battery,steps,rolls,status,ta,mcc,mnc,accuracy`. `bases:[{area,id,signal}]`, `wifi:[{name,mac,signal}]`. LK keys `steps,rolls,battery`; iccid key `iccid`. Timezone default is explicitly a tool setting, not a protocol claim. Default normal form ASCII; non-ASCII cannot be encoded without confirmed encoding (raw HEX available).
- `encode(draft:dict, *, now=None) -> packet`: validates structural input, computes LEN, resolves realtime for UD/AL using explicit timezone. Raises ValueError when bytes cannot safely be generated. Other domain anomalies are `warnings:list[str]`.
- `parse(data:bytes) -> packet`: never throw on malformed input; preserve exact bytes. `packet` has `{hex,text,command,manufacturer,device_id,declared_length:int|null,actual_length:int|null,fields:[{key,label,value,unit?,hint?}],warnings:[str],errors:[str],draft:dict|null}`. `draft` only when ALL data fully mapped; malformed LEN alone may warn but preserve bytes and allow full field candidate. Parsed drafts fixed time. Unknown/incomplete mappings draft null.
- `from_raw(value:str, mode:'text'|'hex') -> bytes`: ASCII text preserving whitespace, strict HEX byte pairs (space allowed); raises ValueError for invalid conversion.
- `frame(content:str, device_id:str, manufacturer:str='3G') -> bytes`: shared strict ASCII envelope constructor (4 hex LEN); practice server uses this for seven downlinks and LK/AL ACKs.
- `normal_reply(packet:dict, version:str='S10U-SIM-1.0') -> bytes`: supports only seven downlinks; validates required arguments, warnings for physical domain do not mandate rejection but malformed structure does; reply with incoming manufacturer/device ID. Unsupported/structural errors raise ValueError. Never reply to LK/AL here (practice server does those).
- `Framer(max_buffer=131072)`: `feed(data:bytes)->list[bytes]` complete frame candidates, `finish()->list[bytes]` residual; `issues:list[str]` accumulated recoveries (caller drains/clears). Bounded, handles chunked/sticky frames; preserves diagnostics. Backend records raw rx chunks separately in log before framing.

## HTTP API (JSON)

Bootstrap: `GET /api/bootstrap` -> `{token,metadata}`. Same-origin and exact loopback Host protection; API authorization `Authorization: Bearer <token>`. Mutations JSON with browser Origin validated. Test clients use exact Origin. WebSocket `/api/events`: first frame `{token}`; server sends `{type:'changed',run_id,seq}`. Client treats notifications as invalidations and fetches `/api/state`; server subscribes before first invalidation. No relying on incremental log delivery: /state is authoritative bounded snapshot. On WS reconnect always refetch; coalesce notifications while fetching and refetch again if dirty. This replaces replay complexity with full snapshots for a single-device local tool.

`GET /api/state` -> `{run_id,seq,connection:{status,session_id,environment_id,environment_name,device_id,host,port,connected_at,reason,practice},practice:{running,host,port,client_connected},logs:[log],downlinks:[record],policies:{COMMAND:policy},dropped_logs:int}`.
`log`: `{id,time,direction:'tx'|'rx'|'event'|'practice',session_id,environment_name,device_id,message,packet?:packet}`. RX raw chunk logs and decoded logs clearly distinguished. `record`: `{id,time,session_id,packet,status,message?,scheduled_at?,reply_packet?}`.
`policy`: `{mode:'auto'|'manual',action:'normal'|'reject'|'ignore',delay:0,version:'S10U-SIM-1.0',raw:'',raw_mode:'text'|'hex'}`.

- `GET /api/saved` -> `{environments:[{id,name,host,port}],devices:[{id,name,environment_id,device_id,iccid}],samples:[{id,name,command,draft}]}`.
- `POST /api/saved/{kind}` (`environments|devices|samples`) body item with optional id -> saved item. No arbitrary SQL keys. Frontend confirm overwrite before id update. No deletion required for initial delivery.
- `POST /api/connect` body `{environment_id?,environment_name?,device_id,host,port,practice:false,keep_seconds:0,reconnect:false,reconnect_interval:3,reconnect_attempts:3}` -> state or connection. Stop/switch old connection explicitly; reject connect if active/connecting. Host/port supplied always; UI fills from selected env or practice status.
- `POST /api/disconnect` body `{}` -> success. Cancels pending connect, timer, delayed replies and retries; generation fence.
- `POST /api/preview` body `{draft}` -> packet.
- `POST /api/parse` body `{value,mode:'text'|'hex'}` -> packet.
- `POST /api/send` body `{operation_id,session_id,draft? ,raw?:{value,mode},confirm_warnings:false}` -> `{log_id,packet,status}`. Exactly one source. Warn on raw device ID mismatch and structural parse errors, allow explicit confirm except invalid conversion; do not change raw. 409 with detail/warnings when confirmation required. No automatic resending. Operation identity conflict rejected.
- `POST /api/policies/{command}` body policy -> policy, persist SQLite.
- `POST /api/downlinks/{id}/reply` body `{action:'normal'|'reject'|'ignore',delay:0,version?,raw?,raw_mode?}` -> record. Atomic claim; scheduled reply must cancel before replacement; old session records cannot send to new session.
- `POST /api/downlinks/{id}/cancel` body `{}` -> record.
- `POST /api/practice/start` `{}` -> practice state (localhost ephemeral port).
- `POST /api/practice/stop` `{}` -> success.
- `POST /api/practice/send` `{command,parameter:'',device_id}` -> `{packet}` sends actual bytes via practice writer. Seven commands only.
- `GET /api/export?format=json|text&session_id=...` -> downloadable content. Auth fetch/blob, not unauthenticated anchor. Session filter optional.

## Ownership

Protocol agent: backend/s10u_tool/protocol/** and tests/test_protocol*.py only.
Backend agent: backend other files, pyproject.toml, backend tests (not test_protocol*). Do not edit protocol files; use API above.
Frontend agent: frontend/** only, including package manifest/tests. Do not edit backend.
Main: integration, docs, scripts, local gitignore, dependency installation, fixes after coordination.
