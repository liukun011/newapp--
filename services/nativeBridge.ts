/**
 * Native Bridge 服务
 * 封装 JS 与 Native (iOS/Android) 的通信接口
 */

// 定义回调响应类型
export interface NativeCallbackResponse {
  action: string;
  success: boolean;
  message?: string;
  data?: any;
}

// 定义音频列表项类型
export interface AudioFileItem {
  fileName: string;
  fileURL: string;
  fileSize: number;
  timestamp: number;
  date: string;
}

// 定义音频列表响应类型
export interface AudioListData {
  page: number;
  pageSize: number;
  total: number;
  list: AudioFileItem[];
}

// 定义图片选择响应类型
export interface ImageSelectedData {
  imageURL: string;
}

// 回调函数类型
type CallbackFunction = (response: NativeCallbackResponse) => void;

class NativeBridgeService {
  private callbacks: Map<string, CallbackFunction[]> = new Map();

  constructor() {
    // 注册全局回调函数
    if (typeof window !== 'undefined') {
      (window as any).nativeCallback = this.handleNativeCallback.bind(this);
      (window as any).onError = this.handleNativeError.bind(this);
    }
  }

  /**
   * 处理 Native 回调
   */
  private handleNativeCallback(response: NativeCallbackResponse) {
    console.log('[NativeBridge] Callback:', response);

    const { action } = response;
    const callbacks = this.callbacks.get(action);

    if (callbacks && callbacks.length > 0) {
      callbacks.forEach(callback => callback(response));
    }
  }

  /**
   * 处理 Native 错误
   */
  private handleNativeError(message: string) {
    console.error('[NativeBridge] Error:', message);
    // 可以触发全局错误处理
  }

  /**
   * 调用 Native 方法
   */
  private callNative(action: string, parameters: any = {}) {
    if (
      typeof window !== 'undefined' &&
      (window as any).webkit?.messageHandlers?.NativeBridge
    ) {
      (window as any).webkit.messageHandlers.NativeBridge.postMessage({
        action,
        parameters,
      });
      console.log('[NativeBridge] Call:', action, parameters);
    } else {
      console.warn('[NativeBridge] Not in native environment');
      // 在非 Native 环境下可以模拟回调用于开发测试
      if (process.env.NODE_ENV === 'development') {
        this.mockCallback(action, parameters);
      }
    }
  }

  /**
   * 模拟回调（用于开发测试）
   */
  private mockCallback(action: string, parameters: any) {
    setTimeout(() => {
      const mockResponse: NativeCallbackResponse = {
        action,
        success: true,
        message: 'Mock response',
        data: null,
      };

      // 根据不同 action 返回不同的模拟数据
      if (action === 'getAudioList') {
        mockResponse.data = {
          page: parameters.page || 0,
          pageSize: parameters.pageSize || 20,
          total: 0,
          list: [],
        };
      }

      this.handleNativeCallback(mockResponse);
    }, 100);
  }

  /**
   * 注册回调监听
   */
  on(action: string, callback: CallbackFunction) {
    if (!this.callbacks.has(action)) {
      this.callbacks.set(action, []);
    }
    this.callbacks.get(action)!.push(callback);
  }

  /**
   * 移除回调监听
   */
  off(action: string, callback?: CallbackFunction) {
    if (!callback) {
      this.callbacks.delete(action);
    } else {
      const callbacks = this.callbacks.get(action);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // ==================== 录音相关接口 ====================

  /**
   * 开启录音
   */
  startRecording() {
    this.callNative('startRecording');
  }

  /**
   * 停止录音
   */
  stopRecording() {
    this.callNative('stopRecording');
  }

  /**
   * 获取录音状态
   */
  getRecordingStatus() {
    this.callNative('getRecordingStatus');
  }

  /**
   * 设置参数并启动录音
   */
  startRecordingWithParams(params: { roleType?: number; surveyId?: number | string; [key: string]: any }) {
    this.callNative('startRecordingSetParams', params);
  }

  // ==================== 音频文件管理接口 ====================

  /**
   * 获取音频列表
   */
  getAudioList(params: { surveyId?: number | string; page: number; pageSize: number }) {
    this.callNative('getAudioList', params);
  }

  /**
   * 删除音频文件
   */
  deleteAudioFile(params: { fileName: string; surveyId?: number }) {
    this.callNative('deleteAudioFile', params);
  }

  // ==================== 媒体相关接口 ====================

  /**
   * 打开相册
   */
  openPhotoLibrary() {
    this.callNative('openPhotoLibrary');
  }

  /**
   * 打开相机
   */
  openCamera() {
    this.callNative('openCamera');
  }

  // ==================== 其他接口 ====================

  /**
   * 关闭应用
   */
  closeApp() {
    this.callNative('closeApp');
  }

  /**
   * 检查是否在 Native 环境中
   */
  isNativeEnvironment(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      (window as any).webkit?.messageHandlers?.NativeBridge
    );
  }
}

// 讯飞转写结果格式
interface XunfeiTranscriptionResult {
  cn: {
    st: {
      rt: Array<{
        ws: Array<{
          cw: Array<{
            w: string;  // 识别的文字
          }>;
        }>;
      }>;
    };
    type: 0 | 1;  // 0=最终结果, 1=中间结果
  };
}

/**
 * 解析讯飞转写结果
 */
export function handleTranscriptionResult(jsonString: string): {
  text: string;
  isFinal: boolean;
} | null {
  try {
    const result: XunfeiTranscriptionResult = JSON.parse(jsonString);

    if (result.cn && result.cn.st && result.cn.st.rt) {
      let text = '';
      const rt = result.cn.st.rt;

      for (const item of rt) {
        if (item.ws) {
          for (const w of item.ws) {
            if (w.cw && w.cw[0] && w.cw[0].w) {
              text += w.cw[0].w;
            }
          }
        }
      }

      const isFinal = result.cn.type === 0;

      return text ? { text, isFinal } : null;
    }
  } catch (e) {
    console.error('解析转写结果失败:', e);
  }
  return null;
}

// 导出单例
export const nativeBridge = new NativeBridgeService();
