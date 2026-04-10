# SKILL: 录音恢复监听 (recordingResumed)

## 目标
在现有的录音中断监听 (`recordingInterrupted`) 基础上，新增录音恢复监听 (`recordingResumed`)，当 Native 端通知录音已恢复时，前端自动恢复录音状态。

## 背景
当前项目已实现 `recordingInterrupted` 事件监听（见 `App.tsx` 第607-649行），用于处理来电、后台运行等外部因素导致的录音中断。但缺少对应的 `recordingResumed` 恢复监听，需要补齐该链路。

## 实现步骤

### Step 1: App.tsx — 添加全局 `recordingResumed` 监听
- **位置**: 紧跟在 `recordingInterrupted` 监听 useEffect 之后
- **逻辑**:
  1. 监听 `nativeBridge.on('recordingResumed', handler)`
  2. 在回调中检查 `response.action === 'recordingResumed'`
  3. 获取 `useRecordingStore` 的当前状态
  4. 如果 `store.isRecording === false`（即之前被中断过），则：
     - 调用 `store.setIsRecording(true)` 恢复录音状态
     - 弹出轻提示 `Toast.success('录音已恢复')` 告知用户
  5. 如果已经在录音中（`store.isRecording === true`），则打印日志忽略
  6. 在 cleanup 中移除监听 `nativeBridge.off('recordingResumed', handler)`

### Step 2: VoiceInputModal.tsx — 添加局部 `recordingResumed` 监听
- **位置**: 在现有的 `recordingInterrupted` handleInterrupt 逻辑旁
- **逻辑**:
  1. 新增 `handleResume` 回调函数，当收到恢复事件时：
     - 调用 `setIsLocalRecording(true)` 恢复局部录音状态
     - 弹出 `Toast.info('录音已恢复')` 提示
  2. 在 `nativeBridge.on('recordingResumed', handleResume)` 注册
  3. 在 cleanup 中 `nativeBridge.off('recordingResumed', handleResume)` 移除

### Step 3: 验证要点
- 确保 `recordingResumed` 事件名称与 Native 端约定一致
- 中断 → 恢复的完整链路：中断时暂停录音状态 + 弹窗提示 → 恢复时恢复录音状态 + Toast 提示
- VoiceInputModal 的局部录音同样支持中断/恢复

## 文件变更清单
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `App.tsx` | 修改 | 新增 `recordingResumed` 全局 useEffect 监听 |
| `components/VoiceInputModal.tsx` | 修改 | 新增局部 `recordingResumed` 监听与 cleanup |
| `skills/SKILL.md` | 新增 | 本技能文档 |
