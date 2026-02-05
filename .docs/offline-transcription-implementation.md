# 离线转写轮询实现

## 概述

前端轮询获取转写结果，Native自动处理音频上传。

## 职责划分

### Native端（无需前端处理）
- 录音时自动定期切割和上传音频（30s-60s）
- 暂停时自动上传音频
- 结束时自动上传音频

### 前端职责
- 轮询 `queryInterviewInstContentListByPage` 获取转写结果（每60秒）
- 渲染转写内容
- 显示加载进度

## 实现方案

### 转写轮询

**轮询间隔**：60秒（1分钟）

**实现逻辑**：
```typescript
const POLL_INTERVAL = 60000; // 60秒
const [lastFetchedCount, setLastFetchedCount] = useState(0);
const [transcriptionProgress, setTranscriptionProgress] = useState(0);

useEffect(() => {
  if (!interviewInstId) return;
  
  const pollTranscription = async () => {
    const pageNum = Math.floor(lastFetchedCount / 20) + 1;
    const res = await dealService.queryInterviewInstContentListByPage({
      interviewInstId, pageNum, pageSize: 20
    });
    
    if (res.success && res.data && res.data.total > lastFetchedCount) {
      const filtered = res.data.records.filter(item => item.type !== '4');
      setTranscriptionList([...transcriptionList, ...filtered]);
      setLastFetchedCount(res.data.total);
    }
    
    // 轮询完成后重置进度条
    setTranscriptionProgress(0);
  };
  
  pollTranscription();
  const timer = setInterval(pollTranscription, POLL_INTERVAL);
  return () => clearInterval(timer);
}, [interviewInstId, lastFetchedCount, transcriptionList]);
```

### 动态进度条

**功能**：60秒内从0%平滑增长到100%

```typescript
useEffect(() => {
  if (!isRecording) {
    setTranscriptionProgress(0);
    return;
  }

  // 每秒更新一次进度，60秒内从0到100
  const progressTimer = setInterval(() => {
    setTranscriptionProgress(prev => {
      const next = prev + (100 / 60); // 每秒增加 1.67%
      return next >= 100 ? 100 : next;
    });
  }, 1000);

  return () => clearInterval(progressTimer);
}, [isRecording]);
```

### 加载状态UI

录音时显示：
```tsx
{isRecording && (
  <div className="text-center py-6 mt-4">
    <div className="text-indigo-600 text-sm font-medium mb-2">
      深度转写中...
    </div>
    <div className="w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear" 
           style={{ width: `${transcriptionProgress}%` }} />
    </div>
    <p className="text-xs text-gray-400 mt-2">
      正在进行语义对齐与降噪优化
    </p>
  </div>
)}
```

## 验证

1. 开始录音，观察轮询启动（60秒间隔）
2. 观察进度条在60秒内从0%增长到100%
3. 等待后端处理，验证新内容追加
4. 验证加载状态显示
