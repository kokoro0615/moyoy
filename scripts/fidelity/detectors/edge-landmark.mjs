const AXES = new Set(["x", "y"]);

/**
 * Finds the median of the strongest perpendicular luminance edges in a normalized
 * region of interest. Sampling each perpendicular line prevents an irregular contour
 * from being averaged away. The exact same function is executed for the approved
 * reference and the build capture; no implementation-only coordinate is accepted.
 */
export function detectLandmark({ data, width, height, channels = 3, parameters }) {
  assertRaster(data, width, height, channels);
  const axis = parameters?.axis;
  if (!AXES.has(axis)) throw new Error("parameters.axis must be x or y");
  const roi = normalizeRoi(parameters?.roi, width, height);
  const first = axis === "x" ? roi.x + 1 : roi.y + 1;
  const last = axis === "x" ? roi.x + roi.width - 1 : roi.y + roi.height - 1;
  if (last <= first) throw new Error("landmark ROI is too small for an edge scan");

  const samples = [];
  const perpendicularFirst = axis === "x" ? roi.y : roi.x;
  const perpendicularLast =
    perpendicularFirst + (axis === "x" ? roi.height : roi.width) - 1;
  for (
    let perpendicular = perpendicularFirst;
    perpendicular <= perpendicularLast;
    perpendicular += 1
  ) {
    samples.push(
      strongestGradient({
        axis,
        channels,
        data,
        first,
        last,
        perpendicular,
        width,
      }),
    );
  }

  const bestPosition = median(samples.map((sample) => sample.position));
  const bestSignedGradient = median(samples.map((sample) => sample.signedGradient));
  const bestMagnitude = median(samples.map((sample) => sample.magnitude));

  return {
    axis,
    position: bestPosition,
    normalizedPosition: bestPosition / (axis === "x" ? width : height),
    confidence: bestMagnitude / 255,
    signedGradient: bestSignedGradient / 255,
    roi,
  };
}

function strongestGradient({
  axis,
  channels,
  data,
  first,
  last,
  perpendicular,
  width,
}) {
  let result = { magnitude: -1, position: first, signedGradient: 0 };
  for (let position = first; position <= last; position += 1) {
    const currentIndex =
      axis === "x"
        ? (perpendicular * width + position) * channels
        : (position * width + perpendicular) * channels;
    const previousIndex =
      axis === "x" ? currentIndex - channels : currentIndex - width * channels;
    const signedGradient =
      luminance(data, currentIndex) - luminance(data, previousIndex);
    const magnitude = Math.abs(signedGradient);
    if (magnitude > result.magnitude) {
      result = { magnitude, position, signedGradient };
    }
  }
  return result;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function normalizeRoi(value, width, height) {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((entry) => !Number.isFinite(entry) || entry < 0 || entry > 1)
  ) {
    throw new Error("parameters.roi must be four normalized numbers in [0, 1]");
  }
  const [x, y, roiWidth, roiHeight] = value;
  if (roiWidth <= 0 || roiHeight <= 0 || x + roiWidth > 1 || y + roiHeight > 1) {
    throw new Error("parameters.roi must be a positive rectangle within the raster");
  }
  const left = Math.min(width - 1, Math.floor(x * width));
  const top = Math.min(height - 1, Math.floor(y * height));
  const right = Math.max(left + 1, Math.min(width, Math.ceil((x + roiWidth) * width)));
  const bottom = Math.max(
    top + 1,
    Math.min(height, Math.ceil((y + roiHeight) * height)),
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function luminance(buffer, index) {
  return (
    buffer[index] * 0.2126 + buffer[index + 1] * 0.7152 + buffer[index + 2] * 0.0722
  );
}

function assertRaster(data, width, height, channels) {
  if (!Buffer.isBuffer(data) && !(data instanceof Uint8Array)) {
    throw new Error("data must be an 8-bit raster buffer");
  }
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Number.isInteger(channels) ||
    width <= 1 ||
    height <= 1 ||
    channels < 3 ||
    data.length !== width * height * channels
  ) {
    throw new Error("invalid raster dimensions");
  }
}
