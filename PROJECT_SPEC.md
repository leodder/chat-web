# 📘 Chat-Web 專案規格書與技術說明書

> **版本：** 1.0.0
> **最後更新：** 2026-04-23
> **作者：** leodder
> **專案類型：** 全端即時聊天應用程式
> **部署平台：** Firebase Hosting（前端）＋ Node.js Server（後端）

---

## 目錄

1. [專案概覽](#1-專案概覽)
2. [技術選型說明](#2-技術選型說明)
3. [專案目錄結構](#3-專案目錄結構)
4. [後端架構詳解](#4-後端架構詳解)
5. [前端架構詳解](#5-前端架構詳解)
6. [Socket.io 即時通訊深度解析](#6-socketio-即時通訊深度解析)
7. [認證流程](#7-認證流程)
8. [訊息傳送完整流程](#8-訊息傳送完整流程)
9. [環境變數設定](#9-環境變數設定)
10. [安全性設計](#10-安全性設計)
11. [佈署流程](#11-佈署流程)
12. [開發者快速上手](#12-開發者快速上手)

---

## 1. 專案概覽

### 是什麼？

**Chat-Web（暱稱：Chatty）** 是一個**全端即時聊天應用程式**，支援使用者之間的一對一私訊。功能涵蓋：

| 功能 | 說明 |
|------|------|
| 帳號系統 | 註冊、登入、登出 |
| 即時訊息 | 文字訊息即時傳遞（無需重新整理頁面） |
| 圖片傳送 | 訊息中附加圖片 |
| 個人頭像 | 上傳、更換個人大頭貼 |
| 線上狀態 | 顯示誰正在線上（綠點指示） |
| 主題系統 | 32 種介面主題可切換 |
| 響應式設計 | 支援手機與桌面裝置 |

### 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器                           │
│                                                             │
│   ┌──────────────────┐        ┌─────────────────────────┐  │
│   │   React 前端      │◄──────►│    Socket.io Client     │  │
│   │ (Vite + DaisyUI) │  HTTP  │  （即時雙向通訊）          │  │
│   └────────┬─────────┘        └───────────┬─────────────┘  │
└────────────┼────────────────────────────── ┼───────────────┘
             │ REST API (HTTP)               │ WebSocket
             ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Node.js 後端                             │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               Express HTTP Server                   │   │
│   │  /api/auth/*          /api/messages/*               │   │
│   └───────────────────────┬─────────────────────────────┘   │
│                           │                                 │
│   ┌───────────────────────┴─────────────────────────────┐   │
│   │               Socket.io Server                      │   │
│   │     連線管理  |  事件廣播  |  線上使用者追蹤            │   │
│   └─────────────────────────────────────────────────────┘   │
└───────────────┬─────────────────────────────────────────────┘
                │
      ┌─────────┴──────────┐
      │                    │
      ▼                    ▼
┌──────────┐        ┌──────────────┐
│ MongoDB  │        │  Cloudinary  │
│ 資料庫   │        │  圖片雲端儲存 │
└──────────┘        └──────────────┘
```

---

## 2. 技術選型說明

### 後端技術

#### Node.js
- **是什麼：** 讓 JavaScript 可以在瀏覽器以外（伺服器端）執行的執行環境
- **為何選它：** 前後端都用 JavaScript，學習成本低；非同步 I/O 模型非常適合即時通訊應用
- **版本：** 建議 v20+

---

#### Express（`^5.1.0`）
- **是什麼：** Node.js 最流行的 Web 框架，負責處理 HTTP 請求與回應
- **為何選它：** 輕量、靈活、生態系豐富
- **在本專案中的角色：**
  - 定義 API 路由（`/api/auth`、`/api/messages`）
  - 套用中介軟體（CORS、cookie-parser、JSON 解析）
  - 與 Socket.io 共用同一個 HTTP server

```javascript
// 典型的 Express 路由範例
router.post("/login", loginController);
router.get("/users", protectRoute, getUsersForSidebar);
```

---

#### Socket.io（`^4.8.1`）
- **是什麼：** 基於 WebSocket 的即時雙向通訊函式庫
- **為何選它：** 自動降級處理（若瀏覽器不支援 WebSocket 會改用 HTTP Long Polling）；自動重連；事件型 API 易用
- **在本專案中的角色：** 負責所有即時功能（新訊息推送、線上狀態同步）
- **詳細說明：** 見第 6 章

---

#### Mongoose（`^8.20.0`）
- **是什麼：** MongoDB 的物件文件對映（ODM）函式庫，為 JavaScript 提供結構化的資料模型
- **為何選它：** 讓操作 MongoDB 像操作 JavaScript 物件一樣直觀；支援資料驗證、Middleware、Query 建構
- **核心概念：**

```javascript
// Schema：定義資料形狀（就像資料表的欄位定義）
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 }
});

// Model：根據 Schema 建立資料存取介面
const User = mongoose.model("User", userSchema);

// 使用：
const user = await User.findOne({ email: "test@example.com" });
```

---

#### bcryptjs（`^3.0.3`）
- **是什麼：** 密碼雜湊函式庫
- **為何選它：** 密碼絕對不能以明文儲存！bcrypt 使用「加鹽雜湊」，即使資料庫被盜，攻擊者也很難還原原始密碼
- **工作原理：**

```
原始密碼: "mypassword123"
     ↓ bcrypt.hash(password, saltRounds: 10)
雜湊後:  "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            │    │
            │    └─ salt（隨機值，每次不同）
            └─ cost factor（越高越安全但越慢）

比對時：bcrypt.compare("mypassword123", hashedPassword) → true/false
```

---

#### jsonwebtoken（`^9.0.2`）
- **是什麼：** JSON Web Token（JWT）的實作函式庫
- **為何選它：** JWT 是無狀態的認證方案，伺服器不需要儲存 session，適合水平擴展
- **JWT 結構：**

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2NjAifQ.signature
│────────────────────│ │──────────────────────│ │─────────│
      Header                  Payload            Signature
   (演算法資訊)           (userId 等資料)         (防竄改簽章)
```

- **在本專案中的使用：**
  1. 登入/註冊成功後，後端用 `JWT_SECRET` 簽發 token
  2. Token 存放在 HTTP-only Cookie（不是 localStorage！）
  3. 每次請求自動帶上 Cookie，後端驗證 token 合法性

---

#### Cloudinary（`^2.8.0`）
- **是什麼：** 雲端圖片/媒體儲存與處理服務（SaaS）
- **為何選它：** 上傳後自動給 CDN URL，不佔用自己伺服器空間；提供自動壓縮、裁切等圖片處理功能
- **在本專案中的流程：**

```
前端選圖片 → 轉成 base64 字串 → 傳給後端
後端收到 base64 → cloudinary.uploader.upload(base64) → 回傳 secure_url
後端將 secure_url 存入 MongoDB
```

---

#### cors（`^2.8.5`）
- **是什麼：** Cross-Origin Resource Sharing（跨來源資源共享）中介軟體
- **為何需要：** 瀏覽器的安全機制預設會阻擋跨 origin（不同網域/port）的請求
- **配置：**

```javascript
cors({
  origin: ["http://localhost:5173", "https://chat-web-9911f.web.app"],
  credentials: true  // 允許攜帶 Cookie
})
```

---

#### cookie-parser（`^1.4.7`）
- **是什麼：** Express 中介軟體，解析 HTTP 請求中的 Cookie 字串
- **為何需要：** 沒有它，`req.cookies` 會是 undefined，JWT 就無法從 Cookie 中讀取

---

### 前端技術

#### React（`^19.2.0`）
- **是什麼：** Facebook 開發的 UI 函式庫，以組件為單位構建介面
- **核心概念：**
  - **Component（組件）：** UI 的最小單位，像積木一樣組合
  - **State（狀態）：** 組件內部的資料，改變時觸發重新渲染
  - **Props（屬性）：** 父組件傳給子組件的資料
  - **useEffect：** 處理副作用（如：API 呼叫、Socket 訂閱）

```jsx
// 組件範例
function ChatHeader({ selectedUser }) {
  return <div>{selectedUser.fullName}</div>;
}
```

---

#### React Router DOM（`^7.9.6`）
- **是什麼：** React 的客戶端路由函式庫
- **為何需要：** 單頁應用（SPA）沒有真正的頁面切換，Router 攔截 URL 變化並渲染對應組件
- **在本專案中：**

```jsx
<Routes>
  <Route path="/" element={<HomePage />} />          // 主畫面
  <Route path="/login" element={<LoginPage />} />    // 登入頁
  <Route path="/signup" element={<SignUpPage />} />  // 註冊頁
  <Route path="/settings" element={<SettingPage />} /> // 設定頁
  <Route path="/profile" element={<ProfilePage />} />  // 個人頁
</Routes>
```

---

#### Zustand（`^5.0.9`）
- **是什麼：** 輕量的 React 全域狀態管理函式庫
- **為何選它（而非 Redux）：** 程式碼極簡；無需 Action、Reducer 等繁瑣概念；體積小（~2KB）
- **工作原理：**

```javascript
// 建立 store
const useAuthStore = create((set) => ({
  authUser: null,              // 狀態
  login: async (data) => {     // 方法（可以是非同步的）
    const res = await axios.post("/auth/login", data);
    set({ authUser: res.data });  // 更新狀態
  }
}));

// 在任意組件中使用（不需要 Provider！）
const { authUser, login } = useAuthStore();
```

---

#### Axios（`^1.13.2`）
- **是什麼：** Promise-based HTTP 客戶端
- **為何選它（而非原生 fetch）：** 自動 JSON 序列化/反序列化；攔截器（Interceptors）；更好的錯誤處理；自動帶 Cookie
- **在本專案中的配置：**

```javascript
// frontend/src/lib/axios.js
const axiosInstance = axios.create({
  baseURL: "http://localhost:5001/api",
  withCredentials: true  // ← 關鍵！讓每個請求自動攜帶 Cookie
});
```

---

#### Socket.io Client（`^4.8.3`）
- **是什麼：** Socket.io 的前端函式庫，與後端 Socket.io Server 配對使用
- **詳細說明：** 見第 6 章

---

#### Vite（`^7.2.2`）
- **是什麼：** 現代前端建構工具
- **為何選它（而非 CRA/Webpack）：** 開發時利用瀏覽器原生 ES Module，啟動極快；HMR（熱模組替換）即時更新

---

#### Tailwind CSS（`^4.1.17`）+ DaisyUI（`^5.5.5`）
- **Tailwind 是什麼：** 原子 CSS 框架，不寫 CSS 文件，直接在 HTML/JSX 中組合 class
- **DaisyUI 是什麼：** Tailwind 的組件外掛，提供按鈕、卡片、輸入框等預設元件
- **主題系統：** DaisyUI 的 `data-theme` 屬性控制全站主題，本專案提供 32 種主題

```jsx
// 主題套用方式
<div data-theme={theme} className="min-h-screen">
  <button className="btn btn-primary">Primary Button</button>
  <div className="chat chat-end">...</div>
</div>
```

---

#### Lucide React（`^0.556.0`）
- **是什麼：** SVG 圖示函式庫，提供 1000+ 個一致風格的圖示
- **使用方式：** `<MessageSquare size={24} />`

---

#### React Hot Toast（`^2.6.0`）
- **是什麼：** 輕量的通知提示（Toast）函式庫
- **使用場景：** 登入成功、錯誤提示、操作反饋

```javascript
toast.success("已成功登入！");
toast.error("密碼錯誤，請重試");
```

---

## 3. 專案目錄結構

```
chat-web/
│
├── package.json              # 根專案配置
├── firebase.json             # Firebase 部署配置
├── .firebaserc               # Firebase 專案 ID
│
├── backend/                  # 後端（Node.js + Express）
│   ├── package.json
│   ├── .env                  # ⚠️ 機密環境變數（不進 Git）
│   │
│   └── src/
│       ├── index.js          # 🚀 伺服器進入點
│       │
│       ├── lib/              # 工具函式庫
│       │   ├── socket.js     # 🔌 Socket.io 初始化（核心）
│       │   ├── db.js         # 資料庫連線
│       │   ├── cloudinary.js # 圖片雲端配置
│       │   └── utils.js      # JWT token 工具
│       │
│       ├── models/           # 資料模型（MongoDB Schema）
│       │   ├── user.models.js
│       │   └── message.model.js
│       │
│       ├── middlerware/      # 中介軟體
│       │   └── auth.middleware.js  # JWT 驗證守衛
│       │
│       ├── routes/           # 路由定義（URL → Controller）
│       │   ├── auth.route.js
│       │   └── message.route.js
│       │
│       └── controllers/      # 業務邏輯（真正做事的地方）
│           ├── auth.controller.js
│           └── message.controller.js
│
└── frontend/                 # 前端（React + Vite）
    ├── package.json
    ├── index.html            # 單頁應用的唯一 HTML
    ├── vite.config.js
    │
    └── src/
        ├── main.jsx          # React 進入點
        ├── App.jsx           # 根組件（路由配置）
        ├── index.css         # Tailwind 引入
        │
        ├── lib/
        │   ├── axios.js      # Axios 實例配置
        │   └── utils.js      # 時間格式化工具
        │
        ├── constants/
        │   └── index.js      # 主題名稱清單
        │
        ├── store/            # Zustand 全域狀態
        │   ├── useAuthStore.js   # 認證狀態 + Socket 管理（核心）
        │   ├── useChatStore.js   # 聊天狀態 + 訊息管理
        │   └── useThemeStore.js  # 主題狀態
        │
        ├── pages/            # 頁面組件（對應路由）
        │   ├── HomePage.jsx
        │   ├── LoginPage.jsx
        │   ├── SignUpPage.jsx
        │   ├── ProfilePage.jsx
        │   └── SettingPage.jsx
        │
        └── components/       # 可重用 UI 組件
            ├── Navbar.jsx
            ├── Sidebar.jsx
            ├── ChatContainer.jsx
            ├── ChatHeader.jsx
            ├── MessageInput.jsx
            ├── NoChatSelected.jsx
            ├── AuthImagePattern.jsx
            └── skeleton/
                ├── MessageSkeleton.jsx
                └── SidebarSkeleton.jsx
```

---

## 4. 後端架構詳解

### 4.1 伺服器進入點：`backend/src/index.js`

```javascript
// 流程說明：
// 1. 從 socket.js 取得已包裝好的 Express app 和 HTTP server
// 2. 套用全域中介軟體
// 3. 掛載路由
// 4. 連接資料庫
// 5. 啟動監聽

import { app, server } from "./lib/socket.js";

app.use(express.json());           // 解析 JSON 請求體
app.use(cookieParser());           // 解析 Cookie
app.use(cors({ ... }));            // 允許跨域

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

await connectDB();
server.listen(PORT);               // 注意：用 server 而非 app 監聽
```

> **⚠️ 重點：** 這裡用 `server.listen()` 而非 `app.listen()`，因為 Socket.io 需要接管 HTTP server 層，共用同一個連接埠

---

### 4.2 資料模型

#### User 模型 (`user.models.js`)

```javascript
const userSchema = new mongoose.Schema({
  email:      { type: String, required: true, unique: true },
  fullName:   { type: String, required: true },
  password:   { type: String, required: true, minlength: 6 },
  // 注意：密碼存的是 bcrypt 雜湊值，不是明文
  profilePic: { type: String, default: "" }
  // Cloudinary 圖片 URL，預設空字串
}, { timestamps: true });
// timestamps: true → 自動加入 createdAt、updatedAt 欄位
```

#### Message 模型 (`message.model.js`)

```javascript
const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // ObjectId 是 MongoDB 的唯一識別符，ref: "User" 建立關聯
  text:       { type: String },      // 文字訊息（可選）
  image:      { type: String }       // Cloudinary URL（可選）
}, { timestamps: true });
// text 和 image 都是可選的，但傳送時至少要有一個
```

---

### 4.3 認證中介軟體：`auth.middleware.js`

中介軟體就像「關卡」，在請求到達 Controller 之前先檢查

```
HTTP 請求
    │
    ▼
protectRoute 中介軟體
    ├─ 沒有 Cookie？ → 401 Unauthorized
    ├─ JWT 無效？    → 401 Unauthorized
    ├─ 找不到用戶？  → 404 Not Found
    └─ 通過！ → req.user = 用戶資料 → next()
                                         │
                                         ▼
                                   Controller 執行
```

```javascript
export const protectRoute = async (req, res, next) => {
  const token = req.cookies.jwt;            // 從 Cookie 讀取 JWT

  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No Token Provided" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // jwt.verify 失敗會拋出例外，外層 try-catch 會捕捉

  const user = await User.findById(decoded.userId).select("-password");
  // .select("-password") → 查詢結果排除 password 欄位（安全考量）

  req.user = user;  // 將用戶資料掛到 req 上，讓後續 Controller 可以使用
  next();           // 呼叫 next() 讓請求繼續往下走
};
```

---

### 4.4 Controllers 說明

#### 認證 Controller (`auth.controller.js`)

| 函式 | 端點 | 功能 |
|------|------|------|
| `signup` | `POST /api/auth/signup` | 註冊新帳號 |
| `login` | `POST /api/auth/login` | 登入 |
| `logout` | `POST /api/auth/logout` | 登出 |
| `updateProfile` | `PUT /api/auth/update-profile` | 更新頭像 |
| `checkAuth` | `GET /api/auth/check` | 驗證目前登入狀態 |

**登入流程細節：**

```javascript
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  // 注意：不能用 == 比對，要用 bcrypt.compare
  if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

  generateToken(user._id, res);  // 生成 JWT 並設定 Cookie
  // 故意回傳模糊的錯誤訊息（不說「密碼錯誤」還是「帳號不存在」）→ 防止帳號列舉攻擊

  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    // 注意：不回傳 password！
  });
};
```

#### 訊息 Controller (`message.controller.js`)

| 函式 | 端點 | 功能 |
|------|------|------|
| `getUsersForSidebar` | `GET /api/messages/users` | 取得所有用戶（側邊欄） |
| `getMessages` | `GET /api/messages/:id` | 取得與指定用戶的對話記錄 |
| `sendMessage` | `POST /api/messages/send/:id` | 傳送訊息（含即時推送） |

**sendMessage 是全專案最核心的函式：**

```javascript
export const sendMessage = async (req, res) => {
  // 1. 取得參數
  const { id: receiverId } = req.params;
  const senderId = req.user._id;
  const { text, image } = req.body;

  // 2. 處理圖片（如果有的話）
  let imageUrl;
  if (image) {
    const uploadResponse = await cloudinary.uploader.upload(image);
    imageUrl = uploadResponse.secure_url;
  }

  // 3. 存入資料庫
  const newMessage = new Message({
    senderId, receiverId, text,
    image: imageUrl
  });
  await newMessage.save();

  // 4. 即時推送（Socket.io 的關鍵時刻）
  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    // 如果接收方在線，透過 Socket.io 即時推送
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }
  // 如果接收方不在線，訊息已存入 DB，等對方上線後再查詢就能看到

  res.status(201).json(newMessage);
};
```

---

## 5. 前端架構詳解

### 5.1 狀態管理：Zustand Store

本專案有三個 Zustand Store，各司其職：

```
useAuthStore         useChatStore         useThemeStore
─────────────        ─────────────        ─────────────
authUser             messages             theme
onlineUsers          users
socket               selectedUser
─────────────        ─────────────        ─────────────
checkAuth()          getUsers()           setTheme()
signup()             getMessages()
login()              sendMessage()
logout()             subscribeToMessages()
updateProfile()      unsubscribeFromMessage()
connectSocket()      setSelectedUser()
disconnectSocket()
```

#### `useAuthStore.js` — 認證 + Socket 管理

這是最重要的 Store，同時管理：
1. 登入狀態（authUser）
2. Socket.io 連線（socket）
3. 線上用戶清單（onlineUsers）

```javascript
connectSocket: () => {
  const { authUser } = get();
  // 防止重複連線
  if (!authUser || get().socket?.connected) return;

  const socket = io(BASE_URL, {
    query: { userId: authUser._id }
    // ↑ 連線時傳 userId 給後端，讓後端知道是誰連上來的
  });

  socket.connect();

  // 監聽後端廣播的「線上用戶清單」事件
  socket.on("getOnlineUsers", (userIds) => {
    set({ onlineUsers: userIds });
    // ↑ 更新狀態，所有用到 onlineUsers 的組件自動重新渲染
  });

  set({ socket });  // 把 socket 實例存起來，其他地方可以拿來用
},
```

#### `useChatStore.js` — 聊天與訊息管理

```javascript
subscribeToMessages: () => {
  const { selectedUser } = get();
  if (!selectedUser) return;

  const socket = useAuthStore.getState().socket;
  // ↑ 從 useAuthStore 取得已建立的 socket 實例

  socket.on("newMessage", (newMessage) => {
    // 只有當收到的訊息是來自「目前選中的聊天對象」才更新
    const isMessageSentFromSelectedUser =
      newMessage.senderId === selectedUser._id;
    if (!isMessageSentFromSelectedUser) return;

    set({ messages: [...get().messages, newMessage] });
    // ↑ 展開現有訊息陣列，加入新訊息 → 觸發 ChatContainer 重新渲染
  });
},

unsubscribeFromMessage: () => {
  const socket = useAuthStore.getState().socket;
  socket.off("newMessage");
  // ↑ 取消監聽，避免切換聊天對象時收到舊對象的訊息
},
```

---

### 5.2 路由守衛設計（App.jsx）

```jsx
// 已登入的用戶不能進入登入/註冊頁（會被導回首頁）
// 未登入的用戶不能進入首頁/個人頁（會被導回登入頁）

<Route path="/" element={
  authUser ? <HomePage /> : <Navigate to="/login" />
} />

<Route path="/login" element={
  !authUser ? <LoginPage /> : <Navigate to="/" />
} />
```

---

### 5.3 組件資料流

```
App.jsx
│  useEffect → checkAuth() → 確認登入狀態
│
├─ Navbar.jsx
│   └─ 讀取 useAuthStore.authUser
│   └─ 呼叫 useAuthStore.logout()
│
└─ HomePage.jsx
    ├─ Sidebar.jsx
    │   ├─ 讀取 useChatStore.users（用 getUsers() 取得）
    │   ├─ 讀取 useAuthStore.onlineUsers（判斷線上狀態）
    │   └─ 點擊用戶 → useChatStore.setSelectedUser()
    │
    └─ ChatContainer.jsx（selectedUser 存在時渲染）
        ├─ useEffect → getMessages() → 載入對話記錄
        ├─ useEffect → subscribeToMessages() → 開始監聽新訊息
        ├─ useEffect cleanup → unsubscribeFromMessage()
        │
        ├─ ChatHeader.jsx
        │   └─ 顯示 selectedUser 資訊
        │
        ├─ 訊息列表（讀取 useChatStore.messages）
        │   └─ 每則訊息：判斷 senderId === authUser._id
        │       ├─ 是自己送的 → chat-end（靠右）
        │       └─ 對方送的  → chat-start（靠左）
        │
        └─ MessageInput.jsx
            └─ 提交 → useChatStore.sendMessage()
```

---

### 5.4 圖片處理流程（前端）

```javascript
// MessageInput.jsx / ProfilePage.jsx

const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (!file.type.startsWith("image/")) {
    toast.error("請選擇圖片檔案");
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    setImagePreview(reader.result);
    // reader.result 就是 base64 字串
    // 例如："data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  };
  reader.readAsDataURL(file);
  // ↑ 把 File 物件讀成 base64 字串，才能放進 JSON 傳給後端
};
```

---

## 6. Socket.io 即時通訊深度解析

> 📌 **這一章專為沒有接觸過 WebSocket 的開發者設計**

---

### 6.1 為什麼需要 Socket.io？（從 HTTP 的限制說起）

傳統 HTTP 是「**請求-回應**」模型：

```
客戶端（你）          伺服器
    │────── 我要資料 ──────►│
    │◄───── 給你資料 ────────│
    │    （連線結束）         │
```

問題：**伺服器無法主動聯繫你**。如果有新訊息，伺服器沒辦法「推」給你，只能等你來「問」。

傳統解決方案（Polling）：

```javascript
// 每秒問一次「有新訊息嗎？」（效率很差）
setInterval(() => {
  fetch("/api/messages").then(...)
}, 1000);
```

這樣的問題：
- 浪費頻寬（大部分請求都回傳「沒有新訊息」）
- 有時間延遲（最多慢 1 秒才收到訊息）
- 伺服器負擔大

---

### 6.2 WebSocket 是什麼？

WebSocket 解決了這個問題，建立一條**持久的雙向通道**：

```
客戶端（你）                    伺服器
    │══════ 建立 WebSocket 連線 ══════│
    │                                │
    │────── 我發訊息給小明 ──────────►│
    │                                │
    │◄───── 小美發訊息給你了！ ────────│  ← 伺服器主動推送！
    │                                │
    │◄───── 小明回覆你了！ ────────────│  ← 伺服器主動推送！
    │                                │
    │  ... 連線持續，隨時可以雙向通訊 ... │
```

**特點：**
- 連線建立後持續保持（不像 HTTP 每次都是新連線）
- 伺服器可以主動推送資料給客戶端
- 延遲極低（毫秒級）

**WebSocket 協議升級過程：**

```
HTTP: GET /chat HTTP/1.1
      Upgrade: websocket         ← 請求升級協議
      Connection: Upgrade

伺服器回應:
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
                                 ← 升級成功，之後用 WebSocket 通訊
```

---

### 6.3 Socket.io 是什麼？它和 WebSocket 的關係？

Socket.io **不是** WebSocket，它是建立在 WebSocket 之上的函式庫，提供：

| 功能 | 原生 WebSocket | Socket.io |
|------|--------------|-----------|
| 自動重連 | ❌ 需自己實作 | ✅ 內建 |
| 降級處理（瀏覽器不支援時用 HTTP）| ❌ | ✅ |
| 事件型 API | ❌ 只有 message | ✅ 自訂事件名稱 |
| 房間（Room）系統 | ❌ | ✅ |
| Namespace | ❌ | ✅ |
| 廣播 | 需手動實作 | ✅ `io.emit()` |

Socket.io 把底層複雜性封裝好，讓你用直觀的**事件（Event）**模型來溝通：

```javascript
// 傳送方：「發射」一個事件，可以帶資料
socket.emit("事件名稱", { 任意資料 });

// 接收方：「監聽」這個事件，收到時執行 callback
socket.on("事件名稱", (資料) => {
  // 做某件事...
});
```

---

### 6.4 後端 Socket.io 設定詳解

#### `backend/src/lib/socket.js` 完整解析

```javascript
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
// ↑ 建立 HTTP server 並把 Express app 包進去
// 目的：Socket.io 需要接管 HTTP server 層

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://chat-web-9911f.web.app"],
    credentials: true  // 允許帶 Cookie（雖然 WebSocket 通常不用）
  }
});
// ↑ 初始化 Socket.io，傳入 http server，設定 CORS

// 關鍵資料結構：記錄「誰」在「哪個 socket」
// 格式：{ userId: socketId }
// 例如：{ "66023abc": "XKcd8sdf", "66023def": "PLmn7qqr" }
const userSocketMap = {};

// 工具函式：根據 userId 查詢 socket ID
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// 監聽連線事件（每當有用戶連上來都會觸發）
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  // socket.id 是 Socket.io 自動分配的唯一識別碼
  // 格式類似："XKcd8sdfG9a2Plmn"

  // 從連線時的 query 參數取得 userId
  // 前端連線時有帶：io(BASE_URL, { query: { userId: "..." } })
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
    // ↑ 建立映射：知道這個用戶對應哪個 socket
  }

  // 廣播目前在線的所有用戶 ID 給「所有連線中的用戶」
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  // io.emit() → 廣播給所有人
  // socket.emit() → 只傳給這個 socket（單一用戶）
  // socket.broadcast.emit() → 傳給除了自己以外的所有人

  // 監聽斷線事件
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    // ↑ 從映射表移除

    // 再次廣播更新後的線上用戶清單
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
```

---

### 6.5 前端 Socket.io 連線詳解

#### `useAuthStore.js` 中的 `connectSocket` 和 `disconnectSocket`

```javascript
connectSocket: () => {
  const { authUser } = get();

  // 防護：未登入或已有連線，直接返回
  if (!authUser || get().socket?.connected) return;

  const socket = io(BASE_URL, {
    // BASE_URL = "http://localhost:5001"
    // ↑ 指向後端 Socket.io server 的位址

    query: {
      userId: authUser._id
      // ↑ 讓後端知道是哪個用戶連上來的
      // 後端用 socket.handshake.query.userId 接收
    }
  });
  // io() 函式是 socket.io-client 提供的
  // 呼叫後立即開始建立 WebSocket 連線

  socket.connect();

  set({ socket });
  // ↑ 把 socket 實例存到 Zustand store
  // 這樣 useChatStore 也能取到同一個 socket 實例

  // 監聽後端廣播的「線上用戶清單」
  socket.on("getOnlineUsers", (userIds) => {
    set({ onlineUsers: userIds });
    // userIds 是陣列，例如：["66023abc", "66023def"]
    // Sidebar 的 onlineUsers 狀態更新 → 綠點即時出現/消失
  });
},

disconnectSocket: () => {
  if (get().socket?.connected) {
    get().socket.disconnect();
    // ↑ 主動斷開連線（登出時呼叫）
  }
},
```

---

### 6.6 訊息即時推送的完整流程

這是整個 Socket.io 功能最核心的部分，我們逐步拆解：

```
【場景：A 用戶向 B 用戶傳送訊息】

步驟 1：A 用戶在輸入框按下送出
──────────────────────────────────
MessageInput.jsx
  → sendMessage({ text: "你好！", image: null })

步驟 2：前端發送 HTTP 請求
──────────────────────────────────
useChatStore.sendMessage()
  → POST /api/messages/send/{B的userId}
    Body: { text: "你好！" }

  發送後，直接把回應的訊息加入 messages 陣列
  → A 用戶立刻看到自己的訊息（不等 Socket）

步驟 3：後端處理請求
──────────────────────────────────
message.controller.js → sendMessage()
  1. 把訊息存入 MongoDB ✓
  2. 查詢 B 用戶的 socket ID：
     receiverSocketId = getReceiverSocketId(B的userId)
     → 從 userSocketMap 查詢
     → 如果 B 在線，得到類似 "PLmn7qqr" 的 socket ID

步驟 4：後端透過 Socket.io 推送給 B
──────────────────────────────────
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", message)
    //  └─────────────────────────────────────────────
    //  io.to(socketId)  → 指定要傳給哪個 socket（即哪個用戶）
    //  .emit("newMessage", data)  → 觸發事件，帶上訊息資料
  }

步驟 5：B 用戶的前端收到 Socket 事件
──────────────────────────────────
useChatStore.subscribeToMessages() 中監聽：

  socket.on("newMessage", (newMessage) => {
    // 判斷這則訊息是不是來自「我正在跟他聊天的對象」
    const isFromSelectedUser = newMessage.senderId === selectedUser._id;
    if (!isFromSelectedUser) return;
    // ↑ 如果 A 不是 B 目前選中的聊天對象，就忽略
    //   （訊息已存 DB，切換聊天時會重新 getMessages）

    set({ messages: [...get().messages, newMessage] });
    // ↑ 把新訊息加到陣列末尾
  });

步驟 6：B 用戶的 ChatContainer 重新渲染
──────────────────────────────────
messages 狀態更新 → React 重新渲染
→ B 用戶看到 A 的訊息出現在畫面上
→ useEffect 觸發自動捲動到最新訊息
```

**視覺化時序圖：**

```
A 的瀏覽器              後端伺服器               B 的瀏覽器
────────────           ────────────            ────────────
按下送出
     │
     │──POST /send/{B}──►│
     │                   │ 存入 MongoDB
     │◄──回傳新訊息────────│
A 看到訊息              │──io.to(B的socketId)──►│
                        │   .emit("newMessage") │
                                                │ socket.on("newMessage")
                                                │ 更新 messages 陣列
                                                B 看到訊息
```

---

### 6.7 線上狀態的運作原理

```
【場景：C 用戶登入】

1. C 完成登入 → connectSocket() 呼叫
2. 前端：io("http://localhost:5001", { query: { userId: C的Id } })
3. 後端觸發 "connection" 事件：
   - userSocketMap["C的Id"] = "新的socketId"
   - io.emit("getOnlineUsers", ["A的Id", "B的Id", "C的Id"])
   → 廣播給所有人（包含 A 和 B）

4. A 和 B 的前端都收到 "getOnlineUsers" 事件：
   - 更新 onlineUsers 狀態
   - Sidebar 重新渲染：C 的頭像旁出現綠點

【場景：C 用戶登出】

1. C 按登出 → logout() → disconnectSocket()
2. 前端：socket.disconnect()
3. 後端觸發 "disconnect" 事件：
   - delete userSocketMap["C的Id"]
   - io.emit("getOnlineUsers", ["A的Id", "B的Id"])
   → 廣播給剩下的人

4. A 和 B 的 Sidebar：C 的綠點消失
```

---

### 6.8 Socket 訂閱/取消訂閱的生命週期

這是一個常見的錯誤來源，理解它很重要：

```jsx
// ChatContainer.jsx

useEffect(() => {
  getMessages(selectedUser._id);  // 載入歷史訊息
  subscribeToMessages();          // 開始監聽新訊息
  // ↑ 組件掛載時執行

  return () => {
    unsubscribeFromMessage();
    // ↑ 清除函式（cleanup）：組件卸載時執行
    //   防止記憶體洩漏和收到不該收到的訊息
  };
}, [selectedUser._id, subscribeToMessages, unsubscribeFromMessage]);
// ↑ 依賴陣列：selectedUser 改變時，舊的取消訂閱，再重新訂閱
```

**為什麼要取消訂閱？**

```
情境：你正在和 A 聊天（已訂閱監聽）
      你切換去和 B 聊天（重新訂閱）
      但如果沒有取消舊訂閱...

      A 傳訊息給你 → 事件觸發 → 會錯誤地顯示在 B 的聊天視窗！
```

---

## 7. 認證流程

### 7.1 JWT Cookie 認證機制

```
為什麼用 Cookie 而不是 localStorage 存 JWT？

localStorage：
  ✗ 可被 JavaScript 讀取 → XSS 攻擊可竊取 token
  ✗ 需要手動在每個請求帶上 Authorization header

HTTP-only Cookie：
  ✓ JavaScript 無法讀取（document.cookie 取不到）→ 防 XSS
  ✓ 瀏覽器自動在每個同域請求帶上 → 不需手動處理
  ✓ 設定 SameSite=strict → 防 CSRF
```

### 7.2 generateToken 函式

```javascript
// backend/src/lib/utils.js

export const generateToken = (userId, res) => {
  const token = jwt.sign(
    { userId },           // Payload：把 userId 編進 token
    process.env.JWT_SECRET,  // Secret：簽章用的金鑰，絕對不能洩漏
    { expiresIn: "7d" }   // 7 天後過期
  );

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天（毫秒）
    httpOnly: true,    // JavaScript 無法存取此 Cookie
    sameSite: "strict", // 只有同一網站的請求才帶此 Cookie
    secure: process.env.NODE_ENV !== "development"
    // 開發環境：不需 HTTPS（false）
    // 生產環境：只在 HTTPS 傳送（true）
  });
};
```

### 7.3 完整認證流程圖

```
用戶打開網站
      │
      ▼
App.jsx useEffect
  checkAuth() → GET /api/auth/check
      │
      ├─ 有效的 JWT Cookie
      │      │
      │      ▼
      │  設定 authUser
      │  connectSocket()
      │  顯示 HomePage
      │
      └─ 沒有 Cookie / Cookie 無效
             │
             ▼
         重導到 /login

用戶填寫登入表單
      │
      ▼
login() → POST /api/auth/login
      │
      ├─ 成功：後端設定 Cookie
      │      │
      │      ▼
      │  設定 authUser
      │  connectSocket()
      │  重導到 /
      │
      └─ 失敗：顯示錯誤 toast
```

---

## 8. 訊息傳送完整流程

### 8.1 傳送文字訊息

```
1. 用戶在 MessageInput 輸入文字
2. 點擊送出按鈕
3. handleSendMessage() 呼叫 sendMessage({ text })
4. POST /api/messages/send/{selectedUser._id}
5. 後端：
   a. protectRoute 驗證 JWT
   b. 建立 Message 文件並存入 MongoDB
   c. 取得接收方 socket ID
   d. 若接收方在線：io.to(socketId).emit("newMessage", msg)
   e. 回傳 201 + 訊息物件
6. 前端：
   a. 把新訊息加入 messages 陣列
   b. 清空輸入框
   c. ChatContainer 重新渲染，捲動到底部
```

### 8.2 傳送圖片訊息

```
1. 用戶點擊迴紋針圖示，選擇圖片
2. FileReader 把圖片讀成 base64 字串
3. 顯示預覽圖
4. 用戶點擊送出
5. sendMessage({ text, image: base64字串 })
6. POST /api/messages/send/{id}，body 包含 base64
7. 後端：
   a. 收到 base64 → cloudinary.uploader.upload(image)
   b. Cloudinary 處理後回傳 secure_url
   c. 存入 MongoDB（image 欄位 = Cloudinary URL）
   d. Socket.io 推送給接收方
8. 前端顯示 Cloudinary CDN 上的圖片
```

---

## 9. 環境變數設定

### 後端 `.env`

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>

# Server
PORT=5001

# JWT
JWT_SECRET=your_super_secret_key_here_make_it_long_and_random

# Environment
NODE_ENV=development  # 改為 production 時 Cookie 需要 HTTPS

# Cloudinary（從 cloudinary.com 控制台取得）
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRECT=your_api_secret
```

### 前端（硬編碼在 axios.js 和 useAuthStore.js）

```javascript
// 開發環境：
const BASE_URL = "http://localhost:5001";

// 部署後需要改為後端的真實網址
```

---

## 10. 安全性設計

| 威脅 | 防護措施 |
|------|---------|
| **密碼洩漏** | bcryptjs 雜湊儲存，salt rounds: 10 |
| **XSS 攻擊** | JWT 存在 HTTP-only Cookie，JavaScript 無法讀取 |
| **CSRF 攻擊** | Cookie 設定 SameSite: "strict" |
| **中間人攻擊** | 生產環境 Cookie 設定 Secure: true（只走 HTTPS）|
| **未授權存取** | protectRoute 中介軟體保護所有需要登入的路由 |
| **帳號列舉** | 登入失敗統一回傳 "Invalid credentials"（不說是帳號還是密碼錯）|
| **Token 永久有效** | JWT 設定 7 天過期 |
| **密碼欄位洩漏** | 所有 User 查詢都 `.select("-password")` |
| **跨域攻擊** | CORS 只允許特定 origin |

---

## 11. 佈署流程

### 後端

```bash
cd backend
npm start  # 使用 node src/index.js 啟動

# 建議使用 PM2 管理 Node 行程
npm install -g pm2
pm2 start src/index.js --name chat-web-backend
```

### 前端

```bash
cd frontend
npm run build  # 輸出到 dist/ 目錄

# Firebase 部署
# firebase deploy
只部署前端部分要加 --only hosting
firebase deploy --only hosting
```

### Firebase 配置（`firebase.json`）

前端靜態檔案部署到 Firebase Hosting，所有請求都重導到 `index.html`（SPA 路由處理）

---

## 12. 開發者快速上手

### 環境需求

- Node.js v20+
- MongoDB 帳號（或本機 MongoDB）
- Cloudinary 帳號（免費方案即可）

### 步驟

```bash
# 1. Clone 專案
git clone <repo-url>
cd chat-web

# 2. 安裝後端依賴
cd backend
npm install

# 3. 設定環境變數
cp .env.example .env
# 填寫 .env 中的各項設定

# 4. 啟動後端
npm run dev  # nodemon 自動重啟

# 5. 另開終端機，安裝前端依賴
cd frontend
npm install

# 6. 啟動前端
npm run dev  # 預設在 http://localhost:5173
```

### 常見問題

| 問題 | 可能原因 | 解決方式 |
|------|---------|---------|
| 登入後立刻被踢出 | JWT_SECRET 未設定 | 檢查 .env 的 JWT_SECRET |
| 圖片上傳失敗 | Cloudinary 設定錯誤 | 確認三個 Cloudinary 環境變數都正確 |
| 即時訊息收不到 | Socket CORS 錯誤 | 確認後端 CORS origin 包含你的前端網址 |
| 跨域請求被阻擋 | CORS 設定 | 確認 `credentials: true` 和對應 origin |
| Cookie 不帶上 | Axios 配置 | 確認 `withCredentials: true` |

---

## 附錄：API 完整列表

### Auth API

| Method | Path | 是否需要登入 | 說明 |
|--------|------|------------|------|
| `POST` | `/api/auth/signup` | ❌ | 註冊 |
| `POST` | `/api/auth/login` | ❌ | 登入 |
| `POST` | `/api/auth/logout` | ❌ | 登出 |
| `PUT` | `/api/auth/update-profile` | ✅ | 更新頭像 |
| `GET` | `/api/auth/check` | ✅ | 檢查登入狀態 |

### Messages API

| Method | Path | 是否需要登入 | 說明 |
|--------|------|------------|------|
| `GET` | `/api/messages/users` | ✅ | 取得所有用戶（側邊欄） |
| `GET` | `/api/messages/:id` | ✅ | 取得與指定用戶的對話記錄 |
| `POST` | `/api/messages/send/:id` | ✅ | 傳送訊息 |

### Socket.io 事件

| 方向 | 事件名稱 | 觸發時機 | 資料格式 |
|------|---------|---------|---------|
| Server → All | `getOnlineUsers` | 有用戶連線/斷線 | `string[]`（userId 陣列）|
| Server → 指定用戶 | `newMessage` | 有人傳訊息給你 | `Message` 物件 |
| Client → Server | （連線時 query）| 連線建立 | `{ userId: string }` |
