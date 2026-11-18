/**
 * 站点配置。改标题、简介、作者和关于页，只需要编辑这个文件。
 * Site title, description, author, and the about page all live here.
 */
export const site = {
  title: "KUI LI's Tech Notes",
  description: "三维高斯泼溅、激光雷达与 SfM 摄影测量（COLMAP）的研究笔记。",
  author: "KUI LI",
  locale: "zh-CN",
  url: "https://xiaokuichifan.github.io",
  repository: "https://github.com/xiaokuichifan/xiaokuichifan.github.io",
  /** 首页「最近」列表最多显示几篇 */
  recentPostCount: 5,
  topics: [
    {
      name: "3D Gaussian Splatting",
      detail: "用各向异性高斯表示场景，可微光栅化，实时渲染。",
    },
    {
      name: "LiDAR",
      detail: "激光点云、度量尺度，以及与图像的对齐。",
    },
    {
      name: "SfM / COLMAP",
      detail: "从照片估计相机位姿和稀疏三维结构。",
    },
  ],
  about: [
    "我是 KUI LI，做三维重建相关的研究与工程。眼下主要在看三件事：3D Gaussian Splatting、激光雷达，以及基于 COLMAP 的 SfM 摄影测量。",
    "这里存放实验记录、实现细节和阅读笔记。正文以中文为主，需要时会夹杂 English 与日本語。",
    "文章是 Markdown 或 MDX，公式用 LaTeX，代码块会高亮。交互内容（例如一个三维查看器）可以嵌在 MDX 里。",
  ],
  nav: [
    { href: "/", label: "首页" },
    { href: "/posts/", label: "文章" },
    { href: "/tags/", label: "标签" },
    { href: "/about/", label: "关于" },
  ],
} as const;
