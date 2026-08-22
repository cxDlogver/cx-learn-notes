# Realtime Chart Five-Minute Window Design

## Goal

Restore the wind-speed concentration chart and make every realtime time-series
chart display one fixed rolling five-minute interval. Historical query behavior
must remain unchanged.

## Current Problems

1. The wind chart reads legacy fields named `r` and `angle`. Realtime telemetry
   exposes `wind_speed` and `wind_direction`, so every wind point is discarded.
2. Realtime chart state is capped at 300 points. At the current 250 ms sampling
   interval, this retains about 75 seconds instead of five minutes.
3. Time axes derive their visible range from available points. During startup,
   the axis shrinks to the small amount of data received rather than showing a
   stable five-minute period.

## Chosen Design

### Rolling Window

Add a reusable realtime-window helper in
`QHZHC_Web/src/views/DataVisualization/utils/visualizationData.ts`.

- The newest valid telemetry timestamp is the window end.
- The window start is exactly 300,000 ms before the end.
- Keep points whose timestamps are within the inclusive start/end range.
- Ignore malformed timestamps when calculating and filtering the window.
- Preserve the original point order.
- Apply this helper only while `searchType === 1`.

`dataVisualization.vue` will keep the chart dataset by elapsed time instead of
the existing 300-point cap. `mapList` keeps its current 300-point limit because
the request only changes realtime charts.

### Time-Series Axes

`Charts.vue` will pass the realtime window bounds to `getChart`. The CH4, CO2,
and methane-isotope time axes will use:

- `min = latest timestamp - 5 minutes`
- `max = latest timestamp`

When less than five minutes of data exists, the leading part of the chart stays
empty. Historical charts receive no forced bounds and keep their existing
selected range.

### Wind-Speed Concentration

`windChart` will build polar scatter points from the realtime protocol fields:

- radius: `wind_speed`
- angle: `wind_direction`
- concentration and legend bucket: `pri_ch4`
- tooltip timestamp: `time`

The current wind-speed title will also read `wind_speed`. Points with missing or
non-finite wind or concentration values are skipped without breaking the chart.

## Error Handling

- Empty realtime input keeps the existing `暂无数据` state.
- Invalid timestamps are omitted from the rolling-window calculation.
- Invalid wind samples are omitted while valid samples continue to render.
- No new network requests or fallback data are introduced.

## Testing

1. Unit-test the rolling-window helper with points before, on, and after the
   five-minute boundary, plus invalid timestamps.
2. Unit-test that realtime batches retain five minutes by timestamp while map
   point retention remains unchanged.
3. Unit-test wind chart output using `wind_speed` and `wind_direction`.
4. Unit-test fixed realtime axis bounds and unchanged historical axes.
5. Run the frontend and server test suites, type checking, the original-UI gate,
   and the production build.
6. Verify in the browser that wind scatter points render and realtime time axes
   span exactly five minutes.

## Out of Scope

- Restricting historical-query ranges.
- Changing simulator sampling frequency.
- Changing map trail retention.
- Redesigning chart layout or desktop styles.
