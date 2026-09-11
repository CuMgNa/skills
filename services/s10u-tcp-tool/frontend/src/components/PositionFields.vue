<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Draft, Metadata, RepeatedRow } from '../types'
import { statusBits, updateStatusBit } from '../helpers'
const props = defineProps<{draft: Draft; metadata: Metadata}>()
const bits = computed(() => statusBits(String(props.draft.fields.status ?? '0')))
const scalar = (key: string) => String(props.draft.fields[key] ?? '')
const rows = (key: string): RepeatedRow[] => Array.isArray(props.draft.fields[key]) ? props.draft.fields[key] as RepeatedRow[] : []
function add(key: 'bases' | 'wifi') { if (!Array.isArray(props.draft.fields[key])) props.draft.fields[key] = []; (props.draft.fields[key] as RepeatedRow[]).push(key === 'bases' ? {area:'',id:'',signal:''} : {name:'',mac:'',signal:''}) }
function toggle(bit: number, enabled: unknown) { try { props.draft.fields.status = updateStatusBit(scalar('status'),bit,!!enabled) } catch (error) { ElMessage.error((error as Error).message) } }
</script>
<template>
  <el-alert title="时区是工具配置，不代表协议已规定时区。业务有效范围及未解释状态位以最新协议确认为准；未知值不会被擅自归一化。" type="info" :closable="false"/>
  <div class="field-grid time-fields"><el-form-item label="时间来源"><el-radio-group v-model="draft.time_mode" aria-label="时间来源"><el-radio-button value="realtime">实时</el-radio-button><el-radio-button value="fixed">固定</el-radio-button></el-radio-group></el-form-item><el-form-item label="时区偏移（显式设置）"><el-input v-model="draft.timezone_offset" aria-label="时区偏移" data-testid="timezone-offset" placeholder="+08:00"/></el-form-item></div>
  <el-collapse :model-value="metadata.groups.map(g => g.key)">
    <el-collapse-item v-for="group in metadata.groups" :key="group.key" :title="group.label" :name="group.key">
      <div class="field-grid"><template v-for="field in group.fields" :key="field.key"><el-form-item v-if="!['bases','wifi'].includes(field.key)" :label="field.label + (field.unit ? ` / ${field.unit}` : '')">
        <el-input :model-value="scalar(field.key)" :aria-label="field.label" :data-testid="`field-${field.key}`" :disabled="draft.time_mode === 'realtime' && ['date','time'].includes(field.key)" @update:model-value="draft.fields[field.key] = $event"/>
        <span v-if="field.hint" class="field-hint">{{ field.hint }}</span><span v-if="draft.time_mode === 'realtime' && ['date','time'].includes(field.key)" class="field-hint">预览 / 发送时由服务端取当前时间</span>
      </el-form-item></template></div>
    </el-collapse-item>
  </el-collapse>
  <section class="status-editor"><h4>设备状态位 · 与 HEX 双向联动</h4><el-input :model-value="scalar('status')" aria-label="状态 HEX" data-testid="status-hex" @update:model-value="draft.fields.status = $event"/><div class="bit-grid"><el-checkbox v-for="bit in metadata.status_bits" :key="bit.bit" :model-value="bits.includes(bit.bit)" :data-testid="`status-bit-${bit.bit}`" @update:model-value="toggle(bit.bit,$event)">bit {{ bit.bit }} · {{ bit.label }}</el-checkbox></div><p class="hint">未列出的位解释未知；切换已知位时保留所有未知位，不清零。</p></section>
  <el-collapse>
    <el-collapse-item :title="`基站列表 bases（${rows('bases').length} 项）`" name="bases"><div class="repeat-heading"><span>顺序参与报文编码</span><el-button data-testid="add-base" @click="add('bases')">添加基站</el-button></div><div v-for="(row,index) in rows('bases')" :key="index" class="repeat-row"><span>{{ index + 1 }}</span><el-input v-model="row.area" :aria-label="`基站${index + 1}区域码`" placeholder="区域码 area"/><el-input v-model="row.id" :aria-label="`基站${index + 1}编号`" placeholder="基站编号 id"/><el-input v-model="row.signal" :aria-label="`基站${index + 1}信号`" placeholder="信号 signal"/><el-button type="danger" plain :aria-label="`删除基站${index + 1}`" @click="rows('bases').splice(index,1)">移除</el-button></div></el-collapse-item>
    <el-collapse-item :title="`Wi-Fi 列表 wifi（${rows('wifi').length} 项）`" name="wifi"><div class="repeat-heading"><span>名称 / MAC / 信号强度</span><el-button data-testid="add-wifi" @click="add('wifi')">添加 Wi-Fi</el-button></div><div v-for="(row,index) in rows('wifi')" :key="index" class="repeat-row"><span>{{ index + 1 }}</span><el-input v-model="row.name" :aria-label="`Wi-Fi${index + 1}名称`" placeholder="名称 name"/><el-input v-model="row.mac" :aria-label="`Wi-Fi${index + 1}MAC`" placeholder="MAC"/><el-input v-model="row.signal" :aria-label="`Wi-Fi${index + 1}信号`" placeholder="信号 signal"/><el-button type="danger" plain :aria-label="`删除Wi-Fi${index + 1}`" @click="rows('wifi').splice(index,1)">移除</el-button></div></el-collapse-item>
  </el-collapse>
</template>
