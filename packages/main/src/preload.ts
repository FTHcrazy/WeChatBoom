import { contextBridge, ipcRenderer } from 'electron';

export type WindowType = 'main' | 'im' | 'setting';

export interface WindowMessage {
  from: WindowType;
  data: any;
  type?: 'request' | 'response';
  requestId?: string;
}

export interface RequestOptions {
  timeout?: number; // 超时时间，毫秒
}

type RequestHandler = (data: any, from: WindowType) => Promise<any> | any;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口管理
  openWindow: (type: WindowType) => ipcRenderer.invoke('open-window', type),
  closeWindow: (type: WindowType) => ipcRenderer.invoke('close-window', type),
  
  // 窗口间通信
  sendTo: (to: WindowType, channel: string, data: any) => {
    ipcRenderer.send('window-message', {
      type: 'send',
      to,
      channel,
      data
    });
  },
  
  broadcast: (channel: string, data: any) => {
    ipcRenderer.send('window-message', {
      type: 'broadcast',
      channel,
      data
    });
  },

  // 请求-响应模式（Promise 异步）
  request: async (
    to: WindowType,
    channel: string,
    data: any,
    options?: RequestOptions
  ): Promise<any> => {
    return ipcRenderer.invoke('window-request', {
      to,
      channel,
      data,
      timeout: options?.timeout
    });
  },

  // 注册请求处理器
  onRequest: (channel: string, handler: RequestHandler) => {
    const listener = async (_event: any, message: WindowMessage) => {
      if (message.type === 'request' && message.requestId) {
        try {
          const result = await handler(message.data, message.from);
          
          // 发送响应
          ipcRenderer.send('window-response', {
            requestId: message.requestId,
            to: message.from,
            channel,
            data: result
          });
        } catch (error: any) {
          // 发送错误响应
          ipcRenderer.send('window-response', {
            requestId: message.requestId,
            to: message.from,
            channel,
            error: error.message || String(error)
          });
        }
      }
    };

    ipcRenderer.on(channel, listener);

    // 返回清理函数
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  
  onMessage: (channel: string, callback: (message: WindowMessage) => void) => {
    const listener = (_event: any, message: WindowMessage) => {
      // 过滤掉请求消息（由 onRequest 处理）
      if (message.type !== 'request') {
        callback(message);
      }
    };
    ipcRenderer.on(channel, listener);
    
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  
  // 通用事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: any, ...args: any[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, listener);
    
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  
  // 发送到主进程
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  
  // 兼容旧的 API
  openIMWindow: () => ipcRenderer.invoke('open-window', 'im'),
  openSettingWindow: () => ipcRenderer.invoke('open-window', 'setting'),
  ping: () => ipcRenderer.invoke('ping')
});
