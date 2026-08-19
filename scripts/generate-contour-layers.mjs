import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * DA-MOTION-01 asks for objects that scroll with small relative offsets, and the design
 * annotation ledger binds that record to the contour objects. A single raster cannot
 * express per-object offsets, so every approved contour export is split into one file per
 * contour path. The viewBox, the `<defs>` block and each path's own attributes are copied
 * verbatim, so restacking the layers at rest reproduces the source drawing exactly.
 */

const root = process.cwd();
const vectorRoot = "public/assets/moyoy-candidate/vector";

const sources = [
  "pc-contours-hero",
  "pc-contours-product",
  "pc-contours-footer",
  "sp-contours-hero",
  "sp-contours-product",
  "sp-contours-footer",
];

const svgOpenPattern = /<svg\b[^>]*>/;
const defsPattern = /<defs>[\s\S]*?<\/defs>/;
const pathPattern = /<path\b[^>]*\/>/g;

function layerPath(name, index) {
  return join(vectorRoot, `${name}-layer-${index + 1}.svg`);
}

async function splitSource(name) {
  const source = await readFile(join(root, vectorRoot, `${name}.svg`), "utf8");
  const svgOpen = source.match(svgOpenPattern)?.[0];
  if (!svgOpen) throw new Error(`${name}.svg has no <svg> element`);
  const defs = source.match(defsPattern)?.[0] ?? "";
  const paths = source.match(pathPattern) ?? [];
  if (paths.length < 2) throw new Error(`${name}.svg has fewer than two contour paths`);

  const written = [];
  for (const [index, path] of paths.entries()) {
    const file = layerPath(name, index);
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      svgOpen.replace(/\sid="[^"]*"/, ` id="_layer_${index + 1}"`),
      defs ? `  ${defs}` : "",
      `  ${path}`,
      "</svg>",
      "",
    ]
      .filter((line) => line !== "")
      .join("\n");
    await writeFile(join(root, file), body, "utf8");
    written.push(file);
  }
  return written;
}

const written = [];
for (const name of sources) written.push(...(await splitSource(name)));

process.stdout.write(
  `generate-contour-layers: wrote ${written.length} contour layers\n${written
    .map((file) => `  ${file}`)
    .join("\n")}\n`,
);
