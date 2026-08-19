import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetRoot = "public/assets/moyoy-candidate";
const headers = [
  "asset_id",
  "public_path",
  "role",
  "natural_dimensions",
  "bytes",
  "sha256",
  "color_source",
  "owner",
  "license",
  "status",
  "intended_output",
  "loading",
  "alt_intent",
  "public_policy",
];

function csv(value) {
  const normalized = String(value);
  return /[",\n]/.test(normalized)
    ? '"' + normalized.replaceAll('"', '""') + '"'
    : normalized;
}

async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesIn(path)));
    else if ([".svg", ".webp", ".woff2"].includes(extname(entry.name).toLowerCase())) {
      result.push(path);
    }
  }
  return result;
}

function describe(path) {
  const extension = extname(path).toLowerCase();
  const name = path.split("/").at(-1);
  if (extension === ".woff2") {
    return {
      alt: "not applicable",
      color: "OFL variable webfont subset",
      dimensions: "font file",
      intended: "self-hosted licensed webfont subset",
      license: "SIL Open Font License 1.1",
      loading: name.includes("noto")
        ? "preload + font-display: swap"
        : "font-display: swap",
      owner: "upstream font authors",
      role: "licensed webfont",
    };
  }
  if (path.includes("/mask/")) {
    return {
      alt: "empty structural mask; aria-hidden",
      color: "sRGB alpha-only derivative",
      dimensions: null,
      intended: "CSS alpha mask for one chapter silhouette",
      license: "client-confirmed paid web-use derivative",
      loading: "CSS-referenced lightweight mask",
      owner: "client-confirmed",
      role: "chapter alpha mask",
    };
  }
  if (path.includes("/photo/")) {
    const match = name.match(/(?:pc|sp)(?:-\d+)?-(root|dusk|dawn|alpine)/);
    const chapter = match?.[1] ?? "chapter";
    const alt =
      chapter === "root"
        ? "deep green forest with a bent tree"
        : chapter === "dusk"
          ? "orange sun over a mountain landscape"
          : chapter === "dawn"
            ? "sunbeams through a green forest"
            : "snow-covered alpine ridges";
    return {
      alt,
      color: "sRGB derivative with private metadata stripped",
      dimensions: null,
      intended: "full-bleed " + chapter + " art-directed WebP",
      license: "client-confirmed paid web-use permission",
      loading: "lazy with explicit responsive source",
      owner: "client-confirmed",
      role: chapter + " chapter photograph",
    };
  }
  return {
    alt: "empty decorative SVG; aria-hidden",
    color: "SVG vector derivative",
    dimensions: null,
    intended: "decorative or product linework SVG",
    license: "client-confirmed web-use permission",
    loading: "static or lazy with semantic parent",
    owner: "client-confirmed",
    role: "brand contour or product vector",
  };
}

const rows = [headers];
for (const path of (await filesIn(assetRoot)).sort()) {
  const absolutePath = join(root, path);
  const bytes = await readFile(absolutePath);
  const description = describe(path);
  if (!description.dimensions) {
    const metadata = await sharp(absolutePath).metadata();
    description.dimensions = metadata.width + "x" + metadata.height;
  }
  rows.push([
    "candidate-" +
      relative(assetRoot, path)
        .replaceAll("/", "-")
        .replace(/\.[^.]+$/, ""),
    path,
    description.role,
    description.dimensions,
    bytes.length,
    createHash("sha256").update(bytes).digest("hex"),
    description.color,
    description.owner,
    description.license,
    "approved-production-derivative",
    description.intended,
    description.loading,
    description.alt,
    "approved-production-asset",
  ]);
}

rows.push(
  [
    "news-placeholders",
    "—",
    "NEWS placeholder set",
    "multiple",
    "—",
    "—",
    "RGB/RGBA reference material",
    "unverified",
    "unverified",
    "placeholder",
    "none until article assets and copy are approved",
    "none",
    "TBD from approved article context",
    "exclude",
  ],
  [
    "reference-fonts",
    "—",
    "reference-only type roles",
    "font files not supplied",
    "—",
    "—",
    "reference font only",
    "not used",
    "not applicable",
    "reference-only-fallback-approved",
    "metric-compatible local fallback",
    "none",
    "not applicable",
    "exclude-reference-font",
  ],
  [
    "icon-instagram",
    "—",
    "third-party Instagram mark",
    "vector",
    "—",
    "—",
    "third-party trademark",
    "third-party",
    "unverified",
    "exclude",
    "none",
    "none",
    "not shipped; account name renders as text",
    "exclude",
  ],
);

await writeFile(
  join(root, "docs/asset-provenance.csv"),
  rows.map((row) => row.map(csv).join(",")).join("\n") + "\n",
);
