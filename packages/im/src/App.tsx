import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { ElectronAPI, WindowMessage, WindowType } from '../types/electron';
import { appRoutes } from './routes';
import './App.css';

const viewTitles: Record<string, string> = {
  chat: '聊天',
  contacts: '通讯录',
  discover: '发现',
  moments: '朋友圈',
  files: '文件',
  favorites: '收藏',
};

const getViewFromPath = (pathname: string) => {
  const trimmed = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  return trimmed || 'chat';
};

function App() {
  const [count, setCount] = useState(0);
  const [pongMessage, setPongMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('Hello from IM window!');
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = getViewFromPath(location.pathname);
  const electronAPI = useMemo(() => window.electronAPI as ElectronAPI | undefined, []);

  useEffect(() => {
    // Check if running in Electron
    if (electronAPI) {
      console.log('Running in Electron');
      
      // 监听侧边栏的视图切换
      const cleanup0 = electronAPI.onMessage('switch-view', (message: WindowMessage) => {
        console.log('视图切换到:', message.data.view);
        if (message.data?.view) {
          navigate(`/${message.data.view}`);
        }
        setMessages(prev => [...prev, `视图切换到: ${message.data.view}`]);
      });

      // 监听来自其他窗口的测试消息
      const cleanup1 = electronAPI.onMessage('test-message', (message: WindowMessage) => {
        setMessages(prev => [...prev, `来自 ${message.from}: ${message.data.text}`]);
      });
      
      // 监听广播的设置变更
      const cleanup2 = electronAPI.onMessage('setting-changed', (message: WindowMessage) => {
        setMessages(prev => [...prev, `设置更新 (来自 ${message.from}): ${JSON.stringify(message.data)}`]);
      });
      
      // 监听应用状态
      const cleanup3 = electronAPI.on('app-status', (data) => {
        console.log('应用状态更新:', data);
      });

      // 注册请求处理器：处理来自其他窗口的数据请求
      const cleanup4 = electronAPI.onRequest('get-user-info', async (_data: unknown, from: WindowType) => {
        setMessages(prev => [...prev, `收到来自 ${from} 的请求: get-user-info`]);
        
        // 模拟异步获取数据
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          userId: 12345,
          username: 'John Doe',
          email: 'john@example.com',
          timestamp: Date.now()
        };
      });

      // 注册另一个请求处理器
      const cleanup5 = electronAPI.onRequest('calculate', async (data: { a: number; b: number; operation: string }, from: WindowType) => {
        const { a, b, operation } = data;
        setMessages(prev => [...prev, `收到来自 ${from} 的计算请求: ${a} ${operation} ${b}`]);
        
        let result;
        switch (operation) {
          case '+': result = a + b; break;
          case '-': result = a - b; break;
          case '*': result = a * b; break;
          case '/': result = b !== 0 ? a / b : 'Error: Division by zero'; break;
          default: throw new Error('Unknown operation');
        }
        
        return { result, timestamp: Date.now() };
      });
      
      return () => {
        cleanup0();
        cleanup1();
        cleanup2();
        cleanup3();
        cleanup4();
        cleanup5();
      };
    } else {
      console.log('Running in browser');
    }
  }, [electronAPI, navigate]);

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/chat', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handlePing = async () => {
    if (electronAPI?.ping) {
      const result = await electronAPI.ping();
      setPongMessage(`Electron responded: ${result}`);
    } else {
      setPongMessage('Not running in Electron');
    }
  };

  const handleOpenIMWindow = async () => {
    if (electronAPI?.openIMWindow) {
      await electronAPI.openIMWindow();
    }
  };

  const handleOpenSettingWindow = async () => {
    if (electronAPI?.openSettingWindow) {
      await electronAPI.openSettingWindow();
    }
  };

  const handleSendToSetting = () => {
    if (electronAPI) {
      electronAPI.sendTo('setting', 'test-message', {
        text: testMessage,
        timestamp: Date.now()
      });
      setMessages(prev => [...prev, `已发送到 setting: ${testMessage}`]);
    }
  };

  const handleBroadcast = () => {
    if (electronAPI) {
      electronAPI.broadcast('test-message', {
        text: testMessage,
        timestamp: Date.now()
      });
      setMessages(prev => [...prev, `已广播消息: ${testMessage}`]);
    }
  };

  const handleRequestUserInfo = async () => {
    if (electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 请求 IM 窗口的用户信息...']);
        const result = await electronAPI.request('im', 'get-user-info', {}, { timeout: 5000 });
        setMessages(prev => [...prev, `✅ 收到响应: ${JSON.stringify(result)}`]);
      } catch (error: any) {
        setMessages(prev => [...prev, `❌ 请求失败: ${error.message}`]);
      }
    }
  };

  const handleRequestCalculation = async () => {
    if (electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 请求计算 10 + 20...']);
        const result = await electronAPI.request(
          'im',
          'calculate',
          { a: 10, b: 20, operation: '+' },
          { timeout: 3000 }
        );
        setMessages(prev => [...prev, `✅ 计算结果: ${result.result}`]);
      } catch (error: any) {
        setMessages(prev => [...prev, `❌ 计算失败: ${error.message}`]);
      }
    }
  };

  const handleRequestTimeout = async () => {
    if (electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 测试超时请求（1秒超时）...']);
        await electronAPI.request(
          'setting',
          'slow-operation',
          {},
          { timeout: 1000 }
        );
      } catch (error: any) {
        setMessages(prev => [...prev, `⏱️ 预期超时: ${error.message}`]);
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>WeChatBoom - {viewTitles[currentView] || '未知视图'}</h1>
        
        <div className="card">
          <h3>窗口管理</h3>
          <div className="button-group">
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <button onClick={handlePing}>
              Test Ping
            </button>
            <button onClick={handleOpenIMWindow}>
              Open IM Window
            </button>
            <button onClick={handleOpenSettingWindow}>
              Open Settings
            </button>
          </div>
          {pongMessage && <p className="message">{pongMessage}</p>}
        </div>

        <div className="card">
          <h3>窗口间通信</h3>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="输入测试消息"
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
          />
          <div className="button-group">
            <button onClick={handleSendToSetting}>
              📤 发送到 Setting 窗口
            </button>
            <button onClick={handleBroadcast}>
              📢 广播到所有窗口
            </button>
          </div>
        </div>

        <div className="card">
          <h3>🔄 Promise 请求-响应</h3>
          <div className="button-group">
            <button onClick={handleRequestUserInfo}>
              📋 请求用户信息
            </button>
            <button onClick={handleRequestCalculation}>
              🧮 请求计算 (10 + 20)
            </button>
            <button onClick={handleRequestTimeout}>
              ⏱️ 测试超时 (1秒)
            </button>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="card">
            <h3>消息记录</h3>
            <div className="message-list">
              {messages.map((msg, index) => (
                <p key={index} className="message">{msg}</p>
              ))}
            </div>
            <button onClick={() => setMessages([])}>清空记录</button>
          </div>
        )}

        <div className="content">
          <Routes>
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </div>

        <p className="description">
          使用 React + TypeScript + Vite + Electron
        </p>
      </header>
    </div>
  );
}

export default App;
