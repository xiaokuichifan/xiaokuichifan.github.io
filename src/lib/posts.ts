import { getCollection, type CollectionEntry } from "astro:content";
import { site } from "../site.config";

export type Post = CollectionEntry<"posts">;

/** 生产构建隐藏草稿；本地 dev 仍可预览，并在列表里标出。 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** 标签页地址。空格会变成连字符，中文保留。 */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function tagHref(tag: string): string {
  return `/tags/${tagSlug(tag)}/`;
}

export function postHref(id: string): string {
  return `/posts/${id}/`;
}

/** 粗略阅读时间。中文按字，其余按词，代码块也算在里面。 */
export function readingMinutes(source: string): number {
  const text = source.replace(/^import\s.+$/gm, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const cjk = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latin = text
    .replace(/\p{Script=Han}/gu, " ")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((word) => word.length > 1).length;
  return Math.max(1, Math.round(cjk / 450 + latin / 180));
}

export function readingMinutesFromPost(post: Post): number {
  const withBody = post as Post & { body?: string };
  const body = typeof withBody.body === "string" ? withBody.body.trim() : "";
  return readingMinutes(body || `${post.data.title}\n${post.data.description}`);
}

/**
 * 首页单独展示的那一篇。
 * 配置了 featuredPostId 且能对上时算置顶；否则看 frontmatter 的 featured；都没有就用最新一篇。
 */
export function selectFeatured(posts: Post[]): { post: Post; pinned: boolean } | undefined {
  if (posts.length === 0) return undefined;
  if (site.featuredPostId) {
    const chosen = posts.find((post) => post.id === site.featuredPostId);
    if (chosen) return { post: chosen, pinned: true };
  }
  const flagged = posts.find((post) => post.data.featured);
  if (flagged) return { post: flagged, pinned: true };
  return { post: posts[0], pinned: false };
}

/** posts 需按时间倒序。newer 是更新的一篇，older 是更早的一篇。 */
export function adjacentPosts(posts: Post[], id: string): { newer?: Post; older?: Post } {
  const index = posts.findIndex((post) => post.id === id);
  if (index < 0) return {};
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export function getTagCounts(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
}
