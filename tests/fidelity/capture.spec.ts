import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { settleMenu } from "../support/menu";

// @ts-expect-error The runtime-validated MJS contract intentionally has no public declaration file.
import * as runContract from "../../scripts/fidelity-run-contract.mjs";
import {
  prepareCaptureRun,
  publishIdenticalOrCreate,
  readPreparedArtifact,
  type PreparedCaptureDestination,
} from "./fidelity-artifact-store";

interface AbsoluteScrollStrategy {
  readonly kind: "absolute";
  readonly x: number;
  readonly y: number;
}

interface SelectorAnchorScrollStrategy {
  readonly block: "start" | "center" | "end";
  readonly inline: "start" | "center" | "end" | "nearest";
  readonly kind: "selector-anchor";
  readonly offsetX: number;
  readonly offsetY: number;
}

interface SemanticObservationContract {
  readonly expected: {
    readonly attributes: Readonly<Record<string, string>>;
    readonly stateId: string;
    readonly visible: true;
  };
  readonly id: string;
  readonly landmarkIds: readonly string[];
  readonly reason: string;
  readonly regionIds: readonly string[];
  readonly scrollStrategy: AbsoluteScrollStrategy | SelectorAnchorScrollStrategy;
  readonly selector: string;
  readonly semantic: string;
  readonly status: "approved" | "blocked";
}

interface FidelityFrame {
  readonly actualFile: string;
  readonly capture: { readonly fullPage: boolean };
  readonly id: string;
  readonly label: string;
  readonly readiness: {
    readonly images: "decode";
    readonly selector: string;
  };
  readonly route: string;
  readonly scroll: { readonly x: number; readonly y: number } | null;
  readonly semanticObservation: SemanticObservationContract;
  readonly state: {
    readonly control?: string;
    readonly id: string;
    readonly setup: "none" | "open-menu";
  };
  readonly viewport: { readonly height: number; readonly width: number };
}

interface FidelityConfig {
  readonly foundationOnly: boolean;
  readonly captureArtifacts: {
    readonly runManifestFile: "capture-run-manifest.json";
    readonly runsRoot: "artifacts/fidelity/captures/runs";
    readonly schemaVersion: 1;
  };
  readonly captureEnvironment: {
    readonly colorScheme: "light";
    readonly deviceScaleFactor: 1;
    readonly locale: "ja-JP";
    readonly timezoneId: "Asia/Tokyo";
  };
  readonly frames: readonly FidelityFrame[];
  readonly schemaVersion: number;
}

interface SemanticObservationResult {
  readonly expected: SemanticObservationContract["expected"];
  readonly failures: readonly string[];
  readonly id: string;
  readonly landmarkResultIds: readonly string[];
  readonly observed: {
    readonly attributes: Readonly<Record<string, string | null>>;
    readonly bounds: {
      readonly height: number;
      readonly width: number;
      readonly x: number;
      readonly y: number;
    };
    readonly scroll: { readonly x: number; readonly y: number };
    readonly selectorCount: number;
    readonly viewportIntersection: { readonly height: number; readonly width: number };
    readonly visible: boolean;
  };
  readonly regionResultIds: readonly string[];
  readonly scrollStrategy: SemanticObservationContract["scrollStrategy"];
  readonly selector: string;
  readonly semantic: string;
  readonly status: "PASS" | "FAIL";
}

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const { createCaptureRunIdentity, validateCaptureArtifactContract } = runContract;
const root = process.cwd();
const server = {
  command: "corepack pnpm start:test",
  origin: "http://127.0.0.1:4173",
  ownedByPlaywright: true,
  pid: null,
  pidEvidence: "Playwright does not expose the owned webServer PID to test code.",
  reuseExistingServer: false,
} as const;
const configBytes = await readFile(resolve(root, "fidelity.config.json"));
const config = JSON.parse(configBytes.toString("utf8")) as FidelityConfig;
validateCaptureConfig(config);
const configSha256 = sha256(configBytes);
const buildId = await readOptionalText(".next/BUILD_ID");
if (!buildId) throw new Error("A completed Next.js build is required before capture");
const sourceRevision = readSourceRevision();
const sourceState = readSourceState(sourceRevision);
const captureRunIdentity = createCaptureRunIdentity({
  build: { id: buildId },
  captureEnvironment: config.captureEnvironment,
  configSha256,
  server,
  source: { revision: sourceRevision, state: sourceState },
});
const captureRun = await prepareCaptureRun(
  root,
  config.captureArtifacts,
  config.frames,
  captureRunIdentity,
);
const destinationsByFrameId = new Map(
  captureRun.frames.map((destination) => [destination.frameId, destination]),
);

for (const frame of config.frames) {
  const destination = requiredDestination(destinationsByFrameId, frame.id);
  test(`captures ${frame.label} deterministically`, async ({ browser, page }) => {
    await page.setViewportSize(frame.viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto(frame.route, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    if (frame.state.setup === "open-menu") {
      const control = page.locator(frame.state.control ?? "");
      expect(await control.count()).toBe(1);
      await control.click();
      await settleMenu(page);
    }
    await page.locator(frame.readiness.selector).waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}",
    });

    const semanticObservationResult = await executeSemanticObservation(page, frame);
    expect(semanticObservationResult.failures).toEqual([]);
    expect(semanticObservationResult.status).toBe("PASS");
    await page.evaluate(async () => {
      const viewportImages = [...document.images].filter((image) => {
        const bounds = image.getBoundingClientRect();
        return (
          bounds.bottom > 0 &&
          bounds.right > 0 &&
          bounds.top < window.innerHeight &&
          bounds.left < window.innerWidth
        );
      });
      await Promise.all(viewportImages.map((image) => image.decode()));
    });

    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: frame.capture.fullPage,
    });
    const capturePublication = await publishIdenticalOrCreate(
      destination.actual,
      screenshot,
    );
    const provenance = {
      version: 3,
      kind: "fidelity-capture-provenance",
      frameId: frame.id,
      frameLabel: frame.label,
      actual: destination.actual.logical,
      actualFile: frame.actualFile,
      actualSha256: capturePublication.sha256,
      browser: { name: "chromium", version: browser.version() },
      build: {
        id: buildId,
        sourceRevision,
        sourceState,
      },
      capture: {
        colorScheme: config.captureEnvironment.colorScheme,
        deviceScaleFactor: config.captureEnvironment.deviceScaleFactor,
        fullPage: frame.capture.fullPage,
        locale: config.captureEnvironment.locale,
        reducedMotion: "reduce",
        route: frame.route,
        scroll: semanticObservationResult.observed.scroll,
        scrollStrategy: frame.semanticObservation.scrollStrategy,
        state: frame.state.id,
        timezoneId: config.captureEnvironment.timezoneId,
        viewport: frame.viewport,
      },
      configSha256,
      run: { id: captureRun.id, identity: captureRun.identity.identity },
      semanticObservationResult,
      server,
    };
    const sidecar = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
    await publishIdenticalOrCreate(destination.provenance, sidecar);
  });
}

test("publishes the complete immutable capture run manifest", async () => {
  const frames = [];
  for (const frame of config.frames) {
    const destination = requiredDestination(destinationsByFrameId, frame.id);
    const actualBytes = await readPreparedArtifact(destination.actual);
    const provenanceBytes = await readPreparedArtifact(destination.provenance);
    const provenance = JSON.parse(provenanceBytes.toString("utf8"));
    expect(provenance).toMatchObject({
      actual: destination.actual.logical,
      actualFile: frame.actualFile,
      actualSha256: sha256(actualBytes),
      configSha256,
      frameId: frame.id,
      run: { id: captureRun.id, identity: captureRun.identity.identity },
    });
    frames.push({
      id: frame.id,
      label: frame.label,
      actual: { path: destination.actual.logical, sha256: sha256(actualBytes) },
      provenance: {
        path: destination.provenance.logical,
        sha256: sha256(provenanceBytes),
      },
    });
  }
  const manifest = {
    schemaVersion: 1,
    kind: "fidelity-capture-run-manifest",
    status: "COMPLETE",
    run: { id: captureRun.id, identity: captureRun.identity.identity },
    config: { path: "fidelity.config.json", sha256: configSha256 },
    source: { revision: sourceRevision, state: sourceState },
    build: { id: buildId },
    server,
    captureEnvironment: config.captureEnvironment,
    frames,
    failures: [],
  };
  await publishIdenticalOrCreate(
    captureRun.manifest,
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  );
});

async function executeSemanticObservation(
  page: Page,
  frame: FidelityFrame,
): Promise<SemanticObservationResult> {
  const contract = frame.semanticObservation;
  const locator = page.locator(contract.selector);
  const selectorCount = await locator.count();
  if (selectorCount === 1) {
    await locator.waitFor({ state: "visible" });
  }

  if (contract.scrollStrategy.kind === "absolute") {
    await page.evaluate(({ x, y }) => window.scrollTo(x, y), contract.scrollStrategy);
  } else if (selectorCount === 1) {
    await locator.evaluate((element, strategy) => {
      const rectangle = element.getBoundingClientRect();
      const horizontal = anchoredCoordinate(
        rectangle.left + window.scrollX,
        rectangle.right + window.scrollX,
        window.innerWidth,
        window.scrollX,
        strategy.inline,
      );
      const vertical = anchoredCoordinate(
        rectangle.top + window.scrollY,
        rectangle.bottom + window.scrollY,
        window.innerHeight,
        window.scrollY,
        strategy.block,
      );
      window.scrollTo(
        Math.round(horizontal + strategy.offsetX),
        Math.round(vertical + strategy.offsetY),
      );

      function anchoredCoordinate(
        start: number,
        end: number,
        viewportSize: number,
        current: number,
        anchor: "start" | "center" | "end" | "nearest",
      ): number {
        if (anchor === "start") return start;
        if (anchor === "center") return (start + end - viewportSize) / 2;
        if (anchor === "end") return end - viewportSize;
        if (start >= current && end <= current + viewportSize) return current;
        return Math.abs(start - current) <= Math.abs(end - (current + viewportSize))
          ? start
          : end - viewportSize;
      }
    }, contract.scrollStrategy);
  }
  await page.evaluate(() => new Promise(requestAnimationFrame));

  const attributeNames = Object.keys(contract.expected.attributes).sort();
  const visible = selectorCount === 1 ? await locator.isVisible() : false;
  const observed =
    selectorCount === 1
      ? await locator.evaluate((element, names) => {
          const rectangle = element.getBoundingClientRect();
          return {
            attributes: Object.fromEntries(
              names.map((name) => [name, element.getAttribute(name)]),
            ),
            bounds: {
              height: rectangle.height,
              width: rectangle.width,
              x: rectangle.x,
              y: rectangle.y,
            },
            scroll: { x: window.scrollX, y: window.scrollY },
            viewportIntersection: {
              height: Math.max(
                0,
                Math.min(rectangle.bottom, window.innerHeight) -
                  Math.max(rectangle.top, 0),
              ),
              width: Math.max(
                0,
                Math.min(rectangle.right, window.innerWidth) -
                  Math.max(rectangle.left, 0),
              ),
            },
          };
        }, attributeNames)
      : {
          attributes: Object.fromEntries(attributeNames.map((name) => [name, null])),
          bounds: { height: 0, width: 0, x: 0, y: 0 },
          scroll: await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
          viewportIntersection: { height: 0, width: 0 },
        };
  const failures: string[] = [];
  if (selectorCount !== 1)
    failures.push("semantic selector did not resolve exactly once");
  if (!visible) failures.push("semantic selector is not visible");
  if (observed.bounds.width <= 0 || observed.bounds.height <= 0) {
    failures.push("semantic selector has no positive bounds");
  }
  if (
    observed.viewportIntersection.width <= 0 ||
    observed.viewportIntersection.height <= 0
  ) {
    failures.push("semantic selector has no viewport intersection");
  }
  for (const [name, value] of Object.entries(contract.expected.attributes)) {
    if (observed.attributes[name] !== value) {
      failures.push(`semantic selector attribute ${name} does not match`);
    }
  }
  if (
    contract.scrollStrategy.kind === "absolute" &&
    (observed.scroll.x !== contract.scrollStrategy.x ||
      observed.scroll.y !== contract.scrollStrategy.y)
  ) {
    failures.push("absolute semantic scroll result does not match its contract");
  }

  return {
    id: contract.id,
    semantic: contract.semantic,
    status: failures.length === 0 ? "PASS" : "FAIL",
    selector: contract.selector,
    scrollStrategy: contract.scrollStrategy,
    expected: contract.expected,
    observed: { ...observed, selectorCount, visible },
    landmarkResultIds: contract.landmarkIds,
    regionResultIds: contract.regionIds,
    failures,
  };
}

function validateCaptureConfig(config: FidelityConfig): void {
  const failures: string[] = [];
  if (config.schemaVersion !== 2) failures.push("schemaVersion must equal 2");
  if (config.foundationOnly !== false) {
    failures.push(
      "external-reference capture is blocked while foundationOnly=true; implement the approved production DOM and set foundationOnly=false before capture",
    );
  }
  if (
    JSON.stringify(config.captureEnvironment) !==
    JSON.stringify({
      colorScheme: "light",
      deviceScaleFactor: 1,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    })
  ) {
    failures.push("captureEnvironment must equal the deterministic contract");
  }
  if (!Array.isArray(config.frames) || config.frames.length === 0) {
    failures.push("frames must contain at least one capture contract");
  }
  try {
    validateCaptureArtifactContract(config.captureArtifacts);
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : "captureArtifacts is invalid",
    );
  }
  const frameIds = new Set<string>();
  const observationIds = new Set<string>();
  for (const frame of config.frames ?? []) {
    validateSafeId(frame.id, "frame id", failures);
    validateSafeId(frame.label, `${frame.id} label`, failures);
    if (frame.actualFile !== `${frame.label}.png`) {
      failures.push(`${frame.id} actualFile must equal its deterministic label PNG`);
    }
    if (frameIds.has(frame.id)) failures.push(`duplicate frame id: ${frame.id}`);
    frameIds.add(frame.id);
    if (!/^\/[A-Za-z0-9/_-]*$/.test(frame.route)) {
      failures.push(`${frame.id} route is not a safe application path`);
    }
    if (
      !Number.isInteger(frame.viewport?.width) ||
      !Number.isInteger(frame.viewport?.height) ||
      frame.viewport.width <= 0 ||
      frame.viewport.height <= 0
    ) {
      failures.push(`${frame.id} viewport is invalid`);
    }
    if (!["none", "open-menu"].includes(frame.state?.setup)) {
      failures.push(`${frame.id} setup is unsupported`);
    }
    if (
      frame.state?.setup === "open-menu" &&
      !validSelector(frame.state.control ?? "")
    ) {
      failures.push(`${frame.id} open-menu control is invalid`);
    }
    if (
      frame.readiness?.images !== "decode" ||
      !validSelector(frame.readiness.selector)
    ) {
      failures.push(`${frame.id} readiness contract is invalid`);
    }
    if (typeof frame.capture?.fullPage !== "boolean") {
      failures.push(`${frame.id} capture mode is invalid`);
    }

    const observation = frame.semanticObservation;
    if (!observation) {
      failures.push(`${frame.id} semanticObservation is missing`);
      continue;
    }
    validateSafeId(observation.id, `${frame.id} semantic observation id`, failures);
    validateSafeId(observation.semantic, `${frame.id} semantic`, failures);
    if (observationIds.has(observation.id)) {
      failures.push(`duplicate semantic observation id: ${observation.id}`);
    }
    observationIds.add(observation.id);
    if (!validSelector(observation.selector)) {
      failures.push(`${frame.id} semantic selector is invalid`);
    }
    if (
      observation.expected?.visible !== true ||
      observation.expected?.stateId !== frame.state?.id ||
      !validExpectedAttributes(observation.expected?.attributes)
    ) {
      failures.push(`${frame.id} expected semantic state is invalid`);
    }
    validateResultIds(observation.landmarkIds, `${frame.id} landmarkIds`, failures);
    validateResultIds(observation.regionIds, `${frame.id} regionIds`, failures);
    const strategy = observation.scrollStrategy;
    const isTopSemantic = ["top", "menu-open"].includes(observation.semantic);
    if (strategy?.kind === "absolute") {
      if (
        !isTopSemantic ||
        !integerCoordinate(strategy.x) ||
        !integerCoordinate(strategy.y) ||
        frame.scroll?.x !== strategy.x ||
        frame.scroll?.y !== strategy.y
      ) {
        failures.push(`${frame.id} absolute semantic scroll contract is invalid`);
      }
    } else if (strategy?.kind === "selector-anchor") {
      if (
        isTopSemantic ||
        frame.scroll !== null ||
        !["start", "center", "end"].includes(strategy.block) ||
        !["start", "center", "end", "nearest"].includes(strategy.inline) ||
        !integerCoordinate(strategy.offsetX, true) ||
        !integerCoordinate(strategy.offsetY, true)
      ) {
        failures.push(`${frame.id} selector-anchor scroll contract is invalid`);
      }
    } else {
      failures.push(`${frame.id} semantic scroll strategy is missing`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Fidelity capture configuration is invalid:\n- ${failures.join("\n- ")}`,
    );
  }
}

function validSelector(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value.normalize("NFKC") === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validExpectedAttributes(
  value: unknown,
): value is Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(
      ([name, attributeValue]) =>
        /^(?:aria|data)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) &&
        typeof attributeValue === "string" &&
        attributeValue.normalize("NFKC") === attributeValue,
    )
  );
}

function validateResultIds(
  value: readonly string[] | undefined,
  label: string,
  failures: string[],
): void {
  if (!Array.isArray(value) || new Set(value).size !== value.length) {
    failures.push(`${label} must be a unique array`);
    return;
  }
  for (const id of value) validateSafeId(id, label, failures);
}

function validateSafeId(value: unknown, label: string, failures: string[]): void {
  if (
    typeof value !== "string" ||
    value.length > 96 ||
    value.normalize("NFKC") !== value ||
    !SAFE_ID.test(value)
  ) {
    failures.push(`${label} is not a safe artifact id`);
  }
}

function integerCoordinate(value: unknown, allowNegative = false): value is number {
  return Number.isInteger(value) && (allowNegative || Number(value) >= 0);
}

function requiredDestination(
  destinations: ReadonlyMap<string, PreparedCaptureDestination>,
  frameId: string,
): PreparedCaptureDestination {
  const destination = destinations.get(frameId);
  if (!destination) throw new Error(`Missing prepared destination for ${frameId}`);
  return destination;
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readOptionalText(path: string): Promise<string | null> {
  try {
    return (await readFile(resolve(root, path), "utf8")).trim() || null;
  } catch {
    return null;
  }
}

function readSourceRevision(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readSourceState(revision: string | null): "clean" | "dirty" | "uncommitted" {
  if (!revision) return "uncommitted";
  try {
    const status = execFileSync("git", ["status", "--porcelain=v1"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return status ? "dirty" : "clean";
  } catch {
    return "dirty";
  }
}
