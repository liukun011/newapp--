/**
 * 格式化时间字符串
 * 支持 YYYYMMDDHHMMSS 格式转换为 YYYY-MM-DD HH:MM
 * @param timeStr 时间字符串
 * @param showSeconds 是否显示秒，默认为 false
 */
export const formatTime = (timeStr?: string, showSeconds: boolean = false) => {
  if (!timeStr) return '';

  // 兼容 YYYYMMDDHHMMSS 纯数字格式 (至少12位)
  if (/^\d{12,14}$/.test(timeStr)) {
    const Y = timeStr.substring(0, 4);
    const M = timeStr.substring(4, 6);
    const D = timeStr.substring(6, 8);
    const h = timeStr.substring(8, 10);
    const m = timeStr.substring(10, 12);
    
    if (showSeconds && timeStr.length >= 14) {
      const s = timeStr.substring(12, 14);
      return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    }
    return `${Y}-${M}-${D} ${h}:${m}`;
  }

  // 尝试解析其他格式 (如 ISO 8601)
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    
    if (showSeconds) {
       return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    }
    return `${Y}-${M}-${D} ${h}:${m}`;
  }

  return timeStr;
};
