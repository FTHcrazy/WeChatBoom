# 窗口布局说明

## 架构概述

应用采用**单窗口 + BrowserView** 架构，Main 窗口左侧显示侧边栏，右侧使用 BrowserView 嵌入 IM 内容。BrowserView 拥有独立的渲染进程，但视觉上在同一个窗口内。

```
┌────────────────────────────────────────────┐
│  Main Window (BrowserWindow)              │
│  1200px × 800px                            │
│                                            │
│  ┌──────────┬──────────────────────────┐  │
│  │ Sidebar  │   IM BrowserView         │  │
│  │ (HTML)   │   (独立渲染进程)          │  │
│  │          │                          │  │
│  │ 💬 聊天   │                          │  │
│  │ 👥 通讯录 │   React IM 应用          │  │
│  │ 🔍 发现   │                          │  │
│  │ 📷 朋友圈  │   (端口 5173)            │  │
│  │ 📁 文件   │                          │  │
│  │ ⭐ 收藏   │                          │  │
│  │          │                          │  │
│  │ ⚙️ 设置   │                          │  │
│  │ 🧪 测试   │                          │  │
│  └──────────┴──────────────────────────┘  │
│     260px            940px                │
└────────────────────────────────────────────┘
```

## 窗口配置

### Main 窗口（BrowserWindow）
- **尺寸**: 1200x800px (260 侧边栏 + 940 内容区)
- **类型**: 主窗口
- **内容**: `packages/main/src/sidebar.html`（左侧 260px）
- **功能**: 
  - 左侧：导航菜单、用户信息、底部工具栏
  - 右侧：嵌入 IM BrowserView
  - 发送视图切换消息到 IM BrowserView

### IM BrowserView（独立渲染进程）
- **尺寸**: 940x800px（自动调整）
- **类型**: BrowserView（嵌入在 Main 窗口右侧）
- **内容**: React 应用（`packages/im-window`）
- **渲染进程**: 独立的渲染进程
- **功能**:
  - 聊天界面
  - 通讯录
  - 发现/朋友圈/文件/收藏等视图
  - 接收侧边栏的视图切换消息
  
**优势**:
- ✅ 独立的渲染进程（崩溃不影响侧边栏）
- ✅ 单一窗口体验（视觉统一）
- ✅ 自动跟随窗口大小调整
- ✅ 完整的 IPC 通信支持

### Setting 窗口
- **尺寸**: 700x600px
- **类型**: 独立窗口
- **内容**: React 应用（`packages/setting-window`）
- **功能**: 应用设置

## 架构关系

1. **嵌入关系**: IM BrowserView 嵌入在 Main 窗口内
   - BrowserView 占据窗口右侧（x: 260px, width: 940px）
   - 自动跟随窗口大小调整
   - Main 窗口关闭时，BrowserView 自动销毁

2. **进程隔离**:
   - **Main 窗口渲染进程**: 负责侧边栏 HTML
   - **IM BrowserView 渲染进程**: 独立进程运行 React 应用
   - **Setting 窗口渲染进程**: 独立窗口独立进程
   - 各进程崩溃互不影响

3. **通信机制**:
   - Sidebar → IM BrowserView: 发送视图切换消息 (`switch-view`)
   - IM BrowserView → Sidebar: 发送状态更新消息 (`chat-updated`)
   - 支持请求-响应模式进行数据交换
   - 所有通信通过主进程中转

## 启动流程

1. 应用启动时，首先创建 Main 窗口（1200x800px）
2. Main 窗口加载 sidebar.html（左侧 260px）
3. 延迟 100ms 后创建 IM BrowserView（右侧 940px）
4. BrowserView 加载 React IM 应用（开发模式：http://localhost:5173）
5. 用户可以通过侧边栏切换 BrowserView 的视图

## 视图切换

侧边栏点击导航项时：
```typescript
// Main 窗口（sidebar.html）
window.electronAPI.sendTo('im', 'switch-view', { view: 'chat' });

// IM 窗口（App.tsx）
window.electronAPI.onMessage('switch-view', (message) => {
  setCurrentView(message.data.view); // 'chat', 'contacts', 'discover', etc.
});
```

支持的视图：
- `chat`: 聊天
- `contacts`: 通讯录
- `discover`: 发现
- `moments`: 朋友圈
- `files`: 文件
- `favorites`: 收藏

## 开发和构建

### 开发模式

```bash
# 1. 启动所有开发服务器
pnpm dev

# 2. 启动 Electron（新终端）
pnpm electron:dev
```

Main 窗口使用本地 HTML 文件，IM 窗口连接到开发服务器。

### 生产构建

```bash
# 构建所有包
pnpm build

# 打包 Electron 应用
pnpm electron:build
```

构建时会自动复制 `sidebar.html` 到 `dist` 目录。

## 自定义布局

### 修改窗口尺寸

编辑 `packages/main/src/WindowManager.ts`:

```typescript
private initWindowConfigs() {
  this.windowConfigs.set('main', {
    width: 260,  // 侧边栏宽度
    height: 800, // 高度
    // ...
  });

  this.windowConfigs.set('im', {
    width: 940,  // IM 窗口宽度
    height: 800, // 高度
    // ...
  });
}
```

### 修改初始位置

```typescript
this.windowConfigs.set('main', {
  // ...
  x: 100,  // 距离屏幕左边
  y: 100,  // 距离屏幕顶部
});
```

### 添加新视图

1. 在 `sidebar.html` 添加导航项：
```html
<div class="nav-item" data-view="your-view">
  <div class="nav-icon">🎯</div>
  <div class="nav-label">新视图</div>
</div>
```

2. 在 IM 窗口的 `App.tsx` 处理新视图：
```typescript
useEffect(() => {
  window.electronAPI.onMessage('switch-view', (message) => {
    const view = message.data.view;
    if (view === 'your-view') {
      // 渲染新视图
    }
  });
}, []);
```

## 注意事项

1. **单窗口体验**: 侧边栏和 IM 内容在同一个窗口内，视觉统一
2. **进程隔离**: IM BrowserView 使用独立渲染进程，崩溃不影响侧边栏
3. **自动调整**: BrowserView 自动跟随窗口大小调整
4. **自动销毁**: 关闭 Main 窗口会自动销毁 BrowserView
5. **开发模式**: 侧边栏使用本地 HTML，修改后需要重新加载窗口
6. **通信支持**: BrowserView 完全支持 IPC 通信，包括请求-响应模式

## 技术实现

### BrowserView 创建和定位

```typescript
// WindowManager.ts
createIMView(parentWindow: BrowserWindow, preloadPath: string): BrowserView {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  });

  // 设置 BrowserView 的边界（右侧区域）
  const bounds = parentWindow.getBounds();
  view.setBounds({
    x: this.SIDEBAR_WIDTH, // 260px
    y: 0,
    width: bounds.width - this.SIDEBAR_WIDTH,
    height: bounds.height
  });

  // 设置自动调整大小
  view.setAutoResize({
    width: true,
    height: true
  });

  // 添加到父窗口
  parentWindow.addBrowserView(view);
  
  return view;
}
```

### 窗口大小跟随

```typescript
// 窗口大小改变时，调整 BrowserView 大小
parentWindow.on('resize', () => {
  try {
    const newBounds = parentWindow.getBounds();
    view.setBounds({
      x: this.SIDEBAR_WIDTH,
      y: 0,
      width: newBounds.width - this.SIDEBAR_WIDTH,
      height: newBounds.height
    });
  } catch (error) {
    // View 可能已被销毁
  }
});
```

### 消息路由（支持 BrowserView）

```typescript
// 发送消息支持 BrowserView
sendToWindow(type: WindowType, channel: string, data: any): boolean {
  // 首先尝试作为窗口发送
  const window = this.getWindow(type);
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, data);
    return true;
  }
  
  // 如果是 'im'，尝试发送到 BrowserView
  if (type === 'im') {
    const view = this.getView('im');
    if (view) {
      view.webContents.send(channel, data);
      return true;
    }
  }
  
  return false;
}
```

## 未来扩展

可能的改进方向：
- 侧边栏可折叠/展开
- 支持多个 IM 窗口（多开）
- 记住窗口位置和尺寸
- 支持窗口吸附和对齐
- 主题切换（深色/浅色）
