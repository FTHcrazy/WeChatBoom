import { useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import type { ElectronAPI, WindowMessage } from '../types/electron';
import { appRoutes } from './routes';
import './App.css';

const viewTitles: Record<string, string> = {
  chat: '聊天',
  contact: '通讯录',
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
      });





      // 监听应用状态
      const cleanup3 = electronAPI.on('app-status', (data) => {
        console.log('应用状态更新:', data);
      });

      return () => {
        cleanup0();
        cleanup3();
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>WeChatBoom - {viewTitles[currentView] || '未知视图'}</h1>
      </header>
      <div className="content w-full h-full">
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </div>
    </div>
  );
}

export default App;
