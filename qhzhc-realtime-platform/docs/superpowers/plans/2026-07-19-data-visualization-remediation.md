# Data Visualization Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the data-visualization feature so that real-time monitoring, historical queries, maps, charts, authorization, and error states form one secure and testable end-to-end workflow.

**Architecture:** Keep Vue 2 and Django Channels, but introduce explicit data contracts and lifecycle boundaries. The page container owns query mode and presentation state; a reusable real-time client owns one WebSocket and one timer; REST and WebSocket responses use the same visualization point schema; map components own and release their own renderer resources.

**Tech Stack:** Vue 2, Vuex 3, Vue Router 3, Element UI, ECharts 5, OpenLayers 6, Cesium, Django 3.2, Django REST Framework, Django Channels, asyncpg, PostgreSQL.

---

## 1. Plan Readiness

**Status:** `READY` for defect remediation.  
**Implementation mode:** `REAL_READY_LIMITED`.

The required source code, browser evidence, database schema evidence, and current runtime are available. The exact business semantics for “现场照片”, “卫星”, and the historical trajectory mode are not available. This plan removes those incomplete entry points from the production screen rather than inventing behavior.

## 2. Target Functional Contract

### 2.1 Query modes

| Mode | Data source | Permitted roles | Required visible result | Failure behavior |
| --- | --- | --- | --- | --- |
| 实时数据 | WebSocket `new_data_gps` plus one `history_data_5min` bootstrap command | `can_visit_realtime` or administrator | Current vehicle, latest point, five-minute charts, current detail, signal state | Keep the last valid display, show disconnected/error state, retry with a bounded backoff only while the page remains in realtime mode. |
| 历史查询 | REST `dataTrans/between` and `dataTrans/5min` | `can_visit_history` or administrator | Selected date range, historical points, selected-point detail and five-minute charts | Show an inline error or empty state; never render cached realtime data as history. |

### 2.2 Standard data envelope

All visualization fetch paths must return the following envelope. HTTP status carries transport status; `code` is numeric and mirrors the semantic result.

```json
{
  "code": 200,
  "message": "ok",
  "begin_time": "2026-07-19 10:00:00",
  "end_time": "2026-07-19 10:05:00",
  "data": []
}
```

Point records use a single field naming convention:

```js
{
  time: "YYYY-MM-DD HH:mm:ss",
  latitude: 28.169435,
  longitude: 104.817693,
  altitude: 120,
  geo_location: [104.817693, 28.169435],
  pri_ch4: 2.1,
  pri_c2h6: 0.2,
  pri_co2: 420,
  pri_co: 0.5,
  pri_n2o: 0.3,
  pri_h2o: 0.1,
  picarro_hp_12ch4_dry: 2.1,
  picarro_hr_12ch4_dry: 2.1,
  picarro_12co2_dry: 420,
  picarro_delta_ich4_raw: -45,
  picarro_h2o: 800,
  wind: [0, 0],
  angle: "0",
  r: 0,
  speed: 0,
  pressure: 0,
  speed_of_true_wind: 0,
  direction_of_true_wind: "北风",
  relative_humidity: 0,
  picarro_ch4: 2.1
}
```

`data: []` represents a valid empty result. It must not be replaced with a fake point. Invalid request parameters, authorization failures, SQL failures, and timeouts must use non-2xx HTTP responses and a non-200 `code`.

### 2.3 Storage boundaries

| State | Owner | Persistence |
| --- | --- | --- |
| Current route and authentication | Router/auth module | Token must not be stored in a URL. Session handling is implemented by secure cookie authentication. |
| Realtime five-minute window | Realtime client/page container | Memory only, maximum 300 points at one point per second. |
| Realtime map points | Page container | Memory only, maximum 300 points. Do not restore as historical results. |
| Historical result | Page container | Memory only; replace it for each successful search. |
| Threshold configuration | Vuex plus backend configuration API introduced in a later dedicated requirement | Until a backend configuration API exists, persist only per browser session and label it “本会话设置”. |

## 3. File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `QHZHC_Server/sever_main/settings.py` | Modify | Required secrets, trusted hosts/origins, JWT cookie configuration. |
| `QHZHC_Server/api_auth/middleware.py` | Modify | Read WebSocket identity from cookie instead of query token. |
| `QHZHC_Server/api_auth/views.py` | Modify | Set/clear secure authentication cookies and omit access token from login body. |
| `QHZHC_Server/api_chart/chartdatatrans.py` | Modify | Input validation, normalized historical query, exception mapping, connection closure. |
| `QHZHC_Server/api_chart/consumers.py` | Modify | Command-level permission checks and unified point mapping. |
| `QHZHC_Server/api_chart/tests.py` | Modify | WebSocket command permission and packet schema tests. |
| `QHZHC_Server/api_chart/test_chartdatatrans.py` | Create | REST historical query validation, error and schema tests. |
| `QHZHC_Web/src/views/DataVisualization/services/realtimeClient.js` | Create | One connection, bounded reconnection, message routing, shutdown. |
| `QHZHC_Web/src/views/DataVisualization/services/historyApi.js` | Create | Historical REST calls and response-envelope validation. |
| `QHZHC_Web/src/views/DataVisualization/utils/visualizationData.js` | Create | Point normalization, time-range validation, bounded buffer helpers. |
| `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue` | Modify | View orchestration only; semantic controls; deterministic mode transitions; history workflow. |
| `QHZHC_Web/src/views/DataVisualization/components/chartData.js` | Modify | Pure chart-option functions, empty state and correct field references. |
| `QHZHC_Web/src/views/DataVisualization/components/Charts.vue` | Modify | Predictable chart updates and zero-data behavior. |
| `QHZHC_Web/src/views/DataVisualization/components/PlanimetricMap.vue` | Modify | One click listener, renderer cleanup, safe point/line rendering. |
| `QHZHC_Web/src/views/DataVisualization/components/StereoscopicMap.vue` | Modify | Explicit Cesium import/configuration, one handler, lifecycle disposal, on-demand rendering. |
| `QHZHC_Web/src/views/DataVisualization/components/RangeConfig.vue` | Modify | Numeric threshold validation and non-destructive submit behavior. |
| `QHZHC_Web/src/views/DataVisualization/components/Weather.vue` | Modify | Use internal weather API, loading/empty/error states and retry behavior. |
| `QHZHC_Web/src/views/DataVisualization/components/Details.vue` | Modify | One declared detail point shape and semantic collapse button. |
| `QHZHC_Web/src/views/DataVisualization/components/legend.vue` | Modify | Semantic toggle and validated threshold display. |
| `QHZHC_Web/src/utils/request.js` | Modify | Environment-based API base URL and unified 401 handling. |
| `QHZHC_Web/src/views/loginPage.vue` | Modify | Remove token logging and honor internal redirect. |
| `QHZHC_Web/src/router/index.js` | Modify | Read authentication state from the new session endpoint or cookie-compatible bootstrap state. |
| `QHZHC_Web/package.json` | Modify | Add `test:unit`; install Vue 2-compatible Jest and `@vue/test-utils` dependencies. |
| `QHZHC_Web/tests/unit/*.spec.js` | Create | Unit coverage for data helpers, charts, threshold validation and page state transitions. |

## 4. Implementation Tasks

### Task 1: Rotate secrets and replace URL-token authentication

**Files:**
- Modify: `QHZHC_Server/sever_main/settings.py`
- Modify: `QHZHC_Server/api_auth/middleware.py`
- Modify: `QHZHC_Server/api_auth/views.py`
- Modify: `QHZHC_Web/src/views/loginPage.vue`
- Modify: `QHZHC_Web/src/utils/request.js`
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`

- [ ] **Step 1: Rotate exposed credentials outside the repository**

Rotate the Django `SECRET_KEY`, Cesium token, TianDiTu tokens, QWeather key, and any token derived from the old Django signing key. Revoke old provider credentials before deployment. Add all replacement values only to the deployment secret store.

- [ ] **Step 2: Require the Django secret at startup**

Replace the committed secret with a required environment variable:

```python
SECRET_KEY = os.getenv("QHZHC_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("QHZHC_SECRET_KEY is required")
```

Keep `SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY`. Do not provide a fallback value in source, `.env.example`, Docker image, or test fixture.

- [ ] **Step 3: Change login to issue an HttpOnly cookie**

In `LoginView.post`, set the access token only in a secure cookie and return only non-sensitive profile fields:

```python
response = Response(profile_payload, status=status.HTTP_200_OK)
response.set_cookie(
    "qhzhc_access",
    str(refresh.access_token),
    httponly=True,
    secure=not settings.DEBUG,
    samesite="Lax",
    max_age=48 * 60 * 60,
)
return response
```

Add a logout endpoint that deletes `qhzhc_access`. Update REST authentication to read the cookie. Update `JWTAuthMiddleware` to parse the `cookie` request header; remove query-string token parsing.

- [ ] **Step 4: Remove frontend token handling**

Delete token persistence and `console.log(res)` from `loginPage.vue`. Configure Axios with `withCredentials: true`. Remove `?token=` construction from `initWebSocket()`:

```js
this.websock = new WebSocket(`${wsBaseUrl}/chat/socket/`);
```

The browser automatically sends the same-origin authentication cookie. Configure WebSocket origin validation in ASGI middleware before accepting the connection.

- [ ] **Step 5: Verify authentication regression cases**

Run browser checks for:

```text
未登录访问 /dataVisualization -> /login?redirect=...
登录成功 -> 原 /dataVisualization
刷新页面 -> 仍可访问
登出 -> /dataVisualization 被拒绝
WebSocket 请求 URL 中不出现 token、ticket 或 JWT
```

Expected result: browser network logs contain no credential in URL; invalid or expired sessions receive one unified login redirect.

### Task 2: Establish a safe historical query service

**Files:**
- Modify: `QHZHC_Server/api_chart/chartdatatrans.py`
- Create: `QHZHC_Server/api_chart/test_chartdatatrans.py`

- [ ] **Step 1: Write failing request validation tests**

Create tests for missing, malformed, reverse-order, and oversized ranges:

```python
def test_between_rejects_reverse_time_range(self):
    response = self.client.get(
        "/api/chart/dataTrans/between",
        {"start_time": "2026-07-19 11:00:00", "end_time": "2026-07-19 10:00:00"},
        HTTP_TOKEN=self.history_token,
    )
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response.json()["code"], 400)
```

Use a maximum range of 24 hours. Declare it as `QHZHC_HISTORY_MAX_SECONDS` with a default of `86400`.

- [ ] **Step 2: Normalize parsing and query execution**

Define one parser and one query function. Use `co2_12_dry` and close the connection on all paths:

```python
def parse_history_range(request):
    start = parse_datetime(request.GET.get("start_time", ""))
    end = parse_datetime(request.GET.get("end_time", ""))
    if not start or not end or start >= end:
        raise ValueError("invalid time range")
    if (end - start).total_seconds() > HISTORY_MAX_SECONDS:
        raise ValueError("time range exceeds limit")
    return start, end

async def query_history_points(start_time, end_time):
    async with asyncpg.connect(**DB_CONFIG) as conn:
        rows = await conn.fetch(QUERY_TIME_BETWEEN, start_time, end_time)
    return [to_visualization_point(row) for row in rows]
```

The SQL must alias all Picarro fields as `picarro_*`, including:

```sql
picarro.hr_12ch4_dry AS picarro_hr_12ch4_dry,
picarro.hp_12ch4_dry AS picarro_hp_12ch4_dry,
picarro.co2_12_dry AS picarro_12co2_dry
```

- [ ] **Step 3: Return one error contract**

Map errors in the view:

```python
try:
    start_time, end_time = parse_history_range(request)
    data = asyncio.run(query_history_points(start_time, end_time))
except ValueError as exc:
    return JsonResponse({"code": 400, "message": str(exc), "data": []}, status=400)
except asyncpg.PostgresError:
    logger.exception("history query failed")
    return JsonResponse({"code": 500, "message": "历史数据查询失败", "data": []}, status=500)

return JsonResponse({"code": 200, "message": "ok", "begin_time": ..., "end_time": ..., "data": data})
```

Do not return database error messages to clients.

- [ ] **Step 4: Test database failure and schema mapping**

Mock `asyncpg.connect`/`fetch` to raise `PostgresError`, then assert HTTP 500, numeric code 500, generic message, empty `data`, and connection cleanup. Add one fixture row and assert the JSON response contains `picarro_hr_12ch4_dry`, `picarro_hp_12ch4_dry`, and `picarro_12co2_dry`.

- [ ] **Step 5: Run backend tests**

Run:

```bash
/Users/bytedance/cx/spec-2/cxdlogver/2024_QH_ZHC/.venv/bin/python manage.py test api_chart --verbosity 2
```

Expected: all existing WebSocket tests and new REST tests pass.

### Task 3: Enforce WebSocket command authorization and packet parity

**Files:**
- Modify: `QHZHC_Server/api_chart/consumers.py`
- Modify: `QHZHC_Server/api_chart/tests.py`

- [ ] **Step 1: Add command-level authorization tests**

Create two users: one with only `can_visit_realtime`, one with both permissions. Assert that the first user cannot receive a historical packet:

```python
await communicator.send_json_to({"command": "history_data_5min"})
response = await communicator.receive_json_from()
self.assertEqual(response["code"], 403)
self.assertEqual(response["message"], "没有历史数据查询权限")
```

Mock database access so the test proves the handler rejects before a query is made.

- [ ] **Step 2: Replace the unguarded dispatch table**

Use explicit command metadata:

```python
COMMANDS = {
    "close": {"handler": "handle_close", "permission": None},
    "new_data_gps": {"handler": "handle_new_data_gps", "permission": "can_visit_realtime"},
    "history_data_5min": {"handler": "handle_history_data_5min", "permission": "can_visit_history"},
}

def has_visualization_permission(user, field):
    return user.is_superuser or getattr(user, field, False)
```

In `receive`, validate JSON, command existence, permission, then call the named handler. Return code 400 for malformed packets, 403 for denied commands, and 500 only for internal errors.

- [ ] **Step 3: Reuse a single point mapper**

Move the point transformation into `to_visualization_point(row, timezone)`. Both `handle_new_data_gps` and `handle_history_data_5min` must use it. The mapper converts coordinates, wind vector, angle, speed, normalized Picarro field names, and `picarro_ch4`.

- [ ] **Step 4: Limit real-time payload and preserve no-data semantics**

`new_data_gps` returns one normalized point when a record exists. When no record exists, return:

```json
{
  "code": 204,
  "message": "当前窗口无实时数据",
  "data": []
}
```

Do not emit a synthetic null point. The frontend handles this as a non-fatal status update.

- [ ] **Step 5: Run WebSocket tests**

Run the `api_chart` test suite and assert it includes:

```text
authorized realtime command accepted
history command denied without history permission
history command accepted with history permission
history packet uses normalized Picarro keys
anonymous connection rejected
```

### Task 4: Add a deterministic frontend visualization data layer

**Files:**
- Create: `QHZHC_Web/src/views/DataVisualization/utils/visualizationData.js`
- Create: `QHZHC_Web/tests/unit/visualizationData.spec.js`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/chartData.js`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/Charts.vue`

- [ ] **Step 1: Add unit-test tooling**

Install Vue 2-compatible dependencies:

```bash
npm install --save-dev jest@27 babel-jest@27 @vue/test-utils@1 vue-jest@3
```

Add `test:unit` to `package.json`:

```json
"test:unit": "jest --runInBand"
```

Configure Jest to transform `.vue` and `.js` files using the project Babel configuration.

- [ ] **Step 2: Write pure data helper tests**

Test bounded data and response validation:

```js
import { appendRealtimePoint, normalizeEnvelope, validateHistoryRange } from "@/views/DataVisualization/utils/visualizationData";

test("appendRealtimePoint retains only 300 points", () => {
  const points = Array.from({ length: 300 }, (_, index) => ({ time: String(index) }));
  expect(appendRealtimePoint(points, { time: "300" }, 300)).toHaveLength(300);
});

test("normalizeEnvelope rejects a non-array data field", () => {
  expect(() => normalizeEnvelope({ code: 200, data: {} })).toThrow("data must be an array");
});
```

- [ ] **Step 3: Implement helpers**

Implement the tested functions:

```js
export function appendRealtimePoint(points, point, maxPoints = 300) {
  return [...points, point].slice(-maxPoints);
}

export function normalizeEnvelope(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error("data must be an array");
  return payload;
}

export function validateHistoryRange(day, range) {
  if (!day || !Array.isArray(range) || !range[0] || !range[1]) {
    throw new Error("请选择日期和完整时间范围");
  }
  const start = `${day} ${range[0]}`;
  const end = `${day} ${range[1]}`;
  if (new Date(start.replace(/-/g, "/")) >= new Date(end.replace(/-/g, "/"))) {
    throw new Error("结束时间必须晚于开始时间");
  }
  return { start, end };
}
```

- [ ] **Step 4: Make chart options pure and empty-safe**

Remove the unused `moment` import. Fix high-range methane:

```js
data1.push([gas.time, gas.picarro_hr_12ch4_dry]);
```

In every chart factory, return an empty option when input data is empty. In `weekWeatherChart`, do not read `dataY2[0]` without checking length:

```js
const minValues = dataY2.map(([, value]) => Number(value)).filter(Number.isFinite);
const weekTempMin = minValues.length ? Math.min(...minValues) : 0;
```

- [ ] **Step 5: Replace mutation-based chart updates**

`Charts.vue` receives the complete normalized window. Replace `splice(0, 1)`/`push(...)` with:

```js
this.gasdata = Array.isArray(this.newdata.data) ? this.newdata.data.slice() : [];
this.chart.setOption(getChart({ chartName: this.chartName, data: this.gasdata, ... }), {
  notMerge: this.isIntialization,
  lazyUpdate: true,
});
```

Show an empty chart option and “暂无数据” overlay rather than artificial null points.

- [ ] **Step 6: Run frontend unit tests**

Run:

```bash
npm run test:unit -- visualizationData.spec.js
```

Expected: range validation, bounded buffer, empty chart, CH4 high-range, and weekly-weather-empty tests pass.

### Task 5: Make realtime mode a single managed lifecycle

**Files:**
- Create: `QHZHC_Web/src/views/DataVisualization/services/realtimeClient.js`
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`
- Create: `QHZHC_Web/tests/unit/realtimeClient.spec.js`

- [ ] **Step 1: Write a client lifecycle test**

Mock `WebSocket` and timers. Assert `start()` called twice creates one socket and one interval; `stop()` closes the socket and clears the exact timer:

```js
test("start is idempotent and stop releases resources", () => {
  const client = new RealtimeClient({ WebSocketImpl: MockSocket, setIntervalImpl, clearIntervalImpl });
  client.start();
  client.start();
  expect(MockSocket).toHaveBeenCalledTimes(1);
  client.stop();
  expect(clearIntervalImpl).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Implement a bounded reconnecting client**

The class owns `socket`, `timer`, `retryTimer`, `mode`, and `closedByUser`. It sends `history_data_5min` exactly once after open, then sends `new_data_gps` every second. Reconnect delays are `1 s`, `2 s`, `5 s`, then `10 s` maximum. `stop()` cancels every timer and disables future reconnects.

- [ ] **Step 3: Wire the page to one client**

In `dataVisualization.vue`, create the client when entering real-time mode and destroy it in `beforeDestroy`. Do not call `initWebSocket()` directly from click handlers. Ignore the realtime mode click when it is already selected:

```js
if (this.searchType === 1) return;
```

Store the current mode before starting/stopping so delayed callbacks cannot update a historical screen.

- [ ] **Step 4: Limit point retention and update visible state**

On a code 200 real-time packet, append the latest point through `appendRealtimePoint`. On code 204, keep existing charts and display “当前窗口无实时数据”. On code 401 or 403, stop the client, clear session state, and navigate once to login with the current route as redirect.

- [ ] **Step 5: Verify with browser tooling**

Open the page, click realtime mode 10 times, inspect network and console, then navigate away. Expected result: one WebSocket, one request per second, no timer activity after navigation, no duplicate map point or chart update.

### Task 6: Close the historical query and point-detail workflow

**Files:**
- Create: `QHZHC_Web/src/views/DataVisualization/services/historyApi.js`
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`
- Create: `QHZHC_Web/tests/unit/historyApi.spec.js`

- [ ] **Step 1: Test request construction and response errors**

```js
test("range search sends selected start and end timestamps", async () => {
  await fetchHistoryRange("2026-07-19 10:00:00", "2026-07-19 10:05:00");
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    url: "/api/chart/dataTrans/between",
    params: { start_time: "2026-07-19 10:00:00", end_time: "2026-07-19 10:05:00" }
  }));
});
```

Test that HTTP 400, 403, 500, invalid envelope, and `data: []` each produce distinct frontend states.

- [ ] **Step 2: Implement history API wrappers**

`fetchHistoryRange` and `fetchFiveMinuteWindow` call the existing request instance, validate HTTP status and envelope shape, and return normalized envelopes. They must never fall back to `localStorage.mapList`.

- [ ] **Step 3: Replace `searchHistory()`**

Implement:

```js
async searchHistory() {
  const { start, end } = validateHistoryRange(this.day, this.value1);
  this.historyStatus = "loading";
  this.historyError = "";
  try {
    const result = await fetchHistoryRange(start, end);
    this.historyData = result;
    this.selectedHistoryPoint = null;
    this.checkData = false;
    this.renderHistoryResult();
    this.historyStatus = result.data.length ? "success" : "empty";
  } catch (error) {
    this.historyError = error.message;
    this.historyStatus = "error";
  }
}
```

`renderHistoryResult()` dispatches to the selected map renderer only after `historyData` is valid. It must not use stale data from a prior successful search when the newest request fails.

- [ ] **Step 4: Fix map mode and detail state**

Correct the duplicate history condition so trajectory rendering requires `map === 2`. Set `rightFlag = true` after successful history point selection. Once a point is selected, call `fetchFiveMinuteWindow(point.time)`, update `gasdata`, `detailData`, and both side panels only after successful response validation.

- [ ] **Step 5: Verify browser cases**

Run all cases:

```text
空日期或时间范围 -> 表单错误，不发请求
开始时间 >= 结束时间 -> 表单错误，不发请求
有效范围且有数据 -> 地图、时间标签、点数与响应一致
有效范围无数据 -> 空态，无旧地图数据
403 -> 权限提示，无旧历史结果
500 -> 错误提示，无业务成功文案
点击历史点 -> 请求五分钟接口，详情与两侧图表更新
```

### Task 7: Repair OpenLayers and Cesium ownership boundaries

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/components/PlanimetricMap.vue`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/StereoscopicMap.vue`
- Create: `QHZHC_Web/tests/unit/mapLifecycle.spec.js`

- [ ] **Step 1: Add lifecycle-focused tests**

Mock OpenLayers `on` and Cesium `ScreenSpaceEventHandler`. Assert repeated history renders add one active click handler, and component destruction removes/destroys all owned handles.

- [ ] **Step 2: Bind the OpenLayers click handler once**

Create a named handler in `mounted()` after map initialization, retain the returned event key, and remove it in `beforeDestroy`:

```js
this.mapClickKey = this.map.on("singleclick", this.handleMapClick);

beforeDestroy() {
  if (this.mapClickKey) unByKey(this.mapClickKey);
  clearInterval(this.timer);
  this.map?.setTarget(null);
}
```

`createCircle()` only refreshes features. It must never bind another handler.

- [ ] **Step 3: Make Cesium conditional and disposable**

In the page template, use conditional mount for the inactive 3D renderer:

```html
<StereoscopicMap
  v-if="mapType === 2"
  :map-list="mapList"
  :history-data="historyData"
  @getTimePointer="getTimePointer"
/>
```

In `StereoscopicMap.vue`, replace `destroy()` with `beforeDestroy()`. Store one `screenSpaceHandler`; destroy it before replacement and in `beforeDestroy`. Destroy the viewer only once:

```js
if (this.viewer && !this.viewer.isDestroyed()) {
  this.viewer.destroy();
}
this.viewer = null;
```

Set `requestRenderMode: true` and call `viewer.scene.requestRender()` after entity changes.

- [ ] **Step 4: Separate map render modes**

Expose explicit methods or props for:

```text
realtime point rendering
history concentration rendering
history trajectory rendering
clear rendering
```

Do not infer history mode from hidden component state. A component receives an immutable point array and one render mode, then clears old resources before rendering the new mode.

- [ ] **Step 5: Run repeated-switch browser verification**

Perform 10 cycles of:

```text
历史查询 -> 气体切换 -> 阈值更新 -> 二维 -> 三维 -> 二维 -> 点选
```

Expected: each click causes one detail request, no duplicate warnings, no hidden Cesium render loop, and no leaked WebGL context after route navigation.

### Task 8: Make thresholds and primary controls valid and accessible

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/components/RangeConfig.vue`
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/Details.vue`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/legend.vue`
- Create: `QHZHC_Web/tests/unit/rangeConfig.spec.js`

- [ ] **Step 1: Add threshold validation tests**

```js
test.each([
  [[["a", 2], [2, 3], [3, 4], [4, 5], [5, 6]], "必须为有限数值"],
  [[[2, 1], [2, 3], [3, 4], [4, 5], [5, 6]], "下界必须小于上界"],
  [[[0, 2], [1, 3], [3, 4], [4, 5], [5, 6]], "区间不得重叠"]
])("rejects invalid ranges", (ranges, message) => {
  expect(() => validateThresholdRanges(ranges)).toThrow(message);
});
```

- [ ] **Step 2: Implement validation before mutation**

Use `el-form` and number inputs. Validation parses all values, rejects `NaN`/infinity, requires lower `<` upper, and requires each next lower bound equal to the preceding upper bound. Only then commit:

```js
validateThresholdRanges(this.rangeList);
this.$store.commit("SET_GasData", { name: this.gasName, value: normalizedRanges });
this.$emit("gasDataChange");
this.$emit("closeChildDialog");
```

Keep the dialog open on validation failure and render the exact error message.

- [ ] **Step 3: Replace clickable div controls**

Convert map type, gas category, gas field, realtime/history mode, collapse/expand, legend, threshold trigger, clear action, and details collapse into `<button type="button">` or Element UI buttons. For selected controls use `:aria-pressed`; supply `aria-label` where the label is icon-only. Use disabled and loading states while a history request is in progress.

- [ ] **Step 4: Remove unsupported production controls**

Remove “现场照片”, “卫星”, and the commented graph-mode section from the production toolbar. Remove `/showChart` from production routing. Preserve demo code only in a separately named development demo route guarded by `NODE_ENV !== "production"`.

- [ ] **Step 5: Verify keyboard and validation paths**

Use browser Tab, Enter, and Space to operate all remaining controls. Verify invalid ranges cannot change the legend or map colors and valid ranges update both exactly once.

### Task 9: Move weather and map configuration behind controlled services

**Files:**
- Create: `QHZHC_Server/api_chart/weather.py`
- Modify: `QHZHC_Server/api_chart/urls.py`
- Modify: `QHZHC_Web/src/views/DataVisualization/components/Weather.vue`
- Modify: `QHZHC_Web/src/utils/request.js`
- Modify: deployment secret configuration and `.env.example`

- [ ] **Step 1: Define an internal weather endpoint**

Implement `GET /api/chart/weather?longitude=<number>&latitude=<number>`. Validate coordinate ranges, call QWeather server-side with `QWEATHER_API_KEY`, impose a 5-second timeout, and cache:

```text
hourly forecast cache: 1 hour
daily forecast cache: 12 hours
cache key: rounded longitude + rounded latitude
```

Return `hourly` and `daily` in a fixed internal envelope. Do not forward the provider key or provider error body.

- [ ] **Step 2: Update Weather.vue state model**

Use:

```js
weatherStatus: "idle" | "loading" | "success" | "error"
weatherError: ""
lastWeatherLocationKey: ""
```

Only set `lastWeatherLocationKey` after a validated response. On failure, show a retry action and preserve the last successful forecast. Do not use hour/day marker values as failed-request locks.

- [ ] **Step 3: Externalize URL and map configuration**

Replace `127.0.0.1:18080` with `VUE_APP_API_BASE_URL`. Map provider keys must use restricted public keys injected by the build pipeline; no private credentials belong in source. All tile endpoints must use HTTPS.

- [ ] **Step 4: Verify external-service failure behavior**

Mock weather timeout, 429, invalid JSON, and empty payload. Expected: existing weather remains visible if available, an explicit error is shown, and retry is possible without waiting an hour or day.

### Task 10: Remove dead code, enforce quality gates, and complete release verification

**Files:**
- Modify: `QHZHC_Web/src/views/DataVisualization/dataVisualization.vue`
- Delete: `QHZHC_Web/src/views/DataVisualization/dataVisualization1.vue`
- Delete: `QHZHC_Web/src/views/DataVisualization/components/WindCharts.vue`
- Delete: `QHZHC_Web/src/utils/websocket.js`
- Modify: `QHZHC_Web/package.json`
- Modify: CI configuration if present in the repository

- [ ] **Step 1: Remove unused code only after import/reference search**

Before deletion, run:

```bash
rg -n "dataVisualization1|WindCharts|SocketService|showChart" QHZHC_Web/src
```

Remove each import, component registration, route, asset dependency, and unused configuration reference. Do not delete `showChart` source until the route is removed and no documentation/example link references it.

- [ ] **Step 2: Split page orchestration from rendering**

Keep `dataVisualization.vue` responsible only for selected mode, selected gas, query state, and component props. Move socket lifecycle, history REST calls, DTO validation, and range helpers to the files defined in Section 3. Target fewer than 500 lines for the page container and fewer than 400 lines for each map/chart implementation file.

- [ ] **Step 3: Resolve all data-visualization lint errors**

Fix the following before widening scope to unrelated modules:

```text
undefined picarro_hr_12ch4_dry
duplicate history else-if branch
unused WindCharts registration
unused moment import
non-standard Vue lifecycle hook
implicit Cesium global
deprecated ECharts itemStyle.normal
unused watcher parameters
```

Configure Cesium as an explicit import or a declared, build-provided global with a documented ESLint environment entry. Do not suppress `no-undef` globally.

- [ ] **Step 4: Add release commands**

Add:

```json
"test": "npm run test:unit",
"verify": "npm run lint && npm run test:unit && npm run build"
```

Run backend verification separately:

```bash
cd QHZHC_Server
../.venv/bin/python manage.py check
../.venv/bin/python manage.py test api_chart --verbosity 2
```

- [ ] **Step 5: Execute final browser acceptance**

Use a fresh account for each permission combination:

```text
anonymous
realtime only
history only
realtime + history
administrator
```

Verify every row in the acceptance matrix below. Capture console messages, WebSocket frames, REST status codes, and screenshots for real-time, valid historical result, empty history, denied history, map switch, threshold validation, and logout.

## 5. Acceptance Matrix

| ID | Scenario | Expected result |
| --- | --- | --- |
| A-01 | Anonymous opens `/dataVisualization` | Redirect to login with internal redirect path retained. |
| A-02 | Realtime-only user sends `history_data_5min` | Receives 403; database query is not executed. |
| A-03 | History-only user opens real-time page | WebSocket rejected; history REST remains usable. |
| A-04 | Valid historical range | REST 200, normalized point fields, selected range displayed, correct point count rendered. |
| A-05 | Invalid/reverse/over-24-hour range | HTTP 400 and visible validation error; no stale map result. |
| A-06 | Historical SQL failure | HTTP 500, generic message, no SQL text, no business code 200. |
| A-07 | Realtime CH4 crosses 12 ppm | CH4 chart updates with HR Picarro value; console has no ReferenceError. |
| A-08 | Weekly weather opened before network response | Loading/empty state; no `dataY2[0]` exception. |
| A-09 | Click realtime mode repeatedly | One live socket and one polling timer. |
| A-10 | Navigate away from page | Socket closed, timers cleared, no Cesium/WebGL or OpenLayers handler activity remains. |
| A-11 | Repeat history render, gas change, threshold change | One map click invokes one detail request. |
| A-12 | Invalid threshold input | Submission blocked, map and legend retain previous valid values. |
| A-13 | Keyboard navigation | All visible controls reachable by Tab and operable with Enter/Space. |
| A-14 | `npm run verify` | Lint, unit tests, and production build pass. |

## 6. Rollout and Rollback

1. Deploy secret changes before deploying cookie authentication. Keep old signing key invalid; do not run dual-key acceptance because the old key is already exposed.
2. Deploy backend contract changes before frontend history changes. Validate REST endpoints with a history-capable account and direct API tests.
3. Deploy frontend with feature flag `VUE_APP_VISUALIZATION_V2=true`. Keep the old route unavailable to normal users rather than serving the old insecure path.
4. Monitor WebSocket connection count, history query error rate, backend asyncpg connection count, frontend uncaught exceptions, and provider API status.
5. If functional rollback is needed, roll back only the frontend feature flag after retaining rotated secrets and server-side authorization fixes. Never restore URL JWTs, committed secrets, or unguarded historical WebSocket commands.

## 7. Plan Self-Review

**Coverage:** The plan covers P0 security defects, historical REST and WebSocket contract failures, real-time lifecycle duplication, chart exceptions, map listener/resource leaks, threshold validation, weather failure handling, accessibility, dead code, quality gates, and browser acceptance. “现场照片”, “卫星”, and trajectory UI are explicitly removed from the release scope because no product behavior is defined.

**Placeholder scan:** No implementation step delegates behavior to unspecified future work. Values introduced by the plan are explicit: 300 realtime points, 24-hour maximum history range, 5-second weather timeout, and bounded reconnect delays.

**Type consistency:** REST and WebSocket use the same `VisualizationPoint` field names. Frontend helpers receive and return the normalized envelope. Map render modes consume immutable point arrays; chart factories accept arrays and return empty-safe ECharts options.

## 8. Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-19-data-visualization-remediation.md`.

Execution options:

1. **Subagent-Driven（推荐）**：按任务分派独立实现与复核，适合安全、后端、前端和地图改造并行推进。
2. **Inline Execution**：在当前会话逐任务实现，每个阶段保留测试与浏览器验证检查点。
