import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { site } from "../src/site.config.ts";

const RASTER_COVER = /\.(?:png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

function generatedOgPath(id) {
  return id ? `/og/${id}.png` : "/og.png";
}

function coverIsRaster(cover) {
  return RASTER_COVER.test((cover ?? "").trim());
}

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = process.env.OG_OUT ?? join(root, "dist");
const fontDir = join(root, "assets/fonts");

const paper = "#f4f1ea";
const ink = "#1f1a17";
const muted = "#5c534c";
const accent = "#9a3412";
const line = "#e3dbd0";
const peach = "#f0a07a";

function hashString(input) {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textUnits(text) {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) <= 0xff ? 0.56 : 1;
  return units;
}

function clip(text, maxUnits) {
  const chars = [...text.trim()];
  let units = 0;
  let count = 0;
  for (const char of chars) {
    const next = units + (char.charCodeAt(0) <= 0xff ? 0.56 : 1);
    if (next > maxUnits) break;
    units = next;
    count += 1;
  }
  if (count >= chars.length) return chars.join("");
  return `${chars.slice(0, Math.max(1, count - 1)).join("")}…`;
}

function titleSize(text) {
  const units = textUnits(text);
  if (units <= 16) return 64;
  if (units <= 26) return 52;
  if (units <= 36) return 44;
  return 38;
}

function splats(seed) {
  const rand = unit(hashString(seed));
  const specs = [
    { n: 2, w: [150, 70], h: [52, 24], opacity: [0.1, 0.06] },
    { n: 5, w: [92, 48], h: [30, 16], opacity: [0.2, 0.16] },
    { n: 4, w: [46, 28], h: [16, 10], opacity: [0.34, 0.2] },
  ];
  const dots = [];
  for (const spec of specs) {
    for (let index = 0; index < spec.n; index += 1) {
      const tone = accent;
      dots.push({
        left: 830 + rand() * 280,
        top: 86 + rand() * 380,
        width: spec.w[0] + rand() * spec.w[1],
        height: spec.h[0] + rand() * spec.h[1],
        rotate: Math.round(rand() * 140 - 70),
        opacity: spec.opacity[0] + rand() * spec.opacity[1],
        tone,
      });
    }
  }
  return dots;
}

function ellipse({ left, top, width, height, rotate, opacity, tone }) {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        left,
        top,
        width,
        height,
        borderRadius: 999,
        background: tone,
        opacity,
        transform: `rotate(${rotate}deg)`,
      },
    },
  };
}

function grid() {
  const lines = [];
  for (let x = 0; x <= 1200; x += 48) {
    lines.push({
      type: "div",
      props: {
        style: {
          position: "absolute",
          left: x,
          top: 0,
          width: 1,
          height: 630,
          background: "rgba(154, 52, 18, 0.045)",
        },
      },
    });
  }
  for (let y = 0; y <= 630; y += 48) {
    lines.push({
      type: "div",
      props: {
        style: {
          position: "absolute",
          left: 0,
          top: y,
          width: 1200,
          height: 1,
          background: "rgba(154, 52, 18, 0.045)",
        },
      },
    });
  }
  return lines;
}

function mark() {
  return {
    type: "div",
    props: {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: {
        type: "div",
        props: {
          style: {
            width: 22,
            height: 12,
            borderRadius: 999,
            background: peach,
            transform: "rotate(-32deg)",
          },
        },
      },
    },
  };
}

function card({ kicker, title, description, footer }) {
  const size = titleSize(title);
  const host = new URL(site.url).host;
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        background: paper,
        position: "relative",
        overflow: "hidden",
        color: ink,
      },
      children: [
        ...grid(),
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 980,
              top: -120,
              width: 360,
              height: 360,
              borderRadius: 999,
              background: "rgba(154, 52, 18, 0.08)",
            },
          },
        },
        ...splats(title).map(ellipse),
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              width: 1200,
              height: 8,
              background: accent,
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: 760,
              height: 630,
              padding: "64px 40px 118px 72px",
              position: "relative",
            },
            children: {
              type: "div",
              props: {
                style: { display: "flex", flexDirection: "column" },
                children: [
                  {
                    type: "div",
                    props: {
                        style: {
                          fontFamily: "Noto Sans SC",
                          fontSize: 22,
                          color: accent,
                          letterSpacing: 2.4,
                          width: 640,
                        },
                        children: kicker,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        width: 56,
                        height: 3,
                        background: accent,
                        marginTop: 16,
                        marginBottom: 22,
                      },
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontFamily: "Noto Serif SC",
                        fontSize: size,
                        fontWeight: 700,
                        lineHeight: 1.28,
                        color: ink,
                        width: 640,
                      },
                      children: title,
                    },
                  },
                  description
                    ? {
                        type: "div",
                        props: {
                          style: {
                            fontFamily: "Noto Sans SC",
                            fontSize: 26,
                            lineHeight: 1.55,
                            color: muted,
                            marginTop: 22,
                            width: 640,
                          },
                          children: description,
                        },
                      }
                    : null,
                ].filter(Boolean),
              },
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 72,
              bottom: 36,
              width: 640,
              display: "flex",
              flexDirection: "column",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "100%",
                    height: 1,
                    background: line,
                    marginBottom: 16,
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center" },
                        children: [
                          mark(),
                          {
                            type: "div",
                            props: {
                              style: {
                                fontFamily: "Noto Sans SC",
                                fontSize: 20,
                                color: muted,
                                marginLeft: 14,
                              },
                              children: footer,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: "Noto Sans SC",
                          fontSize: 20,
                          color: accent,
                        },
                        children: host,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function loadFonts() {
  const files = [
    ["Noto Serif SC", "noto-serif-sc-chinese-simplified-700-normal.woff", 700],
    ["Noto Serif SC", "noto-serif-sc-latin-700-normal.woff", 700],
    ["Noto Serif SC", "noto-serif-sc-latin-ext-700-normal.woff", 700],
    ["Noto Sans SC", "noto-sans-sc-chinese-simplified-400-normal.woff", 400],
    ["Noto Sans SC", "noto-sans-sc-latin-400-normal.woff", 400],
    ["Noto Sans SC", "noto-sans-sc-latin-ext-400-normal.woff", 400],
  ];
  const fonts = [];
  for (const [name, file, weight] of files) {
    fonts.push({
      name,
      data: await readFile(join(fontDir, file)),
      weight,
      style: "normal",
    });
  }
  return fonts;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  let current = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      current = null;
      continue;
    }
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && current) {
      data[current].push(unquote(item[1]));
      continue;
    }
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    const [, key, rest] = field;
    if (rest.trim() === "" || rest.trim() === "|" || rest.trim() === ">") {
      data[key] = [];
      current = key;
      continue;
    }
    current = null;
    if (rest.trim() === "true") data[key] = true;
    else if (rest.trim() === "false" || rest.trim() === "[]") data[key] = rest.trim() === "[]" ? [] : false;
    else data[key] = unquote(rest);
  }
  return data;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.mdx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

async function posts() {
  const base = join(root, "src/content/posts");
  const files = await walk(base);
  const list = [];
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const data = parseFrontmatter(raw);
    if (data.draft === true) continue;
    const id = relative(base, file).replace(/\.mdx?$/, "").split(sep).join("/");
    list.push({
      id,
      title: String(data.title ?? id),
      description: typeof data.description === "string" ? data.description : "",
      date: typeof data.date === "string" ? data.date : "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      cover: typeof data.cover === "string" ? data.cover : "",
    });
  }
  return list;
}

async function render(node, fonts) {
  const svg = await satori(node, {
    width: 1200,
    height: 630,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  return resvg.render().asPng();
}

async function writePng(pathname, png) {
  const file = join(outDir, pathname.slice(1));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, png);
  console.log(`og ${pathname}`);
}

const fonts = await loadFonts();
const hostLabel = site.introMeta || site.title;

await writePng(
  generatedOgPath(),
  await render(
    card({
      kicker: site.author,
      title: clip(site.title, 28),
      description: clip(site.description, 52),
      footer: hostLabel,
    }),
    fonts,
  ),
);

for (const post of await posts()) {
  if (coverIsRaster(post.cover)) continue;
  const tag = post.tags.slice(0, 2).join(" · ");
  const kicker = [post.date ? formatDate(post.date) : "", tag].filter(Boolean).join("  ·  ") || "笔记";
  await writePng(
    generatedOgPath(post.id),
    await render(
      card({
        kicker: clip(kicker, 36),
        title: clip(post.title, 34),
        description: post.description.trim() ? clip(post.description, 52) : "",
        footer: site.title,
      }),
      fonts,
    ),
  );
}
