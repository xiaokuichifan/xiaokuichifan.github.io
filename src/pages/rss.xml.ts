import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts } from "../lib/posts";
import { site } from "../site.config";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    customData: `<language>${site.locale}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: [...post.data.tags],
      link: `/posts/${post.id}/`,
    })),
  });
}
