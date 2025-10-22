# 窗口通信机制文档

## 架构概述

本项目实现了一套完整的窗口管理和通信机制，主进程作为消息转发中心，支持：
- **点对点通信**：窗口间直接消息传递（单向）
- **广播通信**：向所有窗口广播消息
- **请求-响应模式**：基于 Promise 的异步请求-响应（支持超时）

### 核心组件

- **WindowManager**: 窗口管理器类，负责窗口的创建、销毁和消息路由
- **Preload Script**: 安全的 IPC 通信桥梁，暴露通信 API 给渲染进程
- **Main Process**: 主进程作为消息中心，转发和广播消息

## 窗口类型

```typescript
type WindowType = 'main' | 'im' | 'setting';
```

- `main`: 主窗口（端口 5173）
- `im`: IM 聊天窗口（端口 5173）
- `setting`: 设置窗口（端口 5174）

## API 使用说明

### 1. 窗口管理

#### 打开窗口

```typescript
// 打开 IM 窗口
const result = await window.electronAPI.openWindow('im');
if (result.success) {
  console.log('窗口打开成功');
}

// 兼容旧 API
await window.electronAPI.openIMWindow();
await window.electronAPI.openSettingWindow();
```

#### 关闭窗口

```typescript
await window.electronAPI.closeWindow('setting');
```

### 2. 窗口间通信（单向）

#### 点对点通信

从一个窗口发送消息到另一个特定窗口：

```typescript
// 在 main 窗口中发送消息到 im 窗口
window.electronAPI.sendTo('im', 'user-login', {
  userId: '12345',
  username: 'John Doe'
});
```

#### 接收消息

在目标窗口中监听消息：

```typescript
// 在 im 窗口中监听 user-login 消息
const cleanup = window.electronAPI.onMessage('user-login', (message) => {
  console.log('收到来自', message.from, '的消息:', message.data);
  // message.from: 'main'
  // message.data: { userId: '12345', username: 'John Doe' }
});

// 组件卸载时清理监听器
cleanup();
```

#### 广播消息

向所有其他窗口广播消息（不包括发送者）：

```typescript
// 在 setting 窗口中广播主题变更
window.electronAPI.broadcast('theme-changed', {
  theme: 'dark'
});
```

#### 监听广播消息

```typescript
// 在其他窗口中监听主题变更
const cleanup = window.electronAPI.onMessage('theme-changed', (message) => {
  console.log('主题已变更为:', message.data.theme);
  // 更新当前窗口主题
});
```

### 3. 请求-响应模式（Promise 异步）

#### 发送请求并等待响应

```typescript
// 从 main 窗口请求 im 窗口的用户信息
try {
  const userInfo = await window.electronAPI.request(
    'im',                    // 目标窗口
    'get-user-info',         // 请求频道
    { userId: 123 },         // 请求数据
    { timeout: 5000 }        // 可选：超时配置（毫秒）
  );
  
  console.log('用户信息:', userInfo);
  // 响应数据: { userId: 123, username: 'John', email: 'john@example.com' }
} catch (error) {
  console.error('请求失败:', error.message);
  // 可能是超时或目标窗口返回错误
}
```

#### 注册请求处理器

在目标窗口注册处理器来响应请求：

```typescript
// 在 im 窗口注册处理器
const cleanup = window.electronAPI.onRequest('get-user-info', async (data, from) => {
  console.log('收到来自', from, '的请求:', data);
  
  // 执行异步操作
  const user = await fetchUserFromDB(data.userId);
  
  // 返回响应数据
  return {
    userId: user.id,
    username: user.name,
    email: user.email
  };
});

// 组件卸载时清理
cleanup();
```

#### 错误处理

处理器可以抛出错误，请求方会收到错误：

```typescript
// 处理器
window.electronAPI.onRequest('risky-operation', async (data) => {
  if (!data.isValid) {
    throw new Error('Invalid data provided');
  }
  return { success: true };
});

// 请求方
try {
  await window.electronAPI.request('im', 'risky-operation', { isValid: false });
} catch (error) {
  console.error(error.message); // "Invalid data provided"
}
```

#### 超时配置

默认超时为 30 秒，可以自定义：

```typescript
// 5秒超时
await window.electronAPI.request('im', 'quick-task', {}, { timeout: 5000 });

// 1分钟超时
await window.electronAPI.request('setting', 'slow-task', {}, { timeout: 60000 });

// 超时会抛出错误
try {
  await window.electronAPI.request('im', 'task', {}, { timeout: 1000 });
} catch (error) {
  console.error(error.message); // "Request timeout after 1000ms"
}
```

### 4. React 中的使用

#### 单向消息示例

```typescript
import { useEffect, useState } from 'react';

function ChatComponent() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // 监听新消息
    const cleanup = window.electronAPI.onMessage('new-message', (message) => {
      setMessages(prev => [...prev, message.data]);
    });

    // 组件卸载时清理
    return cleanup;
  }, []);

  const sendMessage = (text: string) => {
    // 发送消息到 IM 窗口
    window.electronAPI.sendTo('im', 'send-message', {
      text,
      timestamp: Date.now()
    });
  };

  return (
    <div>
      {/* UI 代码 */}
    </div>
  );
}
```

#### 请求-响应示例

```typescript
import { useState } from 'react';

function UserInfoComponent() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const info = await window.electronAPI.request(
        'im',
        'get-user-info',
        { userId: 123 },
        { timeout: 5000 }
      );
      setUserInfo(info);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchUserInfo} disabled={loading}>
        {loading ? '加载中...' : '获取用户信息'}
      </button>
      {error && <div>错误: {error}</div>}
      {userInfo && <div>用户: {userInfo.username}</div>}
    </div>
  );
}
```

#### 注册请求处理器

```typescript
import { useEffect } from 'react';

function DataProviderComponent() {
  const [userData, setUserData] = useState({
    userId: 123,
    username: 'John',
    email: 'john@example.com'
  });

  useEffect(() => {
    // 注册请求处理器
    const cleanup = window.electronAPI.onRequest('get-user-info', async (data, from) => {
      console.log(`收到来自 ${from} 的请求`);
      
      // 返回当前数据
      return userData;
    });

    return cleanup;
  }, [userData]);

  return <div>{/* UI */}</div>;
}
```

#### 自定义 Hook

##### 消息监听 Hook

```typescript
import { useEffect, useCallback } from 'react';

// 监听窗口消息的 Hook
function useWindowMessage<T = any>(
  channel: string,
  callback: (data: T, from: WindowType) => void
) {
  useEffect(() => {
    const cleanup = window.electronAPI.onMessage(channel, (message) => {
      callback(message.data, message.from);
    });
    return cleanup;
  }, [channel, callback]);
}

// 发送消息的 Hook
function useWindowSender() {
  const sendTo = useCallback((to: WindowType, channel: string, data: any) => {
    window.electronAPI.sendTo(to, channel, data);
  }, []);

  const broadcast = useCallback((channel: string, data: any) => {
    window.electronAPI.broadcast(channel, data);
  }, []);

  return { sendTo, broadcast };
}
```

##### 请求-响应 Hook

```typescript
import { useState, useCallback } from 'react';

// 发送请求的 Hook
function useWindowRequest<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const request = useCallback(async (
    to: WindowType,
    channel: string,
    requestData: any,
    options?: { timeout?: number }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.request(to, channel, requestData, options);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { request, loading, error, data, reset };
}

// 注册请求处理器的 Hook
function useRequestHandler<T = any>(
  channel: string,
  handler: (data: any, from: WindowType) => Promise<T> | T
) {
  useEffect(() => {
    const cleanup = window.electronAPI.onRequest(channel, handler);
    return cleanup;
  }, [channel, handler]);
}

// 使用示例
function MyComponent() {
  const { sendTo, broadcast } = useWindowSender();
  const { request, loading, error, data } = useWindowRequest();

  // 监听用户状态更新
  useWindowMessage('user-status', (data, from) => {
    console.log(`用户状态从 ${from} 更新:`, data);
  });

  // 注册请求处理器
  useRequestHandler('get-data', async (data, from) => {
    return { result: 'some data', timestamp: Date.now() };
  });

  const handleFetchUser = async () => {
    try {
      await request('im', 'get-user-info', { userId: 123 }, { timeout: 5000 });
      console.log('用户数据:', data);
    } catch (err) {
      console.error('请求失败:', error);
    }
  };

  const handleSave = () => {
    broadcast('settings-updated', { theme: 'dark' });
  };

  return (
    <div>
      <button onClick={handleFetchUser} disabled={loading}>
        {loading ? '加载中...' : '获取用户'}
      </button>
      <button onClick={handleSave}>保存设置</button>
      {error && <div>错误: {error}</div>}
      {data && <div>数据: {JSON.stringify(data)}</div>}
    </div>
  );
}
```

### 4. 应用级事件

主进程会定期广播应用状态：

```typescript
// 监听应用状态（每30秒更新）
window.electronAPI.on('app-status', (data) => {
  console.log('活动窗口:', data.activeWindows);
  console.log('时间戳:', data.timestamp);
});
```

## 通信场景示例

### 场景 1: 用户登录（广播）

```typescript
// 在 main 窗口登录成功后
window.electronAPI.broadcast('user-logged-in', {
  userId: user.id,
  username: user.name,
  avatar: user.avatar
});

// 在 im 窗口和 setting 窗口接收
window.electronAPI.onMessage('user-logged-in', (message) => {
  updateUserState(message.data);
});
```

### 场景 2: 设置同步（广播）

```typescript
// 在 setting 窗口更改设置
const handleSettingChange = (key: string, value: any) => {
  // 保存设置
  saveSettings(key, value);
  
  // 广播设置变更
  window.electronAPI.broadcast('setting-changed', { key, value });
};

// 在其他窗口同步设置
window.electronAPI.onMessage('setting-changed', (message) => {
  const { key, value } = message.data;
  applySettings(key, value);
});
```

### 场景 3: 实时通知（广播）

```typescript
// 在 im 窗口收到新消息
const handleNewMessage = (msg: Message) => {
  // 通知其他窗口
  window.electronAPI.broadcast('notification', {
    type: 'message',
    title: msg.sender,
    body: msg.content
  });
};

// 在 main 窗口显示通知
window.electronAPI.onMessage('notification', (message) => {
  showNotification(message.data);
});
```

### 场景 4: 数据请求（请求-响应）

```typescript
// 在 main 窗口请求 IM 窗口的聊天记录
const fetchChatHistory = async (userId: string) => {
  try {
    const history = await window.electronAPI.request(
      'im',
      'get-chat-history',
      { userId, limit: 50 },
      { timeout: 10000 }
    );
    
    displayChatHistory(history);
  } catch (error) {
    console.error('获取聊天记录失败:', error.message);
  }
};

// 在 IM 窗口处理请求
window.electronAPI.onRequest('get-chat-history', async (data) => {
  const { userId, limit } = data;
  const messages = await database.getChatHistory(userId, limit);
  return messages;
});
```

### 场景 5: 表单验证（请求-响应）

```typescript
// 在 setting 窗口验证用户名是否可用
const checkUsername = async (username: string) => {
  setValidating(true);
  
  try {
    const result = await window.electronAPI.request(
      'main',
      'validate-username',
      { username },
      { timeout: 3000 }
    );
    
    if (result.available) {
      setUsernameStatus('可用');
    } else {
      setUsernameStatus('已被使用');
    }
  } catch (error) {
    setUsernameStatus('验证失败');
  } finally {
    setValidating(false);
  }
};

// 在 main 窗口处理验证
window.electronAPI.onRequest('validate-username', async (data) => {
  const { username } = data;
  const available = await checkUsernameInDatabase(username);
  return { available, username };
});
```

### 场景 6: 文件操作（请求-响应 + 超时）

```typescript
// 请求导出大文件（长时间操作）
const exportData = async () => {
  try {
    setExporting(true);
    
    const result = await window.electronAPI.request(
      'im',
      'export-chat-data',
      { format: 'json', includeMedia: true },
      { timeout: 120000 } // 2分钟超时
    );
    
    showSuccess(`导出成功: ${result.filePath}`);
  } catch (error) {
    if (error.message.includes('timeout')) {
      showError('导出超时，请稍后重试');
    } else {
      showError(`导出失败: ${error.message}`);
    }
  } finally {
    setExporting(false);
  }
};

// 处理导出请求
window.electronAPI.onRequest('export-chat-data', async (data) => {
  const { format, includeMedia } = data;
  
  // 长时间操作
  const filePath = await exportDataToFile(format, includeMedia);
  
  return { filePath, size: getFileSize(filePath) };
});
```

## 最佳实践

### 通用实践

1. **总是清理监听器**: 使用 React useEffect 时记得返回 cleanup 函数
   ```typescript
   useEffect(() => {
     const cleanup = window.electronAPI.onMessage('event', handler);
     return cleanup; // ✅ 清理
   }, []);
   ```

2. **使用有意义的 channel 名称**: 如 `user-login`, `get-user-info` 等
   ```typescript
   // ✅ 好的命名
   'user-logged-in', 'get-chat-history', 'validate-email'
   
   // ❌ 差的命名
   'event1', 'data', 'msg'
   ```

3. **数据验证**: 接收消息时验证数据结构
   ```typescript
   window.electronAPI.onMessage('user-data', (message) => {
     if (!message.data.userId || !message.data.username) {
       console.error('Invalid user data');
       return;
     }
     setUser(message.data);
   });
   ```

4. **避免循环消息**: 注意消息流向，避免产生无限循环
   ```typescript
   // ❌ 会导致无限循环
   window.electronAPI.onMessage('ping', () => {
     window.electronAPI.broadcast('ping', {});
   });
   ```

### 请求-响应特定实践

5. **设置合理的超时时间**
   ```typescript
   // 快速操作：1-5秒
   await window.electronAPI.request('im', 'quick-check', {}, { timeout: 3000 });
   
   // 普通操作：5-30秒（默认30秒）
   await window.electronAPI.request('setting', 'fetch-config', {});
   
   // 长时间操作：30秒-数分钟
   await window.electronAPI.request('im', 'export-data', {}, { timeout: 120000 });
   ```

6. **始终处理错误和超时**
   ```typescript
   try {
     const result = await window.electronAPI.request('im', 'get-data', {});
   } catch (error) {
     if (error.message.includes('timeout')) {
       showError('操作超时，请稍后重试');
     } else if (error.message.includes('not found')) {
       showError('目标窗口未打开');
     } else {
       showError(`操作失败: ${error.message}`);
     }
   }
   ```

7. **请求处理器应快速响应或明确超时**
   ```typescript
   // ✅ 快速操作
   window.electronAPI.onRequest('get-status', () => {
     return { status: 'online', timestamp: Date.now() };
   });
   
   // ✅ 长时间操作应该提示调用方设置更长超时
   window.electronAPI.onRequest('process-large-file', async (data) => {
     // 注释说明：此操作可能需要60秒，调用方应设置 timeout: 60000
     return await processFile(data.filePath);
   });
   ```

8. **使用 loading 状态**
   ```typescript
   const [loading, setLoading] = useState(false);
   
   const handleRequest = async () => {
     setLoading(true);
     try {
       const result = await window.electronAPI.request('im', 'fetch-data', {});
       setData(result);
     } catch (error) {
       setError(error.message);
     } finally {
       setLoading(false); // ✅ 始终清理 loading 状态
     }
   };
   ```

9. **区分单向消息和请求-响应**
   - 单向消息：用于通知、事件广播、不需要响应的场景
   - 请求-响应：用于需要获取数据、需要确认结果的场景
   
   ```typescript
   // ✅ 通知 - 使用 sendTo/broadcast
   window.electronAPI.broadcast('user-status-changed', { status: 'away' });
   
   // ✅ 数据请求 - 使用 request
   const userData = await window.electronAPI.request('im', 'get-user-data', {});
   ```

10. **处理器中的错误处理**
    ```typescript
    window.electronAPI.onRequest('validate-data', async (data) => {
      // ✅ 明确的错误消息
      if (!data.email) {
        throw new Error('Email is required');
      }
      
      if (!isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
      
      return { valid: true };
    });
    ```

## 调试技巧

```typescript
// 监听所有消息（开发环境）
if (isDev) {
  window.electronAPI.on('*', (...args) => {
    console.log('收到消息:', args);
  });
}
```

## 类型安全

将 `electron-api.d.ts` 复制到渲染进程项目的 `src/types` 目录：

```typescript
// src/types/electron-api.d.ts
import type { ElectronAPI } from '@wechat-boom/main/src/types/electron-api';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```
