# 离线转写架构改造总结

## 核心变更

### 1. 禁用实时转写监听
**目标**：完全移除前端对 Native 实时推送转写内容 (`transcriptionResult`) 的依赖。
**实现**：
- ✅ **App.tsx**: 
  - 注释掉了 `useEffect` 中监听 `transcriptionResult` 的代码。
  - 注释掉了相关的状态更新逻辑。
- ✅ **components/VoiceInputModal.tsx**:
  - **保持使用** 监听 `transcriptionResult` 的代码。
  - **说明**：补充资料的语音输入继续使用实时与Native交互，不走轮询逻辑。

### 2. 启用离线转写轮询
**目标**：通过轮询后端接口获取转写结果。
**实现**：
- ✅ **RecordingPage.tsx**:
  - 在录音开始时 (`isRecording === true`) 启动定时轮询。
  - 轮询间隔：**30秒**。
  - 接口：`queryInterviewInstContentListByPage`。
  - 参数：
    - `interviewInstId`: 访谈实例ID
    - `cacheCount`: 前端当前已缓存的对话条数（实现增量获取）
  - UI：
    - 录音中显示 "深度转写中..." 容器。
    - 进度条基于每60秒循环动画。
    - 时间段自动每分钟递增 (e.g., 00:00:00-00:01:00)。

### 3. Native 自动上传
**目标**：前端不再手动上传音频/转写，全权交给 Native。
**实现**：
- ✅ **nativeBridge.ts**: 新增 `setHumanVoiceAudioFileUploadParameters`。
- ✅ **App.tsx / RecordingPage.tsx**: 注释掉了所有 `uploadAudioFile`, `uploadTranscriptionContent` 等前端上传逻辑。

## 架构图对比

**旧架构 (实时)**:
```
Native (录音) -> 实时 Event (transcriptionResult) -> 前端 (App.tsx) -> 更新 UI
Native (录音) -> 音频文件 -> 前端 (upload) -> 后端
```

**新架构 (离线/轮询)**:
```
Native (录音) -> 自动切片上传 -> 后端 (ASR处理) -> 数据库
Frontend (RecordingPage) -> 轮询 (queryInterviewInstContentListByPage) -> 后端 -> 更新 UI
```

## 注意事项

1. **补充资料语音输入**: `VoiceInputModal` 继续使用实时转写监听，只有 `RecordingPage` (访谈录音) 切换到了离线轮询模式。
2. **延迟**: 转写内容显示会有 "录音上传 + 后端处理 + 轮询间隔" 的延迟，属于预期行为。
3. **数据一致性**: 使用 `cacheCount` 确保增量获取，减少带宽，且避免重复。

## 代码回滚

所有被禁用的代码均以注释形式保留，标记为：
`// ========== 注释：... ==========`

如需恢复，搜索该标记并取消注释即可。
