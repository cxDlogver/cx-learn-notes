<template>
  <div class="chart-container">
    <div ref="root" id="main"></div>
    <div v-if="!gasdata.length" class="empty-state">暂无数据</div>
  </div>
</template>

<style lang="scss" scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

#main {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding-top: 1%;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
</style>

<script lang="ts">
import { performanceMonitor } from '@/services/performance/monitor';

import * as echarts from "echarts";
import { getChart } from "./chartData";
import { REALTIME_CHART_WINDOW_MS } from "../utils/visualizationData";
import resize from "@/utils/resize";

export default {
  name: "VisualizationCharts",
  mixins: [resize],
  props: {
    chartName: {
      type: String,
      required: true,
    },
    newdata: {
      type: Object,
      default: () => ({}),
    },
    searchType: {
      type: Number,
      default: 1,
    },
  },
  data() {
    return {
      chart: null,
      gasdata: [],
    };
  },
  watch: {
    newdata: {
      handler() {
        this.updateOptions();
      },
      deep: true,
    },
    searchType() {
      this.updateOptions();
    },
  },
  mounted() {
    this.chart = echarts.init(this.$refs.root);
    this.updateOptions();
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    getRealtimeTimeWindow(points) {
      if (this.searchType !== 1) {
        return undefined;
      }
      const timestamps = points
        .map((point) => new Date(point && point.time).getTime())
        .filter((timestamp) => Number.isFinite(timestamp));
      if (!timestamps.length) {
        return undefined;
      }
      const end = Math.max(...timestamps);
      return {
        start: end - REALTIME_CHART_WINDOW_MS,
        end,
      };
    },
    updateOptions() {
      const performanceVersion=performanceMonitor.renderVersion;
      const performanceVisible=Boolean(this.$refs.root && this.$refs.root.getClientRects().length && this.$refs.root.clientWidth);
      if(!performanceVisible)performanceMonitor.skipHidden(this.chartName,performanceVersion);
      performanceMonitor.record('chartCount',1,this.chartName);
      performanceMonitor.record('points',this.newdata?.data?.length || 0,this.chartName);
      return performanceMonitor.measure("chartUpdate", this.chartName, () => {
      this.gasdata = Array.isArray(this.newdata && this.newdata.data)
        ? this.newdata.data.slice()
        : [];
      if (!this.chart) {
        return;
      }
      const performanceVersion=performanceMonitor.renderVersion;
      const performanceRendered=()=>performanceMonitor.rendered(this.chartName,performanceVersion,Boolean(this.$refs.root?.getClientRects().length && this.$refs.root?.clientWidth));
      if(performanceVersion)this.chart.on('rendered',performanceRendered);
      try {
      const options = performanceMonitor.measure("chartConfig",this.chartName,()=>getChart({
          chartName: this.chartName,
          data: this.gasdata,
          containerWidth: this.$refs.root.clientWidth,
          isIntialization: true,
          timeWindow: this.getRealtimeTimeWindow(this.gasdata),
        }));
      performanceMonitor.measure("chartSetOption",this.chartName,()=>this.chart.setOption(options,
        {
          notMerge: true,
          lazyUpdate: false,
        },
      ));
      this.chart.resize();
      } finally { if(performanceVersion)this.chart.off('rendered',performanceRendered); }

      });
    },
  },
};
</script>
