import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SvgAttrs = Record<string, string>;

const root = path.resolve(import.meta.dir, "..");
const assets = path.join(root, "assets");
const sourcePath = path.join(assets, "developer-card.svg");
const outputPath = path.join(assets, "card-full.svg");

function attrsToString(attrs: SvgAttrs): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
}

function inlineSvg(svg: string, attrs: SvgAttrs): string {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const inlineAttrs = { fill: "#24292f", ...attrs };
  const body = svg
    .replace(/<\?xml[^>]*>\s*/g, "")
    .replace(/<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();

  return `<svg ${attrsToString(inlineAttrs)}${viewBox ? ` viewBox="${viewBox}"` : ""}>${body}</svg>`;
}

function attrsFromImage(rawAttrs: string): SvgAttrs {
  return Object.fromEntries(
    [...rawAttrs.matchAll(/\s([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
  );
}

async function main(): Promise<void> {
  let card = await readFile(sourcePath, "utf8");

  const icon = await readFile(path.join(assets, "icon.png"));
  card = card.replace(
    /<image href="\.\/icon\.png"([^>]*)\/>/,
    `<image href="data:image/png;base64,${icon.toString("base64")}"$1/>`,
  );

  const svgFiles = [
    "typescript-plain.svg",
    "rust-original.svg",
    "go-original-wordmark.svg",
  ];

  for (const file of svgFiles) {
    const svg = await readFile(path.join(assets, file), "utf8");
    const pattern = new RegExp(`<image href="\\./${file.replaceAll(".", "\\.")}"([^>]*)\\/>`, "g");
    card = card.replace(pattern, (_, rawAttrs: string) => inlineSvg(svg, attrsFromImage(rawAttrs)));
  }

  await writeFile(outputPath, `${card.trim()}\n`);
}

await main();
