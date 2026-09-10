<template>
  <main class="performance-admin">
    <header>
      <div>
        <p class="eyebrow">CARBONSCOPE · OBSERVABILITY</p>
        <h1>性能监控</h1>
        <p class="muted">标准页面体验与实时可视化分开展示，按场景判断性能。</p>
      </div>
      <nav>
        <router-link to="/admin/simulator">模拟后台</router-link>
        <router-link to="/dataVisualization">数据可视化</router-link>
        <el-button size="small" @click="definitionsOpen = true">指标说明与阈值</el-button>
      </nav>
    </header>
    <section class="filters">
      <el-select v-model="hours" size="small" @change="filterChanged">
        <el-option
          v-for="h in [1, 6, 24, 168, 720]"
          :key="h"
          :label="h < 24 ? '最近 ' + h + ' 小时' : '最近 ' + h / 24 + ' 天'"
          :value="h"
        />
      </el-select>
      <el-select
        v-for="f in selectFilters"
        :key="f.key"
        v-model="filters[f.key]"
        size="small"
        clearable
        :placeholder="f.label"
        @change="filterChanged"
      >
        <el-option v-for="o in f.options" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-input
        v-model="filters.release"
        size="small"
        clearable
        placeholder="发布版本"
        @change="filterChanged"
      />
      <el-input
        v-model="filters.browser"
        size="small"
        clearable
        placeholder="浏览器，如 Chrome/151"
        @change="filterChanged"
      />
      <el-button size="small" :loading="loading" @click="refresh">刷新</el-button>
    </section>
    <div class="status-line">
      <span :class="error ? 'error' : ''">
        {{ error || (updatedAt ? "更新于 " + updatedAt + " · 每 10 秒刷新" : "等待监控数据") }}
      </span>
      <span>{{ overview.visits || 0 }} 次访问 · 明细 7 天 / 趋势 30 天</span>
    </div>
    <el-alert
      v-if="overview.truncated"
      title="查询达到数据量上限，请缩小范围；当前统计不是完整数据。"
      type="warning"
      :closable="false"
    />
    <el-alert
      v-if="!overview.visits && !loading"
      title="暂无监控数据：登录后在数据可视化页面前台停留至少 20 秒，再返回此页。"
      type="info"
      :closable="false"
    />
    <el-alert
      v-if="overview.visitsWithDroppedBatches"
      :title="overview.visitsWithDroppedBatches + ' 次访问报告上报丢失，指标覆盖可能不足。'"
      type="warning"
      :closable="false"
    />
    <section class="cards">
      <article v-for="name in coreMetrics" :key="name" class="metric-card">
        <div class="card-title">
          {{ definition(name).title }}
          <button @click="openDefinition(name)" aria-label="查看指标说明">ⓘ</button>
        </div>
        <template v-if="groups(name).length">
          <div v-for="g in groups(name).slice(0, 3)" :key="groupKey(g)" class="card-reading">
            <strong>
              {{ format(g.value) }}
              <small>{{ definition(name).unit }}</small>
            </strong>
            <span :class="'rating ' + (g.sufficient ? g.rating : 'insufficient')">
              {{ level(g) }}
            </span>
            <div class="muted">{{ contextLabel(g.context) }} · {{ g.visits }} 次访问</div>
            <div class="muted" v-if="name === 'fps' && g.lowWindowRatio !== null">
              低帧率窗口（近似）：{{ format(g.lowWindowRatio * 100) }}%
            </div>
          </div>
          <p v-if="groups(name).length > 3" class="muted">更多场景见下方明细</p>
        </template>
        <template v-else>
          <strong class="unavailable">N/A</strong>
          <p class="muted">{{ missingReason(name) }}</p>
        </template>
        <div class="metric-foot">
          {{
            definition(name).standard
              ? "公开参考标准 · P75"
              : name === "fps"
              ? "短时 rAF 估算 · 非实际呈现帧率"
              : "项目工程目标"
          }}
        </div>
      </article>
    </section>
    <section class="chart-grid">
      <article v-for="c in chartSpecs" :key="c.key" class="panel">
        <h2>{{ c.title }}</h2>
        <div :ref="c.key" class="trend-chart"></div>
      </article>
    </section>
    <section class="panel">
      <h2>指标与瓶颈明细</h2>
      <p class="muted">少于 20 次访问的分组暂不作总体判断；高频耗时分位数来自合并分布。</p>
      <el-table :data="sortedMetrics" size="small" max-height="460" stripe>
        <el-table-column label="指标" min-width="290">
          <template slot-scope="s">
            <button class="text-button" @click="openDefinition(s.row.name)">
              {{ definition(s.row.name).title }}
            </button>
          </template>
        </el-table-column>
        <el-table-column
          prop="component"
          label="组件 / 接口"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="场景" min-width="220">
          <template slot-scope="s">{{ contextLabel(s.row.context) }}</template>
        </el-table-column>
        <el-table-column label="统计值" width="115">
          <template slot-scope="s">
            {{ format(s.row.value) }} {{ definition(s.row.name).unit }}
          </template>
        </el-table-column>
        <el-table-column label="P95" width="90">
          <template slot-scope="s">
            {{ definition(s.row.name).unit === "ms" ? format(s.row.p95) : "—" }}
          </template>
        </el-table-column>
        <el-table-column label="样本 / 访问" width="110">
          <template slot-scope="s">{{ s.row.count }} / {{ s.row.visits }}</template>
        </el-table-column>
        <el-table-column label="分级" width="175">
          <template slot-scope="s">
            <span :class="'rating ' + (s.row.sufficient ? s.row.rating : 'insufficient')">
              {{ level(s.row) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </section>
    <section class="panel">
      <h2>
        异常记录
        <small>持续三个较差窗口触发，连续两个非较差窗口结束</small>
      </h2>
      <el-table :data="anomalies.items || []" size="small" stripe>
        <el-table-column label="开始时间" width="175">
          <template slot-scope="s">{{ time(s.row.started) }}</template>
        </el-table-column>
        <el-table-column label="指标" min-width="290">
          <template slot-scope="s">{{ definition(s.row.name).title }}</template>
        </el-table-column>
        <el-table-column prop="component" label="组件" min-width="120" />
        <el-table-column label="场景" min-width="210">
          <template slot-scope="s">{{ contextLabel(s.row.context) }}</template>
        </el-table-column>
        <el-table-column label="值" width="90">
          <template slot-scope="s">{{ format(s.row.value) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template slot-scope="s">{{ s.row.ended ? "已结束" : "未确认恢复" }}</template>
        </el-table-column>
        <el-table-column label="访问" width="100">
          <template slot-scope="s">
            <el-button type="text" @click="openVisit(s.row.visit)">查看过程</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        :current-page.sync="anomalyPage"
        :page-size="20"
        :total="anomalies.total || 0"
        layout="prev, pager, next"
        @current-change="refresh"
      />
    </section>
    <section class="panel">
      <h2>访问记录</h2>
      <el-table :data="visits.items || []" size="small" stripe>
        <el-table-column label="最近活动" width="175">
          <template slot-scope="s">{{ time(s.row.ended) }}</template>
        </el-table-column>
        <el-table-column label="访问标识" min-width="190" prop="id" show-overflow-tooltip />
        <el-table-column label="场景" min-width="230">
          <template slot-scope="s">{{ contextLabel(s.row.metadata.context) }}</template>
        </el-table-column>
        <el-table-column label="首屏适用性" min-width="160">
          <template slot-scope="s">
            {{
              s.row.mixed
                ? "混合路由，不评级"
                : s.row.metadata.eligible
                ? "文档导航"
                : "SPA：使用业务就绪"
            }}
          </template>
        </el-table-column>
        <el-table-column label="详情" width="100">
          <template slot-scope="s">
            <el-button type="text" @click="openVisit(s.row.id)">查看过程</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        :current-page.sync="visitPage"
        :page-size="20"
        :total="visits.total || 0"
        layout="prev, pager, next"
        @current-change="refresh"
      />
    </section>
    <el-drawer title="指标说明与阈值" :visible.sync="definitionsOpen" size="560px">
      <div class="drawer-body">
        <p class="muted">阈值版本 {{ thresholdVersion }}。FPS 参考档位由采样端配置。</p>
        <p class="muted">
          名称统一为“简称（英文全称）”；自定义诊断指标使用项目内部简称，中文含义与采集口径见下方说明。
        </p>
        <el-select v-model="selectedDefinition" clearable placeholder="全部指标">
          <el-option v-for="d in definitions" :key="d.name" :label="d.title" :value="d.name" />
        </el-select>
        <article v-for="d in shownDefinitions" :key="d.name" class="definition">
          <h3>
            {{ d.title }}
          </h3>
          <p>{{ d.reason }}</p>
          <p>{{ d.method }}</p>
          <p v-if="d.good !== undefined">
            {{ d.standard ? "良好" : "优秀目标" }} {{ d.direction === "higher" ? "≥" : "≤" }}
            {{ d.good }} {{ d.unit }}；较差 {{ d.direction === "higher" ? "<" : ">" }} {{ d.poor }}
            {{ d.unit }}
          </p>
          <p v-else>辅助诊断，无统一优秀阈值。</p>
          <a
            v-if="d.source.startsWith('https://')"
            :href="d.source"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看参考来源
          </a>
          <p v-else class="muted">{{ d.source }}</p>
        </article>
      </div>
    </el-drawer>
    <el-drawer title="访问详情与阶段时间线" :visible.sync="detailOpen" size="680px">
      <div v-if="detail" class="drawer-body">
        <p class="muted">{{ detail.visit.id }}</p>
        <p>最多展示最近 {{ detail.detailLimit }} 个详细窗口；七天前仅保留汇总。</p>
        <el-alert
          v-if="detail.visit.mixed"
          title="此文档有跨页面访问，标准指标不计入纯可视化达标率。"
          type="info"
          :closable="false"
        />
        <h3>采集覆盖</h3>
        <p v-for="(reason, name) in detail.visit.metadata.missing" :key="name">
          {{ definition(name).title }}：{{ reasonLabel(reason) }}
        </p>
        <h3>阶段事件</h3>
        <el-timeline>
          <el-timeline-item v-for="(e, i) in detailEvents" :key="i" :timestamp="time(e.at)">
            <strong>{{ eventName(e.name) }}</strong>
            {{ e.component }} · {{ e.status }}
            <span v-if="e.value !== undefined">{{ format(e.value) }} ms</span>
          </el-timeline-item>
        </el-timeline>
        <h3>采样窗口</h3>
        <el-table :data="detail.windows.slice().reverse()" size="small" max-height="360">
          <el-table-column label="时间" min-width="170">
            <template slot-scope="s">{{ time(s.row.endedAt) }}</template>
          </el-table-column>
          <el-table-column label="场景" min-width="160">
            <template slot-scope="s">{{ contextLabel(s.row.context) }}</template>
          </el-table-column>
          <el-table-column label="有效时长">
            <template slot-scope="s">{{ format(s.row.activeMs / 1000) }} s</template>
          </el-table-column>
          <el-table-column prop="dropped" label="上报丢弃" />
        </el-table>
      </div>
    </el-drawer>
  </main>
</template>
<script lang="ts">
import Vue from "vue";
import * as echarts from "echarts";
import request from "@/utils/request";
import { DEFINITIONS, THRESHOLD_VERSION } from "../../../../QHZHC_Server/src/shared/performance";
export default Vue.extend({
  name: "PerformanceAdmin",
  data() {
    return {
      hours: 1,
      loading: false,
      error: "",
      updatedAt: "",
      overview: { metrics: [], visits: 0, missing: {} } as any,
      trends: [] as any[],
      visits: {} as any,
      anomalies: {} as any,
      visitPage: 1,
      anomalyPage: 1,
      detail: null as any,
      detailOpen: false,
      definitionsOpen: false,
      selectedDefinition: "",
      definitions: DEFINITIONS,
      thresholdVersion: THRESHOLD_VERSION,
      filters: {
        mapType: "",
        mode: "",
        environment: "",
        device: "",
        dataSize: "",
        release: "",
        browser: "",
        referenceHz: "",
      } as Record<string, string>,
      coreMetrics: ["LCP", "INP", "CLS", "fps", "loafBlocking", "ready"],
      selectFilters: [
        {
          key: "mapType",
          label: "地图类型",
          options: [
            { label: "2D", value: "2d" },
            { label: "3D", value: "3d" },
          ],
        },
        {
          key: "mode",
          label: "数据模式",
          options: [
            { label: "实时", value: "realtime" },
            { label: "历史", value: "history" },
            { label: "初始加载", value: "initial" },
            { label: "补发", value: "replay" },
          ],
        },
        {
          key: "environment",
          label: "环境",
          options: [
            { label: "生产", value: "production" },
            { label: "开发", value: "development" },
          ],
        },
        {
          key: "device",
          label: "设备",
          options: [
            { label: "桌面", value: "desktop" },
            { label: "移动", value: "mobile" },
          ],
        },
        {
          key: "dataSize",
          label: "数据量",
          options: [
            { label: "<1000 点", value: "small" },
            { label: "1000～4999 点", value: "medium" },
            { label: "≥5000 点", value: "full" },
          ],
        },
        {
          key: "referenceHz",
          label: "参考刷新率",
          options: [60, 90, 120, 144, 165, 240].map((v) => ({
            label: v + " Hz",
            value: String(v),
          })),
        },
      ],
      chartSpecs: [
        { key: "flow", title: "帧调度与主线程延迟", names: ["fps", "eventLoop"] },
        { key: "queue", title: "数据吞吐与积压", names: ["received", "consumed", "queueLength"] },
        { key: "render", title: "图表与地图更新耗时", names: ["chartUpdate", "mapUpdate"] },
        {
          key: "network",
          title: "请求与实时处理延迟",
          names: ["apiDuration", "receiveApply", "wsRtt"],
        },
      ],
    };
  },
  computed: {
    sortedMetrics(): any[] {
      return (this.overview.metrics || [])
        .slice()
        .sort(
          (a: any, b: any) =>
            (b.rating === "poor" ? 1 : 0) - (a.rating === "poor" ? 1 : 0) ||
            (b.value || 0) - (a.value || 0)
        );
    },
    shownDefinitions(): any[] {
      return this.definitions.filter(
        (d) => !this.selectedDefinition || d.name === this.selectedDefinition
      );
    },
    detailEvents(): any[] {
      return this.detail
        ? this.detail.windows.flatMap((w: any) => w.events).sort((a: any, b: any) => a.at - b.at)
        : [];
    },
  },
  mounted() {
    this.refresh();
    this.schedule();
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("resize", this.resizeCharts);
  },
  beforeDestroy() {
    clearTimeout((this as any)._timer);
    (this as any)._disposed = true;
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("resize", this.resizeCharts);
    for (const c of Object.values((this as any)._charts || {})) (c as any).dispose();
  },
  methods: {
    definition(name: string): any {
      return this.definitions.find((d) => d.name === name) || { title: name, unit: "" };
    },
    groups(name: string): any[] {
      return (this.overview.metrics || []).filter((g: any) => g.name === name);
    },
    groupKey(g: any): string {
      return g.name + "|" + g.component + "|" + JSON.stringify(g.context);
    },
    contextLabel(c: any): string {
      return c
        ? [
            c.mapType?.toUpperCase(),
            ({ realtime: "实时", history: "历史", initial: "初始", replay: "补发" } as any)[c.mode],
            c.dataSize,
            c.device,
            c.browser,
            c.referenceHz + "Hz",
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
    },
    level(g: any): string {
      return g.rating === "diagnostic"
        ? "辅助诊断"
        : !g.sufficient
        ? "样本不足，暂不总体判断"
        : (
            {
              good: this.definition(g.name).standard ? "良好" : "优秀",
              poor: "较差",
              "needs-improvement": "待优化",
            } as any
          )[g.rating] || "N/A";
    },
    format(value: any): string {
      return typeof value === "number" && Number.isFinite(value)
        ? Number(value.toFixed(value < 1 ? 3 : 1)).toLocaleString()
        : "N/A";
    },
    time(value: number): string {
      return new Date(value).toLocaleString();
    },
    reasonLabel(reason: string): string {
      return (
        (
          {
            unsupported: "浏览器不支持",
            "no-interaction": "无有效交互",
            "not-applicable": "本次导航不适用",
            pending: "未完成或等待采样",
            timeout: "业务绘制超时",
            "no-data": "未收到非空业务数据",
            failed: "业务加载失败",
            cancelled: "离开、隐藏或切换场景后取消",
            lost: "存在上报丢失",
            "mixed-route": "混合路由",
          } as any
        )[reason] || reason
      );
    },
    missingReason(name: string): string {
      const keys = Object.keys(this.overview.missing || {}).filter((k) => k.startsWith(name + ":"));
      return keys.length
        ? keys.map((k) => this.reasonLabel(k.split(":")[1])).join(" / ")
        : "暂无有效样本";
    },
    eventName(name: string): string {
      return (
        (
          {
            "view-enter": "进入页面",
            "view-leave": "离开页面",
            ready: "业务就绪",
            connected: "连接成功",
            disconnect: "连接断开",
            "scene-change": "场景切换",
            "slow-call": "慢调用",
            loaf: "长动画帧",
            "bfcache-restore": "页面缓存恢复",
          } as any
        )[name] || name
      );
    },
    openDefinition(name: string) {
      this.selectedDefinition = name;
      this.definitionsOpen = true;
    },
    filterChanged() {
      this.visitPage = 1;
      this.anomalyPage = 1;
      this.refresh();
    },
    async refresh() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      const to = Date.now(),
        params = { ...this.filters, to, from: to - this.hours * 3600000 };
      try {
        const [o, t, v, a] = await Promise.all([
          request.get("/api/admin/performance/overview", { params }),
          request.get("/api/admin/performance/trends", { params }),
          request.get("/api/admin/performance/visits", {
            params: { ...params, page: this.visitPage },
          }),
          request.get("/api/admin/performance/anomalies", {
            params: { ...params, page: this.anomalyPage },
          }),
        ]);
        if ((this as any)._disposed) return;
        this.overview = o.data;
        this.trends = t.data.metrics || [];
        this.visits = v.data;
        this.anomalies = a.data;
        this.updatedAt = new Date().toLocaleTimeString();
        this.$nextTick(this.drawCharts);
      } catch {
        this.error = "监控数据加载失败，请检查后台服务后重试。";
      } finally {
        this.loading = false;
      }
    },
    async openVisit(id: string) {
      try {
        const response = await request.get(
          "/api/admin/performance/visits/" + encodeURIComponent(id)
        );
        this.detail = response.data;
        this.detailOpen = true;
      } catch {
        this.error = "访问详情暂不可用。";
      }
    },
    schedule() {
      (this as any)._timer = setTimeout(() => {
        if (!(this as any)._disposed) {
          if (document.visibilityState !== "hidden") this.refresh();
          this.schedule();
        }
      }, 10000);
    },
    visibility() {
      if (document.visibilityState !== "hidden") this.refresh();
    },
    resizeCharts() {
      for (const c of Object.values((this as any)._charts || {})) (c as any).resize();
    },
    drawCharts() {
      const charts = (this as any)._charts || ((this as any)._charts = {});
      for (const spec of this.chartSpecs) {
        const ref = this.$refs[spec.key] as any,
          element = Array.isArray(ref) ? ref[0] : ref;
        if (!element) continue;
        const chart = charts[spec.key] || (charts[spec.key] = echarts.init(element)),
          series = new Map<string, any[]>(),
          axes = new Map<string, number>();
        for (const m of this.trends.filter((x) => spec.names.includes(x.name))) {
          const key =
            this.definition(m.name).title +
            (m.component ? " / " + m.component : "") +
            " · " +
            this.contextLabel(m.context);
          if (!series.has(key)) series.set(key, []);
          axes.set(
            key,
            (spec.key === "flow" && m.name === "eventLoop") ||
              (spec.key === "queue" && m.name === "queueLength")
              ? 1
              : 0
          );
          series
            .get(key)!
            .push([m.at, ["received", "consumed"].includes(m.name) ? m.rate : m.value]);
        }
        chart.setOption(
          {
            animation: false,
            tooltip: { trigger: "axis" },
            legend: { type: "scroll", bottom: 0, textStyle: { fontSize: 10 } },
            grid: { left: 48, right: 32, top: 28, bottom: 75 },
            xAxis: { type: "time" },
            yAxis: [
              {
                type: "value",
                name: spec.key === "flow" ? "FPS" : spec.key === "queue" ? "点/秒" : "ms",
              },
              {
                type: "value",
                name: spec.key === "flow" ? "ms" : spec.key === "queue" ? "积压点数" : "",
                show: ["flow", "queue"].includes(spec.key),
              },
            ],
            series: Array.from(series)
              .slice(0, 20)
              .map(([name, data]) => ({
                name,
                type: "line",
                yAxisIndex: axes.get(name) || 0,
                showSymbol: true,
                symbolSize: 4,
                connectNulls: false,
                data: data.sort((a, b) => a[0] - b[0]),
              })),
            title: series.size
              ? undefined
              : {
                  text: "暂无采样",
                  left: "center",
                  top: "40%",
                  textStyle: { fontSize: 14, color: "#8291a5" },
                },
          },
          true
        );
      }
    },
  },
});
</script>
<style scoped>
.performance-admin {
  min-height: 100vh;
  padding: 32px 40px 60px;
  background: #f3f6fa;
  color: #203047;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #426a8f;
}
h1 {
  font-size: 29px;
  margin: 9px 0;
}
p {
  line-height: 1.65;
}
nav {
  display: flex;
  align-items: center;
  gap: 20px;
}
a {
  color: #2368a2;
  text-decoration: none;
}
.muted {
  color: #708095;
  font-size: 12px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: white;
  padding: 16px;
  border-radius: 9px;
}
.filters .el-select,
.filters .el-input {
  width: 145px;
}
.status-line {
  display: flex;
  justify-content: space-between;
  padding: 16px 2px;
  font-size: 12px;
  color: #708095;
}
.error {
  color: #bf3b35;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.metric-card,
.panel {
  background: white;
  border: 1px solid #e4eaf1;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 5px #20304704;
}
.card-title {
  gap: 8px;
  line-height: 1.5;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}
.card-title button {
  flex-shrink: 0;
  border: 0;
  background: none;
  color: #708095;
  cursor: pointer;
}
.card-reading {
  margin-top: 16px;
}
.card-reading strong {
  font-size: 25px;
  display: inline-block;
  margin-right: 12px;
}
small {
  font-size: 11px;
  color: #708095;
  font-weight: normal;
  margin-left: 6px;
}
.metric-foot {
  font-size: 11px;
  color: #708095;
  margin-top: 18px;
  border-top: 1px solid #edf0f5;
  padding-top: 10px;
}
.rating {
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 4px;
  background: #f0f3f6;
  color: #63728a;
}
.rating.good {
  background: #e8f6ef;
  color: #258257;
}
.rating.poor {
  background: #fcedeb;
  color: #b5433c;
}
.rating.needs-improvement {
  background: #fff3da;
  color: #9d741f;
}
.unavailable {
  display: block;
  font-size: 28px;
  color: #8795a7;
  margin-top: 22px;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.panel {
  margin-bottom: 18px;
}
h2 {
  font-size: 16px;
  margin: 0 0 18px;
}
.trend-chart {
  height: 290px;
}
.text-button {
  border: 0;
  background: none;
  color: #2368a2;
  cursor: pointer;
  text-align: left;
  padding: 0;
}
.el-pagination {
  margin-top: 16px;
  text-align: right;
}
.drawer-body {
  padding: 0 24px 30px;
  height: calc(100vh - 90px);
  overflow: auto;
}
.drawer-body > .el-select {
  width: 100%;
}
.definition {
  border-bottom: 1px solid #e4eaf1;
  padding: 16px 0;
}
.definition p {
  font-size: 13px;
}
.definition a {
  font-size: 12px;
}
@media (max-width: 1100px) {
  .performance-admin {
    padding: 22px;
  }
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  header {
    align-items: flex-start;
    flex-direction: column;
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .performance-admin {
    padding: 14px;
  }
  .filters .el-select,
  .filters .el-input {
    width: 135px;
  }
  nav {
    gap: 12px;
  }
  .status-line {
    flex-direction: column;
    gap: 8px;
  }
}
.performance-admin ::v-deep .el-input__inner {
  background: #fff;
  color: #203047;
  border-color: #dce4ee;
}
.performance-admin ::v-deep .el-input__inner::placeholder {
  color: #7e8b9d;
}
.rating.insufficient {
  background: #f0f3f6;
  color: #63728a;
}
</style>
