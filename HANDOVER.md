# TalkAssistant 前端业务逻辑超详细交接文档

本系统是基于 React 的单页应用（SPA），由于移动端的特性和特殊的原生交互需求，采用了一套自定义视图栈 `viewStack` 进行多层级视图管理。以下是前端核心业务的代码级调用链路、详细数据流转逻辑及项目开发中的核心技术细节。

## 1. 项目基础架构与工程配置

### 1.1 项目目录结构全景 (Tree View)
```text
/talk-assistant
├──  src
│    ├── components/
│    │    ├── VoiceInputModal/  # 访谈实战中的核心弹窗，负责录音波形展示、转写实时推送显示的UI反馈区
│    │    ├── Mascot/           # 狸宝动效组件，用于引导、进度提示和品牌化情感交互交互
│    │    ├── TemplateSwitch/   # 用于在尽调详情页切换不同的问卷模板，操作后会自动更新关联的 questionId 
│    │    └── Corporate/        # 企业基本资料展示的原子化小组件，用于渲染解析后的天眼查字段
│    ├── pages/
│    │    ├── DueDiligencePage.tsx   # 尽调详情主页：汇总展示企业资料预览、材料清单列表入口及 AI 洞察建议中心
│    │    ├── QuestionsListPage.tsx  # 问题集合管理核心：处理问题勾选状态同步、手动新增、AI 洞察建议项的采纳逻辑
│    │    ├── EnterpriseDetailPage.tsx # 企业深度资料展示：负责对来自后端代理的嵌套天眼查 JSON 进行深度渲染与字段映射
│    │    ├── RecordingPage.tsx      # 录制实战页：承载 JS 与原生 JSBridge 的流式长链接通讯、计时控制与离线转写展示
│    │    ├── MaterialsListPage.tsx   # 资料列表管理：负责文件夹树状展示、物理文件管理以及原生上传回调进度监听
│    │    └── HomePage.tsx           # 尽调列表首页：包含列表的分页动态加载、搜索过滤以及组织/租户切换弹窗逻辑
│    ├── services/
│    │    ├── dealService.ts    # 业务接口封装层：addDealInst, aiInsight, saveQuestionInfo 等核心 CRUD
│    │    ├── authService.ts    # 鉴权接口封装层：处理登录态维护、组织切换、租户上下文同步、用户信息拉取
│    │    └── nativeBridge.ts   # 原生指令封装层：基于 DSBridge 的双端通信管理，统一封装了同步与异步调用
│    ├── store/
│    │    └── useRecordingStore.ts # 基于 Zustand 的持久化状态库：管理当前 dealId、计时秒数、录音中/暂停/停止状态
│    ├── types/                 # TypeScript 类型库：定义了 QuestionInfo, DealRecord, TenantInfo 等全量业务实体接口
│    └── utils/                 # 日期格式化 (dateUtils)、深度文本解析解析、Object深度克隆、异步防抖与节流工具
├──  public/
│    ├── config.js              # 运行时生产环境动态配置文件：允许运维在不重新打包代码的情况下通过修改此文件切换 API 地址
│    └── assets/                # 静态资产管理区：存放 Lottie 动画文件、静态位图、SVG 图标等
├──  index.html                 # 根 HTML：挂载了百度统计 JS 以及定义了原生底座全局广播（如 backButton）的回调监听
└──  vite.config.ts             # 编译构建配置：集成 px-to-viewport 适配插件以支撑从 375px 到全面屏的 UI 适配
```

### 1.2 运行时外部配置机制 (External Runtime Config)
系统采用 `public/config.js` 外挂配置方案：
*   **应用场景**：前端代码内置的 Axios 请求前缀指向 `window.GLOBAL_CONFIG.BASE_URL`。
*   **业务作用**：在生产环境（无需重新构建打包产物）下，维护人员可以直接打开此 JS 文件修改该配置。修改保存后，用户刷新页面即可完成后端域名的热更新切换。
*   **开发规约**：逻辑代码中除 Mock 或本地调试外，禁止使用硬编码字符串作为后端接口地址前缀。

### 1.3 核心构建命令集 (Build Scripts)
| 命令 | 环境/模式 | 详细业务作用与产物说明 |
| :--- | :--- | :--- |
| `yarn dev` | 本地开发环境 | 启动 Vite 开发服务器。支持路径别名 (@) 解析、热重载以及 Server Proxy 接口请求反向代理 |
| `yarn preview` | 产物本地回验 | 启动静态 Web 服务器以验证 `/dist` (或 /talk-assistant) 文件夹中的 Chunk 分离与路由是否正常 |

---

## 2. 核心业务流程与代码调用逻辑链路 (极致详细描述)

### 2.1 尽调实例的生命周期 (Creation -> Detail)
1.  **创建流程**：用户在 `HomePage` 触发“新建尽调”，输入基本信息后点击保存。代码调用 `dealService.addDealInst`。后端成功返回 `dealId` 后，前端执行逻辑跳转。
2.  **详情同步逻辑**：在 `DueDiligencePage` 的组件挂载（`useEffect` 在 mount 时期）触发。
    -   **逻辑细节**：立即调用 `fetchDealDetail` 同步获取该实例的最全信息包（包含企业资料、已存问卷 ID、报告生成进度）。
    -   **状态回溯**：如果详情数据返回该尽调正处于“报告分析生成中 (GENERATING)”，前端代码会自动开启一个每 interval 为 5s 的轮询计时器，直到状态变为“SUCCESS”或“FAILED”才停止。

### 2.2 企业数据深度解析与映射逻辑 (天眼查集成)
1.  **数据采集链路**：前端通过 `/deal/tyc/basicInfo` 请求后端代理接口，获取天眼查的全量档案字符串。
2.  **深度解析代码逻辑**：
    -   **原始数据转换**：后端拉回来的 `basicInfo.result` 是一个深度嵌套的 JSON 字符串。前端在 `EnterpriseDetailPage` 中对其进行 `JSON.parse`。
    -   **股权变更 (Equity Change)**：数据位于 `result.equityChange` 数组中。
    -   **自动映射字段**：前端遍历该数组，精准匹配并提取 `investor_name` (投资者姓名/机构)、`change_time` (变更执行日期)、`ratio_before` (变更前持股占比)、`ratio_after` (变更后持股占比)。
    -   **日期格式化兜底**：如果接口返回的时间戳非标准 YYYY-MM-DD，工具类 `formatTime` 必须在渲染前介入转换，防止安卓某些低端浏览器显示 Invalid Date。

### 2.3 问题清单管理与 AI 洞察转换逻辑 (全栈最难点)
1.  **初始化的双重数据合并机制**：
    -   `QuestionsListPage` 进入初始化时：Props 首先从父页透传已存储在 DB 的老问题集合 `questionInfoList`。
    -   **并行请求**：代码异步调用 `dealService.aiInsight(dealId, false)`（此时 `regenerate` 为 `false`）。这步是为了利用大模型从天眼查资料中实时洞察出该企业特有的风险点补充建议。
2.  **前端“临时加入”状态容器管理**：
    -   **操作动作**：当用户点击 AI 建议项旁边的“加入本项目”按钮时。
    -   **核心逻辑**：前端代码在本地的 `localQuestions` 状态数组中 Push 一个复合业务接口的对象。此时该数据并没有持久化，为了在 UI 上能对它进行删除、上下移动排序，前端通过 `Date.now()` 手动生成一个以 `temp_ai_` 为前置标识符的伪 ID (ID)。
    -   **脏检查同步**：此操作必须由代码同步设置 `isDirtyRef.current = true`。原因详见第 7 节“避坑规约”。
3.  **串行三阶异步保存链路 (performSave)**：
    -   **Step 1：AI 采纳同步 (Accepting)**：前端逻辑先遍历整个列表，精准过滤出 ID 以 `temp_ai_` 开头的所有新增项，并调用 `dealService.acceptAiInsight(dealId, [{ questionContent }])`。这步是为了在服务端进行数据转换，将“建议条目”正式固化为该尽调名下的“持久化问题模型”。
    -   **Step 2：数据结构清洗**：确认 Step 1 成功后，前端代码必须动态处理数组，移除所有用于 UI 占位的 `temp_` 类伪 ID，只保留真实的问题内容。
    -   **Step 3：全量状态刷新 (Sync)**：最后全量调用 `dealService.saveQuestionInfo(dealId, cleanedQuestions)`。后端接收后，会以前端当前这套完整的顺序、内容全量覆盖重写原有的问题清单配置。

---

## 3. WebSocket 异步消息机制 (Async Messaging)

针对“文档解析”大耗时任务和“AI报告生成”异步任务，系统实现了完整的推送闭环。

### 3.1 监听策略与全量鉴权
*   **挂载点**：在全局 `App` 组件成功拿到用户 Token 并在根节点挂载后，初始化 WebSocket 通讯。
*   **安全握手**：物理连接建立成功的首个生命周期内，向服务端通过子信道发送 `Authorization: Bearer <Token>` 进行身份认证。

### 3.2 频道消息订阅 Topics 与 逻辑响应
1.  **资料提取/解析进度 (`DEAL_FILE_PROGRESS`)**：
    -   **流程**：原生上传成功后进入后端解析引擎队列。后端解析出一个关键指标或完成一个页码，就通过 WS 发送一条广播。
    -   **前端响应逻辑**：`MaterialsListPage` 组件监听到命中当前 `dealId` 的解析消息。通过解析包含的 `fileId` 和 `progress: number` 字段，实时在 UI 上执行进度条步进（Step Animation），无需用户被动刷新。
2.  **AI 报告生成结果 (`REPORT_GENERATION_STATUS`)**：
    -   **场景描述**：由于大模型生成报告涉及几万字的处理，耗时通常为 1-2 分钟。
    -   **代码响应逻辑**：前端在详情页收到 `Status: SUCCESS` 的推动消息后。首先自动清空详情页内部的 Loading 加载态组件。随后触发 Mascot (狸宝图标) 的表情变化反馈（如：从加载思考态切到胜利态）。最后异步自动拉取最新的 `fetchDealDetail` 以更新“查看报告”链接。

### 3.3 逻辑鲁棒性设计 (WS Fallback Plan)
*   **心跳维持**：前端代码内置 30s 心跳。若连接物理断开，执行最多 5 次的指数退避自动重连（Exponential Backoff）。
*   **离线静默轮询**：若环境判定 WebSocket 握手失败（如内网防火墙过滤）。系统感知层会自动启用兜底逻辑——**降级为每 5 秒一次频率的 `fetchDealDetail` REST 接口轮询**。通过这种方式确保即使在极差网络环境下，用户也能最终看到报告生成完成的状态切换。

---

## 4. 离线转写文本分道接收逻辑 (Offline Voice Flow)

这是应用的核心竞争力点，代码逻辑极度复杂，主要体现在 `RecordingPage.tsx` 和它的 Custom Hooks 中。

### 4.1 全局拦截函数：`window.onReceiveTranscription`
原生 App（讯飞引擎或底层本地引擎）识别出的每笔文字都会调用这个全局 JS 借口：`(text: string, isFinal: boolean)`。

### 4.2 双层数据流 (Stream Splitting Logic)
前端在核心逻辑层将收到的文本分流处理：
1.  **瞬时预览流 (Temporary Overlay - isFinal: false)**：
    -   **代码逻辑动作**：将 `text` 实时更新至 `currentTranscribingText` 这一单一状态变量中。
    -   **UI表现细节**：前端会在对话列表的最后方渲染该文本，颜色渲染为浅灰色，且不带索引。这段文字具有“非持久化”属性，主要是为了给用户创造即时的“看见即记录”的打字机式平滑反馈。
2.  **正式落库流 (Finalized Segment - isFinal: true)**：
    -   **触发点**：当识别到底座判断这是一段完整话语（停顿结束）。
    -   **逻辑逻辑细节**：
        -   **合并**：代码将该段落封装成 `TranscriptionBlock` 对象，通过 `Array.push` 或 Spread 模式正式归档入 `transcriptionList` 状态库。
        -   **清空原位**：立即执行 `setCurrentTranscribingText('')` 以清空预览占位。
        -   **关键点联动：关键字自动命中识别算法**：在文本确认落库的瞬间，前端后台进程会同步遍历当前绑定的 `questions` 访谈大纲字典。采用正则表达式或模糊语义匹配（包含关系为主）：如果当前段落文本包含清单中某一问题的“关键字词”。**代码会自动将该 question 的 `CHECKED` 属性从 false 置为 true**。此时用户在 UI 上无需任何操作，对应的清单进度小圆圈会自动被勾选，实时计算“已访谈百分比”。

---

## 5. 原生调用机制 (Call Native Bridge) 与 深度集成注意事项

### 5.1 通讯封装函数实现逻辑 (`callNative`)
```javascript
/**
 * 高度封装的跨端通讯统一出口
 * @param action 动作指令名
 * @param parameters 复杂的参数对象负载
 */
function callNative(action, parameters = {}) {
  try {
    if (window.webkit?.messageHandlers?.NativeBridge) {
      // iOS 端 WebKit 原理：系统底座层能直接自动识别并序列化内存中的 Object
      window.webkit.messageHandlers.NativeBridge.postMessage({ action, parameters });
    } else if (window.android?.callNative) {
      // Android 端 DSBridge/JSInterface 原理：
      // 核心业务注意：物理接口反射限制。前端必须显式执行 JSON.stringify 将 Payload 打平为字符串。
      // 如果直接传原始对象引用，安卓底层接收到的会是 [object Object] 甚至导致底座 App 驱动崩溃。
      window.android.callNative(action, JSON.stringify(parameters));
    }
  } catch (e) {
    console.error("[NativeBridge Critical Error] 指令下发失败:", action, e);
  }
}
```

### 5.2 交互底层的实战细节与坑点规约
*   **附件存储路径编码规则**：当原生底座返回的是本地存储路径（含空格、括号或中文字符）时，**前端传递回原生逻辑前，必须执行一次 `encodeURIComponent()` 对路径字符串进行转义**。这是一条血的教训：如果不转义，原生底座在查找物理文件句柄时会因路径解析错误而静默失败。
*   **JS-Native 指令时序竞争响应**：在发起 `startRecording` 开启离线转写指令后。底层硬件驱动会有约 500ms-1500ms 的初始化预热延时。**在此时段内，前端必须锁定相关交互 UI（如置灰按钮或开启 Loading 遮罩）**。防止用户在这零点几秒内连点，造成原生底层指令队列堆叠或初始化冲突。
*   **系统焦点中断响应机制**：监听全局 Action：`recordingInterrupted`。当手机进入来电响应、系统闹钟或电量警报抢占麦克风焦点时。前端在收到通知的第 1 时间：
    -   记录当前计时器秒数快照。
    -   保存已产出的临时预览文字。
    -   将界面自动切入“录制被动暂停”态，并在 Mascot 狸宝上方弹出友好的风险提示。

---

## 6. 原生 Action 回调协议及 Data 字段字典（极其重要）

这是前端消费原生底座物理事件推送的全量协议。开发新功能时请务必保持解析结构对齐。

| Action (ActionName)    | 触发逻辑与应用场景                   | 技术备注与 Data 结构详情说明                                |
| :--------------------- | :---------------------------------- | :------------------------------------------------------ |
| `startRecording`       | H5 -> 原生 发起后的物理确认          | 标志录音流水线正式就绪。前端此时应开启 UI 波形动画          |
| `stopRecording`        | H5 -> 原生 终止录制后的确认          | 原生底层完成编码封装动作。H5 后续需执行文件的最终 ID 绑定    |
| `getRecordingStatus`   | 前端主动拉取的同步指令              | 回传 `{status: boolean}`。处理用户杀掉后台重进后的 UI 同步 |
| `transcriptionResult`  | 原生底座向 H5 推送的流数据池          | 核心逻辑消费点。参见第 4 节：含解析分词、时间戳、语义文本。  |
| `getAudioList`         | 前端查询本地离线存储资产            | 数据结构：`{list: [{fileName, fileSize, duration}]}`        |
| `deleteAudioFile`      | H5 执行物理缓存清理动作              | 传对应文件名。原生物理删除后同步此回调。                     |
| `imageSelected`        | 异步图片路径获取成功回调            | 返回 localPath。前端下一步通常紧接着调用 `uploadFile` 协议  |
| `onUploadResult`       | 原生上传底座的持续进度广播          | 支持断点续传状态推送。含：`progress: number`, `fileId` (后端持久化ID) |
| `recordingInterrupted` | 系统强行中断（如：来电、闹钟）广播    | 代码逻辑动作：触发 H5 暂停预览与“恢复录制”引导弹窗展示      |
| `recordingResumed`     | 录音恢复操作成功后的广播            | 用于通知 H5：麦克风权限已拿回，可以继续恢复画面动画与计时计 |
| `fileSelected`         | 本地文件选择回调                    | 包含文件本地分层树路径。注意 `content://` 类型 URI 路径的处理 |

---

## 7. 前端核心开发建议与“避坑规约”（必读总结）

1.  **“侧滑手势返回”引发的数据丢失风险对抗 (Handover Tips)**：
    -   **惨痛背景**：在 iOS/Android 这种基于 WebStack 的容器中，用户手势侧滑返回是“瞬间性”的，它不会等待你的 Promise 完成。
    -   **实战规约**：在 `QuestionsListPage` 这种高频编辑页。代码底层全量引入了 **`useRef` 同步最新数据镜像**。逻辑定义：在 `useEffect` 的销毁（Cleanup）函数中，逻辑引擎会全自动检查 `isDirty` 标记。如果有改动，立即发起并行的静默保存流程。**原则：严禁在“返回按钮”那 1 个单一入口写保存逻辑。**
2.  **复杂访谈场景的“不断电”现场恢复体系**：
    -   **设计思路**：核心状态托管于 `useRecordingStore` (Zustand 持久化引擎)。
    -   **功能点**：前端每秒会自动更新 Store 里的 `dealId` 和 `recordingElapsedSeconds`。即使用户因为来电意外杀掉 App 进程，重新点开 App 系统能识别到之前的异常断点，并自动弹出“是否恢复录制现场？”的向导，从而实现物理上的“无感续录”。
3.  **多租户架构下的选中判定逻辑底线**：
    -   在组织、租户、角色切换弹窗中。由于存在同名组织干扰（如“默认组织”、“测试公司”重名）。
    -   **强制规约**：代码内部的所有激活选中判定、高亮条件必须基于服务端分配的全局唯一标示——`tenantId` (String)。严禁使用 `tenantName` 进行 UI 状态逻辑判定。
4.  **Token 多端同步与数据热重载策略**：
    -   系统底层集成了 Axios 402 静默拦截器。
    -   当租户发生权限降级或 Session 飘移。原生 App 会广播并触发全局 JS 事件 `tenant-synced`。
    -   **代码策略**：各个核心页面均由于 Hook 监听此事件。一旦发生，立即执行 `fetchDeals(page=1)` 并全量清空当前的 Redux/Zustand 缓存数据，从而确保用户看到的列表数据是实时清空的，绝不产生多租户数据穿透越权。

---


## 8. 测试及生产服务地址

- 测试地址
    VITE_AUTH_BASE_URL: 'http://192.168.8.201:21000/auth/',
    VITE_API_BASE_URL: 'http://192.168.8.201:20101/report/',
- 生产地址
    VITE_AUTH_BASE_URL: 'http://user.binarysee.com/auth/',
    VITE_API_BASE_URL: '/report/', 
- 测试补充：重要
    在201环境测试真机测试必须连接公司内网，否则无法访问❗️

## 9. 部署上环境

    - 测试环境：
        - cd /home/report/nginx/html/
        - rm -rf talk-assistant.zip
        - rm -rf __MACOSX
        - rm -rf talk-assistant
        - unzip talk-assistant.zip

    - 生产环境：
        - 打包给项目负责人
