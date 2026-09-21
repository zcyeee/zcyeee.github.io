import { Link } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeo } from '@/hooks/use-seo';

/**
 * 兜底路由。`/blog/:slug` 能匹配任意 slug，坏文章链接由 BlogPost 自己处理；
 * 这里接的是完全不匹配任何路由的路径（如 /foo、/blog/a/b/c），
 * 否则 <Routes> 会渲染 null，页面上只剩导航栏和页脚的一片空白。
 */
export function NotFound() {
    useSeo({ title: '页面未找到', description: '该页面不存在或已被移动。' });

    return (
        <div className="min-h-screen pb-16 flex items-center justify-center">
            <div className="text-center px-4">
                <p className="text-6xl font-bold text-primary/30 mb-4">404</p>
                <h1 className="text-2xl md:text-3xl font-bold mb-3">页面未找到</h1>
                <p className="text-muted-foreground mb-6">该页面不存在或已被移动。</p>
                <Link to="/">
                    <Button variant="outline" className="gap-1">
                        <HomeIcon className="w-4 h-4" />
                        返回首页
                    </Button>
                </Link>
            </div>
        </div>
    );
}
