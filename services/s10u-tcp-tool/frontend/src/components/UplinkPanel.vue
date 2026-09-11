<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api, ApiError } from '../api'
import { clone, validateBackfill } from '../helpers'
import { confirm, metadata, refresh, refreshSaved, run, saved, snapshot } from '../store'
import type { Draft, Packet, RawMode, SavedId, SendInput } from '../types'
import PacketDetails from './PacketDetails.vue'
import PositionFields from './PositionFields.vue'
const props = defineProps<{deviceId: string; iccid: string}>()
const draft = ref<Draft>(clone(metadata.value!.defaults.LK))
const command = ref('LK'), source = ref<'form' | 'raw'>('form'), rawMode = ref<RawMode>('text'), raw = ref('')
const preview = ref<Packet>(), previewSignature = ref(''), parsing = ref(false), sending = ref(false), previewing = ref(false)
const selectedSample = ref<SavedId | ''>(''), sampleName = ref(''), selectedReference = ref(0), referencePacket = ref<Packet>()
const references = computed(() => metadata.value!.samples.filter(s => s.command === command.value))
const reference = computed(() => references.value[selectedReference.value])
const position = computed(() => ['UD','UD2','AL'].includes(command.value))
const signature = computed(() => source.value === 'form' ? JSON.stringify(draft.value) : JSON.stringify({raw:raw.value,mode:rawMode.value}))
const previewStale = computed(() => !!preview.value && previewSignature.value !== signature.value)
const connected = computed(() => snapshot.value?.connection.status === 'connected')
watch(() => props.deviceId, id => { if (id) draft.value.device_id = id }, {immediate:true})
watch(() => props.iccid, value => { if (value && command.value === 'iccid') draft.value.fields.iccid = value }, {immediate:true})
function chooseCommand(value: string) {
  command.value = value
  const previous = draft.value
  draft.value = clone(metadata.value!.defaults[value]); draft.value.device_id = props.deviceId || previous.device_id
  if (value === 'iccid' && props.iccid) draft.value.fields.iccid = props.iccid
  preview.value = undefined; selectedReference.value = 0; selectedSample.value = ''
}
let referenceGeneration = 0
watch(reference, async item => {
  const generation = ++referenceGeneration; referencePacket.value = undefined
  if (item) try { const packet = await api.parse(item.raw,'text'); if (generation === referenceGeneration) referencePacket.value = packet } catch (error) { if (generation === referenceGeneration) ElMessage.error((error as Error).message) }
}, {immediate:true})
async function getPreview() {
  const currentSignature = signature.value
  previewing.value = true
  try { preview.value = source.value === 'form' ? await api.preview(clone(draft.value)) : await api.parse(raw.value,rawMode.value); previewSignature.value = currentSignature }
  catch (error) { ElMessage.error((error as Error).message) }
  finally { previewing.value = false }
}
async function backfill() {
  parsing.value = true
  const value = raw.value, mode = rawMode.value
  try {
    const packet = await api.parse(value,mode); preview.value = packet; previewSignature.value = JSON.stringify({raw:value,mode})
    const candidate = validateBackfill(packet)
    if (!metadata.value!.defaults[candidate.command]) throw new Error('此报文不属于五类上行，保留原文但不可反填上行表单')
    if (!await confirm('解析可完整映射。反填将覆盖当前动态表单全部字段，原始输入保持不变。是否继续？','确认反填')) return
    command.value = candidate.command; draft.value = candidate; source.value = 'form'
    ElMessage.success('已完整反填，时间模式为解析报文的固定时间')
  } catch (error) { ElMessage.error((error as Error).message) } finally { parsing.value = false }
}
async function loadReference() {
  if (!reference.value || !await confirm('加载参考样本将覆盖 raw 输入，切换到原文模式。样本的 LEN / MAC 等异常不修正；反填需另行解析确认。','加载原文样本')) return
  raw.value = reference.value.raw; rawMode.value = 'text'; source.value = 'raw'; await getPreview()
}
async function loadSample() {
  const sample = saved.value.samples.find(s => s.id === selectedSample.value)
  if (!sample || !await confirm(`加载“${sample.name}”将覆盖当前表单，包括样本设备 ID。发送前会重新检查实际会话。`)) return
  command.value = sample.command; draft.value = clone(sample.draft); sampleName.value = sample.name; source.value = 'form'; preview.value = undefined
}
async function saveSample(overwrite: boolean) {
  if (!sampleName.value.trim()) { ElMessage.warning('请填写自定义样本名称'); return }
  const previous = saved.value.samples.find(s => s.id === selectedSample.value)
  if (overwrite && (!previous || !await confirm(`覆盖自定义样本“${previous.name}”？原版本将被替换。`))) return
  await run(async () => { await api.save('samples',{...(overwrite ? {id:previous!.id} : {}),name:sampleName.value.trim(),command:draft.value.command,draft:clone(draft.value)}); await refreshSaved() },'样本已保存')
}
async function sendOnce() {
  const sessionId = snapshot.value?.connection.session_id
  if (!connected.value || !sessionId || sending.value) return
  sending.value = true
  const sentSignature = signature.value
  const operation: SendInput = {operation_id:crypto.randomUUID(),session_id:sessionId,confirm_warnings:false,...(source.value === 'form' ? {draft:clone(draft.value)} : {raw:{value:raw.value,mode:rawMode.value}})}
  try {
    try { const result = await api.send(operation); preview.value = result.packet; previewSignature.value = sentSignature; ElMessage.success('已手动发送一次') }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) throw error
      const detail = error.detail as {warnings?: unknown; confirm_required?: boolean}
      // Only warning-confirmation conflicts may be resubmitted. Session/operation conflicts are never retried.
      if (!detail || typeof detail !== 'object' || !('warnings' in detail)) throw error
      if (!await confirm(`${JSON.stringify(detail)}\n确认后仅发送这份原始字节一次，不自动修正。`,'异常报文发送确认')) return
      if (snapshot.value?.connection.session_id !== sessionId || !connected.value) throw new Error('会话已变更，已取消发送。请重新检查连接。')
      const result = await api.send({...operation,confirm_warnings:true}); preview.value = result.packet; previewSignature.value = sentSignature; ElMessage.success('已确认异常并手动发送一次')
    }
  } catch (error) { ElMessage.error(`${(error as Error).message}；未自动重试，请先检查日志。`) }
  finally { sending.value = false; await refresh() }
}
</script>
<template>
  <div class="uplink-layout"><section class="panel uplink-form" aria-label="动态上行表单">
    <div class="section-heading"><h2>上行报文</h2><el-tag type="info">仅手动 · 一次发送</el-tag></div>
    <div class="command-selector"><el-radio-group :model-value="command" aria-label="上行指令" @update:model-value="chooseCommand(String($event))"><el-radio-button v-for="item in metadata!.uplinks" :key="item.command" :value="item.command" :data-testid="`uplink-${item.command}`">{{ item.command }} · {{ item.label }}</el-radio-button></el-radio-group></div>
    <el-radio-group v-model="source" aria-label="发送来源" class="source-switch"><el-radio value="form">字段表单编码</el-radio><el-radio value="raw">原始 text / HEX</el-radio></el-radio-group>
    <el-form v-if="source === 'form'" label-position="top" @submit.prevent>
      <div class="field-grid"><el-form-item label="厂商标识"><el-input v-model="draft.manufacturer" aria-label="厂商标识" data-testid="manufacturer"/></el-form-item><el-form-item label="报文设备 ID"><el-input v-model="draft.device_id" aria-label="报文设备 ID" data-testid="draft-device-id"/></el-form-item></div>
      <PositionFields v-if="position" :draft="draft" :metadata="metadata!"/>
      <div v-else-if="command === 'LK'" class="field-grid"><el-form-item v-for="field in [{key:'steps',label:'步数'},{key:'rolls',label:'翻滚次数'},{key:'battery',label:'电量 / %'}]" :key="field.key" :label="field.label"><el-input :model-value="String(draft.fields[field.key] ?? '')" :aria-label="field.label" :data-testid="`field-${field.key}`" @update:model-value="draft.fields[field.key] = $event"/></el-form-item></div>
      <el-form-item v-else label="ICCID"><el-input :model-value="String(draft.fields.iccid ?? '')" aria-label="ICCID" data-testid="field-iccid" @update:model-value="draft.fields.iccid = $event"/></el-form-item>
    </el-form>
    <section v-else class="raw-editor"><div class="inline-actions"><el-radio-group v-model="rawMode" aria-label="原始报文格式"><el-radio-button value="text">ASCII 文本</el-radio-button><el-radio-button value="hex">HEX 字节</el-radio-button></el-radio-group><el-button data-testid="raw-backfill" :loading="parsing" @click="backfill">解析并确认反填</el-button></div><el-input v-model="raw" type="textarea" :rows="7" aria-label="原始报文" data-testid="raw-input" placeholder="粘贴原文或空格分隔 HEX；空白、未知字段及异常 LEN 不会自动修正"/><p class="hint">文本按 ASCII 编码。非 ASCII 编码尚未确认，请使用已确认编码的 HEX。未知 / 不完整字段不允许有损反填。</p></section>
    <el-collapse><el-collapse-item title="命名自定义样本 · 保存 / 加载" name="samples"><div class="sample-toolbar"><el-select v-model="selectedSample" aria-label="自定义样本" placeholder="选择已保存样本"><el-option v-for="item in saved.samples" :key="item.id" :label="`${item.name} · ${item.command}`" :value="item.id!"/></el-select><el-button :disabled="selectedSample === ''" @click="loadSample">加载样本</el-button><el-input v-model="sampleName" aria-label="样本名称" placeholder="样本名称"/><el-button :disabled="source !== 'form'" @click="saveSample(false)">另存新样本</el-button><el-button :disabled="selectedSample === '' || source !== 'form'" @click="saveSample(true)">覆盖所选</el-button></div><p class="hint">自定义样本保存当前完整表单；raw 请先完整解析反填，避免未知数据丢失。</p></el-collapse-item></el-collapse>
    <div class="send-bar"><el-button data-testid="preview" :loading="previewing" @click="getPreview">字节预览 / 校验</el-button><el-button type="primary" data-testid="send-once" :disabled="!connected || parsing || previewing" :loading="sending" @click="sendOnce">手动发送一次</el-button><span class="hint">{{ connected ? `目标：${snapshot!.connection.environment_name} / ${snapshot!.connection.device_id}` : '先建立 TCP 连接才能发送' }}</span></div>
    <el-alert v-if="previewStale" title="字段已修改，以下预览已过期；发送时会重新编码校验。" type="warning" :closable="false"/>
    <PacketDetails v-if="preview" :packet="preview"/>
  </section><aside class="panel sample-reference" aria-label="默认样本原文参考"><h2>默认样本 · 原文参考</h2><p class="hint">参考与编辑区独立，原文异常如实呈现，不把示例当作有效性保证。</p><el-select v-model="selectedReference" aria-label="默认样本" :disabled="!references.length"><el-option v-for="(item,i) in references" :key="i" :label="item.label" :value="i"/></el-select><p v-if="reference?.note" class="hint">{{ reference.note }}</p><el-button data-testid="load-reference" :disabled="!reference" @click="loadReference">一键加载原文（覆盖提示）</el-button><PacketDetails :packet="referencePacket" compact/></aside></div>
</template>
