type WindowType = 'main' | 'im' | 'setting';

interface WindowMessage {
  from: WindowType;
  data: any;
}

interface RequestOptions {
  timeout?: number;
}

interface ElectronAPI {
  openWindow?: (type: WindowType) => Promise<{ success: boolean; error?: string }>;
  closeWindow?: (type: WindowType) => Promise<{ success: boolean; error?: string }>;
  sendTo: (to: WindowType, channel: string, data: any) => void;
  broadcast: (channel: string, data: any) => void;
  request: (to: WindowType, channel: string, data: any, options?: RequestOptions) => Promise<any>;
  onRequest: (channel: string, handler: (data: any, from: WindowType) => Promise<any> | any) => () => void;
  onMessage: (channel: string, callback: (message: WindowMessage) => void) => () => void;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  openIMWindow?: () => Promise<void>;
  openSettingWindow?: () => Promise<void>;
  ping?: () => Promise<string>;
}
  interface Window {
    electronAPI?: ElectronAPI;
  }

