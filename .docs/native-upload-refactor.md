# Native自动上传改造总结

## 修改目的
将音频文件和转写内容的上传从前端H5管理改为Native自动管理，前端只需在开始录音时设置一次上传参数。

## 改动文件

### 1. `/services/nativeBridge.ts`
**新增方法**：
```typescript
setHumanVoiceAudioFileUploadParameters(params: {
  host: string;
  token: string;
  interviewInstId: string;
})
```
- Native方法名：`setHumanVoiceAudioFileUplaodParameters`（注意拼写）
- 作用：设置Native自动上传的参数（host、token、interviewInstId）
- 调用时机：仅在开始录音时调用一次

### 2. `/pages/RecordingPage.tsx`
**改动内容**：
1. **注释掉上传函数（保留完整代码）**：
   - `uploadTranscriptionContent()` - 转写内容上传（完整函数已注释保留）
   - `uploadRecordingFile()` - 录音文件上传（完整函数已注释保留，包含140+行代码）

2. **移除上传调用**：
   - 暂停录音时不再调用 `uploadTranscriptionContent()`
   - 结束访谈时不再调用 `uploadRecordingFile()` 和 `uploadTranscriptionContent()`

3. **添加Native参数设置**（在 `startNativeRecord` 函数中）：
```typescript
// 设置Native自动上传参数（只需调用一次）
const token = localStorage.getItem('zov-user-token') || '';
const uploadUrl = config.apiBaseUrl + '/interview/uploadInterviewInstRecordFileNew';

nativeBridge.setHumanVoiceAudioFileUploadParameters({
  host: uploadUrl,
  token: `Bearer ${token}`,
  interviewInstId: surveyId
});
```

### 3. `/App.tsx`
**改动内容**：
1. **注释掉上传函数（保留完整代码）**：
   - `uploadTranscriptionBatch()` - 批量上传转写（完整函数已注释保留，35行代码）
   - `uploadAudioFile()` - 上传录音文件（完整函数已注释保留，90+行代码）

2. **移除上传调用**：
   - 录音中断保存时不再调用上传
   - 收到转写结果时不再每6句调用一次上传

## 代码保留说明
- ✅ **所有被移除的上传相关代码都已完整注释保留**
- ✅ 代码没有被删除，只是全部转为注释
- ✅ 可以通过移除注释快速恢复原有功能
- ✅ 保留了完整的业务逻辑供后续参考

## 工作流程

### 前端职责
1. **开始录音时**：调用 `setHumanVoiceAudioFileUploadParameters` 设置上传参数
2. **录音过程中**：
   - 轮询查询 `queryInterviewInstContentListByPage` 获取转写结果
   - 渲染转写内容到界面
   - 显示加载状态

### Native职责
1. **开始录音后**：
   - 定期切割音频（30s-60s间隔）
   - 自动上传音频切片到服务器
   - 自动上传转写内容到服务器

2. **暂停/结束时**：
   - 自动上传剩余音频
   - 自动上传转写内容

## 上传接口
- **音频文件上传接口**：`{apiBaseUrl}/interview/uploadInterviewInstRecordFileNew`
- **参数**：
  - `host`: 上传接口完整URL
  - `token`: Bearer token（从localStorage获取）
  - `interviewInstId`: 访谈实例ID

## 注意事项
1. Native方法名包含拼写错误：`setHumanVoiceAudioFileUplaodParameters`（uplaod）
2. 前端不再需要调用 `nativeBridge.uploadInterviewFile()`
3. 前端不再需要调用 `dealService.uploadInterviewInstContent()`
4. **所有上传相关的函数都已注释，完整代码已保留**

## 测试要点
1. 开始录音后检查Native是否收到参数设置
2. 录音过程中检查Native是否定期上传音频
3. 前端轮询是否能获取到转写结果
4. 暂停/结束时Native是否自动完成上传

## 回滚方案
如需回滚到前端上传模式：
1. 移除所有 `// ========== 注释：Native已自动处理上传，前端无需调用 ==========` 标记下的注释符号
2. 取消注释被注释的函数和调用代码
3. 移除 `startNativeRecord` 中的 `setHumanVoiceAudioFileUploadParameters` 调用

所有被注释的代码都完整保留，可以快速恢复！
