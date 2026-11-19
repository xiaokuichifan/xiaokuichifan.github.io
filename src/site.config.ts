export type Project = {
  name: string;
  url: string;
  summary: string;
  note: string;
};

/**
 * 站点文字都在这个文件里改。
 *
 * 以「【待填写】」开头的句子是占位：页面上会套虚线框。
 * 整句换成你自己的话、并且不再以「【待填写】」开头，虚线框就会消失。
 * 不想显示某一段，把字符串改成 ""。
 *
 * 这里没有填写单位、论文或访问量。请只写你确认过的内容。
 */
export const site = {
  title: "KUI LI's Tech Notes",
  description: "三维高斯泼溅、激光雷达与 SfM 摄影测量（COLMAP）的研究笔记。",
  author: "KUI LI",
  locale: "zh-CN",
  url: "https://xiaokuichifan.github.io",
  /**
   * Google Search Console 的 HTML 标记验证码。
   * 只要 content="..." 里面的那一串。留空则不输出 meta。
   */
  googleSiteVerification: "",
  /**
   * Bing 网站管理员工具的验证码，对应 meta name="msvalidate.01"。
   * 留空则不输出。
   */
  bingSiteVerification: "",
  /**
   * GoatCounter 站点代码，例如 xiaokuichifan。
   * 也可以填 https://你的代码.goatcounter.com。留空则不加载统计脚本。
   */
  goatcounterCode: "",
  /**
   * IndexNow 密钥。部署成功后用它通知 Bing、Yandex。
   * 构建时会在站点根目录放同名的 txt。留空则不提交。
   */
  indexNowKey: "b4e0248f35b788b87677418cfe27bafb",
  repository: "https://github.com/xiaokuichifan/xiaokuichifan.github.io",
  /** 开场动画标题下面那一行小字。 */
  introMeta: "3DGS · LiDAR · SfM",
  /**
   * 头像。src 留空时显示 initials，不会去请求图片。
   * 要用照片：放进 public/images/，src 写成 "/images/文件名.jpg"。
   */
  avatar: {
    src: "",
    initials: "KL",
  },
  /**
   * 首页标题下多出来的一句介绍。description 会始终显示。
   * 这句是更个人的补充，默认是占位。
   */
  heroNote:
    "【待填写】写一两句更个人的介绍（编辑本文件的 heroNote）。整句替换后虚线框会消失；改成空字符串则不显示。",
  /** 首页在置顶/最新一篇之外，最多再列几篇。 */
  recentPostCount: 4,
  /**
   * 要置顶的文章 id：src/content/posts/ 里的路径，去掉扩展名。
   * 留空时，frontmatter 里 featured: true 的文章优先，否则展示最新一篇，并标成「最新」而不是「置顶」。
   * 示例："hello-3d-gaussian-splatting"
   */
  featuredPostId: "",
  /** 首页、关于页和页脚上的链接。handle 留空则只显示 label。 */
  profiles: [
    {
      label: "GitHub",
      href: "https://github.com/xiaokuichifan",
      handle: "@xiaokuichifan",
    },
    {
      label: "RSS",
      href: "/rss.xml",
      handle: "",
    },
  ],
  topics: [
    {
      name: "3D Gaussian Splatting",
      detail: "用各向异性高斯表示场景，可微光栅化，实时渲染。",
      /** 与文章标签一致时，有笔记才会链到标签页。 */
      tag: "3D Gaussian Splatting",
    },
    {
      name: "LiDAR",
      detail: "激光点云、度量尺度，以及与图像的对齐。",
      tag: "LiDAR",
    },
    {
      name: "SfM / COLMAP",
      detail: "从照片估计相机位姿和稀疏三维结构。",
      tag: "COLMAP",
    },
  ],
  /**
   * 项目页开头的说明。只有 projects 里有条目时才显示。
   * 留空则不显示。以「【待填写】」开头会套虚线框。
   */
  projectsIntro: "",
  /**
   * 项目卡片。留空数组时，首页和关于页都不显示项目区。
   * 一条的形状：
   * { name: "项目名", url: "", summary: "一两句话。", note: "" }
   * url 留空则不放外链。note 留空则不显示第二段。
   * summary / note 若以「【待填写】」开头，页面上会套虚线框。
   */
  projects: [] as Project[],
  /**
   * projects 为空时，导航里要不要留下「项目」。
   * false：不放进导航。/projects/ 仍可打开，并显示 projectsEmpty。
   * true：导航保留，点进去是同一句空状态。
   */
  showProjectsNavWhenEmpty: false,
  /** 项目列表为空时，项目页上的那一句。留空则只剩标题。 */
  projectsEmpty: "还没有公开的项目。",
  /** 页脚多出来的一行。留空则不显示。 */
  footerNote: "",
  about: [
    "我是 KUI LI，做三维重建相关的研究与工程。眼下主要在看三件事：3D Gaussian Splatting、激光雷达，以及基于 COLMAP 的 SfM 摄影测量。",
    "这里存放实验记录、实现细节和阅读笔记。正文以中文为主，需要时会夹杂 English 与日本語。",
    "文章是 Markdown 或 MDX，公式用 LaTeX，代码块会高亮。交互内容（例如一个三维查看器）可以嵌在 MDX 里。",
  ],
  nav: [
    { href: "/", label: "首页" },
    { href: "/posts/", label: "文章" },
    { href: "/projects/", label: "项目" },
    { href: "/tags/", label: "标签" },
    { href: "/about/", label: "关于" },
  ],
} as const;
