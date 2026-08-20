# Edge probe 5 — measurement specification

Status: **predeclared. Written before the device recording exists.**\
Instrument: `src/app/edge-probe/route.ts`, candidate `5 css-timeline`\
Question: does an ordinary document layer, counter-translated 1 : 1 against the root
scroll timeline by CSS alone, hold still inside the strips iOS Safari draws its status bar
and toolbar over, during fast and inertial scrolling?

Every threshold, region rule and exclusion rule below is fixed here. None of them may be
changed after a result is seen. If the recording cannot be measured under these rules, the
result is `UNRESOLVED`, not a pass.

---

## 1. Why this measurement exists

Rounds one to three settled the mechanism and eliminated four candidates:

| Candidate | Reaches the bar strips | Holds still |
| --- | --- | --- |
| `2 bg-fixed` | yes | no — `background-attachment: fixed` is unsupported on iOS and the pattern scrolls with the document |
| `3 js-abs` | yes | no — a `scroll` + `requestAnimationFrame` pin trails the compositor by about 13 CSS px under a fast flick |
| `4 sticky` | no | unpins at its parent's edge as well |
| the shipped `position: fixed` plate | no — a fixed box is clipped to the window | yes |

So the layer that answers the strips has to be ordinary document content, and whatever
holds it still cannot run on the main thread. Candidate 5 is the only remaining shape:
ordinary document content, held by a scroll-driven CSS animation.

The production symptom this is aimed at, measured on four device screenshots of the
current build:

| Chapter | Flat band under the bottom bar | Per-row luma SD, photograph → band |
| --- | ---: | --- |
| ROOT | 58.0 CSS px | 11.3 → 0.1 |
| DUSK | 58.0 CSS px | 13.5 → 0.2 |
| DAWN | 58.0 CSS px | 13.1 → 0.1 |
| ALPINE | 58.0 CSS px | 15.1 → 0.1 |

The band is not merely the wrong colour. It has **no texture at all**, and the transition
from photograph to band completes within a single raster row, so the toolbar is not
blurring the page enough to hide a photograph if one were there. Solving the colour cannot
solve this; only putting the photograph itself under the bar can.

The same measurement also shows the colour is not solved either. Modelling the toolbar
composite as `alpha x content + base` and solving it from two chapters gives
`alpha ~ 0.72` over a base of luma ~45, uniform down the whole strip. Under that model the
band's implied content luma matches the photograph's own lower edge for ROOT and ALPINE and
misses it by about 50 levels for DUSK and DAWN — because the shipped fill carries a
frame-wide row mean while the reader is looking at one part of the frame.

## 2. The instrument

### 2.1 Carrier

The probe publishes its own geometry in `<meta name="edge-probe">`, and the analysis builds
its template from that string. A template built from anything else is measuring a different
probe.

| Field | Value | Why |
| --- | --- | --- |
| `cell` | 12 CSS px | one code symbol; 15.3 recording px at the recording scale |
| `lit` | 6 CSS px | the carrier's light half |
| `nudge` | 3 CSS px | the code ramp is shifted a quarter cell so its own smeared boundaries fall inside a shade stripe, where the carrier mask hides them |
| `order` | 4 | every window of four cells is unique |
| `lane` | 60 CSS px | five cells — one more than uniqueness needs, which widens the correlation margin |
| `margin` | 36 CSS px | clear space between a reading lane and the window edge |
| `bleed` | 240 CSS px | how far the candidate extends beyond each window edge |
| `telemetry` | 180 CSS px from the window top | fixed offset, so the strip never moves as the toolbar changes the window height |
| `telemetrybits` | 28 | markers, 16 bits of scroll, 8 of frame counter, 2 of parity |
| `tones` | green 95 / 168 / 240 | the code |
| `shade` | green 32 | the carrier |

The tone sequence is a ternary de Bruijn sequence of order 4 (81 cells, 972 CSS px). The
build asserts that every four-cell window is unique and fails rather than serving a probe
that cannot be read.

**Why a code and not a plain periodic stripe.** A 12 px period reads a true error of 13 px
as +1 px. That is the exact failure candidate 3 was measured at, so a periodic-only
measurement could report the known-bad candidate as a pass. Frame-to-frame continuity does
not rescue it: iOS momentum can carry more than one period per 30 fps frame, and a screen
recording may drop or repeat frames. The code makes every frame self-locating.

**Why horizontal stripes.** Round three used 135° stripes. Averaging a diagonal pattern
across an x window smears the vertical profile by the width of that window; measured
against the round-three recordings, a 40 px window turned hard colour stops into a monotone
ramp. Horizontal stripes can be averaged across the full width of a region at no cost in
vertical resolution.

**Why the carrier and the code are separate layers.** A single 972 px gradient carrying all
162 stops comes back from WebKit with every transition smeared over about ±2 px — a quarter
of a 6 px stripe — because a long gradient is rasterised through a ramp table of a few
hundred entries. The brightest tone then peaks for one row instead of holding a plateau,
the template stops matching, and the correlation peak becomes unstable. A 12 px repeating
mask decides the stripe edges and a long ramp carries only one tone per cell. Measured
after the split: every rendered pixel is exactly the declared colour.

### 2.2 What each region reads

Two boundaries can fail independently, and a single rail-to-bar comparison cannot say
which did:

```text
root scroll          ->  threaded transform     (tracking error)
transformed document ->  native bar backdrop    (bar transfer)
```

So the same candidate layer is read twice per frame:

| Region | What it is | Expected |
| --- | --- | --- |
| `rail` | the same carrier on a `position: fixed` box, masked to two lanes well clear of both window edges | held still by the window; any reading other than zero is the harness's own error |
| `witness` | the candidate itself, seen through a slot cut in the fixed plate, inside the window | zero if the timeline is exact |
| `bar-top` / `bar-bottom` | the candidate in the strip beyond the window edge | zero if the timeline is exact **and** the strip is fed the post-transform surface |

`tracking error = witness − rail` and `bar transfer = bar − witness`. The gate is on
`bar − rail`; the split says where a failure lives.

### 2.3 Expected offset is geometry, not calibration

The rail's box is the window and its code is offset by one bleed. A perfect pin puts the
candidate's box top exactly one bleed above the window. The bleed is a whole number of
cells, so both carriers are in phase by construction and **the expected offset is zero,
derived from the CSS, not fitted from the recording.**

No empirical calibration constant is subtracted before the gate. The scroll-stopped frames
at the start of the recording are used to *verify* that constant is zero and to measure the
harness's noise floor; they are not used to move the zero. An empirical residual is
reported separately, labelled `tracking residual`, and never replaces the direct figure.

### 2.4 Decoder, and what it has been shown to do

Offsets are recovered by normalised cross-correlation against a template rendered from the
published descriptor. Normalisation is what makes this survive the bar: the composite is
`alpha x content + base` with alpha constant down the strip, and a zero-mean unit-variance
correlation is invariant to exactly that pair. A symmetric blur attenuates the peak without
moving it.

Validated before use, in `.private/tmp-inspect/edge-probe-5/validate-decode.mjs`:

| Check | Worst error | Correlation |
| --- | ---: | ---: |
| synthetic, clean | 0.12 CSS px | 0.99 |
| synthetic, bar composite (`alpha 0.72`, base 44.5, blur 0.8, noise ±2) | 0.08 CSS px | 0.99 |
| synthetic, washed and soft (`alpha 0.45`, base 120, blur 1.6, noise ±4) | 0.07 CSS px | 1.00 |
| rendered WebKit 26.5 frames, six scroll offsets, rail and witness | **0.000 CSS px** | 1.000 |
| rendered frames displaced by 1, 3, 7, 13 and 29 known rows | **0.000 CSS px** | 1.000 |
| all four lanes at the device's own window size, 402 × 754 | **0.000 CSS px** | 1.000 |

The synthetic set deliberately includes true shifts of 13, −37.6 and 121.4 CSS px. All are
recovered, with no continuity assumption, which is the property a periodic carrier does not
have.

**The template's softness is fitted rather than assumed.** A template blurred differently
from the signal is symmetric and so does not bias the peak in principle, but measured on a
sharp render a fixed blur moved three of four lanes by about 0.12 CSS px and the fourth by
0.10 the other way — a fifth of the gate spent on a modelling choice, in exactly the
quantity being gated. With the blur fitted, the same four lanes read 0.000 at correlation
1.000, which is what confirms the geometric zero of §2.3 is real rather than approximately
real.

**The harness floor is therefore 0.12 CSS px on degraded synthetic signals and 0.000 on a
sharp render at device-pixel-ratio 1.** The floor at the recording's own scale is
re-measured from the rail in the recording itself and reported with the result. A point
estimate is never reported without it.

## 3. Recording protocol

The probe is served from an owned production build on a dedicated port on the local
network. No publishing, tunnelling, upload or change to any existing deployment is
involved, and none is authorised by this document.

Required states, each a separate continuous take:

| # | Query | Notes |
| --- | --- | --- |
| A | `?try=csstimeline&plate=on&shield=on` | the measurement |
| B | `?try=csstimeline&plate=on&shield=off` | separates the shield's transparency job from the candidate's carriage job |
| C | `?try=csstimeline&plate=on&shield=on&mask=on` | asks whether an ancestor mask removes the layer from the strips |
| D | `?try=jsabs&plate=on&shield=on` | the known-bad main-thread pin, as a control the harness must fail |

Take D is not optional. A harness that cannot fail the candidate already measured at
13 CSS px cannot be trusted to pass one at 2.

Each take must contain, in one continuous recording of 10–20 s:

- several seconds stopped at the start, for the noise floor and the zero check;
- slow scroll;
- a fast flick with its full momentum decay;
- a reverse flick;
- a full stop, held;
- the address bar both expanded and collapsed, including the transition;
- the band's entry and exit.

Recorded at the highest available quality, 60 fps if offered and 30 fps at minimum, with
Control Center, the keyboard and notifications closed. A still screenshot of each state is
taken as well.

## 4. Analysis

Reproducible scripts, extracted frames, per-frame CSV and contact sheets live under
`.private/tmp-inspect/edge-probe-5/`, outside Git.

1. `ffprobe` the recording for width, height, frame rate and duration.
2. Extract every frame. Hash each one to detect the recorder repeating or dropping frames,
   and cross-check against the probe's own frame counter in the telemetry strip.
3. Locate the two yellow rulers per frame, to sub-pixel. They mark the window's own edges,
   so they give the recording scale and both strip extents without assuming a device, and
   they detect the toolbar's state directly: validated against the round-three device
   recordings, the same detector reads a 58.1 CSS px bottom strip with the address bar
   collapsed and 98.0 CSS px with it expanded, from the frames alone.

   Each end's strip region and that end's rail lane are both positioned from the **same**
   ruler edge, so any error in locating that edge is common to both and cancels in their
   difference. This is why there is a rail at each end rather than one in the middle.

   The detector takes the outermost full-width runs and requires better than 92 % coverage
   of the row. The readout's own active buttons are the same yellow and would otherwise be
   mistaken for a ruler; they never exceed 76 % of the window.
4. Cross-check the horizontal scale against the recording width and the window width the
   probe reports. If the two scales differ by more than 0.5 %, stop and resolve it rather
   than averaging them.
5. Read the scroll offset and frame counter from the telemetry strip. The strip carries
   both as text, for a human and for the still evidence, and again as **28 black-or-white
   cells across the full width** — first and last always lit as markers, sixteen bits of
   scroll offset, eight of frame counter, two of parity. The bits are what the analysis
   reads: matching a monospace font in a recording that has been rescaled by a non-integer
   factor is a font problem with nothing to do with this page, whereas 28 cells either
   check out against their parity or they do not. This gives per-frame velocity and
   direction, which is what labels each frame, and it is what detects a recorder that
   dropped or repeated a frame.
6. Select regions **by rule, not by coordinate**: a column belongs to a region only if the
   carrier's hue holds down the whole region, `(green + blue) / 2 − red >= 18`. Safari's
   own chrome — white glyphs, the black pill, grey icons — fails that by a wide margin. The
   surviving runs are averaged together.
7. Region rows: the 48 CSS px of each strip adjacent to the window edge; the published
   lanes for the rail and the witness.
8. Decode each region and record `bar − rail`, `witness − rail` and `bar − witness`.
9. Emit per-frame CSV and a JSON summary with maximum, P95, median, frame counts, excluded
   frames and the reason for each exclusion.
10. Build a contact sheet, and inspect the ten worst frames at original detail.

### Frames that may be excluded

Only these, and each one is listed individually with its reason in the report:

- Control Center or another system overlay is on screen;
- the operating system's own transition at the very start or end of the recording;
- a region is fully occluded by Safari's UI, so no clean column survives rule 6;
- the recorder repeated or dropped the frame, proved by the frame counter.

**A frame is never excluded for having a large error.** "Blurry", "transient" and "only
during the flick" are not exclusion reasons.

### Frames that are `UNRESOLVED`

A frame whose correlation peak is not separated from its nearest rival by more than the
floor measured on the rail in the same recording is reported as unresolved. Unresolved
frames are counted and listed. More than 2 % unresolved in any take fails the take and the
recording is repeated; they are never silently dropped.

## 5. Acceptance thresholds

Predeclared. All must hold.

| # | Gate | Threshold |
| --- | --- | --- |
| G1 | maximum absolute `bar-top − rail` over every analysable scroll frame | ≤ 2.00 CSS px |
| G2 | maximum absolute `bar-bottom − rail` over every analysable scroll frame | ≤ 2.00 CSS px |
| G3 | the above include fast, inertial, reverse and toolbar-transition frames | frames of each class present and counted |
| G4 | carrier coverage in the strip's region | no frame with a magenta or paper gap anywhere in the region |
| G5 | expanded bottom toolbar fully covered by the bleed | measured strip height < 240 CSS px in every frame |
| G6 | no snap-back or phase jump after the scroll stops | \|error\| ≤ 2.00 CSS px for every stopped frame, and no step larger than the floor between consecutive stopped frames |
| G7 | the band's entry and exit leave nothing on the page | no carrier outside the band |
| G8 | take A holds with `plate=on` | measured with the plate present |
| G9 | shield ON is transparent, and the difference against shield OFF is explained | both takes analysed |
| G10 | the control take D fails | `js-abs` must exceed 2.00 CSS px, or the harness is not sensitive enough to be believed |
| G11 | rail reads zero | maximum absolute rail error ≤ the floor measured in the same recording |
| G12 | user agent, OS version, window and screen size, toolbar state, frame rate and recording conditions recorded | in the private report |

G1 and G2 are **maxima over every analysable scroll frame**, per edge, separately. P95 and
median are reported as supporting statistics and are not the gate.

A point estimate is reported with the measured floor. A maximum of 1.99 CSS px against a
floor of 0.4 CSS px is not a pass; it is `MARGINAL`, and the take is repeated.

## 6. What a pass here does and does not mean

A pass means the mechanism carries a moving pattern into the bar strips within 2 CSS px.

It does not mean the production page is fixed. Production adds a silhouette mask, a
`clip-path`, a zoomed artboard, four photographs with their own pan, chapter boundaries and
paper sections. Each of those is a way for the same mechanism to fail, and each is checked
again on the device against the four photographs before anything is called complete.

A desktop run of `tests/e2e/edge-probe.spec.ts` proves the probe is syntactically valid, its
keyframe endpoint is derived correctly, the pinned layer does not extend the document it is
scaled against, and candidates 1–4 have not regressed. No desktop engine draws the strips at
all. A green desktop suite is never evidence about the browser bars.

## 7. Recorded engine support

| Engine | `animation-timeline: scroll(root block)` | `animation-duration: auto` | Behaviour of candidate 5 |
| --- | --- | --- | --- |
| Chromium 151 | yes | yes | pin exact at every scroll offset |
| WebKit 26.5 (Playwright) | yes | yes | pin exact at every scroll offset |
| Firefox 153 | no | no | travels with the document; the animation is gated behind `@supports`, so it is inert rather than parked at the keyframe's end value |

`@supports` reports syntax, never threading. Safari 26.0–26.3 answer yes and still sample
the timeline on the main thread; only 26.4 and later move it off. The recorded OS version
is therefore part of the result, not context.

## 8. Two defects found while building the instrument

Both would have produced a wrong answer quietly, and both are fixed in the probe.

1. **The counter-translated layer extended the document.** At maximum scroll the pinned box
   reaches one bleed past the document's end. In Chromium that contributed to scrollable
   overflow, so `scrollHeight` grew from 6752 to 6940 px, which changed the maximum scroll
   the keyframe endpoint is derived from, which moved the layer, which grew the document
   again. WebKit's `clip-path` suppressed it and Chromium's did not. `overflow: clip` on the
   band fixes it in both. Production carries the same shape and needs the same guard.
2. **The probe had no doctype**, so every round ran in quirks mode, where
   `documentElement.clientHeight` is the content height rather than the window. Any maximum
   scroll derived that way is zero. Rounds one to three did not depend on it; round five
   does, because the keyframe endpoint is exactly that number.

3. **Two `80vh` terms that cancel algebraically still round separately during layout.** The
   first version placed the candidate with `top: calc(-1 * (240px + 80vh))` inside a band at
   `top: 80vh`, so the two were supposed to cancel to a document top of exactly minus one
   bleed. Measured, the residual was 0.22 CSS px — eleven per cent of the gate, in exactly
   the quantity the gate is on. Both keyframe endpoints are now derived from the band's own
   **measured** document top. Production has no cancelling expression available anyway,
   because its mirror sits at whatever offset its chapter has, so measuring is the shape
   that transfers.

A fourth is recorded rather than fixed: the naive endpoint `260vh` is wrong by up to 40 CSS
px on this device, because `vh` is the large viewport while the window shrinks when the
toolbar expands. Forty pixels is twenty times the gate. Both endpoints are measured in
JavaScript on load, resize, orientation and `pageshow`, and never during a scroll.
