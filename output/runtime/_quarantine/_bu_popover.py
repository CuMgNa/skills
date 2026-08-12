import json, time
# hover 到第一条语音消息中心 (825,257)，看 read-count/read-trigger 是否出现
# browser-use 没有 hover helper，用 CDP Input.dispatchMouseEvent
cdp("Input.dispatchMouseEvent", type="mouseMoved", x=825, y=257)
time.sleep(1.0)
r = js("""
const q=(s)=>{try{return document.querySelectorAll(s).length}catch(e){return 'ERR'}};
const trig = Array.from(document.querySelectorAll('span.read-count, span.read-unread-trigger')).slice(0,4).map(e=>{const b=e.getBoundingClientRect();return {cls:e.className,txt:e.textContent.trim(),x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2),top:Math.round(b.y),bottom:Math.round(b.y+b.height)}});
return JSON.stringify({readCount:q('span.read-count'), readTrigger:q('span.read-unread-trigger'), deliverySuccess:q('.delivery-success'), trig});
""")
print("after hover:", r)
