<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { dispose, initialize, loadError, loading, metadata, refresh, socketStatus, unexported } from './store'
import ConnectionPanel from './components/ConnectionPanel.vue'
import UplinkPanel from './components/UplinkPanel.vue'
import DownlinkPanel from './components/DownlinkPanel.vue'
import LogPanel from './components/LogPanel.vue'
const tab = ref('uplink'), deviceId = ref(''), iccid = ref('')
function selectDevice(id: string, value: string) { deviceId.value = id; iccid.value = value }
function beforeUnload(event: BeforeUnloadEvent) { if (unexported.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => { void initialize(); window.addEventListener('beforeunload',beforeUnload) })
onBeforeUnmount(() => { dispose(); window.removeEventListener('beforeunload',beforeUnload) })
</script>
<template>
  <el-config-provider :locale="zhCn"><div class="workbench"><header class="app-header"><div><div class="eyebrow">DEVICE PROTOCOL WORKBENCH</div><h1>S10U TCP 调测工具台</h1><p>连接设备，构造报文，逐字节验证。</p></div><div class="header-status"><span class="sync-dot"/>{{ socketStatus }}<el-button text @click="refresh">刷新状态</el-button></div></header>
    <main v-loading="loading"><el-alert v-if="loadError" :title="`服务连接异常：${loadError}`" type="error" :closable="false"/><template v-if="metadata"><ConnectionPanel @device="selectDevice"/><el-tabs v-model="tab" class="main-tabs"><el-tab-pane label="上行构造与发送" name="uplink"><UplinkPanel :device-id="deviceId" :iccid="iccid"/></el-tab-pane><el-tab-pane label="下行接收与回复" name="downlink"><DownlinkPanel/></el-tab-pane></el-tabs><LogPanel/></template><el-empty v-else-if="!loading" description="尚未获取接口元数据，请确认本地 FastAPI 服务已启动"><el-button type="primary" @click="initialize">重新初始化</el-button></el-empty></main>
    <footer class="app-footer">仅连接已授权的测试环境 · 不自动发送上行 · 未知协议字段不擅自推断 · 关闭程序前请导出日志</footer>
  </div></el-config-provider>
</template>
