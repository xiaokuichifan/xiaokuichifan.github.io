# KUI LI's Tech Notes

个人技术博客，用 [Astro](https://astro.build) 做成静态站，部署在 GitHub Pages：<https://xiaokuichifan.github.io>。

正文以中文为主。文章放在 `src/content/posts/`，支持 Markdown 与 MDX。

## 本地预览

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

浏览器打开 <http://localhost:4321>。

确认生产构建：

```bash
npm run build
npm run preview
```

`npm run build` 会在 `dist/` 生成静态文件。`draft: true` 的文章不会进入这次构建。

## 写一篇新文章

在 `src/content/posts/` 新建一个 `.md` 或 `.mdx` 文件。文件名会变成网址：`my-note.mdx` 对应 `/posts/my-note/`。子目录也可以，例如 `lidar/align.md` 对应 `/posts/lidar/align/`。

```md
---
title: 文章标题
date: 2026-11-18
description: 一两句摘要，会出现在列表、标签页和 RSS 里。
tags:
  - LiDAR
  - COLMAP
draft: false
---
```

五个字段：

| 字段 | 作用 |
| --- | --- |
| `title` | 标题 |
| `date` | 发布日期，`YYYY-MM-DD` |
| `description` | 摘要 |
| `tags` | 标签列表，可省略 |
| `draft` | `true` 时只在 `npm run dev` 里可见，正式构建和 RSS 会跳过。可省略，默认发布 |
| `featured` | 可省略。`true` 时首页把这篇标成「置顶」 |
| `cover` | 可省略。封面图路径，例如 `/images/figure.png`。不写就用自动生成的色块 |

写的时候可以用：

- 标题、列表、表格、引用，都是普通 Markdown。
- 代码块会按语言高亮，浅色和深色主题各一套。
- 行内公式 `$E = mc^2$`，独立公式用一对 `$$`。美元金额写成 `\$5`，免得被当成公式。
- 图片放进 `public/images/`，这样引用：`![说明](/images/figure.png)`。
- 需要组件或交互内容时用 `.mdx`。嵌入网页或三维查看器：

```mdx
import Embed from "../../components/Embed.astro";

<Embed src="https://example.com/viewer" title="高斯查看器" height={480}>
  可选的说明文字。
</Embed>
```

`src` 可以是站内页面（例如 `/embeds/viewer-placeholder.html`）或外部查看器。示例文章在 `src/content/posts/hello-3d-gaussian-splatting.mdx`。

标签页地址由标签名生成：空格变成连字符，字母改为小写，中文保留。`3D Gaussian Splatting` 对应 `/tags/3d-gaussian-splatting/`。

## 修改标题、关于和首页

站点名称、简介、作者、头像、首页补充介绍、研究方向、项目和导航，都在 [`src/site.config.ts`](src/site.config.ts)。改 `title` 一处即可，页头、首页、RSS 和浏览器标题会一起换。

以 `【待填写】` 开头的句子是占位，页面上会套虚线框。整句换成你自己的话、并且不再以这个前缀开头，虚线框就会消失。某一段不想显示，把字符串改成 `""`。

- `heroNote`：首页标题下面多出来的一句介绍。
- `avatar.src`：头像路径。留空就显示 `initials`。
- `profiles`：GitHub、RSS 这类链接。
- `topics`：研究关注。`tag` 和文章标签一致、而且已经有笔记时，卡片才会链到标签页。
- `projects` 和 `projectsIntro`：项目页，以及首页上的项目区。`url` 留空则不放外链。
- `featuredPostId`：要置顶的文章 id（文件名去掉扩展名）。留空则展示最新一篇，并标成「最新」。
- `footerNote`：页脚多一行。留空则不显示。
- `about`：关于页正文，每一项是一段。
- `introMeta`：开场动画标题下的小字。
- `nav`：页头导航文字。

关于页如果要加更复杂的排版，再改 [`src/pages/about.astro`](src/pages/about.astro)。发布地址写在 `url`，要和 `astro.config.ts` 里的 `site` 保持一致（配置文件会直接读 `url`）。这是用户站点，根路径是 `/`，不要设置 `base`。

## 部署到 GitHub Pages

推送到 `main` 后，[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 会安装依赖、执行 `npm run build`，再用官方的 `actions/upload-pages-artifact` 与 `actions/deploy-pages` 发布。

只需要做一次仓库设置：

1. 打开仓库的 **Settings → Pages**。
2. 在 **Build and deployment** 里，把 **Source** 选成 **GitHub Actions**。

选好之后，之后每次推到 `main` 都会自动更新 <https://xiaokuichifan.github.io>。第一次如果 Actions 还没跑完，页面会暂时打不开。
