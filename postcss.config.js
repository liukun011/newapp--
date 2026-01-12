export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-px-to-viewport': {
      viewportWidth: 375,     // 设计稿宽度 (移动端通常是 375px)
      unitPrecision: 5,       // 转换后单位的小数精度
      viewportUnit: 'vw',     // 转换成的单位
      selectorBlackList: ['.rv-', '.ignore-', 'html', 'body'],  // 不转换的选择器（保护 react-vant）
      minPixelValue: 1,       // 最小转换的px值
      mediaQuery: false,      // 允许在媒体查询中转换
      exclude: [/node_modules\/(?!react-vant)/], // 排除 node_modules，但保留 react-vant 的转换
      replace: true,          // 直接替换而不是添加备用属性
      landscape: false,       // 不处理横屏情况
    },
  },
};