<script setup lang="ts">
import type { Policy } from '../types'
defineProps<{policy: Policy; showMode?: boolean; prefix: string}>()
const emit = defineEmits<{changed: []}>()
</script>
<template>
  <div class="policy-editor"><div class="policy-fields">
    <el-form-item v-if="showMode" label="处理模式"><el-radio-group v-model="policy.mode" @update:model-value="emit('changed')" :aria-label="`${prefix}处理模式`"><el-radio-button value="auto">自动</el-radio-button><el-radio-button value="manual">手动</el-radio-button></el-radio-group></el-form-item>
    <el-form-item label="处理动作"><el-select v-model="policy.action" @update:model-value="emit('changed')" :aria-label="`${prefix}处理动作`" :data-testid="`${prefix}-action`"><el-option label="正常回复" value="normal"/><el-option label="拒绝（自定义 raw）" value="reject"/><el-option label="忽略（不发送）" value="ignore"/></el-select></el-form-item>
    <el-form-item label="延迟 / 秒（默认 0）"><el-input-number v-model="policy.delay" @update:model-value="emit('changed')" :min="0" :aria-label="`${prefix}延迟秒数`" :data-testid="`${prefix}-delay`"/></el-form-item>
    <el-form-item label="VERNO 版本回复内容"><el-input v-model="policy.version" @update:model-value="emit('changed')" :aria-label="`${prefix}版本回复`" :data-testid="`${prefix}-version`"/></el-form-item>
  </div><template v-if="policy.action === 'reject'"><el-form-item label="拒绝报文格式"><el-radio-group v-model="policy.raw_mode" @update:model-value="emit('changed')" :aria-label="`${prefix}拒绝格式`"><el-radio-button value="text">ASCII 文本</el-radio-button><el-radio-button value="hex">HEX 字节</el-radio-button></el-radio-group></el-form-item><el-form-item label="拒绝报文 raw（不会自动补齐或修正）"><el-input v-model="policy.raw" @update:model-value="emit('changed')" type="textarea" :rows="3" :aria-label="`${prefix}拒绝原文`" :data-testid="`${prefix}-raw`"/></el-form-item></template></div>
</template>
