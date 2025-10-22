/**
 * Electron API 类型定义
 * 供渲染进程使用
 */

export type WindowType = 'main' | 'im' | 'setting';

export interface WindowMessage {
  from: WindowType;
  data: any;
  type?: 'request' | 'response';
  requestId?: string;
}

export interface RequestOptions {
  timeout?: number; // 超时时间（毫秒），默认 30000ms
}

type RequestHandler = (data: any, from: WindowType) => Promise<any> | any;

export interface ElectronAPI {
  // 窗口管理
  openWindow: (type: WindowType) => Promise<{ success: boolean; error?: string }>;
  closeWindow: (type: WindowType) => Promise<{ success: boolean; error?: string }>;
  
  // 窗口间通信（单向）
  sendTo: (to: WindowType, channel: string, data: any) => void;
  broadcast: (channel: string, data: any) => void;
  onMessage: (channel: string, callback: (message: WindowMessage) => void) => () => void;
  
  // 请求-响应模式（Promise 异步）
  request: (
    to: WindowType,
    channel: string,
    data: any,
    options?: RequestOptions
  ) => Promise<any>;
  onRequest: (channel: string, handler: RequestHandler) => () => void;
  
  // 通用事件监听
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // 兼容旧的 API
  openIMWindow: () => Promise<{ success: boolean; error?: string }>;
  openSettingWindow: () => Promise<{ success: boolean; error?: string }>;
  ping: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
