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

## 修改标题和关于信息

站点名称、简介、作者、关于页段落和首页上的研究方向，都在 [`src/site.config.ts`](src/site.config.ts)。改 `title` 一处即可，页头、首页、RSS 和浏览器标题会一起换。

关于页的正文是 `about` 数组，每一项是一段。研究方向在 `topics`。导航文字在 `nav`。

关于页如果要加链接或更复杂的排版，再改 [`src/pages/about.astro`](src/pages/about.astro)。发布地址写在 `url`，要和 `astro.config.ts` 里的 `site` 保持一致（配置文件会直接读 `url`）。这是用户站点，根路径是 `/`，不要设置 `base`。

## 部署到 GitHub Pages

推送到 `main` 后，[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 会安装依赖、执行 `npm run build`，再用官方的 `actions/upload-pages-artifact` 与 `actions/deploy-pages` 发布。

只需要做一次仓库设置：

1. 打开仓库的 **Settings → Pages**。
2. 在 **Build and deployment** 里，把 **Source** 选成 **GitHub Actions**。

选好之后，之后每次推到 `main` 都会自动更新 <https://xiaokuichifan.github.io>。第一次如果 Actions 还没跑完，页面会暂时打不开。
