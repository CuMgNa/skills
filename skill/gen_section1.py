# -*- coding: utf-8 -*-
import json, sys
sys.path.insert(0, 'mcp/scripts/lib')

bs = json.load(open('mcp/output/【磐钴】星地多网融合指挥调度SaaS平台1期-bugstats-20260624.json', encoding='utf-8'))

by_status = bs['byStatus']
by_level = bs['byLevel']
high = sum(1 for x in bs['未关闭列表'] if x['级别'] in ('一级','二级'))

all_mods = list(bs['byModule'].keys())
intro_mods = '、'.join(all_mods[:6]) + ('等多个模块' if len(all_mods)>6 else '模块')

bullets = [
    '【消息通知-扣费/订阅逻辑】：9个未关闭缺陷，涉及多协议下报文携带者、紧急联系人、个人账号绑定者的微信/短信/邮件通知扣费错误，以及订阅次数扣减后用户未收到通知等问题',
    '【群聊消息同步】：2个未关闭缺陷（回归不通过2），涉及普通群聊取消消息状态未同步，求救群聊消息摘要未自动刷新',
    '【停港逻辑】：2个未关闭缺陷，涉及报警+离线+停港状态组合下的设备列表离线状态统计错误',
    '【电子围栏】：1个未关闭缺陷+1个已延期，三级账号删除同步围栏时异常清除上级账号数据',
    '【设备详情】：1个四级未关闭缺陷，自定义字段与分隔符间距过大',
    '【消息管理】：1个未关闭缺陷，涉及非主账号设置下离线间隔默认值处理',
]

bullet_lines = '\n'.join(f'- **{b}**' for b in bullets)

section1 = f"""本轮测试覆盖 {len(all_mods)} 个模块，缺陷总计 {bs['total']} 个。当前仍有 **{by_status['未关闭']} 个未关闭** 缺陷（其中 **{bs['回归不通过']} 个** 回归不通过），**{by_status['已修复待回归']} 个** 已修复待回归，**{by_status['已延期']} 个** 已延期，**{by_status.get('已关闭',0)} 个** 已关闭。

{bullet_lines}"""

with open('mcp/output/section1_fresh.md', 'w', encoding='utf-8') as f:
    f.write(section1)

print(f'OK {len(section1)} chars')
print(section1[:200])