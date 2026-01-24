// @ts-ignore
import dsbridge from './dsbridge';

declare global {
  interface Window {
    _dsbridge: any;
    _dswk: any;
  }
}

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
    ) {// iOS 环境 (WKWebView) - 保持原逻辑不变
      (window as any).webkit.messageHandlers.NativeBridge.postMessage({
        action,
        parameters,
      });
      console.log('[NativeBridge] Call:', action, parameters);
    } // Android 环境 (DSBridge)
    else if (window._dsbridge || window._dswk || -1 != navigator.userAgent.indexOf("_dsbridge")) {
      dsbridge.call(action, parameters);
    }else {
      console.warn('[NativeBridge] Not in native environment');
    }
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

  /**
   * 上传访谈文件
   */
  uploadInterviewFile(params: {
    host: string;
    authorization: string;
    filePath: string;
    interviewInstId: number | string;
  }) {
    this.callNative('uploadInterviewFile', params);
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
      type?: string | number; // 有些版本 type 可能在 st 里
      rt: Array<{
        ws: Array<{
          cw: Array<{
            w: string;  // 识别的文字
          }>;
        }>;
      }>;
    };
    type?: number | string;  // 0=最终结果, 1=中间结果
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
    
    // DEBUG: Show RAW RESULT using overlay
    // if (typeof document !== 'undefined' && !document.getElementById('debug-overlay-raw')) {
    //   const div = document.createElement('div');
    //   div.id = 'debug-overlay-raw';
    //   // Center of screen, very visible
    //   div.style.cssText = 'position:fixed;top:20%;left:5%;width:90%;height:300px;background:rgba(0,0,0,0.9);color:#ffff00;z-index:100005;overflow:auto;padding:20px;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;border:2px solid yellow;';
    //   div.innerText = "--- RAW RESULT ---\n" + JSON.stringify(result, null, 2);
    //   div.onclick = () => document.body.removeChild(div);
    //   document.body.appendChild(div);
    // }

    if (result.cn && result.cn.st && result.cn.st.rt) {
      // 兼容字符串 "0" 和数字 0
      // 优先取 result.cn.type，如果没有则取 result.cn.st.type (根据截图 type 可能在 st 层级)
      let typeVal = result.cn.type;
      if (typeVal === undefined && result.cn.st.type !== undefined) {
        typeVal = result.cn.st.type;
      }
      
      const isTypeFinal = String(typeVal) === "0";

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
      return { text, isFinal: isTypeFinal };
    }
  } catch (e) {
    console.error('解析转写结果失败:', e);
  }
  return null;
}

// 导出单例
export const nativeBridge = new NativeBridgeService();
