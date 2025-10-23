import { BrowserWindow, BrowserView } from 'electron';
import * as path from 'path';

export type WindowType = 'main' | 'im' | 'setting';
export type ViewType = 'im'; // BrowserView 类型

export interface WindowConfig {
  width: number;
  height: number;
  devPort?: number;
  distPath: string;
  htmlPath?: string; // 直接使用 HTML 文件路径
  parent?: WindowType; // 父窗口
  x?: number; // X 坐标
  y?: number; // Y 坐标
  resizable?: boolean;
  frame?: boolean;
}

export interface IMessage {
  type: 'send' | 'broadcast' | 'request' | 'response';
  from: WindowType;
  to?: WindowType;
  channel: string;
  data: any;
  requestId?: string;
  timeout?: number;
  error?: string;
}

export interface IPendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: NodeJS.Timeout;
  from: WindowType;
  to: WindowType;
}

/**
 * 窗口管理器类
 * 负责管理所有窗口的创建、销毁和通信
 */
export class WindowManager {
  private windows: Map<WindowType, BrowserWindow | null> = new Map();
  private windowConfigs: Map<WindowType, WindowConfig> = new Map();
  private views: Map<ViewType, BrowserView | null> = new Map();
  private isDev: boolean;
  private pendingRequests: Map<string, IPendingRequest> = new Map();
  private requestIdCounter = 0;
  private readonly DEFAULT_TIMEOUT = 30000; // 30秒默认超时
  private readonly SIDEBAR_WIDTH = 260; // 侧边栏宽度

  constructor(isDev: boolean) {
    this.isDev = isDev;
    this.initWindowConfigs();
  }

  /**
   * 生成唯一的请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * 初始化窗口配置
   */
  private initWindowConfigs() {
    // Main 窗口：完整窗口（侧边栏 + IM 内容区）
    this.windowConfigs.set('main', {
      width: 1200, // 260 (侧边栏) + 940 (IM区域)
      height: 800,
      devPort: 9526,
      distPath: '../base/dist/index.html',
      x: 100,
      y: 100,
      resizable: true,
      frame: true
    });

    // IM 配置：用于 BrowserView（不再是独立窗口）
    this.windowConfigs.set('im', {
      width: 940,
      height: 800,
      devPort: 9527,
      distPath: '../im/dist/index.html',
      resizable: false,
      frame: false
    });

    // Setting 窗口：独立设置窗口
    this.windowConfigs.set('setting', {
      width: 700,
      height: 600,
      devPort: 9528,
      distPath: '../setting/dist/index.html',
      resizable: true,
      frame: true
    });
  }

  /**
   * 创建窗口
   */
  createWindow(type: WindowType, preloadPath: string): BrowserWindow {
    const config = this.windowConfigs.get(type);
    if (!config) {
      throw new Error(`Unknown window type: ${type}`);
    }

    // 获取父窗口
    let parentWindow: BrowserWindow | undefined = undefined;
    let x = config.x;
    let y = config.y;

    if (config.parent) {
      parentWindow = this.windows.get(config.parent) || undefined;
      
      // 如果有父窗口，计算子窗口位置（紧贴父窗口右侧）
      if (parentWindow) {
        const parentBounds = parentWindow.getBounds();
        x = parentBounds.x + parentBounds.width;
        y = parentBounds.y;
      }
    }

    const window = new BrowserWindow({
      width: config.width,
      height: config.height,
      x,
      y,
      parent: parentWindow,
      resizable: config.resizable !== false,
      frame: config.frame !== false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath
      }
    });

    // 加载页面
    let url: string;
    if (config.htmlPath) {
      // 使用本地 HTML 文件
      url = `file://${path.join(__dirname, config.htmlPath)}`;
    } else if (this.isDev && config.devPort) {
      // 开发环境使用开发服务器
      url = `http://localhost:${config.devPort}`;
    } else {
      // 生产环境使用构建后的文件
      url = `file://${path.join(__dirname, config.distPath)}`;
    }

    window.loadURL(url);

    // 开发环境下打开 DevTools（可选）
    // if (this.isDev && !config.htmlPath) {
    //   window.webContents.openDevTools();
    // }

    this.windows.set(type, window);

    // 父窗口移动时，子窗口跟随
    if (parentWindow) {
      parentWindow.on('move', () => {
        if (!window.isDestroyed()) {
          const parentBounds = parentWindow!.getBounds();
          window.setPosition(parentBounds.x + parentBounds.width, parentBounds.y);
        }
      });
    }

    // 窗口关闭时清理
    window.on('closed', () => {
      this.windows.set(type, null);
    });

    return window;
  }

  /**
   * 创建 BrowserView（IM 视图）
   */
  createIMView(parentWindow: BrowserWindow, preloadPath: string): BrowserView {
    const config = this.windowConfigs.get('im');
    if (!config) {
      throw new Error('IM config not found');
    }

    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath
      }
    });

    // 设置 BrowserView 的边界（右侧区域）
    const bounds = parentWindow.getBounds();
    view.setBounds({
      x: this.SIDEBAR_WIDTH,
      y: 0,
      width: bounds.width - this.SIDEBAR_WIDTH,
      height: bounds.height
    });

    // 设置自动调整大小
    view.setAutoResize({
      width: true,
      height: true
    });

    // 加载 IM 页面
    const url = this.isDev && config.devPort
      ? `http://localhost:${config.devPort}`
      : `file://${path.join(__dirname, config.distPath)}`;

    view.webContents.loadURL(url);

    // 开发环境下打开 DevTools（可选）
    // if (this.isDev) {
    //   view.webContents.openDevTools();
    // }

    // 添加到父窗口
    parentWindow.addBrowserView(view);
    this.views.set('im', view);

    // 窗口大小改变时，调整 BrowserView 大小
    parentWindow.on('resize', () => {
      try {
        const newBounds = parentWindow.getBounds();
        view.setBounds({
          x: this.SIDEBAR_WIDTH,
          y: 0,
          width: newBounds.width - this.SIDEBAR_WIDTH,
          height: newBounds.height
        });
      } catch (error) {
        // View 可能已被销毁
      }
    });

    return view;
  }

  /**
   * 获取窗口
   */
  getWindow(type: WindowType): BrowserWindow | null {
    return this.windows.get(type) || null;
  }

  /**
   * 获取 BrowserView
   */
  getView(type: ViewType): BrowserView | null {
    return this.views.get(type) || null;
  }

  /**
   * 显示或创建窗口
   */
  showOrCreate(type: WindowType, preloadPath: string): BrowserWindow {
    let window = this.getWindow(type);
    
    if (!window) {
      window = this.createWindow(type, preloadPath);
    } else {
      window.show();
      window.focus();
    }

    return window;
  }

  /**
   * 关闭窗口
   */
  closeWindow(type: WindowType): void {
    const window = this.getWindow(type);
    if (window && !window.isDestroyed()) {
      window.close();
    }
    this.windows.set(type, null);
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): Map<WindowType, BrowserWindow> {
    const result = new Map<WindowType, BrowserWindow>();
    this.windows.forEach((window, type) => {
      if (window) {
        result.set(type, window);
      }
    });
    return result;
  }

  /**
   * 获取所有 WebContents（包括 BrowserView）
   */
  getAllWebContents(): Array<{ type: string; webContents: Electron.WebContents }> {
    const result: Array<{ type: string; webContents: Electron.WebContents }> = [];
    
    // 添加窗口的 webContents
    this.windows.forEach((window, type) => {
      if (window) {
        result.push({ type, webContents: window.webContents });
      }
    });
    
    // 添加 BrowserView 的 webContents
    this.views.forEach((view, type) => {
      if (view) {
        result.push({ type, webContents: view.webContents });
      }
    });
    
    return result;
  }

  /**
   * 发送消息到指定窗口或视图
   */
  sendToWindow(type: WindowType, channel: string, data: any): boolean {
    // 首先尝试作为窗口发送
    const window = this.getWindow(type);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
      return true;
    }
    
    // 如果是 'im'，尝试发送到 BrowserView
    if (type === 'im') {
      const view = this.getView('im');
      if (view) {
        try {
          view.webContents.send(channel, data);
          return true;
        } catch (error) {
          // View 可能已被销毁
        }
      }
    }
    
    return false;
  }

  /**
   * 广播消息到所有窗口和视图（除了发送者）
   */
  broadcast(fromType: WindowType, channel: string, data: any): void {
    // 广播到所有窗口
    this.windows.forEach((window, type) => {
      if (type !== fromType && window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
    
    // 广播到所有 BrowserView（如果发送者不是 im）
    if (fromType !== 'im') {
      this.views.forEach((view) => {
        if (view) {
          try {
            view.webContents.send(channel, data);
          } catch (error) {
            // View 可能已被销毁
          }
        }
      });
    }
  }

  /**
   * 广播消息到所有窗口和视图（包括发送者）
   */
  broadcastToAll(channel: string, data: any): void {
    // 广播到所有窗口
    this.windows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
    
    // 广播到所有 BrowserView
    this.views.forEach((view) => {
      if (view) {
        try {
          view.webContents.send(channel, data);
        } catch (error) {
          // View 可能已被销毁
        }
      }
    });
  }

  /**
   * 发送请求并等待响应
   */
  async sendRequest(
    from: WindowType,
    to: WindowType,
    channel: string,
    data: any,
    timeout?: number
  ): Promise<any> {
    const requestId = this.generateRequestId();
    const timeoutMs = timeout || this.DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      // 设置超时定时器
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // 保存待处理请求
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
        from,
        to
      });

      // 发送请求消息
      const success = this.sendToWindow(to, channel, {
        type: 'request',
        from,
        requestId,
        data
      });

      if (!success) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Window ${to} not found or not ready`));
      }
    });
  }

  /**
   * 处理响应消息
   */
  handleResponse(requestId: string, data: any, error?: string): void {
    const pending = this.pendingRequests.get(requestId);
    
    if (!pending) {
      console.warn(`No pending request found for ID: ${requestId}`);
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(data);
    }
  }

  /**
   * 发送响应消息
   */
  sendResponse(
    to: WindowType,
    channel: string,
    requestId: string,
    data: any,
    error?: string
  ): boolean {
    return this.sendToWindow(to, channel, {
      type: 'response',
      requestId,
      data,
      error
    });
  }

  /**
   * 处理窗口间通信消息
   */
  handleMessage(message: IMessage): void {
    if (message.type === 'send' && message.to) {
      // 点对点通信
      this.sendToWindow(message.to, message.channel, {
        from: message.from,
        data: message.data
      });
    } else if (message.type === 'broadcast') {
      // 广播通信
      this.broadcast(message.from, message.channel, {
        from: message.from,
        data: message.data
      });
    } else if (message.type === 'request' && message.to) {
      // 请求消息
      this.sendToWindow(message.to, message.channel, {
        type: 'request',
        from: message.from,
        requestId: message.requestId,
        data: message.data
      });
    } else if (message.type === 'response' && message.requestId) {
      // 响应消息
      this.handleResponse(message.requestId, message.data, message.error);
    }
  }

  /**
   * 销毁所有窗口和视图
   */
  destroyAll(): void {
    // 清理所有待处理的请求
    this.pendingRequests.forEach((pending, requestId) => {
      clearTimeout(pending.timer);
      pending.reject(new Error('Application is closing'));
    });
    this.pendingRequests.clear();

    // 销毁所有 BrowserView
    this.views.forEach((view, type) => {
      if (view) {
        try {
          // BrowserView 需要从窗口中移除
          const mainWindow = this.getWindow('main');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.removeBrowserView(view);
          }
        } catch (error) {
          // 可能已被移除
        }
      }
      this.views.set(type, null);
    });

    // 销毁所有窗口
    this.windows.forEach((window, type) => {
      if (window && !window.isDestroyed()) {
        window.destroy();
      }
      this.windows.set(type, null);
    });
  }

  /**
   * 获取待处理请求数量
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
}
