import * as React from "react"
import { isReactSnapPrerender } from "@/lib/prerender"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // react-snap 在 480px 宽的视口里拍快照，若让它测出 isMobile=true，快照就会是移动端
    // 布局，而真实浏览器 hydration 的首帧一律是初始值（false）—— 两边不一致会让
    // React 判定 hydration 失败并丢弃整棵预渲染树重新渲染。预渲染时保持初始值即可对齐。
    if (isReactSnapPrerender()) return
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
