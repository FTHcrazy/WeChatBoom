import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import * as path from 'path';
import { WindowManager, WindowType, IMessage } from './WindowManager';

// 判断是否为开发环境
const isDev = !app.isPackaged;

// 创建窗口管理器实例
const windowManager = new WindowManager(isDev);

// Preload 脚本路径
const preloadPath = path.join(__dirname, 'preload.js');

/**
 * 从 WebContents 获取窗口类型
 */
function getWindowTypeFromWebContents(webContents: WebContents): WindowType | null {
  const allWindows = windowManager.getAllWindows();
  
  // 检查窗口
  for (const [type, window] of allWindows) {
    if (window.webContents === webContents) {
      return type;
    }
  }
  
  // 检查 BrowserView
  const imView = windowManager.getView('im');
  if (imView && imView.webContents === webContents) {
    return 'im';
  }
  
  return null;
}

/**
 * 从 event 获取窗口类型
 */
function getWindowTypeFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): WindowType | null {
  return getWindowTypeFromWebContents(event.sender);
}

// 应用准备就绪
app.whenReady().then(() => {
  // 创建主窗口（包含侧边栏）
  const mainWindow = windowManager.createWindow('main', preloadPath);
  
  // 延迟创建 IM 的 BrowserView，确保主窗口已就绪
  setTimeout(() => {
    windowManager.createIMView(mainWindow, preloadPath);
  }, 100);

  // macOS 激活时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const mainWin = windowManager.createWindow('main', preloadPath);
      setTimeout(() => {
        windowManager.createIMView(mainWin, preloadPath);
      }, 100);
    }
  });
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  windowManager.destroyAll();
});

// ==================== IPC Handlers ====================

/**
 * 打开窗口
 */
ipcMain.handle('open-window', (_event, type: WindowType) => {
  try {
    windowManager.showOrCreate(type, preloadPath);
    return { success: true };
  } catch (error) {
    console.error(`Failed to open window ${type}:`, error);
    return { success: false, error: String(error) };
  }
});

/**
 * 关闭窗口
 */
ipcMain.handle('close-window', (_event, type: WindowType) => {
  try {
    windowManager.closeWindow(type);
    return { success: true };
  } catch (error) {
    console.error(`Failed to close window ${type}:`, error);
    return { success: false, error: String(error) };
  }
});

/**
 * 窗口间通信
 */
ipcMain.on('window-message', (event, message: Partial<IMessage>) => {
  const fromType = getWindowTypeFromEvent(event);
  
  if (!fromType) {
    console.error('Cannot determine window type from event');
    return;
  }

  const fullMessage: IMessage = {
    type: message.type || 'send',
    from: fromType,
    to: message.to,
    channel: message.channel || 'message',
    data: message.data
  };

  windowManager.handleMessage(fullMessage);
});

/**
 * 窗口请求（Promise 异步）
 */
ipcMain.handle('window-request', async (event, request: {
  to: WindowType;
  channel: string;
  data: any;
  timeout?: number;
}) => {
  const fromType = getWindowTypeFromEvent(event);
  
  if (!fromType) {
    throw new Error('Cannot determine window type from event');
  }

  try {
    const result = await windowManager.sendRequest(
      fromType,
      request.to,
      request.channel,
      request.data,
      request.timeout
    );
    return result;
  } catch (error: any) {
    throw new Error(error.message);
  }
});

/**
 * 窗口响应
 */
ipcMain.on('window-response', (event, response: {
  requestId: string;
  to: WindowType;
  channel: string;
  data?: any;
  error?: string;
}) => {
  windowManager.handleMessage({
    type: 'response',
    from: getWindowTypeFromEvent(event) || 'main',
    to: response.to,
    channel: response.channel,
    requestId: response.requestId,
    data: response.data,
    error: response.error
  });
});

/**
 * Ping-Pong 测试
 */
ipcMain.handle('ping', () => {
  return 'pong';
});

// ==================== 应用级广播示例 ====================

/**
 * 定期广播应用状态（示例）
 */
setInterval(() => {
  const allWindows = windowManager.getAllWindows();
  if (allWindows.size > 0) {
    windowManager.broadcastToAll('app-status', {
      timestamp: Date.now(),
      activeWindows: Array.from(allWindows.keys())
    });
  }
}, 30000); // 每30秒广播一次
