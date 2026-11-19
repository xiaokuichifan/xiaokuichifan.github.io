import type { APIRoute } from "astro";
import { site } from "../site.config";

export function getStaticPaths() {
  const key = site.indexNowKey.trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return [];
  return [{ params: { indexnowKey: key } }];
}

export const GET: APIRoute = () =>
  new Response(site.indexNowKey.trim(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
