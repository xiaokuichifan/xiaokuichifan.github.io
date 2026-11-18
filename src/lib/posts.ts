import { getCollection, type CollectionEntry } from "astro:content";

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
