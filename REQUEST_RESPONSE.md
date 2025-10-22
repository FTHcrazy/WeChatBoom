# Promise 请求-响应机制

## 概述

除了单向消息传递，本项目还实现了基于 Promise 的请求-响应机制，支持：
- ✅ **异步等待响应**：使用 `async/await` 语法
- ✅ **超时控制**：可配置超时时间，默认 30 秒
- ✅ **错误处理**：自动传递错误信息
- ✅ **类型安全**：完整的 TypeScript 类型支持

## 快速开始

### 1. 发送请求

```typescript
// 从窗口 A 请求窗口 B 的数据
try {
  const result = await window.electronAPI.request(
    'im',                    // 目标窗口
    'get-user-info',         // 请求频道
    { userId: 123 },         // 请求数据
    { timeout: 5000 }        // 可选：5秒超时
  );
  
  console.log('用户信息:', result);
} catch (error) {
  console.error('请求失败:', error.message);
}
```

### 2. 注册处理器

```typescript
// 在窗口 B 注册处理器
useEffect(() => {
  const cleanup = window.electronAPI.onRequest('get-user-info', async (data, from) => {
    console.log(`收到来自 ${from} 的请求`);
    
    // 执行异步操作
    const user = await fetchUser(data.userId);
    
    // 返回响应
    return {
      userId: user.id,
      username: user.name,
      email: user.email
    };
  });

  return cleanup; // 清理监听器
}, []);
```

## API 参考

### window.electronAPI.request()

发送请求并等待响应。

```typescript
request(
  to: WindowType,           // 目标窗口：'main' | 'im' | 'setting'
  channel: string,          // 请求频道
  data: any,                // 请求数据
  options?: RequestOptions  // 可选配置
): Promise<any>
```

**参数：**
- `to`: 目标窗口类型
- `channel`: 请求频道名称
- `data`: 发送的数据
- `options.timeout`: 超时时间（毫秒），默认 30000

**返回：**
- Promise，resolve 为响应数据，reject 为错误

**抛出：**
- 超时错误：`Request timeout after {ms}ms`
- 目标不存在：`Window {type} not found or not ready`
- 处理器错误：处理器抛出的错误消息

### window.electronAPI.onRequest()

注册请求处理器。

```typescript
onRequest(
  channel: string,
  handler: (data: any, from: WindowType) => Promise<any> | any
): () => void
```

**参数：**
- `channel`: 监听的频道名称
- `handler`: 处理函数
  - `data`: 请求数据
  - `from`: 请求来源窗口
  - 返回值：响应数据（可以是 Promise）

**返回：**
- 清理函数，调用后移除监听器

## 完整示例

### 示例 1：获取数据

```typescript
// 请求方（Main 窗口）
const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.request(
        'im',
        'get-users',
        { limit: 10 },
        { timeout: 5000 }
      );
      setUsers(result.users);
    } catch (error) {
      console.error('加载失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={loadUsers} disabled={loading}>
      {loading ? '加载中...' : '加载用户'}
    </button>
  );
};

// 响应方（IM 窗口）
useEffect(() => {
  const cleanup = window.electronAPI.onRequest('get-users', async (data) => {
    const users = await database.getUsers(data.limit);
    return { users, total: users.length };
  });

  return cleanup;
}, []);
```

### 示例 2：表单验证

```typescript
// 请求方（Setting 窗口）
const UsernameInput = () => {
  const [username, setUsername] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = async (value: string) => {
    if (!value) return;
    
    setValidating(true);
    setError('');
    
    try {
      const result = await window.electronAPI.request(
        'main',
        'validate-username',
        { username: value },
        { timeout: 3000 }
      );
      
      if (!result.available) {
        setError('用户名已被使用');
      }
    } catch (err: any) {
      setError('验证失败');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={() => validateUsername(username)}
      />
      {validating && <span>验证中...</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
};

// 响应方（Main 窗口）
useEffect(() => {
  const cleanup = window.electronAPI.onRequest('validate-username', async (data) => {
    const available = await checkUsername(data.username);
    return { available };
  });

  return cleanup;
}, []);
```

### 示例 3：长时间操作

```typescript
// 请求方
const ExportButton = () => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      const result = await window.electronAPI.request(
        'im',
        'export-data',
        { format: 'json' },
        { timeout: 120000 } // 2分钟超时
      );
      
      alert(`导出成功: ${result.filePath}`);
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        alert('导出超时，请稍后重试');
      } else {
        alert(`导出失败: ${error.message}`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={exporting}>
      {exporting ? `导出中... ${progress}%` : '导出数据'}
    </button>
  );
};

// 响应方
useEffect(() => {
  const cleanup = window.electronAPI.onRequest('export-data', async (data) => {
    const filePath = await exportToFile(data.format);
    return { filePath, size: getFileSize(filePath) };
  });

  return cleanup;
}, []);
```

### 示例 4：错误处理

```typescript
// 响应方抛出错误
window.electronAPI.onRequest('risky-operation', async (data) => {
  if (!data.isValid) {
    throw new Error('Invalid data provided');
  }
  
  if (!hasPermission(data.userId)) {
    throw new Error('Permission denied');
  }
  
  return { success: true };
});

// 请求方捕获错误
try {
  await window.electronAPI.request('im', 'risky-operation', {
    isValid: false
  });
} catch (error: any) {
  console.error(error.message); // "Invalid data provided"
}
```

## 超时配置建议

| 操作类型 | 建议超时 | 示例 |
|---------|---------|------|
| 快速查询 | 1-5秒 | 获取缓存数据、状态查询 |
| 普通操作 | 5-30秒（默认） | 数据库查询、API 调用 |
| 长时间操作 | 30秒-5分钟 | 文件导出、大数据处理 |
| 超长操作 | 5分钟+ | 视频处理、批量操作 |

```typescript
// 快速操作
await window.electronAPI.request('im', 'get-status', {}, { timeout: 2000 });

// 普通操作（使用默认30秒）
await window.electronAPI.request('im', 'fetch-data', {});

// 长时间操作
await window.electronAPI.request('im', 'export-file', {}, { timeout: 120000 });
```

## 错误类型

| 错误 | 原因 | 解决方法 |
|------|------|---------|
| `Request timeout after {ms}ms` | 超时 | 增加超时时间或优化处理器性能 |
| `Window {type} not found or not ready` | 目标窗口不存在或未就绪 | 确保目标窗口已打开 |
| 自定义错误消息 | 处理器抛出错误 | 检查请求数据和处理器逻辑 |

## 与单向消息的对比

| 特性 | 单向消息 | 请求-响应 |
|------|---------|----------|
| API | `sendTo()` / `broadcast()` | `request()` |
| 响应 | 无 | 有（Promise） |
| 超时 | 无 | 支持 |
| 错误处理 | 手动 | 自动 |
| 使用场景 | 通知、事件广播 | 数据获取、操作确认 |
| 性能 | 更快（无需等待） | 需等待响应 |

## 最佳实践

1. **选择合适的通信方式**
   - 不需要响应 → 使用 `sendTo()` 或 `broadcast()`
   - 需要数据或确认 → 使用 `request()`

2. **设置合理超时**
   - 根据操作类型设置超时
   - 长时间操作明确告知调用方

3. **完善错误处理**
   - 始终使用 `try-catch`
   - 区分超时和其他错误
   - 提供友好的错误提示

4. **使用 loading 状态**
   - 请求期间禁用按钮
   - 显示加载指示器
   - finally 块中清理状态

5. **清理监听器**
   - 使用 `useEffect` 返回清理函数
   - 避免内存泄漏

## 调试技巧

```typescript
// 开发环境日志
if (import.meta.env.DEV) {
  // 记录所有请求
  const originalRequest = window.electronAPI.request;
  window.electronAPI.request = async (...args) => {
    console.log('📤 Request:', args);
    try {
      const result = await originalRequest(...args);
      console.log('✅ Response:', result);
      return result;
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  };
}
```

## 性能考虑

- 请求-响应比单向消息慢（需等待）
- 超时定时器会占用资源
- 大量并发请求可能影响性能
- 建议使用缓存减少重复请求

## 更多信息

- 完整文档：[COMMUNICATION.md](packages/main/COMMUNICATION.md)
- 架构说明：[WindowManager.ts](packages/main/src/WindowManager.ts)
- 示例代码：`packages/im-window/src/App.tsx`
