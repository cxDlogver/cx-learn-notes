<template>
  <div class="app-content">
    <div
      class="left"
      v-show="
        (checkData && searchType == 2 && leftFlag) ||
        (searchType == 1 && leftFlag)
      "
    >
      <!-- 天气预报信息 -->
      <div class="left-weather">
        <div class="title">
          <div class="title-msg">气象信息</div>
        </div>
        <div class="weather-box title-content">
          <!-- <Weather v-if="weather_location_data != null" :location="weather_location_data"></Weather> -->
          <Weather
            :location="weather_location_data"
            :newdata="gasdata"
          ></Weather>
        </div>
      </div>
      <!-- CH4时序变化  -->
      <div class="left-ch4">
        <div class="title">
          <div class="title-msg">CH4时序变化</div>
        </div>
        <div class="ch4-box title-content">
          <Charts
            v-if="gasdata != null"
            :newdata="gasdata"
            :searchType="searchType"
            chartName="CH4"
          >
          </Charts>
        </div>
      </div>
      <!-- CO2时序变化  -->
      <div class="left-co2">
        <div class="title">
          <div class="title-msg">CO2时序变化</div>
        </div>
        <div class="co2-box title-content">
          <Charts
            v-if="gasdata != null"
            :newdata="gasdata"
            :searchType="searchType"
            chartName="CO2"
          >
          </Charts>
        </div>
      </div>
    </div>
    <!-- 左侧关闭按钮 -->
    <button
      type="button"
      v-show="(checkData && searchType == 2) || searchType == 1"
      :class="leftFlag ? 'close-leftbtn' : 'open-leftbtn'"
      :aria-expanded="String(leftFlag)"
      :aria-label="leftFlag ? '收起左侧图表面板' : '展开左侧图表面板'"
      @click="toggleLeftPanel"
    >
      <span
        :class="
          leftFlag
            ? 'iconfont icon-jiantou_yemian_xiangzuo'
            : 'iconfont icon-jiantou_yemian_xiangyou'
        "
      ></span>
    </button>
    <div class="map" v-loading="loading">
      <!-- 是否视角跟随按钮 -->
      <button
        type="button"
        class="button"
        v-if="searchType == 1"
        :aria-pressed="String(viewFlag)"
        @click="viewFlag = !viewFlag"
      >
        {{ viewFlag ? "取消跟随" : "视角跟随" }}
      </button>
      <!-- 指北针 -->
      <div class="map-icon">
        <i class="iconfont icon-zhinanzhen"></i>
      </div>
      <!-- 当前信号状态 -->
      <div class="state-box" v-if="searchType == 1 && signalState">
        {{ signalState }}
      </div>
      <!-- 操作栏 -->
      <div class="btn-box">
        <button
          type="button"
          class="gjx"
          :aria-expanded="String(boxShow)"
          aria-controls="visualization-tools"
          aria-label="切换工具栏"
          @click="boxShow = !boxShow"
        >
          <i class="iconfont icon-gongjuxiang"></i>
        </button>
        <div id="visualization-tools" class="c-content" v-show="boxShow">
          <div class="btn-content btn-content1">
            <div class="c-title">地图类型：</div>
            <div class="c-body">
              <button
                type="button"
                :class="mapType == 1 ? 'c-type mapbg1 active' : 'c-type mapbg1'"
                :aria-pressed="String(mapType === 1)"
                @click="checkMapType(1)"
              >
                平面
              </button>
              <button
                type="button"
                :class="mapType == 2 ? 'c-type mapbg2 active' : 'c-type mapbg2'"
                :aria-pressed="String(mapType === 2)"
                @click="checkMapType(2)"
              >
                3D
              </button>
            </div>
          </div>
          <div class="btn-content">
            <div class="c-title">阈值设置:</div>
            <button
              type="button"
              class="pic-link"
              aria-label="打开气体阈值设置"
              @click="dialogVisible = true"
            >
              <i class="iconfont icon-shuzhi"></i>
            </button>
          </div>
          <div class="btn-content btn-content3">
            <div class="c-title">气体种类：</div>
            <div class="gas-box">
              <button
                type="button"
                :class="gasType == 'PRI' ? 'gas-type active' : 'gas-type'"
                :aria-pressed="String(gasType === 'PRI')"
                @click="changeGas('PRI')"
              >
                PRI
              </button>
              <button
                type="button"
                :class="gasType == 'Picarro' ? 'gas-type active' : 'gas-type'"
                :aria-pressed="String(gasType === 'Picarro')"
                @click="changeGas('Picarro')"
              >
                Picarro
              </button>
            </div>
            <div class="gas-select" v-show="gasSelect">
              <button
                type="button"
                :class="gasName == item.label ? 'gas-item active' : 'gas-item'"
                :aria-pressed="String(gasName === item.label)"
                @click="checkGasName(item)"
                v-for="item in gasTypeList"
                :key="item.label"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
          <div class="btn-content btn-content2">
            <div class="c-title">查询方式：</div>
            <div class="bc2-body">
              <button
                type="button"
                :class="searchType == 1 ? 'icontype active' : 'icontype'"
                :aria-pressed="String(searchType === 1)"
                :aria-label="
                  canVisitRealtime ? '实时数据' : '实时数据（无权限）'
                "
                :disabled="!canVisitRealtime"
                @click="changeSearch(1)"
              >
                <i class="iconfont icon-shishishuju"></i>
                <div class="icon-msg">实时数据</div>
              </button>
              <button
                type="button"
                :class="searchType == 2 ? 'icontype active' : 'icontype'"
                :aria-pressed="String(searchType === 2)"
                :aria-label="
                  canVisitHistory ? '历史查询' : '历史查询（无权限）'
                "
                :disabled="!canVisitHistory"
                @click="changeSearch(2)"
              >
                <i class="iconfont icon-sousuowenjian"></i>
                <div class="icon-msg">历史查询</div>
              </button>
            </div>
            <div class="date-select" v-show="dateShow">
              <div class="date-box">
                <el-row>
                  <el-col :span="9">
                    <el-date-picker
                      v-model="day"
                      type="date"
                      placeholder="选择日期"
                      format="yyyy-MM-dd"
                      value-format="yyyy-MM-dd"
                      size="small"
                      style="width: 134px"
                      :clearable="false"
                    >
                    </el-date-picker>
                  </el-col>
                  <el-col :span="13">
                    <el-time-picker
                      is-range
                      v-model="value1"
                      range-separator="至"
                      start-placeholder="开始时间"
                      end-placeholder="结束时间"
                      placeholder="选择时间范围"
                      size="small"
                      :clearable="false"
                      value-format="HH:mm:ss"
                      :picker-options="{
                        selectableRange: '00:00:00 - 23:59:59',
                      }"
                      style="width: 200px"
                    >
                    </el-time-picker>
                  </el-col>
                  <el-col :span="2">
                    <el-button
                      style="margin-top: 2px; margin-left: 4px"
                      type="primary"
                      icon="el-icon-search"
                      size="mini"
                      circle
                      :loading="historyStatus === 'loading'"
                      :disabled="historyStatus === 'loading'"
                      @click="searchHistory"
                    ></el-button>
                  </el-col>
                </el-row>
                <div
                  v-if="historyStatus === 'empty'"
                  class="history-feedback"
                >
                  所选时间范围暂无数据
                </div>
                <div
                  v-if="historyStatus === 'error'"
                  class="history-feedback history-error"
                >
                  {{ historyError }}
                </div>
              </div>
            </div>
          </div>
          <div class="btn-content" v-if="searchType == 1">
            <div class="c-title">每秒接收:</div>
            <el-select
              v-model="realtimePointLimit"
              size="mini"
              style="width: 88px; margin-top: 10px"
              @change="changeRealtimePointLimit"
            >
              <el-option
                v-for="item in realtimePointLimitOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </div>
          <div class="btn-content" v-if="searchType == 1">
            <div class="c-title">清除数据:</div>
            <button
              type="button"
              class="pic-link"
              aria-label="清除实时数据"
              @click="clearData"
            >
              <i class="iconfont icon-qingchuhuancun"></i>
            </button>
          </div>
        </div>
      </div>
      <!-- 选中的数据信息（历史） -->
      <div class="checkInfo" v-if="searchType == 2">
        <div class="info-item">气体种类：{{ gasName }}</div>
        <div class="info-item">
          查询时间：{{ day }} {{ value1[0] }}-{{ value1[1] }}
        </div>
      </div>
      <!-- 实时气体种类 -->
      <!-- <div class="checkInfo" v-if="searchType == 1">
        <div class="info-item">气体种类：{{ gasName }}</div>
      </div> -->
      <!-- 图例 -->
      <div class="legend-box">
        <Legend ref="legendChild" :gas-name="gasName"></Legend>
      </div>
      <Details
        v-show="detailsFlag"
        :detailData="detailData"
        :searchType="searchType"
        :gas-name="gasName"
        :gas-value="gasValue"
      ></Details>
      <!-- 二维地图 -->
      <PlanimetricMap
        v-show="mapType == 1"
        :mapList="mapList"
        :searchType="searchType"
        ref="childMap"
        @getTimePointer="getTimePointer"
      >
      </PlanimetricMap>
      <!-- 三维地图 -->
      <StereoscopicMap
        v-if="mapType === 2"
        ref="child3DMap"
        :mapList="mapList"
        @getTimePointer="getTimePointer"
      >
      </StereoscopicMap>
    </div>
    <div
      class="right"
      v-show="
        (checkData && searchType == 2 && rightFlag) ||
        (searchType == 1 && rightFlag)
      "
    >
      <!-- 风速浓度分布  -->
      <div class="right-windspeed">
        <div class="title">
          <div class="title-msg">风速浓度分布</div>
        </div>
        <div class="windspeed-box title-content">
          <Charts
            v-if="gasdata != null"
            :newdata="gasdata"
            :searchType="searchType"
            chartName="windspeed"
          >
          </Charts>
        </div>
      </div>
      <!-- 实时监测-->
      <div class="right-realtime">
        <div class="title">
          <div class="title-msg">实时监测</div>
        </div>
        <div class="realtime-box title-content">
          <Charts
            v-if="gasdata != null"
            :newdata="gasdata"
            :searchType="searchType"
            chartName="realTime"
          >
          </Charts>
        </div>
      </div>
      <!-- 甲烷碳同位素变化 -->
      <div class="right-ch4">
        <div class="title">
          <div class="title-msg">甲烷碳同位素变化</div>
        </div>
        <div class="ch4-box title-content">
          <Charts
            v-if="gasdata != null"
            :newdata="gasdata"
            :searchType="searchType"
            chartName="iCH4"
          >
          </Charts>
        </div>
      </div>
    </div>
    <!-- 右侧关闭按钮 -->
    <button
      type="button"
      v-show="(checkData && searchType == 2) || searchType == 1"
      :class="rightFlag ? 'close-rightbtn' : 'open-rightbtn'"
      :aria-expanded="String(rightFlag)"
      :aria-label="rightFlag ? '收起右侧图表面板' : '展开右侧图表面板'"
      @click="toggleRightPanel"
    >
      <span
        :class="
          rightFlag
            ? 'iconfont icon-jiantou_yemian_xiangyou'
            : 'iconfont icon-jiantou_yemian_xiangzuo'
        "
      ></span>
    </button>
    <RangeConfig
      v-if="dialogVisible"
      :dialogtitle="dialogTitle"
      :gasName="gasName"
      @closeChildDialog="closeChildDialog"
      @gasDataChange="gasDataChange"
    >
    </RangeConfig>
  </div>
</template>
<script lang="ts">
import PlanimetricMap from "./components/PlanimetricMap.vue";
import StereoscopicMap from "./components/StereoscopicMap.vue";
import Weather from "./components/Weather.vue";
import Charts from "./components/Charts.vue";
import Legend from "./components/legend.vue";
import Details from "./components/Details.vue";
import RangeConfig from "./components/RangeConfig.vue";
import RealtimeClient from "./services/realtimeClient";
import {
  fetchFiveMinuteWindow,
  fetchHistoryRange,
} from "./services/historyApi";
import {
  appendRealtimeBatch,
  appendRealtimeTimeWindow,
  normalizeEnvelope,
  validateHistoryRange,
} from "./utils/visualizationData";
import { accessTokenManager } from "@/services/accessToken";
import { resolveWebSocketBaseUrl } from "@/utils/apiBaseUrl";
export default {
  components: {
    StereoscopicMap,
    PlanimetricMap,
    Weather,
    Charts,
    Legend,
    RangeConfig,
    Details,
  },
  data() {
    return {
      boxShow: true, //工具箱是否显示
      mapType: 1, //1平面地图23d地图
      realtimeClient: null,
      realtimePointLimit: 0,
      realtimePointLimitOptions: [
        { label: "全部", value: 0 },
        { label: "1 点", value: 1 },
        { label: "2 点", value: 2 },
        { label: "5 点", value: 5 },
        { label: "10 点", value: 10 },
        { label: "20 点", value: 20 },
      ],
      sessionProfile: {},
      gasTypeList: [], //气体选择
      gasTypeData: {
        PRI: [
          {
            label: "CH4",
            value: "pri_ch4",
          },
          {
            label: "C2H6",
            value: "pri_c2h6",
          },
          {
            label: "CO2",
            value: "pri_co2",
          },
          {
            label: "CO",
            value: "pri_co",
          },
          {
            label: "N2O",
            value: "pri_n2o",
          },
        ],
        Picarro: [
          {
            label: "HP_12CH4_dry",
            value: "picarro_hp_12ch4_dry",
          },
          {
            label: "HR_12CH4_dry",
            value: "picarro_hr_12ch4_dry",
          },
          {
            label: "12CO2_dry",
            value: "picarro_12co2_dry",
          },
        ],
      }, //气体总数据
      gasType: "PRI", //当前选中的气体大类
      gasName: "CH4", //选中的气体名称
      gasValue: "pri_ch4", //气体数值
      dateShow: false, //时间选择弹窗
      day: "", //选择的日期
      value1: ["", ""], //历史时间范围
      gasSelect: false, //气体选择弹窗
      searchType: 1, //查询方式1实时查询2历史查询
      mapList: [], //地图数据
      // 气体数据
      gasdata: { code: 200, message: "ok", data: [] },
      // 用于天气获取经纬度
      weather_location_data: [116.4, 39.9], //默认北京
      checkData: false, //是否选中数据
      // 标识是否连接成功
      connected: false,
      signalState: "", //当前信号状态
      dialogTitle: "CH4气体阈值区间配置", //气体阈值配置标题
      dialogVisible: false, //气体阈值配置弹窗是否显示
      detailsFlag: false, //详情数据弹窗是否显示
      historyData: { code: 200, message: "ok", data: [] },
      historyStatus: "idle",
      historyError: "",
      historyRequestSequence: 0,
      realtimeRequestSequence: 0,
      //详情数据
      detailData: {},
      leftFlag: true, //左侧图表
      rightFlag: true, //右侧图表
      viewFlag: true, //视角是否跟随移动
      loading: false, //地图加载事件
    };
  },
  computed: {
    canVisitRealtime() {
      return Boolean(
        this.sessionProfile.is_superuser ||
          this.sessionProfile.can_visit_realtime !== false,
      );
    },
    canVisitHistory() {
      return Boolean(
        this.sessionProfile.is_superuser ||
          this.sessionProfile.can_visit_history !== false,
      );
    },
  },
  watch: {
    viewFlag(enabled) {
      this.$nextTick(() => {
        if (this.mapType === 1 && this.$refs.childMap) {
          this.$refs.childMap.setFollowMode(enabled);
        }
        if (this.mapType === 2 && this.$refs.child3DMap) {
          this.$refs.child3DMap.changeView(enabled);
        }
      });
    },
  },
  created() {
    this.sessionProfile = this.getSessionProfile();
    this.gasTypeList = this.gasTypeData[this.gasType];
    if (sessionStorage.getItem("GasData")) {
      this.$store.state.gasData = JSON.parse(sessionStorage.getItem("GasData"));
    }
    if (this.canVisitRealtime) {
      this.enterRealtimeMode();
    } else if (this.canVisitHistory) {
      this.searchType = 2;
      this.dateShow = true;
    } else {
      this.signalState = "当前账户没有数据可视化查询权限";
    }
  },
  beforeDestroy() {
    this.historyRequestSequence += 1;
    this.realtimeRequestSequence += 1;
    sessionStorage.setItem(
      "GasData",
      JSON.stringify(this.$store.state.gasData),
    );
    this.stopRealtime();
  },
  methods: {
    getSessionProfile() {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}");
      } catch (_error) {
        return {};
      }
    },
    getWebSocketUrl() {
      const wsBase = resolveWebSocketBaseUrl();
      return `${wsBase}/ws/robots/QH-ZHC-01`;
    },
    startRealtime(options = {}) {
      if (
        !this.canVisitRealtime ||
        this.realtimeClient ||
        this.searchType !== 1
      ) {
        return;
      }
      this.realtimeClient = new RealtimeClient({
        url: this.getWebSocketUrl(),
        onPacket: this.handleRealtimePacket,
        onStatus: this.handleRealtimeStatus,
        initialBucketStartMs: Number(options.initialBucketStartMs),
        maxPointsPerSecond: this.realtimePointLimit,
        maxPerFrame: 1,
      });
      this.realtimeClient.start();
    },
    changeRealtimePointLimit(value) {
      if (this.realtimeClient) {
        this.realtimeClient.setMaxPointsPerSecond(Number(value));
      }
    },
    stopRealtime() {
      if (this.realtimeClient) {
        this.realtimeClient.stop();
        this.realtimeClient = null;
      }
      this.connected = false;
    },
    /** 处理实时连接状态 */
    handleRealtimeStatus(status) {
      if (this.searchType !== 1) {
        return;
      }
      this.connected = status === "connected";
      const statusText = {
        connected: "",
        "no-data": "无最新采集数据",
        disconnected: "网络异常",
        "auth-recovering": "登录凭证更新中",
        error: "实时连接失败",
        "invalid-packet": "实时数据格式错误",
      };
      this.signalState = statusText[status] || this.signalState;
    },
    /**
     * 消费每一个实时数据包：校验信封 → 增量并入折线图与地图 → 刷新详情卡与天气。
     *
     * 注意 WebSocket 关闭有延迟，切到历史模式后仍可能有包飞到回调里，所以入口必须先判 searchType。
     */
    handleRealtimePacket(packet) {
      if (this.searchType !== 1) {
        return;
      }
      try {
        // normalizeEnvelope 只保证 code 是数字、data 是数组；点位内部的字段合法性交给下游渲染容错。
        const result = normalizeEnvelope(packet);
        if (result.code === 200 && result.data.length) {
          const point = result.data[result.data.length - 1];
          // 两条曲线用的是不同的保留策略，所以必须各自增量合并，不能共用一份：
          // 折线图按时间窗口淘汰（以最新点为基准向前留 REALTIME_CHART_WINDOW_MS），
          // 地图轨迹不设上限、全量保留，长度只受运行时长与订阅频率影响。
          const nextGasPoints = appendRealtimeTimeWindow(
            this.gasdata.data,
            result.data,
          );
          const nextMapPoints = appendRealtimeBatch(this.mapList, result.data);
          this.gasdata = { ...result, data: nextGasPoints };
          this.mapList = nextMapPoints;
          // 详情卡与天气只关心批次里的最后一个点。
          this.detailData = point;
          this.detailsFlag = true;
          this.weatherLocationUpdate(point);
          this.signalState = "";
        } else if (result.code === 204) {
          // 204 = 链路正常但本次无新数据，原样透传服务端文案。
          this.signalState = result.message;
        } else if (result.code === 401) {
          // 必须先断开再跳转，否则客户端会在登录页后台持续重连、被反复拒绝。
          this.stopRealtime();
          accessTokenManager.clearAccessToken();
          localStorage.removeItem("user");
          this.$router.replace({
            path: "/login",
            query: { redirect: this.$route.fullPath },
          });
        } else {
          this.signalState = result.message || "实时数据请求失败";
        }
      } catch (error) {
        // 结构化失败不应中断推送链路，降级成一句状态提示即可。
        this.signalState = "实时数据格式错误";
      }
    },
    // 地图2d和3d切换
    checkMapType(val) {
      if (this.mapType === val) {
        return;
      }
      this.mapType = val;
      if (this.searchType === 2) {
        this.renderHistoryResult();
      } else {
        this.$nextTick(() => {
          if (val === 2 && this.$refs.child3DMap) {
            this.$refs.child3DMap.updatedMapSize();
            this.$refs.child3DMap.changeView(this.viewFlag);
            return;
          }
          this.redrawRealtimeWindow();
        });
      }
    },
    // 气体类型切换
    changeGas(val) {
      this.gasTypeList = this.gasTypeData[val];
      this.dateShow = false; //关闭时间选择弹窗
      if (this.gasType == val) {
        this.gasSelect = !this.gasSelect;
      } else {
        this.gasSelect = true;
        this.gasType = val;
      }
    },
    // 选择气体名称
    checkGasName(item) {
      this.gasName = item.label; //气体名称
      this.gasValue = item.value; //气体值
      this.$refs.legendChild.getGasRange(item.label);
      if (this.searchType === 2) {
        this.renderHistoryResult();
      } else {
        this.redrawRealtimeConcentration();
      }
      this.gasSelect = false;
    },
    redrawRealtimeConcentration() {
      const points = Array.isArray(this.mapList) ? this.mapList : [];
      if (
        this.$refs.childMap &&
        this.$refs.childMap.redrawConcentrationByGas
      ) {
        this.$refs.childMap.redrawConcentrationByGas(
          this.gasValue,
          this.gasName,
          points,
        );
      }
      if (
        this.$refs.child3DMap &&
        this.$refs.child3DMap.redrawConcentrationByGas
      ) {
        this.$refs.child3DMap.redrawConcentrationByGas(this.gasValue, points);
      }
    },
    redrawRealtimeWindow() {
      const points = Array.isArray(this.mapList) ? this.mapList : [];
      if (this.mapType === 1 && this.$refs.childMap) {
        this.$refs.childMap.updatedMapSize();
        if (this.$refs.childMap.redrawRealtimeWindow) {
          this.$refs.childMap.redrawRealtimeWindow(
            this.gasValue,
            this.gasName,
            points,
          );
        }
      }
      if (
        this.mapType === 2 &&
        this.$refs.child3DMap &&
        this.$refs.child3DMap.redrawRealtimeWindow
      ) {
        this.$refs.child3DMap.updatedMapSize();
        this.$refs.child3DMap.redrawRealtimeWindow(this.gasValue, points);
      }
    },
    // 查询方式切换（历史、实时）
    changeSearch(val) {
      if (this.searchType === val) {
        return;
      }
      const hasPermission =
        val === 1 ? this.canVisitRealtime : this.canVisitHistory;
      if (!hasPermission) {
        this.$message.warning(
          val === 1 ? "暂无实时查询权限" : "暂无历史查询权限",
        );
        return;
      }
      this.historyRequestSequence += 1;
      this.gasSelect = false;
      this.searchType = val;
      if (val === 2) {
        this.stopRealtime();
        this.checkData = false;
        this.dateShow = true;
        this.detailsFlag = false;
        this.historyStatus = "idle";
        this.historyError = "";
        this.historyData = { code: 200, message: "ok", data: [] };
        this.mapList = [];
        if (this.$refs.childMap) {
          this.$refs.childMap.removeTC();
        }
      } else {
        this.enterRealtimeMode();
      }
    },
    async enterRealtimeMode() {
      if (!this.canVisitRealtime || this.searchType !== 1) {
        return;
      }
      const requestSequence = ++this.realtimeRequestSequence;
      this.dateShow = false;
      this.historyStatus = "idle";
      this.historyError = "";
      this.loading = true;
      this.historyData = { code: 200, message: "ok", data: [] };
      this.gasdata = { code: 200, message: "ok", data: [] };
      this.mapList = [];
      this.checkData = false;
      this.detailsFlag = false;
      if (this.$refs.childMap) {
        this.$refs.childMap.removeTC();
      }
      try {
        const result = await fetchFiveMinuteWindow();
        if (!this.isCurrentRealtimeRequest(requestSequence)) {
          return;
        }
        this.applyRealtimeInitialWindow(result);
      } catch (error) {
        if (!this.isCurrentRealtimeRequest(requestSequence)) {
          return;
        }
        this.signalState = error.message || "最新 5 分钟数据加载失败";
        this.$message.warning(this.signalState);
      } finally {
        if (this.isCurrentRealtimeRequest(requestSequence)) {
          this.loading = false;
          const latestPoint = this.mapList[this.mapList.length - 1];
          const latestPointTime = Date.parse(latestPoint && latestPoint.time);
          const initialBucketStartMs = Number.isFinite(latestPointTime) // 如果有最新采集数据，则从最新采集数据的下一秒开始推送
            ? Math.floor(latestPointTime / 1000) * 1000 + 1000
            : Math.floor(Date.now() / 1000) * 1000 + 1000;
          this.startRealtime({
            initialBucketStartMs,
          });
        }
      }
    },
    applyRealtimeInitialWindow(result) {
      const points = Array.isArray(result.data) ? result.data : [];
      this.gasdata = result;
      this.mapList = points.slice();
      this.checkData = points.length > 0;
      this.detailsFlag = points.length > 0;
      if (points.length) {
        const latestPoint = points[points.length - 1];
        this.detailData = latestPoint;
        this.weatherLocationUpdate(latestPoint);
        this.signalState = "";
      } else {
        this.signalState = "无最新采集数据";
      }
      this.$nextTick(() => {
        this.redrawRealtimeWindow();
      });
    },
    isCurrentRealtimeRequest(requestSequence) {
      return (
        this.searchType === 1 &&
        requestSequence === this.realtimeRequestSequence
      );
    },
    // 查询历史数据
    async searchHistory() {
      if (!this.canVisitHistory) {
        this.historyStatus = "error";
        this.historyError = "暂无历史查询权限";
        this.$message.warning(this.historyError);
        return;
      }
      const requestSequence = ++this.historyRequestSequence;
      try {
        const { start, end } = validateHistoryRange(this.day, this.value1);
        this.historyStatus = "loading";
        this.historyError = "";
        this.loading = true;
        this.historyData = { code: 200, message: "ok", data: [] };
        this.gasdata = { code: 200, message: "ok", data: [] };
        this.mapList = [];
        this.checkData = false;
        this.detailsFlag = false;
        const result = await fetchHistoryRange(start, end);
        if (!this.isCurrentHistoryRequest(requestSequence)) {
          return;
        }
        this.historyData = result;
        this.gasdata = result;
        this.mapList = result.data.slice();
        this.checkData = result.data.length > 0;
        this.historyStatus = result.data.length ? "success" : "empty";
        this.renderHistoryResult();
      } catch (error) {
        if (!this.isCurrentHistoryRequest(requestSequence)) {
          return;
        }
        this.historyStatus = "error";
        this.historyError = error.message;
        this.$message.warning(error.message);
      } finally {
        if (this.isCurrentHistoryRequest(requestSequence)) {
          this.loading = false;
        }
      }
    },
    isCurrentHistoryRequest(requestSequence) {
      return (
        this.searchType === 2 &&
        requestSequence === this.historyRequestSequence
      );
    },
    //清除实时缓存数据
    clearData() {
      this.mapList = [];
      this.gasdata = { code: 200, message: "ok", data: [] };
      this.detailsFlag = false;
      if (this.$refs.childMap) {
        this.$refs.childMap.removeTC();
      }
      if (this.$refs.child3DMap) {
        this.$refs.child3DMap.remove();
      }
    },
    /** 获取天气数据经纬度 */
    weatherLocationUpdate(point) {
      if (point && Array.isArray(point.geo_location)) {
        this.weather_location_data = point.geo_location.slice();
      }
    },

    renderHistoryResult() {
      if (
        this.searchType !== 2 ||
        !Array.isArray(this.historyData.data) ||
        !this.historyData.data.length
      ) {
        return;
      }
      this.$nextTick(() => {
        if (this.mapType === 1 && this.$refs.childMap) {
          this.$refs.childMap.gasType = this.gasValue;
          this.$refs.childMap.gasName = this.gasName;
          this.$refs.childMap.updatedMapSize();
          this.$refs.childMap.createCircle(this.historyData.data);
          return;
        }
        if (this.mapType === 2 && this.$refs.child3DMap) {
          this.$refs.child3DMap.gasType = this.gasValue;
          this.$refs.child3DMap.remove();
          this.$refs.child3DMap.echartsPlay(this.historyData);
        }
      });
    },
    async getTimePointer(data) {
      try {
        const result = await fetchFiveMinuteWindow(data.time);
        this.detailData = data;
        this.gasdata = result;
        this.checkData = true;
        this.detailsFlag = true;
        this.leftFlag = true;
        this.rightFlag = true;
        if (this.$refs.childMap) {
          this.$refs.childMap.updatedMapSize();
        }
      } catch (error) {
        this.$message.warning(error.message);
      }
    },
    // 关闭气体阈值配置弹窗
    closeChildDialog() {
      this.dialogVisible = false;
    },
    // 修改阈值后更新地图内容
    gasDataChange() {
      this.$refs.legendChild.getGasRange(this.gasName);
      if (this.searchType === 2) {
        this.renderHistoryResult();
      } else if (this.$refs.childMap) {
        this.$refs.childMap.removeCircle();
      }
    },
    // 图表按钮展开收起事件
    leftClick() {
      if (this.$refs.childMap) {
        this.$refs.childMap.updatedMapSize();
      }
      if (this.$refs.child3DMap) {
        this.$refs.child3DMap.updatedMapSize();
      }
    },
    toggleLeftPanel() {
      this.leftFlag = !this.leftFlag;
      this.$nextTick(this.leftClick);
    },
    toggleRightPanel() {
      this.rightFlag = !this.rightFlag;
      this.$nextTick(this.leftClick);
    },
  },
};
</script>
<style lang="scss" scoped>
.app-content {
  display: flex;
  justify-content: space-between;
  // padding: 1%;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  position: relative;
  button {
    appearance: none;
    border: 0;
    padding: 0;
    font-family: "Microsoft YaHei";
    color: #ffffff;
    background: transparent;
  }
  // 标题样式
  .title {
    height: 39px;
    width: 100%;
    background: url("~@/assets/imgs/title-bg.png") no-repeat;
    background-size: 100%;
    font-family: "Microsoft YaHei";
    position: relative;
    .title-msg {
      position: absolute;
      left: 30px;
      line-height: 39px;
      font-weight: bold;
      font-size: 18px;
      background: linear-gradient(180deg, #ffffff 0%, #519eff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
  // 左侧按钮
  .close-leftbtn,
  .open-leftbtn,
  .close-rightbtn,
  .open-rightbtn {
    width: 21px;
    height: 53px;
    position: absolute;
    bottom: 0;
    top: 0;
    margin: auto;
    z-index: 66;
    background: url("~@/assets/imgs/cbtn.png") no-repeat;
    background-size: 21px 53px;
    font-size: 13px;
    writing-mode: vertical-rl;
    text-align: center;
    padding: 0px;
    display: flex;
    -webkit-display: flex;
    flex-direction: column;
    /* align-content: center; */
    /* vertical-align: middle; */
    justify-content: center;
    cursor: pointer;
  }
  .close-leftbtn {
    left: 485px;
  }
  .open-leftbtn {
    left: 0;
  }
  .close-rightbtn,
  .open-rightbtn {
    height: 53px;
    width: 21px;
    font-size: 13px;
    background: url("~@/assets/imgs/closebtn.png") no-repeat;
    background-size: 21px 53px;
  }
  .close-rightbtn {
    right: 485px;
  }
  .open-rightbtn {
    right: 0;
  }
  //图表
  .title-content {
    height: calc(100% - 39px);
    width: 100%;
    background: url("~@/assets/imgs/bg.png") no-repeat;
    background-size: 100% 100%;
  }
  .left,
  .right {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: 470px;
  }
  .left {
    margin-right: 8px;
    position: relative;
    .left-weather {
      height: calc(40% - 16px);
    }
    .left-ch4,
    .left-co2 {
      height: 30%;
      width: 100%;
    }
  }
  .map {
    // width: calc(100% - 956px);
    flex: 1;
    height: 100%;
    margin: 0;
    padding: 0;
    background: #000;
    position: relative;
    .button {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 99;
      cursor: pointer;
      width: 112px;
      height: 36px;
      background: url("~@/assets/imgs/jump.png") no-repeat;
      background-size: 100% 100%;
      text-align: center;
      line-height: 36px;
    }
    .map-icon {
      position: absolute;
      top: 14px;
      left: 21px;
      z-index: 99;
      height: 34px;
      width: 34px;
      // background: #0095ff;
      box-sizing: border-box;
      // border: 0.6px solid rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      text-align: center;
      color: #0095ff;
      text-shadow: 1px 1px 1px lightgray, -1px -1px 1px #aaa;
      i {
        font-size: 36px;
        line-height: 32px;
      }
    }
    .state-box {
      position: absolute;
      top: 6px;
      left: 0;
      right: 0;
      margin: auto;
      z-index: 999;
      border-radius: 4px;
      opacity: 1;
      width: 474px;
      height: 28px;
      text-align: center;
      background: linear-gradient(
        90deg,
        rgba(255, 0, 0, 0) 0%,
        rgba(1, 62, 102, 0.76) 50%,
        rgba(255, 0, 0, 0) 100%
      );
      box-sizing: border-box;
      border: 1px solid;
      border-image: linear-gradient(
          90deg,
          rgba(0, 0, 0, 0) 0%,
          #080e19 50%,
          rgba(0, 0, 0, 0) 100%
        )
        1;
      line-height: 26px;
    }
    .btn-box {
      position: absolute;
      height: 82px;
      z-index: 22;
      top: 50px;
      left: 20px;
      .gjx {
        position: absolute;
        top: 0;
        left: 0;
        display: inline-block;
        width: 41px;
        height: 41px;
        border-radius: 50%;
        background: #0095ff;
        box-sizing: border-box;
        border: 1px solid rgba(255, 255, 255, 0.38);
        text-align: center;
        line-height: 40px;
        cursor: pointer;
        i {
          font-size: 22px;
        }
      }
      .c-content {
        display: inline-block;
        margin-left: 56px;
        height: 80px;
        .btn-content {
          height: 80px;
          float: left;
          background: #122336;
          // box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(4px);
          margin-right: 8px;
          border-radius: 5px;
          box-sizing: border-box;
          padding: 5px 7px;
          // box-shadow: 0px 4px 10px 0px rgba(38, 102, 127, 0.3);
          .c-title {
            line-height: 24px;
            font-size: 14px;
          }
          .c-body {
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            .c-type {
              width: 72px;
              height: 44px;
              box-sizing: border-box;
              border: 1px solid rgba(255, 255, 255, 0.35);
              border-radius: 4px;
              line-height: 44px;
              text-align: center;
              text-shadow: 1px 1px 1px lightgray, -1px -1px 1px #aaa;
              cursor: pointer;
              color: #d8f3ff;
              transition: border-color 0.2s ease, box-shadow 0.2s ease,
                transform 0.2s ease;
            }
            .c-type.mapbg1 {
              background: url("~@/assets/imgs/2d.png") no-repeat;
              background-size: 100% 100%;
            }
            .c-type.mapbg2 {
              background: url("~@/assets/imgs/3d.png") no-repeat;
              background-size: 100% 100%;
            }
            .c-type.active {
              border: 1px solid #0095ff;
              text-shadow: 1px 1px 1px #d5f0ff, -1px -1px 1px #0095ff;
              box-shadow: 0 0 10px rgba(0, 149, 255, 0.45);
            }
          }
          .pic-link {
            width: 100%;
            text-align: center;
            margin-top: 10px;
            cursor: pointer;
            i {
              font-size: 30px;
              color: #0095ff;
            }
          }
        }
        .btn-content1 {
          // margin: 20px auto;
          width: 172px;
          height: 80px;
          line-height: 50px;
          position: relative;
          border-radius: 5px;
        }
        .btn-content1::before {
          content: "";
          position: absolute;
          width: 0;
          height: 0;

          /* 箭头靠左边 */
          top: 13px;
          left: -12px;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-right: 11px solid rgba(255, 255, 255, 0.3);
        }
        .btn-content1::after {
          content: "";
          position: absolute;
          width: 0;
          height: 0;
          /* 箭头靠右边 */
          // top: 13px;
          // right: -13px;
          // border-top: 10px solid transparent;
          // border-bottom: 10px solid transparent;
          // border-left: 15px solid #fff;
          /* 箭头靠左边 */
          top: 13px;
          left: -11px;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-right: 12px solid #122336;
        }
        .btn-content2 {
          width: 147px;
          position: relative;
          .bc2-body {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            .icontype {
              height: 43px;
              width: 57px;
              position: relative;
              text-align: center;
              cursor: pointer;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px solid rgba(0, 149, 255, 0.35);
              border-radius: 6px;
              background: linear-gradient(
                180deg,
                rgba(0, 149, 255, 0.2) 0%,
                rgba(18, 35, 54, 0.82) 100%
              );
              color: rgba(255, 255, 255, 0.82);
              box-shadow: inset 0 1px 4px rgba(255, 255, 255, 0.08);
              transition: border-color 0.2s ease, box-shadow 0.2s ease,
                color 0.2s ease;
              i {
                font-size: 23px;
                line-height: 22px;
              }
              .icon-msg {
                position: static;
                z-index: 10;
                margin-top: 1px;
                font-size: 12px;
                line-height: 14px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
              }
            }
            .icontype.active {
              border-color: #10bd8c;
              background: linear-gradient(
                180deg,
                rgba(16, 189, 140, 0.34) 0%,
                rgba(18, 35, 54, 0.92) 100%
              );
              box-shadow: 0 0 10px rgba(16, 189, 140, 0.35),
                inset 0 1px 6px rgba(255, 255, 255, 0.1);
              i {
                color: #10bd8c;
              }
              .icon-msg {
                color: #85fbf7;
              }
            }
          }
          // 日期选择
          .date-select {
            width: 384px;
            min-height: 50px;
            position: absolute;
            top: 90px;
            right: 0;
            background: linear-gradient(
              180deg,
              #122336 0%,
              rgba(18, 35, 54, 0.6) 100%
            );
            box-sizing: border-box;
            border: 1px solid #0095ff;
            padding: 6px;
            border-radius: 4px;
            box-shadow: 0px 4px 10px 0px rgba(38, 102, 127, 0.3),
              inset 0px 6px 9px 0px rgba(0, 149, 255, 0.08);
            .history-feedback {
              margin-top: 6px;
              color: #ffffff;
              font-size: 12px;
            }
            .history-error {
              color: #ff9b9b;
            }
          }
          .date-select::before {
            content: "";
            position: absolute;
            width: 0;
            height: 0;
            /* 箭头朝上 */
            right: 22px;
            top: -10px;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 11px solid #0095ff;
          }
          .date-select::after {
            content: "";
            position: absolute;
            width: 0;
            height: 0;
            /* 箭头靠上边 */
            right: 22px;
            top: -9px;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 11px solid #122336;
          }
        }
        // 气体种类
        .btn-content3 {
          width: 140px;
          position: relative;
          .gas-box {
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-top: 10px;
            .gas-type {
              padding: 5px 8px;
              border: 1px solid #0095ff;
              background: #0095ff;
              color: #ffffff;
              border-radius: 4px;
              cursor: pointer;
              box-shadow: 0 0 8px rgba(0, 149, 255, 0.18);
            }
            .gas-type.active {
              background: #cee4ff;
              color: #0095ff;
              box-sizing: border-box;
              border: 1px solid #0095ff;
            }
          }
          .gas-select {
            position: absolute;
            top: 90px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 90;
            width: 220px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            background: linear-gradient(
              180deg,
              #122336 0%,
              rgba(18, 35, 54, 0.88) 100%
            );
            box-sizing: border-box;
            border: 1px solid rgba(0, 149, 255, 0.75);
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0px 4px 10px 0px rgba(38, 102, 127, 0.3),
              inset 0px 6px 9px 0px rgba(0, 149, 255, 0.08),
              0 0 18px rgba(0, 149, 255, 0.18);
            .gas-item {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 32px;
              line-height: 16px;
              text-align: center;
              cursor: pointer;
              border: 1px solid rgba(0, 149, 255, 0.32);
              border-radius: 6px;
              background: rgba(8, 24, 42, 0.62);
              color: rgba(255, 255, 255, 0.84);
              font-size: 13px;
              transition: border-color 0.2s ease, box-shadow 0.2s ease,
                background 0.2s ease, color 0.2s ease;
            }
            .gas-item:hover {
              border-color: rgba(133, 251, 247, 0.7);
              color: #85fbf7;
              box-shadow: 0 0 8px rgba(0, 149, 255, 0.25);
            }
            .gas-item.active {
              border-color: #10bd8c;
              background: linear-gradient(
                180deg,
                rgba(16, 189, 140, 0.38) 0%,
                rgba(18, 35, 54, 0.92) 100%
              );
              color: #85fbf7;
              box-shadow: 0 0 10px rgba(16, 189, 140, 0.35),
                inset 0 1px 6px rgba(255, 255, 255, 0.1);
            }
          }
          .gas-select::before {
            content: "";
            position: absolute;
            width: 0;
            height: 0;
            /* 箭头朝上 */
            left: 50%;
            transform: translateX(-50%);
            top: -10px;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 11px solid rgba(0, 149, 255, 0.75);
          }
          .gas-select::after {
            content: "";
            position: absolute;
            width: 0;
            height: 0;
            /* 箭头靠上边 */
            left: 50%;
            transform: translateX(-50%);
            top: -9px;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 11px solid #122336;
          }
        }
      }
    }
    // 选中的数据信息
    .checkInfo {
      position: absolute;
      left: 0px;
      right: 0;
      margin: auto;
      bottom: 10px;
      width: 523px;
      height: 36px;
      opacity: 1;
      background: rgba(0, 0, 0, 0.7);
      z-index: 66;
      .info-item {
        float: left;
        margin-left: 10px;
        line-height: 36px;
      }
    }
    // 图例信息
    .legend-box {
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 66;
      height: 240px;
      width: 110px;
    }
  }
  .right {
    margin-left: 8px;
    .right-windspeed,
    .right-realtime,
    .right-ch4 {
      height: calc((100% - 16px) / 3);
    }
  }
  ::v-deep .el-loading-mask {
    //设置遮罩层颜色
    background-color: rgba(0, 0, 0, 0.5);
  }
}
@keyframes slideIn {
  0% {
    transform: translate(-200px, 0);
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes slideOut {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(-470px, 0);
  }
}

.slide-enter-active {
  animation: slideIn 0.5s;
}

.slide-leave-active {
  animation: slideOut 0.5s;
}

@media (max-width: 1400px) {
  .app-content {
    flex-direction: column !important;
    .left,
    .right {
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
    .map {
      min-width: 0 !important;
    }
    .checkInfo {
      width: 90vw !important;
      font-size: 12px !important;
    }
    .legend-box {
      width: 80px !important;
      height: 180px !important;
    }
    .btn-content1,
    .btn-content2,
    .btn-content3 {
      width: 120px !important;
    }
    .date-select {
      width: 220px !important;
    }
  }
}

@media (max-width: 900px) {
  .app-content {
    flex-direction: column !important;
    .left,
    .right {
      width: 100vw !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
    .map {
      min-width: 0 !important;
    }
    .checkInfo {
      width: 98vw !important;
      font-size: 10px !important;
      left: 1vw !important;
    }
    .legend-box {
      width: 60px !important;
      height: 120px !important;
      right: 2vw !important;
    }
    .btn-content1,
    .btn-content2,
    .btn-content3 {
      width: 90px !important;
    }
    .date-select {
      width: 140px !important;
    }
  }
}

/* 原项目的大屏样式保持不变；这里只修复普通笔记本视口下三列被错误纵向堆叠的问题。 */
@media (max-width: 1400px) and (min-width: 901px) {
  .app-content {
    flex-direction: row !important;
    .left,
    .right {
      flex: 0 0 300px;
      width: 300px !important;
      min-width: 0 !important;
    }
    .map {
      flex: 1 1 auto;
      min-width: 0 !important;
    }
    .close-leftbtn {
      left: 315px;
    }
    .close-rightbtn {
      right: 315px;
    }
    .map .btn-box .c-content {
      width: 720px;
      transform: scale(0.82);
      transform-origin: left top;
    }
    .map .state-box {
      max-width: calc(100% - 130px);
    }
  }
}

@media (max-width: 900px) {
  .app-content {
    flex-direction: row !important;
    .left,
    .right {
      display: none !important;
    }
    .map {
      flex: 1 1 100%;
      min-width: 0 !important;
    }
    .close-leftbtn,
    .open-leftbtn,
    .close-rightbtn,
    .open-rightbtn {
      display: none !important;
    }
    .map .btn-box .c-content {
      width: 720px;
      transform: scale(0.72);
      transform-origin: left top;
    }
    .map .state-box {
      max-width: calc(100% - 130px);
    }
    .checkInfo {
      width: calc(100% - 24px) !important;
      font-size: 10px !important;
      left: 12px !important;
    }
    .legend-box {
      width: 60px !important;
      height: 120px !important;
      right: 2vw !important;
    }
    .btn-content1,
    .btn-content2,
    .btn-content3 {
      width: 90px !important;
    }
    .date-select {
      width: 140px !important;
    }
  }
}
</style>
