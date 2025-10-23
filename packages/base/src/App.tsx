import { useEffect, useMemo, useState } from 'react';
import type { ElectronAPI, WindowMessage } from '../types/electron';

import './index.css';

type ViewKey = 'chat' | 'contacts' | 'discover' | 'moments' | 'files' | 'favorites';

type NavItem = {
  key: ViewKey;
  icon: string;
  label: string;
  initialBadge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'chat', icon: '💬', label: '聊天', initialBadge: 5 },
  { key: 'contacts', icon: '👥', label: '通讯录' },
  { key: 'discover', icon: '🔍', label: '发现' },
  { key: 'moments', icon: '📷', label: '朋友圈', initialBadge: 2 },
  { key: 'files', icon: '📁', label: '文件' },
  { key: 'favorites', icon: '⭐', label: '收藏' }
];

const getInitialBadges = () => {
  const badges: Record<ViewKey, number> = {
    chat: 0,
    contacts: 0,
    discover: 0,
    moments: 0,
    files: 0,
    favorites: 0
  };

  NAV_ITEMS.forEach((item) => {
    if (item.initialBadge) {
      badges[item.key] = item.initialBadge;
    }
  });

  return badges;
};

const SidebarApp = () => {
  const [activeView, setActiveView] = useState<ViewKey>('chat');
  const [badges, setBadges] = useState<Record<ViewKey, number>>(() => getInitialBadges());

  const electronAPI = useMemo(() => window.electronAPI as ElectronAPI | undefined, []);

  useEffect(() => {
    if (!electronAPI) {
      return;
    }

    const cleanups: Array<() => void> = [];

    cleanups.push(
      electronAPI.onMessage('chat-updated', (message: WindowMessage) => {
        const unread = message.data?.unread;
        if (typeof unread === 'number') {
          setBadges((prev) => ({
            ...prev,
            chat: unread
          }));
        }
      })
    );

    cleanups.push(
      electronAPI.onMessage('switch-view', (message: WindowMessage) => {
        const view = message.data?.view as ViewKey | undefined;
        if (view) {
          setActiveView(view);
        }
      })
    );

    return () => {
      cleanups.forEach((dispose) => {
        try {
          dispose();
        } catch (error) {
          console.error('Failed to dispose listener', error);
        }
      });
    };
  }, [electronAPI]);

  const handleSwitchView = (view: ViewKey) => {
    setActiveView(view);

    if (electronAPI) {
      electronAPI.sendTo('im', 'switch-view', { view });
    }
  };

  const handleOpenSetting = async () => {
    if (!electronAPI?.openWindow) {
      return;
    }

    await electronAPI.openWindow('setting');
  };

  const handleTest = async () => {
    if (!electronAPI) {
      alert('未在 Electron 环境中运行');
      return;
    }

    try {
      const result = await electronAPI.request(
        'im',
        'get-user-info',
        {},
        { timeout: 5000 }
      );
      alert(`测试成功！\n用户: ${result.username}\nID: ${result.userId}`);
    } catch (error: any) {
      alert(`测试失败: ${error.message || error}`);
    }
  };

  return (
    <div className="sidebar">
      <div className="user-profile">
        <div className="avatar">👤</div>
        <div className="user-info">
          <div className="username">用户名</div>
          <div className="status">在线</div>
        </div>
      </div>

      <div className="nav-menu">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-item${activeView === item.key ? ' active' : ''}`}
            onClick={() => handleSwitchView(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {badges[item.key] ? <span className="badge">{badges[item.key]}</span> : null}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button className="tool-btn" onClick={handleOpenSetting}>
          <span className="tool-icon">⚙️</span>
          <span>设置</span>
        </button>
        <button className="tool-btn" onClick={handleTest}>
          <span className="tool-icon">🧪</span>
          <span>测试</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarApp;
