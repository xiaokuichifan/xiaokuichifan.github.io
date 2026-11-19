import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { site } from "./src/site.config";

// 用户站点（username.github.io），发布在域名根路径，不要设置 base。
export default defineConfig({
  site: site.url,
  output: "static",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        if (pathname === "/rss.xml") return false;
        if (pathname.endsWith(".txt")) return false;
        if (pathname === "/og.png" || pathname.startsWith("/og/")) return false;
        return true;
      },
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            output: "htmlAndMathml",
            throwOnError: true,
          },
        ],
      ],
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
  },
});
