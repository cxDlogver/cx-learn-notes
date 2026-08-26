# Realtime Chart Five-Minute Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the realtime wind-speed concentration chart and constrain all realtime time-series charts to the latest rolling five-minute interval.

**Architecture:** Add one timestamp-based rolling-window utility and use it when realtime packets update chart state. Keep map retention independent. Pass the resulting window bounds into existing ECharts option builders, and translate the current telemetry wind fields directly in the polar chart.

**Tech Stack:** Vue 2, TypeScript, ECharts, Jest, Vue Test Utils

---

### Task 1: Add Timestamp-Based Realtime Retention

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/utils/visualizationData.ts`
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`
- Test: `QHZHC_Web/tests/unit/visualizationData.spec.js`

- [x] **Step 1: Write the failing rolling-window tests**

Add tests that call a new `appendRealtimeTimeWindow` helper with points at
`09:59:59`, `10:00:00`, `10:03:00`, and `10:05:00`. Assert that the latest
timestamp is the end, the exact five-minute boundary is retained, the older
point is removed, and an invalid timestamp is ignored.

```js
const result = appendRealtimeTimeWindow(existing, incoming);
expect(result.map((point) => point.time)).toEqual([
  "2026-08-22T10:00:00.000Z",
  "2026-08-22T10:03:00.000Z",
  "2026-08-22T10:05:00.000Z",
]);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:unit -- --runInBand tests/unit/visualizationData.spec.js
```

Expected: FAIL because `appendRealtimeTimeWindow` is not exported.

- [x] **Step 3: Implement the rolling-window helper**

Add:

```ts
export const REALTIME_CHART_WINDOW_MS = 5 * 60 * 1000;

export function appendRealtimeTimeWindow<
  T extends { time?: string | number | Date },
>(
  points: T[] | null | undefined,
  incoming: T[] | null | undefined,
  windowMs = REALTIME_CHART_WINDOW_MS,
): T[] {
  const combined = [
    ...(Array.isArray(points) ? points : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ].filter((point) => point && typeof point === "object");
  const timestamped = combined
    .map((point) => ({ point, timestamp: new Date(point.time).getTime() }))
    .filter(({ timestamp }) => Number.isFinite(timestamp));
  const end = Math.max(...timestamped.map(({ timestamp }) => timestamp));
  const start = end - windowMs;
  return timestamped
    .filter(({ timestamp }) => timestamp >= start && timestamp <= end)
    .map(({ point }) => point);
}
```

Return `[]` when there are no valid timestamps.

- [x] **Step 4: Use elapsed-time retention for realtime chart state**

Import `appendRealtimeTimeWindow` in `dataVisualization.vue` and replace only
the `gasdata.data` update:

```js
const nextGasPoints = appendRealtimeTimeWindow(
  this.gasdata.data,
  result.data,
);
const nextMapPoints = appendRealtimeBatch(this.mapList, result.data);
```

Do not change history handling or map retention.

- [x] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npm run test:unit -- --runInBand \
  tests/unit/visualizationData.spec.js \
  tests/unit/historyModeRace.spec.js
```

Expected: both suites pass.

### Task 2: Fix Realtime Wind-Speed Concentration Data

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/components/chartData.ts`
- Test: `QHZHC_Web/tests/unit/visualizationData.spec.js`

- [x] **Step 1: Write the failing wind-chart tests**

Build a `windspeed` chart with one valid realtime point:

```js
{
  time: "2026-08-22T10:05:00.000Z",
  wind_speed: 3.4,
  wind_direction: 135,
  pri_ch4: 2.3,
}
```

Assert that the `2-2.5` series contains
`[3.4, 135, 2.3, "2026-08-22T10:05:00.000Z"]`, the title shows
`W=3.40 m/s`, and a malformed wind point is excluded.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:unit -- --runInBand tests/unit/visualizationData.spec.js
```

Expected: FAIL because the chart still reads `r` and `angle`.

- [x] **Step 3: Translate current telemetry fields in `windChart`**

For each point, convert `wind_speed`, `wind_direction`, and `pri_ch4` to finite
numbers. Skip the point when any value is non-finite. Keep the existing methane
concentration buckets and push:

```ts
[windSpeed, windDirection, concentration, gas.time]
```

Read the current title value from the newest valid `wind_speed`.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm run test:unit -- --runInBand tests/unit/visualizationData.spec.js
```

Expected: wind series and title assertions pass.

### Task 3: Fix Realtime Time Axes to Five Minutes

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/components/Charts.vue`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/chartData.ts`
- Test: `QHZHC_Web/tests/unit/chartsRendering.spec.js`
- Test: `QHZHC_Web/tests/unit/visualizationData.spec.js`

- [x] **Step 1: Write failing realtime and history axis tests**

For realtime CH4 and methane-isotope charts, pass a `timeWindow` with numeric
`start` and `end`; assert `xAxis.min` and `xAxis.max` equal those values. Build
the same charts without `timeWindow` and assert the historical axes have no
forced `min` or `max`.

- [x] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm run test:unit -- --runInBand \
  tests/unit/visualizationData.spec.js \
  tests/unit/chartsRendering.spec.js
```

Expected: FAIL because no window bounds are passed or applied.

- [x] **Step 3: Derive realtime bounds in `Charts.vue`**

When `searchType === 1`, derive the latest valid timestamp from `gasdata` and
pass this object to `getChart`:

```js
timeWindow: {
  start: latestTimestamp - REALTIME_CHART_WINDOW_MS,
  end: latestTimestamp,
}
```

When `searchType !== 1` or no valid timestamp exists, pass no `timeWindow`.

- [x] **Step 4: Apply bounds only to time-series chart axes**

In `lineChart` and `methaneChart`, spread the optional bounds into `xAxis`:

```ts
...(params.timeWindow
  ? {
      min: params.timeWindow.start,
      max: params.timeWindow.end,
    }
  : {}),
```

Do not add bounds to history charts, weather charts, bar charts, or the polar
wind chart.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm run test:unit -- --runInBand \
  tests/unit/visualizationData.spec.js \
  tests/unit/chartsRendering.spec.js \
  tests/unit/historyModeRace.spec.js
```

Expected: all focused suites pass.

### Task 4: Full Verification and Browser Acceptance

**Files:**
- Verify only

- [x] **Step 1: Run project verification**

Run:

```bash
npm run verify
```

Expected: original-UI gate, frontend tests, server tests, type checking, and
production build all exit successfully.

- [x] **Step 2: Verify the running page**

Open `http://localhost:9527/#/dataVisualization` and assert:

- the wind-speed concentration polar chart contains scatter points;
- its title reports a non-zero current wind speed;
- CH4, CO2, and methane-isotope x-axis bounds differ by exactly 300,000 ms;
- realtime chart data contains no point older than the current window start;
- switching to history mode does not force a five-minute x-axis.

- [x] **Step 3: Review browser runtime**

Confirm no application-generated console errors and capture one screenshot
showing the populated wind chart and realtime time-series charts.
