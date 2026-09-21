export const siteConfig = {
    author: "张晨阳",
    siteName: "张晨阳的个人主页",
    /** 用于生成 canonical / og:url / sitemap 的站点根地址，结尾不带斜杠 */
    siteUrl: "https://zcyeee.github.io",
    description:
        "张晨阳的个人主页与技术博客，记录大语言模型、强化学习、位置编码与工程实践方面的学习笔记。",
    /** 社交平台分享卡片的默认配图 */
    ogImage: "/images/avatar.jpg",
    locale: "zh_CN",
    footerText: "© 2026 Chenyang Zhang. All rights reserved.",
    navItems: [
        { path: '/', label: '首页', icon: 'Home' },
        { path: '/blog', label: '博客', icon: 'BookOpen' },
        { path: '/archive', label: '归档', icon: 'Archive' },
        { path: '/gallery', label: '摄影', icon: 'Camera' },
    ],
};
