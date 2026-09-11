<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { api } from '../api'
import { canReply, clone, defaultPolicy, recordLabel } from '../helpers'
import { confirm, metadata, run, snapshot } from '../store'
import type { Downlink, Policy } from '../types'
import PacketDetails from './PacketDetails.vue'
import PolicyEditor from './PolicyEditor.vue'
const policies = reactive<Record<string,Policy>>({}), policyDirty = reactive<Record<string,boolean>>({})
watch(() => snapshot.value?.policies, values => { for (const item of metadata.value!.downlinks) if (!policyDirty[item.command]) policies[item.command] = clone(values?.[item.command] ?? defaultPolicy()) }, {immediate:true})
const saving = ref(''), selectedId = ref<string | number>(), replyPolicy = ref(defaultPolicy()), replyBusy = ref(false)
const selected = computed(() => snapshot.value?.downlinks.find(item => item.id === selectedId.value))
const replyAllowed = computed(() => !!selected.value && !!snapshot.value && canReply(selected.value,snapshot.value.connection))
const sameSession = computed(() => !!selected.value && selected.value.session_id === snapshot.value?.connection.session_id)
const practiceCommand = ref(metadata.value!.downlinks[0]?.command ?? ''), practiceParameter = ref(''), practiceDevice = ref(''), practiceBusy = ref(false)
watch(() => snapshot.value?.connection.device_id, id => { if (id) practiceDevice.value = id }, {immediate:true})
async function savePolicy(command: string) {
  if (!await confirm(`保存 ${command} 策略将影响之后收到的此类指令；自动模式会按策略主动回复。现有接收记录不会被替换。`,'确认策略生效')) return
  saving.value = command
  try { await run(async () => { const result = await api.policy(command,clone(policies[command]!)); policies[command] = result; policyDirty[command] = false },'策略已保存并生效') } finally { saving.value = '' }
}
function selectRecord(record: Downlink) { selectedId.value = record.id; replyPolicy.value = clone(snapshot.value?.policies[record.packet.command ?? ''] ?? defaultPolicy()) }
async function reply() {
  const id = selected.value?.id
  if (id === undefined || !replyAllowed.value) return
  if (!await confirm('对这条接收记录执行所选回复动作？只执行一次。延迟任务必须先取消才能替换。','手动回复确认')) return
  if (!replyAllowed.value || selected.value?.id !== id) return
  replyBusy.value = true
  try { const {mode:_,...policy} = clone(replyPolicy.value); await run(() => api.reply(id,policy),'回复动作已提交') } finally { replyBusy.value = false }
}
async function cancel() { if (selected.value) await run(() => api.cancel(selected.value!.id),'延迟回复已取消') }
async function practiceSend() { practiceBusy.value = true; try { await run(() => api.practiceSend(practiceCommand.value,practiceParameter.value,practiceDevice.value),'练习服务已通过 TCP 发送下行') } finally { practiceBusy.value = false } }
</script>
<template>
  <div class="downlink-layout"><section class="panel"><div class="section-heading"><h2>下行回复策略</h2><span class="hint">七类指令 · SQLite 持久化</span></div><p class="hint">编辑后点击保存才生效。默认延迟 0 秒；自动模式在收到对应指令后回复，手动模式需选择接收记录。</p>
    <el-collapse><el-collapse-item v-for="item in metadata!.downlinks" :key="item.command" :name="item.command"><template #title><span class="policy-title">{{ item.command }} · {{ item.label }} <span class="hint">{{ snapshot?.policies[item.command]?.mode === 'auto' ? '自动' : '手动' }}{{ policyDirty[item.command] ? ' · 有未保存修改' : '' }}</span></span></template>
      <el-form label-position="top" @input="policyDirty[item.command] = true" @change="policyDirty[item.command] = true"><PolicyEditor :policy="policies[item.command]!" show-mode :prefix="`policy-${item.command}`" @changed="policyDirty[item.command] = true"/><el-button type="primary" :data-testid="`save-policy-${item.command}`" :loading="saving === item.command" @click="savePolicy(item.command)">保存此指令策略</el-button></el-form>
    </el-collapse-item></el-collapse>
    <section class="practice-send"><h3>真实 TCP 下行发送窗口</h3><el-alert title="仅通过本地练习服务的已连接 TCP writer 发送七类下行；不是直接调用回复处理函数。" type="info" :closable="false"/><el-form label-position="top"><div class="field-grid"><el-form-item label="练习下行指令"><el-select v-model="practiceCommand" aria-label="练习下行指令" data-testid="practice-command"><el-option v-for="item in metadata!.downlinks" :key="item.command" :label="`${item.command} · ${item.label}`" :value="item.command"/></el-select></el-form-item><el-form-item label="下行设备 ID"><el-input v-model="practiceDevice" aria-label="下行设备 ID" data-testid="practice-device-id"/></el-form-item></div><el-form-item label="指令参数（按协议；无参数留空）"><el-input v-model="practiceParameter" aria-label="练习指令参数" data-testid="practice-parameter" placeholder="例如 UPLOAD 间隔，其他参数以协议定义为准"/></el-form-item><el-button type="primary" data-testid="practice-send" :loading="practiceBusy" :disabled="!snapshot?.practice.running || !snapshot.practice.client_connected || !snapshot.connection.practice || snapshot.connection.status !== 'connected'" @click="practiceSend">通过练习 TCP 发送一次</el-button></el-form></section>
  </section><section class="panel"><h2>下行接收记录与单次回复</h2><el-table :data="snapshot?.downlinks ?? []" highlight-current-row max-height="340" size="small" data-testid="downlink-records" @row-click="selectRecord"><el-table-column prop="time" label="接收时间" min-width="155"/><el-table-column prop="packet.command" label="指令" width="90"/><el-table-column label="状态" min-width="110"><template #default="{row}">{{ recordLabel(row.status) }}<span v-if="row.session_id !== snapshot?.connection.session_id" class="danger-text"> · 旧会话</span></template></el-table-column><el-table-column label="选择" width="70"><template #default="{row}"><el-button link @click.stop="selectRecord(row)">详情</el-button></template></el-table-column></el-table>
    <template v-if="selected"><div class="record-heading"><b>{{ selected.packet.command }} · {{ recordLabel(selected.status) }}</b><code>会话 {{ selected.session_id }}</code></div><el-alert v-if="!sameSession" title="这是旧会话接收记录，禁止向当前连接发送回复。" type="warning" :closable="false"/><p v-if="selected.message" class="hint">{{ selected.message }}</p><p v-if="selected.scheduled_at" class="hint">计划发送时间：{{ selected.scheduled_at }}</p><PacketDetails :packet="selected.packet" compact/>
      <el-form label-position="top"><PolicyEditor :policy="replyPolicy" prefix="record"/><div class="inline-actions"><el-button type="primary" data-testid="reply-record" :disabled="!replyAllowed" :loading="replyBusy" @click="reply">对此记录回复一次</el-button><el-button data-testid="cancel-record" :disabled="!sameSession || selected.status !== 'scheduled'" @click="cancel">取消延迟回复</el-button></div><p class="hint">只允许当前会话的待处理 / 已取消记录回复。已发送、忽略、失败等终态不重发；延迟等待中请先取消。</p></el-form><template v-if="selected.reply_packet"><h3>已回复报文</h3><PacketDetails :packet="selected.reply_packet" compact/></template>
    </template><el-empty v-else description="选择一条接收记录查看详情并回复" :image-size="48"/>
  </section></div>
</template>
