import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';

const EMPTY_PARAMS = new URLSearchParams();
const subscribe = () => () => {};

/**
 * 决定渲染内容用的查询参数：hydration 那一遍视为空，随后立即以真实值重渲染；
 * hydration 之后才挂载的组件（站内路由切换）直接拿到真实值。
 *
 * 预渲染快照按路径保存，拍摄时不带查询参数：`/blog?page=2` 拿到的是第 1 页的快照，
 * 从归档页进入的 `/blog/<slug>?from=archive` 拿到的快照里写着「返回博客列表」。
 * 首帧若直接读查询参数，文本对不上，React 会判定 hydration 失败，丢掉整棵预渲染 DOM 重画；
 * 只差在属性上则不会被修正，链接会一直指向快照里的地址。
 *
 * 要改写查询参数时仍用 useSearchParams 拿到的真实值。
 */
export function useHydrationSafeSearchParams(): URLSearchParams {
  const [searchParams] = useSearchParams();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated ? searchParams : EMPTY_PARAMS;
}
