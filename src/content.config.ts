import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({
    base: "./src/content/posts",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** 摘要。可省略。列表、RSS、meta description 和分享卡片都会用到。 */
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    /** 为 true 时优先出现在首页，并标成「置顶」。 */
    featured: z.boolean().default(false),
    /** 封面图，站点根路径，例如 /images/cover.png。不写则用生成的色块。 */
    cover: z.string().optional(),
  }),
});

export const collections = { posts };
