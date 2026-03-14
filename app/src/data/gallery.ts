export interface Photo {
    id: string;
    src: string;
    title: string;
    location: string;
    date: string;
    camera: string;
    category: string;
    width: number;
    height: number;
}

export const photos: Photo[] = [
    {
        id: '1',
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1000&fit=crop',
        title: '晨曦中的山峰',
        location: '四川 · 四姑娘山',
        date: '2024-10',
        camera: 'Sony A7R IV',
        category: '风光',
        width: 800,
        height: 1000,
    },
    {
        id: '2',
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
        title: '雾中森林',
        location: '云南 · 香格里拉',
        date: '2024-09',
        camera: 'Canon R5',
        category: '风光',
        width: 800,
        height: 600,
    },
    {
        id: '3',
        src: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=1000&fit=crop',
        title: '城市夜景',
        location: '上海 · 外滩',
        date: '2024-08',
        camera: 'Sony A7R IV',
        category: '城市',
        width: 800,
        height: 1000,
    },
    {
        id: '4',
        src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
        title: '山间小径',
        location: '浙江 · 莫干山',
        date: '2024-07',
        camera: 'Fujifilm X-T5',
        category: '风光',
        width: 800,
        height: 600,
    },
    {
        id: '5',
        src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=1000&fit=crop',
        title: '瀑布飞流',
        location: '贵州 · 黄果树',
        date: '2024-06',
        camera: 'Sony A7R IV',
        category: '风光',
        width: 800,
        height: 1000,
    },
    {
        id: '6',
        src: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=600&fit=crop',
        title: '古镇黄昏',
        location: '江苏 · 周庄',
        date: '2024-05',
        camera: 'Canon R5',
        category: '人文',
        width: 800,
        height: 600,
    },
    {
        id: '7',
        src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=1000&fit=crop',
        title: '湖光山色',
        location: '新疆 · 赛里木湖',
        date: '2024-04',
        camera: 'Sony A7R IV',
        category: '风光',
        width: 800,
        height: 1000,
    },
    {
        id: '8',
        src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop',
        title: '金色麦田',
        location: '河北 · 坝上',
        date: '2024-03',
        camera: 'Fujifilm X-T5',
        category: '风光',
        width: 800,
        height: 600,
    },
];

export const categories = ['全部', '风光', '城市', '人像'];
