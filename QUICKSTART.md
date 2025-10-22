# 窗口通信快速开始

## 1. 基本概念

本项目实现了主进程作为消息中心的窗口通信机制：

```
┌─────────────────────────────────────────────────┐
│           Main Process (消息中心)                │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │      WindowManager                   │       │
│  │  - 管理所有窗口                      │       │
│  │  - 路由消息                          │       │
│  │  - 广播事件                          │       │
│  └─────────────────────────────────────┘       │
└───────┬─────────────┬─────────────┬─────────────┘
        │             │             │
    ┌───▼───┐    ┌───▼───┐    ┌───▼────┐
    │ Main  │    │  IM   │    │Setting │
    │Window │    │Window │    │ Window │
    │(5173) │    │(5173) │    │ (5174) │
    └───────┘    └───────┘    └────────┘
```

## 2. 创建新窗口

### 添加窗口类型

1. 在 `WindowManager.ts` 中添加窗口类型：

```typescript
export type WindowType = 'main' | 'im' | 'setting' | 'your-new-window';
```

2. 在 `initWindowConfigs()` 中添加配置：

```typescript
this.windowConfigs.set('your-new-window', {
  width: 800,
  height: 600,
  devPort: 5175,  // 新端口
  distPath: '../your-new-window/dist/index.html'
});
```

3. 创建新的子项目：

```bash
cd packages
mkdir your-new-window
# 复制 im-window 或 setting-window 的结构
```

4. 更新根目录 `package.json`：

```json
"scripts": {
  "dev": "concurrently \"...\" \"pnpm --filter @wechat-boom/your-new-window dev\""
}
```

## 3. 发送消息

### 点对点通信

```typescript
// 发送到特定窗口
window.electronAPI.sendTo('im', 'user-message', {
  userId: 123,
  text: 'Hello!'
});
```

### 广播通信

```typescript
// 广播到所有其他窗口（不包括自己）
window.electronAPI.broadcast('global-event', {
  type: 'update',
  data: 'something'
});
```

## 4. 接收消息

### 基本监听

```typescript
// 监听特定频道
const cleanup = window.electronAPI.onMessage('user-message', (message) => {
  console.log('From:', message.from);
  console.log('Data:', message.data);
});

// 记得清理
cleanup();
```

### React Hook 封装

```typescript
// hooks/useWindowMessage.ts
import { useEffect } from 'react';

export function useWindowMessage<T = any>(
  channel: string,
  callback: (data: T, from: WindowType) => void
) {
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onMessage(channel, (message) => {
      callback(message.data, message.from);
    });

    return cleanup;
  }, [channel, callback]);
}

// 使用
function MyComponent() {
  useWindowMessage('user-message', (data, from) => {
    console.log(`收到来自 ${from} 的消息:`, data);
  });

  return <div>My Component</div>;
}
```

### 发送 Hook

```typescript
// hooks/useWindowSender.ts
import { useCallback } from 'react';

export function useWindowSender() {
  const sendTo = useCallback(
    (to: WindowType, channel: string, data: any) => {
      window.electronAPI?.sendTo(to, channel, data);
    },
    []
  );

  const broadcast = useCallback((channel: string, data: any) => {
    window.electronAPI?.broadcast(channel, data);
  }, []);

  return { sendTo, broadcast };
}

// 使用
function MyComponent() {
  const { sendTo, broadcast } = useWindowSender();

  const handleClick = () => {
    sendTo('im', 'test', { hello: 'world' });
  };

  return <button onClick={handleClick}>发送</button>;
}
```

## 5. 常见场景

### 场景1: 用户登录状态同步

```typescript
// 在主窗口登录后
const handleLogin = async (user) => {
  // 保存用户信息
  await saveUser(user);
  
  // 广播登录事件
  window.electronAPI.broadcast('user-logged-in', {
    userId: user.id,
    username: user.name,
    avatar: user.avatar
  });
};

// 在其他窗口监听
useWindowMessage('user-logged-in', (userData) => {
  setCurrentUser(userData);
  initializeUserData(userData.userId);
});
```

### 场景2: 实时消息通知

```typescript
// IM 窗口收到新消息
const handleNewMessage = (msg) => {
  // 通知所有窗口
  window.electronAPI.broadcast('new-message-notification', {
    from: msg.sender,
    text: msg.text,
    timestamp: msg.timestamp
  });
};

// 主窗口显示通知
useWindowMessage('new-message-notification', (data) => {
  showNotification({
    title: `来自 ${data.from} 的消息`,
    body: data.text
  });
});
```

### 场景3: 设置同步

```typescript
// 设置窗口
const handleSaveSettings = (settings) => {
  // 保存设置
  localStorage.setItem('settings', JSON.stringify(settings));
  
  // 广播设置变更
  window.electronAPI.broadcast('settings-changed', settings);
};

// 其他窗口应用设置
useWindowMessage('settings-changed', (settings) => {
  applyTheme(settings.theme);
  setNotifications(settings.notifications);
});
```

## 6. 调试技巧

### 消息日志

```typescript
// 在开发环境记录所有消息
useEffect(() => {
  if (import.meta.env.DEV && window.electronAPI) {
    const channels = ['test-message', 'user-login', 'settings-changed'];
    
    const cleanups = channels.map(channel =>
      window.electronAPI.onMessage(channel, (message) => {
        console.log(`[${channel}]`, {
          from: message.from,
          data: message.data,
          timestamp: new Date().toISOString()
        });
      })
    );

    return () => cleanups.forEach(cleanup => cleanup());
  }
}, []);
```

### 监听应用状态

```typescript
// 主进程每30秒广播应用状态
useEffect(() => {
  const cleanup = window.electronAPI?.on('app-status', (status) => {
    console.log('活动窗口:', status.activeWindows);
    console.log('时间戳:', new Date(status.timestamp).toLocaleString());
  });

  return cleanup;
}, []);
```

## 7. 最佳实践

### ✅ 推荐做法

1. **总是清理监听器**
   ```typescript
   useEffect(() => {
     const cleanup = window.electronAPI.onMessage('event', handler);
     return cleanup;  // ✅
   }, []);
   ```

2. **使用有意义的频道名**
   ```typescript
   // ✅ 好的命名
   'user-logged-in'
   'message-sent'
   'settings-updated'
   
   // ❌ 差的命名
   'event1'
   'data'
   'msg'
   ```

3. **数据验证**
   ```typescript
   useWindowMessage('user-data', (data) => {
     if (!data.userId || !data.username) {
       console.error('Invalid user data');
       return;
     }
     setUser(data);
   });
   ```

4. **错误处理**
   ```typescript
   const sendMessage = async () => {
     try {
       window.electronAPI.sendTo('im', 'test', data);
     } catch (error) {
       console.error('Failed to send message:', error);
       showError('消息发送失败');
     }
   };
   ```

### ❌ 避免做法

1. **不清理监听器**
   ```typescript
   // ❌ 内存泄漏
   useEffect(() => {
     window.electronAPI.onMessage('event', handler);
     // 没有 return cleanup
   }, []);
   ```

2. **循环消息**
   ```typescript
   // ❌ 可能导致无限循环
   useWindowMessage('ping', () => {
     window.electronAPI.broadcast('ping', {});
   });
   ```

3. **过度使用广播**
   ```typescript
   // ❌ 不需要所有窗口都知道
   window.electronAPI.broadcast('im-typing', {});
   
   // ✅ 只发送给需要的窗口
   window.electronAPI.sendTo('im', 'user-typing', {});
   ```

## 8. 类型安全

创建 `src/types/window.d.ts`：

```typescript
import type { WindowType } from '@wechat-boom/main/src/WindowManager';

interface WindowMessage {
  from: WindowType;
  data: any;
}

declare global {
  interface Window {
    electronAPI: {
      openWindow: (type: WindowType) => Promise<{ success: boolean }>;
      closeWindow: (type: WindowType) => Promise<{ success: boolean }>;
      sendTo: (to: WindowType, channel: string, data: any) => void;
      broadcast: (channel: string, data: any) => void;
      onMessage: (
        channel: string,
        callback: (message: WindowMessage) => void
      ) => () => void;
      on: (
        channel: string,
        callback: (...args: any[]) => void
      ) => () => void;
    };
  }
}

export {};
```

## 需要帮助？

- 完整文档: [COMMUNICATION.md](packages/main/COMMUNICATION.md)
- 示例代码: 查看 `packages/im-window/src/App.tsx`
- 架构说明: 查看 `packages/main/src/WindowManager.ts`
