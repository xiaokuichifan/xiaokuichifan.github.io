import { site } from "../site.config";

/** 给 meta / JSON-LD 用的文章形状，避免这里依赖 astro:content。 */
export type SeoPost = {
  id: string;
  body?: string | null;
  data: {
    title: string;
    description?: string;
    date: Date;
    tags: readonly string[];
    cover?: string;
  };
};

const RASTER_COVER = /\.(?:png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

export function absoluteUrl(pathname: string): string {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return new URL(pathname, site.url).href;
}

/** 构建时生成的默认分享图，或某篇文章的分享图。 */
export function generatedOgPath(id?: string): string {
  return id ? `/og/${id}.png` : "/og.png";
}

/** 社交平台可靠支持的位图封面。SVG 仍可做文内封面，但不用作 og:image。 */
export function coverIsRaster(cover: string | undefined): boolean {
  const value = cover?.trim() ?? "";
  return RASTER_COVER.test(value);
}

/**
 * GoatCounter 计数地址。
 * 站点代码 `xiaokuichifan`、主机名，或已经带 `/count` 的完整地址都可以。
 * 空字符串表示不启用。
 */
export function goatcounterEndpoint(code: string): string {
  const value = code.trim().replace(/\/+$/, "");
  if (!value) return "";
  let url = value;
  if (!/^https?:\/\//i.test(url)) {
    url = url.includes(".") ? `https://${url}` : `https://${url}.goatcounter.com`;
  }
  url = url.replace(/\/+$/, "");
  if (!/\/count$/i.test(url)) url += "/count";
  return url;
}

export function plainExcerpt(source: string, max = 110): string {
  const text = source
    .replace(/^import\s.+$/gm, " ")
    .replace(/^export\s.+$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]+\$/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const chars = [...text];
  if (chars.length <= max) return text;
  return `${chars.slice(0, max - 1).join("")}…`;
}

/** 文章摘要。frontmatter 没写 description 时，用正文开头，再不行用站点简介。 */
export function postDescription(post: SeoPost): string {
  const written = post.data.description?.trim();
  if (written) return written;
  if (typeof post.body === "string") {
    const excerpt = plainExcerpt(post.body);
    if (excerpt) return excerpt;
  }
  return site.description;
}

export function authorEntity(): { "@type": "Person"; name: string; url?: string } {
  const url = site.profiles.find((item) => item.label === "GitHub")?.href;
  return {
    "@type": "Person",
    name: site.author,
    ...(url ? { url } : {}),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.title,
    description: site.description,
    url: absoluteUrl("/"),
    inLanguage: site.locale,
    author: authorEntity(),
  };
}

export function blogPostingJsonLd(
  post: SeoPost,
  options: { minutes: number; image: string; url: string },
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.data.title,
    description: postDescription(post),
    datePublished: post.data.date.toISOString(),
    dateModified: post.data.date.toISOString(),
    inLanguage: site.locale,
    url: options.url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": options.url,
    },
    image: [options.image],
    timeRequired: `PT${options.minutes}M`,
    author: authorEntity(),
  };
  if (post.data.tags.length > 0) data.keywords = [...post.data.tags];
  return data;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
