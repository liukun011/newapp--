# JS-Native 桥接规范文档

## 一、通信格式

### 1.1 JS 调用 Native

```javascript
window.webkit.messageHandlers.NativeBridge.postMessage({
    action: "actionName",      // 方法名
    parameters: {}              // 参数对象（可选）
});
```

### 1.2 Native 回调 JS

```javascript
window.nativeCallback({
    action: "actionName",      // 对应的 action
    success: true/false,       // 执行结果
    message: "描述信息",       // 状态消息
    data: {}                   // 返回数据（可选）
});
```


---

## 二、接口列表

### 2.1 录音相关

| Action | 参数 | 回调 data | 说明 |
|--------|------|-----------|------|
| `startRecording` | 无 | 无 | 开启录音  参数获取到的是 startRecordingSetParams 以前传入的参数|
| `stopRecording` | 无 | 无 | 停止录音 |
| `getRecordingStatus` | 无 | 无 | 获取录音状态，success 表示是否正在录音 |
| `startRecordingSetParams` | `{surveyId:1}` | 无 | 保存参数并启动录音 额外的参数参考 https://www.xfyun.cn/doc/asr/rtasr/API.html#%E6%8E%A5%E5%8F%A3%E8%B0%83%E7%94%A8%E6%B5%81%E7%A8%8B|

### 2.2 音频文件管理

| Action | 参数 | 回调 data | 说明 |
|--------|------|-----------|------|
| `getAudioList` | `{surveyId?, page, pageSize}` | `{page, pageSize, total, list}` | 分页获取音频列表 |
| `deleteAudioFile` | `{fileName, surveyId?}` | `{fileName}` | 删除单个音频文件 |

> **注意**: `surveyId` 为可选参数，不传时从 `FCStorageManage` 获取默认值

### 2.3 媒体相关

| Action | 参数 | 回调 data | 说明 |
|--------|------|-----------|------|
| `openPhotoLibrary` | 无 | `{imageURL}` | 打开相册选择图片 |
| `openCamera` | 无 | `{imageURL}` | 打开相机拍照 |
| `chooseFile` | 无 | `{imageURL}` | 打开文件管理|

### 2.4 文件上传

| Action | 参数 | 回调 data | 说明 |
|--------|------|-----------|------|
| `uploadInterviewFile` | `{host, authorization, filePath, interviewInstId}` | `   ` | 上传访谈文件到服务器 |

**参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `host` | String | 上传接口地址 |
| `authorization` | String | 授权 token |
| `filePath` | String | 本地文件路径（如 `appfile:///images/IMG_xxx.jpg`） |
| `interviewInstId` | Number | 访谈实例 ID |

### 2.5 实时转写

| Action | 来源 | 回调 data | 说明 |
|--------|------|-----------|------|
| `transcriptionResult` | Native 主动推送 | `jsonString` (讯飞原始JSON) | 实时转写结果 |

---

## 三、回调 Action 列表

| Action | 触发时机 | data 结构 |
|--------|----------|-----------|
| `startRecording` | 录音启动完成 | 无 |
| `stopRecording` | 录音停止完成 | 无 |
| `getRecordingStatus` | 状态查询完成 | 无 |
| `transcriptionResult` | 收到转写结果 | 讯飞 JSON 字符串 |
| `getAudioList` | 音频列表获取完成 | `{page, pageSize, total, list}` |
| `deleteAudioFile` | 文件删除完成 | `{fileName}` |
| `imageSelected` | 图片选择完成 | 见4.3 图片 URL |
| `onUploadResult` | 文件上传进度/结果 | 见 4.4 上传结果 |
| `recordingInterrupted` | 录音被中断（如来电） | 无 |
| `fileSelected` | 打开文件管理选中文件回调 | 见 4.5  |
| `recordingResumed` | 录音恢复
---

## 四、数据结构示例

### 4.1 音频列表项

```javascript
{
    fileName: "REC_1768818135.wav",
    fileURL: "appfile:///surveys/1/REC_1768818135.wav",
    fileSize: 224092,
    timestamp: 1768818135,
    date: "2026-01-19 15:30:15"
}
```

### 4.2 转写结果 (讯飞原始格式)

```json
{
    "cn": {
        "st": {
            "rt": [
                {
                    "ws": [
                        {"cw": [{"w": "识别文本"}]}
                    ]
                }
            ]
        },
        "type": 0  // 0=最终结果, 1=中间结果
    }
}
```

### 4.3 图片 URL

```javascript
{
    imageURL: "appfile:///images/IMG_1768818135.jpg"
}
```

### 4.4 上传结果 (onUploadResult)

```javascript
{
    message: "上传成功",
    success: true,
    action: "onUploadResult",
    data: {
        progress: 1,              // 上传进度 0-1
        percent: 100,             // 上传百分比 0-100
        orgFilePath: "/var/mobile/.../images/IMG_xxx.jpg",
        result: {
            code: 1,
            success: true,
            message: "上传成功",
            data: "http://68.79.42.215:9000/zov-interview-record/.../xxx.jpg",  // 服务器返回的文件URL
            traceId: "177f08531f234499"
        }
    }
}
```

### 4.5 文件选择回调

```javascript
{
    "data":{
        "fileName":"8e8b879a-554c-44cd-8349-a7048f055fe2.pdf",
        "fileURL":"appfile://doc/1364D4D7-3B75-4DF3-A65B-2EDAB3DAF492.pdf"
    },
    "success":true,
    "message":"文件选择成功",
    "action":"fileSelected"}
```

---

## 五、URL Scheme 规范

| Scheme | 用途 | 格式 | 示例 |
|--------|------|------|------|
| `appfile://` | 访问本地音频文件 | `appfile:///surveys/{surveyId}/{filename}` | `appfile:///surveys/1/REC_xxx.wav` |
| `appfile://` | 访问本地图片文件 | `appfile:///images/{filename}` | `appfile:///images/IMG_xxx.jpg` |

### 支持的文件类型

| 类型 | 扩展名 | Content-Type |
|------|--------|--------------|
| 音频 | `wav`, `mp3`, `m4a` | `audio/wav`, `audio/mpeg`, `audio/mp4` |
| 视频 | `mp4` | `video/mp4` |
| 图片 | `jpg`, `jpeg`, `png`, `gif` | `image/jpeg`, `image/png`, `image/gif` |

### 特性

- 支持 HTTP Range 请求（分段加载）
- 支持 206 Partial Content 响应

---

## 六、JS工具函数

```javascript
// 调用原生方法
function callNative(action, parameters = {})

// 添加日志
function addLog(text, isResult = false)

// 清空日志
function clearLog()

```

---

## 七、调用示例

### 7.1 开启录音

```javascript
callNative('startRecording');
```

### 7.2 设置参数并启动录音

```javascript
callNative('startRecordingSetParams', {
    roleType: 2,
    surveyId: 1
});
```

### 7.3 获取音频列表（分页）

```javascript
callNative('getAudioList', {
    page: 0,
    pageSize: 20
});
```

### 7.4 删除音频文件

```javascript
callNative('deleteAudioFile', {
    fileName: 'REC_1768818135.wav'
});
```

### 7.5 打开相册

```javascript
callNative('openPhotoLibrary');
```

### 7.6 打开相机

```javascript
callNative('openCamera');
```

### 7.7 上传访谈文件

```javascript
callNative('uploadInterviewFile', {
    host: 'http://68.79.42.215/report/interview/uploadInterviewInstRecordFile',
    authorization: 'af179270-17d9-4e51-a64a-0fda3e8a8408',
    filePath: 'appfile:///images/IMG_1768818135.jpg',
    interviewInstId: 1399333020016
});
```

### 7.8 监听上传结果

```javascript
window.nativeCallback = function(response) {
    if (response.action === 'onUploadResult') {
        // 处理上传结果（包含进度和最终结果）
        const { progress, success, message, data } = response;
        console.log('上传进度:', progress);
        if (success) {
            console.log('上传成功:', data);
        } else {
            console.error('上传失败:', message);
        }
    }
};
```

### 7.9 监听录音中断（如来电）

```javascript
window.nativeCallback = function(response) {
    if (response.action === 'recordingInterrupted') {
        // 录音被中断（如来电、其他应用占用音频）
        console.log('录音已中断:', response.message);
        // 录音文件已自动保存
        // 注意：中断后不会自动恢复录音，需要用户手动重新开始
    }
};
```


---


## 八、文件存储结构

```
Documents/
├── surveys/
│   └── {surveyId}/
│       └── REC_{timestamp}.wav
└── images/
    └── IMG_{timestamp}.jpg
```
