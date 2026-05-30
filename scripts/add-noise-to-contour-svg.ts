import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const inputPath = path.join(root, "assets", "loop_contour_trace_smooth_sm.svg");
const outputPath = path.join(root, "assets", "loop_contour_trace_smooth_sm_noise.svg");

async function main(): Promise<void> {
  const source = await readFile(inputPath, "utf8");
  const d = source.match(/<path\b[^>]*\sd="([\s\S]*?)"/)?.[1];
  if (!d) throw new Error("Could not find path data in loop_contour_trace_smooth_sm.svg");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">
  <title id="title">Elecmonkey Loop Contour Smooth Noise</title>
  <desc id="desc">A smoothed Elecmonkey loop contour with clipped grain noise texture.</desc>
  <defs>
    <linearGradient id="warmBrown" x1="122" y1="142" x2="904" y2="858" gradientUnits="userSpaceOnUse">
      <stop stop-color="#A56E36" />
      <stop offset="0.48" stop-color="#87551F" />
      <stop offset="1" stop-color="#A66B30" />
    </linearGradient>
    <filter id="grain" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="23" result="noise" />
      <feColorMatrix in="noise" type="matrix" values="0.55 0 0 0 0.22 0 0.55 0 0 0.12 0 0 0.55 0 0.03 0 0 0 0.62 0" result="brownNoise" />
      <feComposite in="brownNoise" in2="SourceAlpha" operator="in" result="clippedNoise" />
      <feBlend in="SourceGraphic" in2="clippedNoise" mode="multiply" />
    </filter>
    <filter id="speckles" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="71" result="fineNoise" />
      <feComponentTransfer in="fineNoise" result="dots">
        <feFuncR type="discrete" tableValues="0 0 0 0.55 1" />
        <feFuncG type="discrete" tableValues="0 0 0 0.38 0.76" />
        <feFuncB type="discrete" tableValues="0 0 0 0.18 0.36" />
        <feFuncA type="discrete" tableValues="0 0 0 0.18 0.42" />
      </feComponentTransfer>
      <feComposite in="dots" in2="SourceAlpha" operator="in" />
    </filter>
  </defs>
  <path fill="url(#warmBrown)" fill-rule="evenodd" filter="url(#grain)" d="
    ${d.trim()}
  "/>
  <path fill="#C28A4D" fill-rule="evenodd" opacity="0.45" filter="url(#speckles)" d="
    ${d.trim()}
  "/>
</svg>
`;

  await writeFile(outputPath, svg);
}

await main();
