import { Toast } from 'react-vant';

/**
 * 复制文本到剪贴板的通用工具函数
 * 处理了 navigator.clipboard 不可用的情况（如非 HTTPS 环境）
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 尝试使用现代 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API copy failed:', err);
      // 如果失败了，尝试走 fallback
    }
  }

  // Fallback: 使用传统的 document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 确保 textarea 在移动端不可见且不影响布局
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  return false;
};

/**
 * 带 Toast 提示的复制函数
 */
export const copyWithToast = async (text: string, successMsg = '复制成功') => {
  const success = await copyToClipboard(text);
  if (success) {
    Toast.success(successMsg);
  } else {
    Toast.fail('复制失败，请尝试长按手动复制');
  }
  return success;
};
