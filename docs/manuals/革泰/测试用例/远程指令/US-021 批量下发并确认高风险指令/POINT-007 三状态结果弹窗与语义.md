# 用户故事：US-021 批量下发并确认高风险指令 - POINT-007 三状态结果弹窗与语义

## [P1] 验证全部受理时展示成功状态和数量
- 测试类型
  - 功能
- 前置条件
  1. 验证CR批次包含GT-D001、GT-D002、GT-D003、GT-D004
  2. 验证服务端返回submitted为4且failedToSubmit为0
- 测试步骤
  1. 完成批量提交并等待结果弹窗出现
  2. 查看弹窗顶栏、图标、主标题、数量和操作按钮
- 预期结果
  1. 顶栏显示Submission Result，弹窗使用成功状态图标并显示Command Submitted
  2. 数量显示4 of 4 devices submitted，同时提供Command History和Done

## [P3][反向] 验证部分受理时展示警告状态和双向数量
- 测试类型
  - 功能
- 前置条件
  1. 验证RESET批次包含GT-D001、GT-D004、GT-D008、GT-D009、GT-D010
  2. 验证服务端返回submitted为2且failedToSubmit为3
- 测试步骤
  1. 完成批量提交并打开结果弹窗
  2. 查看图标、主标题和数量说明
- 预期结果
  1. 弹窗使用警告状态并显示Partially Submitted，不使用纯成功图标
  2. 弹窗明确显示2 of 5 devices submitted和3 devices failed to submit

## [P3][反向] 验证全部失败时展示失败状态和零受理数量
- 测试类型
  - 功能
- 前置条件
  1. 验证CR批次包含GT-D005、GT-D006、GT-D007
  2. 验证服务端返回submitted为0且failedToSubmit为3
- 测试步骤
  1. 完成批量提交并打开结果弹窗
  2. 查看失败标题、数量和操作入口
- 预期结果
  1. 弹窗使用失败状态并显示Submission Failed，不得显示Command Submitted
  2. 数量显示0 of 3 devices submitted，仍保留Command History和Done

## [P3][反向] 验证结果弹窗不把提交受理描述为设备执行成功
- 测试类型
  - 易用性
- 前置条件
  1. 验证准备全部受理批次BATCH-007-A、部分受理批次BATCH-007-B和全部失败批次BATCH-007-C
  2. 验证3个批次均未收到设备业务执行回文
- 测试步骤
  1. 依次查看3个批次的结果弹窗
  2. 检查主标题、数量和说明文案
- 预期结果
  1. 三种弹窗仅使用Submitted、Failed to submit或Submission Failed表达提交受理结果
  2. 弹窗不出现Executed successfully、Execution failed或Delivered等设备已执行语义
