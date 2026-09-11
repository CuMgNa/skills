<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api'
import { rawChunk } from '../helpers'
import { exportedMarker, logMarker, snapshot, unexported } from '../store'
import type { Log } from '../types'
import PacketDetails from './PacketDetails.vue'
const direction = ref(''), search = ref(''), session = ref(''), selected = ref<Log>(), detailOpen = ref(false), exporting = ref(false)
const chunk = computed(() => selected.value ? rawChunk(selected.value.message) : null)
const sessions = computed(() => [...new Set(snapshot.value?.logs.map(item => item.session_id).filter(Boolean) ?? [])] as string[])
const logs = computed(() => (snapshot.value?.logs ?? []).filter(item => (!direction.value || item.direction === direction.value) && (!session.value || item.session_id === session.value) && (!search.value || JSON.stringify(item).toLowerCase().includes(search.value.toLowerCase()))).slice().reverse())
const directionLabel = (value: string) => ({tx:'发送 TX',rx:'接收 RX',event:'连接事件',practice:'练习服务'} as Record<string,string>)[value] ?? value
function view(row: Log) { selected.value = row; detailOpen.value = true }
async function download(format: 'json' | 'text') {
  exporting.value = true
  const marker = logMarker.value
  try {
    const blob = await api.export(format,session.value), url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `s10u-logs-${new Date().toISOString().replace(/[:.]/g,'-')}.${format === 'text' ? 'txt' : 'json'}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
    if (!session.value) exportedMarker.value = marker
    ElMessage.success(session.value ? '已导出所选会话；其他会话仍需导出' : '日志已导出；导出期间新增记录仍会提示未导出')
  } catch (error) { ElMessage.error((error as Error).message) } finally { exporting.value = false }
}
</script>
<template>
  <section class="panel log-panel" aria-label="共用收发日志"><div class="section-heading"><div><h2>收发日志</h2><p class="hint">上行 / 下行共用 · 导出按会话范围，不应用方向或关键词筛选 · 不自动写入磁盘</p></div><div class="inline-actions"><el-button data-testid="export-json" :loading="exporting" @click="download('json')">导出 JSON</el-button><el-button data-testid="export-text" :loading="exporting" @click="download('text')">导出文本</el-button></div></div>
    <el-alert :title="`程序关闭后未导出的日志将丢失。${unexported ? ' 当前有未导出的记录。' : ''}${snapshot?.dropped_logs ? ` 已因容量限制丢弃 ${snapshot.dropped_logs} 条旧记录，请及时导出。` : ''}`" type="warning" :closable="false"/>
    <div class="log-filters"><el-select v-model="direction" aria-label="日志方向筛选" placeholder="全部方向" clearable><el-option label="发送 TX" value="tx"/><el-option label="接收 RX" value="rx"/><el-option label="连接事件" value="event"/><el-option label="练习服务" value="practice"/></el-select><el-select v-model="session" aria-label="日志会话筛选" placeholder="全部会话" clearable><el-option v-for="id in sessions" :key="id" :label="id" :value="id"/></el-select><el-input v-model="search" aria-label="日志关键词" data-testid="log-search" placeholder="搜索指令、设备、原文或消息" clearable/><span class="hint">显示 {{ logs.length }} 条</span></div>
    <p class="hint">接收分片 / TCP 原始块与完整帧解析分开记录。原始块不等于完整业务报文；LEN 异常请查看报文详情，不能按 TCP 块长度判断协议长度。</p>
    <el-table :data="logs" size="small" max-height="400" data-testid="logs" @row-click="view"><el-table-column prop="time" label="时间" min-width="165"/><el-table-column label="方向" width="100"><template #default="{row}"><span :class="`direction-${row.direction}`">{{ directionLabel(row.direction) }}</span></template></el-table-column><el-table-column prop="environment_name" label="环境" min-width="100"/><el-table-column prop="device_id" label="设备" min-width="110"/><el-table-column label="记录 / 分片 / 解析说明" min-width="260"><template #default="{row}"><span v-if="rawChunk(row.message)">TCP 原始接收块 / 分片（{{ rawChunk(row.message)!.length }} 字节，非完整帧解析）</span><span v-else>{{ row.message }}</span><el-tag v-if="row.packet?.warnings?.length || row.packet?.errors?.length" size="small" type="warning">解析警告</el-tag></template></el-table-column><el-table-column label="操作" width="70"><template #default="{row}"><el-button link @click.stop="view(row)">详情</el-button></template></el-table-column></el-table>
  </section>
  <el-drawer v-model="detailOpen" title="日志详情 · 原始字节与解析" size="min(760px, 94vw)"><template v-if="selected"><dl class="log-detail"><dt>时间</dt><dd>{{ selected.time }}</dd><dt>方向</dt><dd>{{ directionLabel(selected.direction) }}</dd><dt>环境 / 设备</dt><dd>{{ selected.environment_name }} / {{ selected.device_id }}</dd><dt>会话</dt><dd class="mono">{{ selected.session_id || '无会话' }}</dd><dt>记录说明</dt><dd>{{ selected.message }}</dd></dl><PacketDetails v-if="selected.packet" :packet="selected.packet"/><div v-else-if="chunk" class="packet-details" data-testid="raw-chunk-details"><el-alert :title="`TCP 原始接收块 / 分片 · ${chunk.length} 字节。此长度是读取块长度，不是协议 LEN；可能是半帧、多帧或噪声。`" type="info" :closable="false"/><div class="raw-title">原始 HEX（精确字节）</div><pre>{{ chunk.hex }}</pre><div class="raw-title">ASCII 参考（不可打印字节显示为转义，不代表已确认字符编码）</div><pre>{{ chunk.text }}</pre></div><el-alert v-else title="此记录是连接事件或诊断，不包含完整报文解析。" type="info" :closable="false"/></template></el-drawer>
</template>
