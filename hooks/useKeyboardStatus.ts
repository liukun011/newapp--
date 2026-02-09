import { useState, useEffect } from 'react';

/**
 * 检测移动端软键盘是否弹出
 * - iOS: 不检测，始终返回 false（因为 iOS 的键盘不会压缩 viewport）
 * - Android: 使用 visualViewport API 或 window resize 检测
 */
export function useKeyboardStatus() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // 检测是否为 iOS 设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // iOS 不需要检测键盘，直接返回
    if (isIOS) {
      setIsKeyboardOpen(false);
      return;
    }

    // Android: 使用 visualViewport API（更准确）或 fallback 到 resize
    const originalHeight = window.visualViewport?.height || window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      // 如果当前高度比原始高度小 150px 以上，认为键盘弹起了
      if (currentHeight < originalHeight - 150) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    // 优先使用 visualViewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return isKeyboardOpen;
}
