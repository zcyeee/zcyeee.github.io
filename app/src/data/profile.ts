import type { PersonalInfo, Education, Experience, Project, Award, Research } from '@/types';

export const personalInfo: PersonalInfo = {
  name: "张晨阳",
  motto: "浩渺行无极，扬帆但信风",
  bio: "欢迎来到我的个人博客。我是张晨阳，目前主要关注 Agentic RL 和 Memory 方向，喜欢摄影、旅游和羽毛球。希望在输出中进步，期待与大家进一步的交流",
  email: "chenyoung@whu.edu.cn",
  github: "https://github.com/zcyeee",
  linkedin: "https://linkedin.com/in/zhangmingyuan",
  googleScholar: "https://scholar.google.com/citations?user=CtwaMOQAAAAJ&hl=zh-CN",
  location: "中国 · 上海",
  avatar: "/images/avatar.jpg"
};

export const education: Education[] = [
  {
    school: "武汉大学",
    degree: "专业硕士",
    field: "应用统计",
    department: "前沿交叉学科研究院",
    startDate: "2025-09",
    endDate: "2027-06"
  },
  {
    school: "湖南大学",
    degree: "理学学士",
    field: "统计学",
    department: "金融与统计学院",
    startDate: "2021-09",
    endDate: "2025-06"
  }
];

export const experiences: Experience[] = [
  {
    company: "美团",
    position: "大模型算法实习生",
    location: "上海",
    startDate: "2026-01",
    endDate: "至今",
    description: [
      "Agentic RL：",
      "Group Memory：",
    ]
  },
  {
    company: "快看漫画",
    position: "大模型应用算法实习生",
    location: "北京",
    startDate: "2025-02",
    endDate: "2025-05",
    description: [
      "基于 Mem0 构建向量（Milvus）与图（Neo4j）双路异构记忆结构，分别维护处理事实性记忆与实体关系图谱",
      "构建向量检索与图检索双路召回机制；设计融合相关性、时效性与重要性的多维 Re-ranking 策略，动态返回记忆信息",
      "基于 LongMemEval 搭建端到端长期记忆自动化 QA 评测框架，最终框架相比 RAG 基线各项指标平均提升约 10%"
    ]
  }
];

export const projects: Project[] = [
  {
    name: "基于全模态行为序列的生成式广告交互预测",
    date: "2025.07 — 2025.09",
    description: "腾讯广告算法大赛（初赛前 15%）。基于多模态用户行为序列，引入 HSTU 注意力模块与 RoPE 增强序列建模；解耦静态/动态特征编码，采用 InfoNCE + 动态难负例 Triplet Loss 双损失联合优化，两阶段训练策略对齐测评指标，核心指标由 0.023 提升至 0.086。",
    technologies: ["HSTU", "InfoNCE", "Triplet Loss", "多模态特征融合"],
    image: "/images/project_ad_recommendation.png"
  },
  {
    name: "EastMoney Crawler · 东方财富股吧爬虫",
    date: "开源项目   2024",
    stars: 181,
    description: "开源的东方财富股吧数据采集工具，支持多线程并发爬取帖子与评论信息并持久化至 MongoDB。采用 Selenium + stealth.js 规避反爬检测；以 MVC 模式解耦爬虫（PostCrawler / CommentCrawler）、解析器与数据库接口（MongoAPI），支持 post_id 关联查询，适用于量化研究与舆情分析。",
    technologies: ["Selenium", "MongoDB", "多线程", "MVC架构"],
    github: "https://github.com/zcyeee/EastMoney_Crawler",
    image: "/images/project_eastmoney_crawler.png"
  }
];

export const awards: Award[] = [
  {
    title: "国家奖学金",
    organization: "教育部",
    date: "2024-12"
  },
  {
    title: "全国大学生数学建模竞赛 省级一等奖",
    organization: "中国工业与应用数学学会",
    date: "2023-11"
  },
  {
    title: "全国大学生统计建模大赛 省级一等奖",
    organization: "中国统计教育学会",
    date: "2023-08"
  }
];

export const skills: string[] = [
  // "熟悉 Python、PyTorch，掌握 Slurm、Linux、Shell、Git 等开发与任务调度环境",
  "熟悉 PPO、GRPO、DAPO 等强化学习算法与 Verl 强化学习框架",
  "熟悉 RAG、Agent 等 LLM 应用技术，了解 LangChain 以及 LLM 基础原理及应用",
  "熟悉 SQL 和 LaTeX，掌握 Python 数据分析与可视化，了解 Tableau 等工具",
];

export const research: Research[] = [
  {
    title: "Cell lineage tracing: Methods, applications, and challenges",
    authors: "Shanjun Mao, Chenyang Zhang, Runjiu Chen, Shan Tang, Xiaodan Fan, Jie Hu",
    venue: "Quantitative Biology",
    year: "2025",
    link: "https://onlinelibrary.wiley.com/doi/full/10.1002/qub2.70006",
    tags: ["Lineage Tracing", "Survey"]
  },
  {
    title: "STW-MD: a novel spatio-temporal weighting and multi-step decision tree method for considering spatial heterogeneity in brain gene expression data",
    authors: "Shanjun Mao, Xiao Huang, Runjiu Chen, Chenyang Zhang, Yizhu Diao, Zongjin Li, Qingzhe Wang, Shan Tang, Shuixia Guo",
    venue: "Briefings in Bioinformatics (CCF-B)",
    year: "2024",
    link: "https://academic.oup.com/bib/article/25/2/bbae051/7611940",
    tags: ["Spatial Heterogeneity", "Decision Tree"]
  }
];
