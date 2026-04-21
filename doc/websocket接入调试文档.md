WebSocket 前端接入文档（含重新解析接口）
1. 鉴权与基础信息
•
Base URL：同后端服务地址（例如 https://api.xxx.com）
•
所有接口都走登录态（Sa-Token）
•
token 支持两种传法：
i.
Authorization 请求头（推荐）
ii.
WebSocket URL query：token=Bearer xxx
2. WebSocket 实时进度订阅
2.1 建立连接
•
URL：GET ws://{host}/ws/connect?dealInstId={dealInstId}&token={BearerToken}
•
dealInstId：尽调ID，必填
•
token：登录token，必填（若未放header）
2.2 服务端推送频率
•
默认约每 2s 检查一次并推送
•
仅在内容变化时推送（避免重复刷屏）
2.3 推送消息结构
{
    "event": "DEAL_FILE_PROGRESS",
    "dealInstId": "123456",
    "serverTime": 1760000000000,
    "files": [
    {
      "id": "987654321",
      "fileName": "财务报表.pdf",
      "progress": 0.63,
      "status": "2"
    }
    ]
}
2.4 字段说明
•
event：事件名，固定 DEAL_FILE_PROGRESS
•
files[].id：文件ID
•
files[].fileName：文件名
•
files[].progress：解析进度（0~1，完成一般为1）
•
files[].status：解析状态（parseStatus）
◦
1 未解析
◦
2 解析中
◦
3 解析成功
◦
4 解析失败
2.5 心跳
•
前端发：ping
•
后端回：pong
2.6 断开连接
•
离开“尽调资料”页面时调用 ws.close() 即可
3. 重新解析接口（解析失败时）
3.1 接口
•
POST /deal/reparse-file
•
用途：对“解析失败”的文件触发重解析
3.2 请求体
{
    "id": "dealInstId",
    "fileId": "fileId"
}
•
id：尽调ID
•
fileId：文件ID
3.3 成功响应（示例）
{
    "code": 1,
    "success": true,
    "message": "重新解析已触发",
    "data": null
}
3.4 失败场景
•
文件不存在
•
文件不属于当前尽调
•
当前文件不是“解析失败”状态（仅允许失败文件重试）
•
文件缺少 outFileInstId
•
知识库重解析触发失败
4. 推荐前端流程
1.
进入尽调资料页：建立 ws/connect 连接
2.
渲染初始列表（可调用已有 dealInstDetail）
3.
持续处理 WS 推送，按 files[].id 更新进度与状态
4.
若状态为 4（失败），点击“重新解析”调用 /deal/reparse-file
5.
继续监听 WS，直到该文件状态变为 3
6.
离开页面关闭 WebSocket
5. 前端示例（JS）
const token = 'Bearer xxx';
const dealInstId = '123456';
const ws = new WebSocket(
    `wss://api.xxx.com/ws/connect?dealInstId=${encodeURIComponent(dealInstId)}&token=${encodeURIComponent(token)}`
);

ws.onopen = () => {
  // 可选心跳
  ws.send('ping');
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.event === 'DEAL_FILE_PROGRESS') {
    // 用 msg.files 更新页面
    console.log(msg.files);
  } else if (e.data === 'pong') {
    // 心跳响应
  }
};

ws.onclose = () => {};
ws.onerror = () => {};