/**
 * react-snap 在预渲染时会将 `navigator.userAgent` 设为 `"ReactSnap"`。
 * 依赖布局测量、动画初始态或浮层的 UI 应在此环境下跳过渲染，
 * 交给真实浏览器 hydration 后再挂载，避免快照与客户端不一致。
 *
 * @see https://github.com/stereobooster/react-snap
 */
export function isReactSnapPrerender(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';
}
