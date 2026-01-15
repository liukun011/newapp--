import React, { useEffect, useState } from 'react';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  isAnimating: boolean;
  delay?: number;
}

/**
 * 延迟加载包装器
 * 在页面动画期间不渲染子组件，避免性能问题
 */
const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({ 
  children, 
  isAnimating, 
  delay = 100 
}) => {
  const [shouldRender, setShouldRender] = useState(!isAnimating);

  useEffect(() => {
    if (isAnimating) {
      setShouldRender(false);
    } else {
      // 动画结束后延迟渲染
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, delay]);

  if (!shouldRender) {
    // 返回占位符或 loading 状态
    return <div style={{ minHeight: '100px' }} />;
  }

  return <>{children}</>;
};

export default LazyLoadWrapper;
