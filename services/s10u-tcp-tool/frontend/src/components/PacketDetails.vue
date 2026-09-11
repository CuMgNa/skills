<script setup lang="ts">
import type { Packet } from '../types'
defineProps<{packet?: Packet | null; compact?: boolean}>()
const display = (value: unknown) => typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
</script>
<template>
  <div v-if="packet" class="packet-details" data-testid="packet-details">
    <div class="packet-meta"><span>指令 <b>{{ packet.command || '未知' }}</b></span><span>设备 {{ packet.device_id || '未知' }}</span><span :class="{'danger-text': packet.declared_length !== packet.actual_length}">声明 LEN {{ packet.declared_length ?? '未知' }} / 实际字节 {{ packet.actual_length ?? '未知' }}</span></div>
    <el-alert v-for="(error, i) in packet.errors" :key="`e${i}`" :title="error" type="error" :closable="false" />
    <el-alert v-for="(warning, i) in packet.warnings" :key="`w${i}`" :title="warning" type="warning" :closable="false" />
    <div class="raw-title">原文（保留空白，不修正 LEN）</div><pre data-testid="packet-text">{{ packet.text }}</pre>
    <div class="raw-title">原始 HEX</div><pre data-testid="packet-hex">{{ packet.hex }}</pre>
    <el-collapse v-if="packet.fields?.length" :model-value="compact ? [] : ['fields']"><el-collapse-item title="逐字段解析 / 单位 / 解释" name="fields">
      <el-table :data="packet.fields" size="small" max-height="360"><el-table-column prop="label" label="字段" min-width="120"/><el-table-column prop="key" label="键" min-width="120"/><el-table-column label="值" min-width="120"><template #default="{row}"><span class="mono">{{ display(row.value) }}</span></template></el-table-column><el-table-column prop="unit" label="单位" width="70"/><el-table-column prop="hint" label="说明" min-width="140"/></el-table>
    </el-collapse-item></el-collapse>
    <p v-if="!packet.draft" class="hint">未获得完整可反填映射，未知数据仍保留在原文与 HEX 中。</p>
  </div><el-empty v-else description="尚无报文，先解析或预览" :image-size="48"/>
</template>
