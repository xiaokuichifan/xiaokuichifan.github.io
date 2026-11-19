import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/site.config.ts", import.meta.url), "utf8");

function field(name) {
  const match = source.match(new RegExp(`^\\s*${name}:\\s*"([^"]*)"`, "m"));
  return match?.[1] ?? "";
}

const site = {
  url: field("url"),
  indexNowKey: field("indexNowKey"),
};

const ENDPOINT = "https://api.indexnow.org/indexnow";
const ATTEMPTS = 4;
const PAUSE_MS = 15_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) =>
    match[1].trim().replace(/&amp;/g, "&"),
  );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "kui-li-tech-notes-indexnow" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`);
  }
  return response.text();
}

async function pageUrls(siteUrl) {
  const host = new URL(siteUrl).host;
  const pages = new Set();
  const queue = [];
  const seen = new Set();

  const pushLoc = (loc) => {
    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      return;
    }
    if (parsed.host !== host) return;
    if (parsed.pathname.endsWith(".xml")) queue.push(parsed.href);
    else pages.add(parsed.href);
  };

  try {
    const xml = await fetchText(`${siteUrl}/sitemap-index.xml`);
    const found = locs(xml);
    if (found.length === 0) throw new Error("sitemap index is empty");
    for (const loc of found) pushLoc(loc);
  } catch (error) {
    console.warn(
      `IndexNow: sitemap index unavailable (${error instanceof Error ? error.message : error})`,
    );
    queue.push(`${siteUrl}/sitemap-0.xml`, `${siteUrl}/sitemap.xml`);
  }

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    try {
      const xml = await fetchText(url);
      for (const loc of locs(xml)) pushLoc(loc);
    } catch (error) {
      console.warn(`IndexNow: skip ${url} (${error instanceof Error ? error.message : error})`);
    }
  }

  return [...pages];
}

async function submit(siteUrl, key, urls) {
  const host = new URL(siteUrl).host;
  const body = {
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: urls.slice(0, 10_000),
  };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "kui-li-tech-notes-indexnow",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  console.log(`IndexNow: accepted ${body.urlList.length} URLs (${response.status})`);
}

async function main() {
  const key = site.indexNowKey.trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
    console.warn("IndexNow: indexNowKey is empty or invalid, skip.");
    return;
  }
  const siteUrl = site.url.replace(/\/$/, "");
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const urls = await pageUrls(siteUrl);
      if (urls.length === 0) throw new Error("sitemap has no page URLs");
      console.log(`IndexNow: attempt ${attempt}, ${urls.length} URLs from ${siteUrl}`);
      await submit(siteUrl, key, urls);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`IndexNow: attempt ${attempt} failed: ${lastError}`);
      if (attempt < ATTEMPTS) await sleep(PAUSE_MS);
    }
  }
  console.warn(`IndexNow: gave up after ${ATTEMPTS} attempts (${lastError}). Deploy is unchanged.`);
}

try {
  await main();
} catch (error) {
  console.warn(`IndexNow: ${error instanceof Error ? error.message : error}`);
}
process.exit(0);
