import { useState, useEffect } from 'react';
import './App.css';

type WindowType = 'main' | 'im' | 'setting';

interface WindowMessage {
  from: WindowType;
  data: any;
}

interface RequestOptions {
  timeout?: number;
}

declare global {
  interface Window {
    electronAPI?: {
      openWindow: (type: WindowType) => Promise<{ success: boolean }>;
      closeWindow: (type: WindowType) => Promise<{ success: boolean }>;
      sendTo: (to: WindowType, channel: string, data: any) => void;
      broadcast: (channel: string, data: any) => void;
      request: (to: WindowType, channel: string, data: any, options?: RequestOptions) => Promise<any>;
      onRequest: (channel: string, handler: (data: any, from: WindowType) => Promise<any> | any) => () => void;
      onMessage: (channel: string, callback: (message: WindowMessage) => void) => () => void;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      openIMWindow: () => Promise<void>;
      openSettingWindow: () => Promise<void>;
      ping: () => Promise<string>;
    };
  }
}

function App() {
  const [count, setCount] = useState(0);
  const [pongMessage, setPongMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('Hello from IM window!');
  const [currentView, setCurrentView] = useState('chat');

  useEffect(() => {
    // Check if running in Electron
    if (window.electronAPI) {
      console.log('Running in Electron');
      
      // 监听侧边栏的视图切换
      const cleanup0 = window.electronAPI.onMessage('switch-view', (message) => {
        setCurrentView(message.data.view);
        setMessages(prev => [...prev, `视图切换到: ${message.data.view}`]);
      });

      // 监听来自其他窗口的测试消息
      const cleanup1 = window.electronAPI.onMessage('test-message', (message) => {
        setMessages(prev => [...prev, `来自 ${message.from}: ${message.data.text}`]);
      });
      
      // 监听广播的设置变更
      const cleanup2 = window.electronAPI.onMessage('setting-changed', (message) => {
        setMessages(prev => [...prev, `设置更新 (来自 ${message.from}): ${JSON.stringify(message.data)}`]);
      });
      
      // 监听应用状态
      const cleanup3 = window.electronAPI.on('app-status', (data) => {
        console.log('应用状态更新:', data);
      });

      // 注册请求处理器：处理来自其他窗口的数据请求
      const cleanup4 = window.electronAPI.onRequest('get-user-info', async (_data, from) => {
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
      const cleanup5 = window.electronAPI.onRequest('calculate', async (data, from) => {
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
  }, []);

  const handlePing = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.ping();
      setPongMessage(`Electron responded: ${result}`);
    } else {
      setPongMessage('Not running in Electron');
    }
  };

  const handleOpenIMWindow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openIMWindow();
    }
  };

  const handleOpenSettingWindow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openSettingWindow();
    }
  };

  const handleSendToSetting = () => {
    if (window.electronAPI) {
      window.electronAPI.sendTo('setting', 'test-message', {
        text: testMessage,
        timestamp: Date.now()
      });
      setMessages(prev => [...prev, `已发送到 setting: ${testMessage}`]);
    }
  };

  const handleBroadcast = () => {
    if (window.electronAPI) {
      window.electronAPI.broadcast('test-message', {
        text: testMessage,
        timestamp: Date.now()
      });
      setMessages(prev => [...prev, `已广播消息: ${testMessage}`]);
    }
  };

  const handleRequestUserInfo = async () => {
    if (window.electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 请求 IM 窗口的用户信息...']);
        const result = await window.electronAPI.request('im', 'get-user-info', {}, { timeout: 5000 });
        setMessages(prev => [...prev, `✅ 收到响应: ${JSON.stringify(result)}`]);
      } catch (error: any) {
        setMessages(prev => [...prev, `❌ 请求失败: ${error.message}`]);
      }
    }
  };

  const handleRequestCalculation = async () => {
    if (window.electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 请求计算 10 + 20...']);
        const result = await window.electronAPI.request(
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
    if (window.electronAPI) {
      try {
        setMessages(prev => [...prev, '⏳ 测试超时请求（1秒超时）...']);
        await window.electronAPI.request(
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
        <h1>WeChatBoom - {currentView === 'chat' ? '聊天' : 
             currentView === 'contacts' ? '通讯录' :
             currentView === 'discover' ? '发现' :
             currentView === 'moments' ? '朋友圈' :
             currentView === 'files' ? '文件' :
             currentView === 'favorites' ? '收藏' : '未知视图'}</h1>
        
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

        <p className="description">
          使用 React + TypeScript + Vite + Electron
        </p>
      </header>
    </div>
  );
}

export default App;
