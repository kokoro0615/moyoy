import assert from "node:assert/strict";
import test from "node:test";

import { detectLandmark } from "../../scripts/fidelity/detectors/edge-landmark.mjs";

test("detects the same boundary symmetrically in reference and implementation rasters", () => {
  const reference = splitRaster(40, 20, 17);
  const implementation = splitRaster(40, 20, 19);
  const parameters = { axis: "x", roi: [0.2, 0.1, 0.6, 0.8] };

  const expected = detectLandmark({ ...reference, parameters });
  const actual = detectLandmark({ ...implementation, parameters });

  assert.equal(expected.position, 17);
  assert.equal(actual.position, 19);
  assert.equal(Math.abs(expected.position - actual.position), 2);
  assert.ok(expected.confidence > 0.7);
  assert.ok(actual.confidence > 0.7);
});

test("rejects a non-normalized or out-of-bounds ROI", () => {
  const raster = splitRaster(10, 10, 5);
  assert.throws(
    () =>
      detectLandmark({ ...raster, parameters: { axis: "x", roi: [0.8, 0, 0.4, 1] } }),
    /within the raster/,
  );
});

test("finds the median position of an irregular boundary without averaging it away", () => {
  const raster = irregularHorizontalRaster(120, 80);
  const result = detectLandmark({
    ...raster,
    parameters: { axis: "y", roi: [0, 0.05, 1, 0.9] },
  });

  assert.ok(result.position >= 29 && result.position <= 31);
  assert.ok(result.confidence > 0.7);
});

function splitRaster(width, height, boundary) {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < boundary ? 24 : 224;
      const index = (y * width + x) * channels;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
    }
  }
  return { channels, data, height, width };
}

function irregularHorizontalRaster(width, height) {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const boundary = 10 + (x % 41);
      const value = y < boundary ? 24 : 224;
      const index = (y * width + x) * channels;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
    }
  }
  return { channels, data, height, width };
}
