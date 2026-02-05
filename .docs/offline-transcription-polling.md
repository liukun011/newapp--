# 离线转写轮询功能实现总结

## 功能概述

实现了录音时的离线转写轮询机制，包括：
1. 开始录音后显示"深度转写中"加载容器
2. 定时轮询后端接口获取转写结果
3. 增量拼接新内容到转写列表

## 实现细节

### 1. 轮询逻辑

**状态管理**：
```typescript
const [lastFetchedCount, setLastFetchedCount] = React.useState(0);
const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
```

**轮询机制**：
- **触发条件**：`isRecording && interviewInstId`
- **轮询间隔**：30秒
- **接口**：`queryInterviewInstContentListByPage`
- **参数**：
  - `interviewInstId`: 访谈实例ID
  - `cacheCount`: 前端当前缓存的转写对话条数
- **增量更新**：后端根据 `cacheCount` 只返回新增的内容

**关键代码**：
```typescript
useEffect(() => {
  if (!isRecording || !interviewInstId) {
    // 停止轮询
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    return;
  }

  const pollTranscription = async () => {
    // 使用当前缓存的转写条数作为参数
    const currentCacheCount = transcriptionList.filter((item: any) => item.type !== '4').length;
    
    // 获取最新转写内容
    const res = await dealService.queryInterviewInstContentListByPage({
      interviewInstId,
      cacheCount: currentCacheCount  // 告诉后端前端已有多少条
    });

    if (res.success && res.data && res.data.records) {
      const filteredRecords = res.data.records.filter((item: any) => item.type !== '4');
      const newCount = filteredRecords.length;

      // 只有当总数增加时才更新列表
      if (newCount > lastFetchedCount) {
        console.log(`[轮询] 发现新内容：${newCount - lastFetchedCount} 条`);
        setTranscriptionList(filteredRecords);
        setLastFetchedCount(newCount);
      }
    }
  };

  // 立即执行一次
  pollTranscription();

  // 启动定时轮询（每30秒）
  pollingIntervalRef.current = setInterval(pollTranscription, 30000);

  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };
}, [isRecording, interviewInstId, lastFetchedCount, setTranscriptionList]);
```

### 2. UI展示

#### 深度转写中容器

**显示条件**：正在录音时（`isRecording === true`）

**UI组成**：
1. **时间段标签**：显示当前录音时间段（例如：00:00-01:00）
2. **转写状态卡片**：
   - 标题："深度转写中..." + 旋转加载图标
   - 进度条：渐变色动画进度条（60%宽度，脉冲动画）
   - 提示文字："正在进行语义对齐与降噪优化"

**样式特点**：
- 渐变背景：`from-indigo-50 to-purple-50`
- 圆角卡片：`rounded-2xl`
- 边框：`border-indigo-100/50`
- 动画：旋转加载图标 + **动态进度条**

#### 动态进度条

**进度计算**：
- 基于当前录音秒数在60秒内的位置
- 公式：`progressPercent = ((seconds % 60) / 60) * 100`
- 每60秒自动重置为0%，重新开始

**时间段自动递增**：
- 计算当前分钟：`currentMinute = Math.floor(seconds / 60)`
- 起始时间：`startTime = currentMinute * 60`
- 结束时间：`endTime = (currentMinute + 1) * 60`
- 示例：
  - 0-59秒：显示 00:00:00-00:01:00
  - 60-119秒：显示 00:01:00-00:02:00
  - 120-179秒：显示 00:02:00-00:03:00

**动画效果**：
- 平滑过渡：`transition-all duration-1000 ease-linear`
- 每秒自动增长约 1.67%（60秒内从0%到100%）
- 到达60秒时自动重置，时间段自动+1分钟

#### 代码实现

```tsx
{isRecording && (
  <div className="mt-4 mb-6">
    {/* 时间段标签 */}
    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 3.5V7L9.5 9.5" stroke="currentColor" strokeLinecap="round"/>
      </svg>
      <span>{formatTime(Math.floor(seconds / 60) * 60)}-{formatTime(Math.floor(seconds / 60) * 60 + 60)}</span>
    </div>

    {/* 深度转写中容器 */}
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100/50">
      <div className="text-center">
        {/* 标题 */}
        <div className="text-indigo-600 font-medium mb-4 flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4">...</svg>
          <span>深度转写中...</span>
        </div>

        {/* 进度条 */}
        <div className="relative w-full h-2 bg-gray-200/50 rounded-full overflow-hidden mb-3">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse"
               style={{ width: '60%' }}
          />
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-500">
          正在进行语义对齐与降噪优化
        </p>
      </div>
    </div>
  </div>
)}
```

### 3. 显示逻辑

**状态判断**：
1. **有转写内容**：显示转写列表（访谈对象卡片）
2. **无转写内容 + 未录音**：显示"暂无转写记录"
3. **无转写内容 + 正在录音**：显示"深度转写中"容器

**代码逻辑**：
```tsx
{transcriptionList.length > 0 ? (
  // 显示转写列表
  transcriptionList.map((item, index) => ...)
) : !isRecording ? (
  // 显示空状态
  <div>暂无转写记录</div>
) : null}

{/* 录音时显示深度转写容器 */}
{isRecording && (
  <div>深度转写中...</div>
)}
```

### 4. 内容拼接策略

**增量更新机制**：
- 通过 `lastFetchedCount` 记录已获取的转写总数
- 每次轮询时比较新旧总数
- 只有当 `newCount > lastFetchedCount` 时才更新列表
- 更新时使用完整列表（`filteredRecords`），新内容会自动拼接在最前面

**过滤规则**：
- 过滤掉 `type === '4'` 的记录（补充资料语音录入）
- 只显示访谈对话内容

## 用户体验流程

1. **点击"开始录音"**
   - 转写列表区域变为空白
   - 显示"深度转写中"容器
   - 时间段显示当前分钟区间

2. **录音过程中**
   - 后端处理音频并生成转写内容
   - 前端每30秒轮询一次
   - 发现新内容时自动显示在"深度转写中"容器上方

3. **暂停/结束录音**
   - 停止轮询
   - "深度转写中"容器消失
   - 保留已获取的转写内容

## 技术要点

1. **轮询清理**：使用 `useEffect` 的清理函数确保组件卸载时清除定时器
2. **避免重复更新**：通过计数器判断是否有新内容，避免无意义的状态更新
3. **立即执行**：轮询启动时立即执行一次，不等待第一个3秒间隔
4. **类型过滤**：自动过滤掉非访谈对话的内容

## 测试建议

1. 开始录音后检查控制台日志：`[轮询] 开始轮询转写结果...`
2. 观察30秒间隔的轮询请求
3. 验证有新内容时的日志：`[轮询] 发现新内容：X 条`
4. 检查UI是否正确显示"深度转写中"容器
5. 验证转写内容是否正确拼接显示

## 相关文件

- `/pages/RecordingPage.tsx` - 主要实现文件
- `/services/dealService.ts` - 接口服务（`queryInterviewInstContentListByPage`）
