# WeChatBoom

基于 Electron + React + TypeScript 的 IM 应用，使用 pnpm + Monorepo 架构。

## 项目结构

```
WeChatBoom/
├── packages/
│   ├── main/              # Electron 主进程
│   │   ├── src/
│   │   │   ├── main.ts    # 主进程入口
│   │   │   └── preload.ts # 预加载脚本
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── im/         # IM 窗口渲染进程
│   │   ├── src/
│   │   │   ├── App.tsx    # React 主组件
│   │   │   ├── main.tsx   # React 入口
│   │   │   ├── App.css
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── setting/    # 设置窗口渲染进程
│       ├── src/
│       │   ├── App.tsx    # React 主组件
│       │   ├── main.tsx   # React 入口
│       │   ├── App.css
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── .npmrc                 # npm 中国镜像配置
├── package.json           # 根项目配置
└── README.md
```

## 技术栈

- **包管理**: pnpm + Monorepo
- **主进程**: Electron + TypeScript
- **渲染进程**: React 18 + TypeScript + Vite
- **打包工具**: electron-builder
- **镜像源**: npm 中国镜像

## 安装依赖

确保已安装 pnpm (>= 8.0.0) 和 Node.js (>= 18.0.0)

```bash
# 如果未安装 pnpm
npm install -g pnpm

# 安装所有依赖
pnpm install
```

## 开发

```bash
# 启动开发环境（同时运行主进程和渲染进程）
pnpm dev

# 在新终端启动 Electron
pnpm electron:dev
```

或者分步执行：

```bash
# 启动 IM 窗口开发服务器（端口 5173）
pnpm --filter @wechat-boom/im dev

# 启动设置窗口开发服务器（端口 5174）
pnpm --filter @wechat-boom/setting dev

# 编译主进程（监听模式）
pnpm --filter @wechat-boom/main dev

# 启动 Electron
pnpm --filter @wechat-boom/main electron:dev
```

## 构建

```bash
# 构建所有项目并打包
pnpm electron:build

# 仅构建代码（不打包）
pnpm build
```

构建产物将输出到 `release/` 目录。

## 项目特性

- ✅ **Monorepo 架构**: 使用 pnpm workspace 管理多个包
- ✅ **TypeScript**: 全项目 TypeScript 支持
- ✅ **React 18**: 使用最新的 React 和 Hooks
- ✅ **Vite**: 快速的开发服务器和构建工具
- ✅ **窗口通信机制**: 完整的窗口管理和通信系统
  - 点对点通信：窗口间直接消息传递（单向）
  - 广播通信：向所有窗口广播消息
  - 请求-响应：基于 Promise 的异步通信（支持超时）
  - 事件监听：支持自定义事件和清理
- ✅ **IPC 通信**: 主进程和渲染进程之间的安全通信
- ✅ **中国镜像**: 配置了 npm 和 Electron 的中国镜像源
- ✅ **跨平台**: 支持 macOS、Windows 和 Linux

## npm 镜像配置

项目已配置中国镜像源（`.npmrc`）：

```
registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## 窗口通信示例

### 窗口管理

```typescript
// 打开窗口
await window.electronAPI.openWindow('im');
await window.electronAPI.openWindow('setting');

// 关闭窗口
await window.electronAPI.closeWindow('setting');

// 兼容旧 API
await window.electronAPI.openIMWindow();
await window.electronAPI.openSettingWindow();
```

### 窗口间通信

#### 点对点通信

```typescript
// 从主窗口发送消息到 IM 窗口
window.electronAPI.sendTo('im', 'user-login', {
  userId: '12345',
  username: 'John Doe'
});

// 在 IM 窗口接收消息
const cleanup = window.electronAPI.onMessage('user-login', (message) => {
  console.log('来自', message.from, '的消息:', message.data);
});

// 清理监听器
cleanup();
```

#### 广播通信

```typescript
// 在设置窗口广播主题变更
window.electronAPI.broadcast('theme-changed', {
  theme: 'dark'
});

// 在其他窗口监听
window.electronAPI.onMessage('theme-changed', (message) => {
  applyTheme(message.data.theme);
});
```

### 请求-响应模式（Promise 异步）

```typescript
// 发送请求并等待响应
try {
  const result = await window.electronAPI.request(
    'im',                    // 目标窗口
    'get-user-info',         // 请求频道
    { userId: 123 },         // 请求数据
    { timeout: 5000 }        // 超时配置（可选）
  );
  console.log('用户信息:', result);
} catch (error) {
  console.error('请求失败:', error.message);
}

// 注册请求处理器
useEffect(() => {
  const cleanup = window.electronAPI.onRequest('get-user-info', async (data, from) => {
    const user = await fetchUser(data.userId);
    return {
      userId: user.id,
      username: user.name,
      email: user.email
    };
  });

  return cleanup; // 清理监听器
}, []);
```

### React 中使用

```typescript
import { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    // 监听消息
    const cleanup = window.electronAPI.onMessage('test-message', (message) => {
      console.log('收到消息:', message.data);
    });

    // 组件卸载时清理
    return cleanup;
  }, []);

  const sendMessage = () => {
    window.electronAPI.broadcast('my-event', { data: 'hello' });
  };

  const requestData = async () => {
    try {
      const data = await window.electronAPI.request('im', 'get-data', {});
      console.log('数据:', data);
    } catch (error) {
      console.error('失败:', error.message);
    }
  };

  return (
    <div>
      <button onClick={sendMessage}>发送消息</button>
      <button onClick={requestData}>请求数据</button>
    </div>
  );
}
```

### 文档

- **通信机制**: [packages/main/COMMUNICATION.md](packages/main/COMMUNICATION.md)
- **请求-响应**: [REQUEST_RESPONSE.md](REQUEST_RESPONSE.md)
- **快速开始**: [QUICKSTART.md](QUICKSTART.md)

## 窗口布局

应用采用**单窗口 + BrowserView** 架构，类似微信桌面版：

```
┌────────────────────────────────────────────┐
│  Main Window (1200×800)                   │
│  ┌──────────┬──────────────────────────┐  │
│  │ Sidebar  │   IM BrowserView         │  │
│  │ (HTML)   │   (独立渲染进程)          │  │
│  │          │                          │  │
│  │ 💬 聊天   │   React IM 应用          │  │
│  │ 👥 通讯录 │                          │  │
│  │ 🔍 发现   │   根据侧边栏切换视图      │  │
│  │ 📷 朋友圈  │                          │  │
│  │ 📁 文件   │                          │  │
│  │ ⭐ 收藏   │                          │  │
│  │ ⚙️ 设置   │                          │  │
│  └──────────┴──────────────────────────┘  │
│     260px            940px                │
└────────────────────────────────────────────┘
```

- **Main 窗口**: 单一窗口（1200×800），左侧侧边栏 HTML
- **IM BrowserView**: 嵌入右侧（940px），独立渲染进程运行 React
- **Setting 窗口**: 独立设置窗口

**优势**: 
- ✅ 单窗口体验，视觉统一
- ✅ 独立渲染进程，IM 崩溃不影响侧边栏
- ✅ 自动跟随窗口大小调整

详细说明：[WINDOW_LAYOUT.md](WINDOW_LAYOUT.md)

## 开发说明

1. **主进程** (`packages/main`): 负责创建窗口、管理应用生命周期、侧边栏 HTML
2. **IM 窗口** (`packages/im`): React 应用，IM 聊天界面（端口 5173）
3. **设置窗口** (`packages/setting`): React 应用，设置界面（端口 5174）
4. **Preload 脚本**: 提供安全的 IPC 通信桥梁

## 许可证

MIT
