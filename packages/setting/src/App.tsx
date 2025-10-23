import { useState, useEffect } from 'react';
import type { ElectronAPI, WindowMessage, WindowType } from '../types/electron';
import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const electronAPI = window.electronAPI as ElectronAPI | undefined;

    if (electronAPI) {
      // 监听测试消息
      const cleanup1 = electronAPI.onMessage('test-message', (message: WindowMessage) => {
        setMessages(prev => [...prev, `收到来自 ${message.from} 的消息: ${message.data.text}`]);
      });

      // 注册慢速操作处理器（用于测试超时）
      const cleanup2 = electronAPI.onRequest('slow-operation', async (_data: unknown, from: WindowType) => {
        setMessages(prev => [...prev, `收到来自 ${from} 的慢速请求...`]);
        
        // 模拟3秒的长时间操作
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return { completed: true, duration: 3000 };
      });

      // 注册设置请求处理器
      const cleanup3 = electronAPI.onRequest('get-settings', async (_data: unknown, from: WindowType) => {
        setMessages(prev => [...prev, `收到来自 ${from} 的设置请求`]);
        
        return {
          theme,
          notifications,
          autoStart,
          timestamp: Date.now()
        };
      });

      return () => {
        cleanup1();
        cleanup2();
        cleanup3();
      };
    }
  }, [theme, notifications, autoStart]);

  const handleSave = () => {
    const settings = {
      theme,
      notifications,
      autoStart
    };
    console.log('保存设置:', settings);
    
    // 广播设置变更到所有窗口
    if (window.electronAPI) {
      window.electronAPI.broadcast('setting-changed', settings);
      setMessages(prev => [...prev, `已广播设置更新`]);
    }
    
    alert('设置已保存并通知其他窗口！');
  };

  return (
    <div className="settings-app">
      <header className="settings-header">
        <h1>⚙️ 设置</h1>
      </header>
      
      <main className="settings-content">
        <section className="setting-section">
          <h2>外观</h2>
          <div className="setting-item">
            <label htmlFor="theme">主题</label>
            <select 
              id="theme" 
              value={theme} 
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </section>

        <section className="setting-section">
          <h2>通知</h2>
          <div className="setting-item">
            <label htmlFor="notifications">
              <input
                type="checkbox"
                id="notifications"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              启用通知
            </label>
          </div>
        </section>

        <section className="setting-section">
          <h2>系统</h2>
          <div className="setting-item">
            <label htmlFor="autoStart">
              <input
                type="checkbox"
                id="autoStart"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
              />
              开机自动启动
            </label>
          </div>
        </section>

        <div className="setting-actions">
          <button className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
          <button className="btn-secondary" onClick={() => window.close()}>
            关闭
          </button>
        </div>

        {messages.length > 0 && (
          <section className="setting-section">
            <h2>通信记录</h2>
            <div className="message-list">
              {messages.map((msg, index) => (
                <div key={index} className="message-item">
                  {msg}
                </div>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setMessages([])}>
              清空记录
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
