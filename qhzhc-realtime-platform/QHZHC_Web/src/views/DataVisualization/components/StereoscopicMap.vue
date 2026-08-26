<!--3d地图 -->
<template>
  <div class="app-content" style="padding: 0;">

    <div id="cesiumContainer"></div>
  </div>
</template>
<script lang="ts">
import * as turf from "@turf/turf";

const MAX_REALTIME_BARS = 300;
const REALTIME_ROUTE_HEIGHT = 2;

export default {
  name: "StereoscopicMap",
  data() {
    return {
      dlEllipse: null,
      animation: true,
      gasType: "",
      colorList: [
        "#00FF44",
        "#FCFF63",
        "#FF7B10",
        "#F90000",
        "#9900FF",
        "#FFFFFF",
      ],
      index: 0,//实时数据下标
      dataList: [],//地图数据
      prevData: "",//上一个点数据
      screenSpaceHandler: null,
      realtimeEntityIds: [],
      realtimeBarStates: [],
      realtimeBarCursor: 0,
      realtimeRouteState: null,
      latestRealtimeBarId: null,
      following: false,
    };
  },
  props: {
    mapList: {
      type: Array,
      required: true,
    },
  },
  watch: {
    mapList: {
      deep: true,
      handler(newval) {
        if (!Array.isArray(newval) || !newval.length) {
          return;
        }
        this.dataList = newval;
        this.index = newval.length - 1;
        // console.log(this.index, localStorage.getItem("mapList"), "实时数据");
        // this.moveBar(newval);
        // if(!entity){
        if (this.index > 0) {
          this.prevData = newval[this.index - 1]
        } else {
          this.prevData = newval[this.index]
        }
        this.nowBar(newval[this.index]);
        this.updateRealtimeRoute(newval);

      },
    },
  },
  mounted() {
    this.gasType = this.$parent.gasValue;
    this.init();
  },
  beforeDestroy() {
    this.destroyScreenSpaceHandler();
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
    this.viewer = null;
  },
  methods: {
    getCesiumToken() {
      return (
        process.env.VUE_APP_CESIUM_ION_TOKEN ||
        process.env.VUE_APP_CESIUM_ION_ACCESS_TOKEN ||
        ""
      );
    },
    getMapToken() {
      return (
        process.env.VUE_APP_TDT_TOKEN ||
        process.env.VUE_APP_TIANDITU_TOKEN ||
        ""
      );
    },
    createBaseImageryProvider(mapToken) {
      if (!mapToken) {
        return new Cesium.UrlTemplateImageryProvider({
          url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          maximumLevel: 20,
        });
      }
      return new Cesium.WebMapTileServiceImageryProvider({
        url:
          "https://{s}.tianditu.gov.cn/vec_c/wmts?service=wmts&request=GetTile&version=1.0.0" +
          "&LAYER=vec&tileMatrixSet=c&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
          "&style=default&format=tiles&tk=" +
          mapToken,
        layer: "tdtVec",
        style: "default",
        format: "tiles",
        tileMatrixSetID: "c",
        subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
        tilingScheme: new Cesium.GeographicTilingScheme(),
        tileMatrixLabels: Array.from({ length: 19 }, (_, index) =>
          String(index + 1),
        ),
        maximumLevel: 18,
      });
    },
    createAnnotationImageryProvider(mapToken) {
      if (!mapToken) {
        return null;
      }
      return new Cesium.WebMapTileServiceImageryProvider({
        url:
          "https://{s}.tianditu.gov.cn/cva_c/wmts?service=wmts&request=GetTile&version=1.0.0" +
          "&LAYER=cva&tileMatrixSet=c&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
          "&style=default&format=tiles&tk=" +
          mapToken,
        layer: "tdtCva",
        style: "default",
        format: "tiles",
        tileMatrixSetID: "c",
        subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
        tilingScheme: new Cesium.GeographicTilingScheme(),
        tileMatrixLabels: Array.from({ length: 19 }, (_, index) =>
          String(index + 1),
        ),
        maximumLevel: 18,
      });
    },
    configureImageryLayers(mapToken) {
      this.viewer.imageryLayers.removeAll();
      this.viewer.imageryLayers.addImageryProvider(
        this.createBaseImageryProvider(mapToken),
      );
      const annotationProvider =
        this.createAnnotationImageryProvider(mapToken);
      if (annotationProvider) {
        this.viewer.imageryLayers.addImageryProvider(annotationProvider);
      }
    },
    configureGlobeAppearance() {
      if (!this.isViewerReady()) {
        return;
      }
      this.viewer.scene.globe.baseColor =
        Cesium.Color.fromCssColorString("#90DAEE");
      this.viewer.scene.backgroundColor =
        Cesium.Color.fromCssColorString("#020A18");
      if (this.viewer.scene.skyAtmosphere) {
        this.viewer.scene.skyAtmosphere.show = false;
      }
      if (this.viewer.scene.fog) {
        this.viewer.scene.fog.enabled = false;
      }
      this.requestRender();
    },
    init() {
      const cesiumToken = this.getCesiumToken();
      const mapToken = this.getMapToken();
      if (cesiumToken) {
        Cesium.Ion.defaultAccessToken = cesiumToken;
      }
      this.viewer = new Cesium.Viewer("cesiumContainer", {
        // terrainProvider: Cesium.createWorldTerrain(),
        // terrain: Cesium.Terrain.fromWorldTerrain(),
        // imageryProvider: tiandituVector,//天地图
        baseLayerPicker: false, // 如果设置为false，将不会创建右上角图层按钮。
        geocoder: false, // 如果设置为false，将不会创建右上角查询(放大镜)按钮。
        navigationHelpButton: false, // 如果设置为false，则不会创建右上角帮助(问号)按钮。
        homeButton: false, // 如果设置为false，将不会创建右上角主页(房子)按钮。
        sceneModePicker: false, // 如果设置为false，将不会创建右上角投影方式控件(显示二三维切换按钮)。
        animation: false, // 如果设置为false，将不会创建左下角动画小部件。
        timeline: false, // 如果设置为false，则不会创建正下方时间轴小部件。
        fullscreenButton: false, // 如果设置为false，将不会创建右下角全屏按钮。
        scene3DOnly: true, // 为 true 时，每个几何实例将仅以3D渲染以节省GPU内存。
        shouldAnimate: true, // 默认true ，否则为 false 。此选项优先于设置 Viewer＃clockViewModel 。
        // ps. Viewer＃clockViewModel 是用于控制当前时间的时钟视图模型。我们这里用不到时钟，就把shouldAnimate设为false
        infoBox: false, // 是否显示点击要素之后显示的信息
        sceneMode: 3, // 初始场景模式 1 2D模式 2 2D循环模式 3 3D模式  Cesium.SceneMode
        requestRenderMode: true,
        fullscreenElement: document.body, // 全屏时渲染的HTML元素 暂时没发现用处，虽然我关闭了全屏按钮，但是键盘按F11 浏览器也还是会进入全屏
        selectionIndicator: false, //关闭绿色弹窗
        imageryProvider: false,
      });
      this.configureImageryLayers(mapToken);
      this.configureGlobeAppearance();
      // this.viewer.scene.screenSpaceCameraController.enableRotate = false; //旋转
      // this.viewer.terrainProvider = Cesium.createWorldTerrainAsync({
      //   requestWaterMask: true,
      //   requestVertexNormals: true
      // });
      // 再加上天影像注记地图
      // this.viewer.imageryLayers.addImageryProvider(
      //   tiandituVector
      // );
      // 标注
      //全球影像中文注记服务
      // this.viewer.imageryLayers.addImageryProvider(
      //   new Cesium.WebMapTileServiceImageryProvider({
      //     subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
      //     url: "https://t{s}.tianditu.gov.cn/cva_w/wmts?tk=" + token + "&service=wmts&request=GetTile&version=1.0.0&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles",
      //     layer: "tdtAnnoLayer",
      //     style: "default",
      //     format: "image/jpeg",
      //     tileMatrixSetID: "GoogleMapsCompatible",
      //     show: false
      //   })
      // );

      // var baseFragShader; // 底图着色器
      // var baseFragShaderClone; // 原底图着色器缓存
      // var newbaseFragShaderClone; // 新底图着色器缓存
      // var viewer = this.viewer;
      // const modifyMap = (viewer, options) => {
      //   const baseLayer = viewer.imageryLayers.get(0);
      //   //以下几个参数根据实际情况修改
      //   baseLayer.brightness = options.brightness || 0.6;
      //   baseLayer.contrast = options.contrast || 1.8; //对比度
      //   baseLayer.gamma = options.gamma || 0.3;
      //   baseLayer.hue = options.hue || 1; //图层色调
      //   baseLayer.saturation = options.saturation || 0; //
      //   baseFragShader =
      //     viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources;
      //   baseFragShaderClone = JSON.parse(JSON.stringify(baseFragShader));

      //   for (let i = 0; i < baseFragShader.length; i++) {
      //     const strS =
      //       "color = czm_saturation(color, textureSaturation);\n#endif\n";
      //     let strT =
      //       "color = czm_saturation(color, textureSaturation);\n#endif\n";
      //     if (options.invertColor) {
      //       strT += `
      //             color.r = 1.0 - color.r;
      //             color.g = 1.0 - color.g;
      //             color.b = 1.0 - color.b;
      //             `;
      //     }
      //     if (options.filterRGB.length > 0) {
      //       strT += `
      //                 color.r = color.r * ${options.filterRGB[0]}.0/255.0;
      //                 color.g = color.g * ${options.filterRGB[1]}.0/255.0;
      //                 color.b = color.b * ${options.filterRGB[2]}.0/255.0;
      //                 `;
      //     }
      //     baseFragShader[i] = baseFragShader[i].replace(strS, strT);
      //   }
      //   newbaseFragShaderClone = JSON.parse(JSON.stringify(baseFragShader));
      // };

      // //调用
      // modifyMap(viewer, {
      //   //反色
      //   invertColor: true,
      //   //滤镜值
      //   filterRGB: [60, 145, 172],
      // });
      //   设置初始位置  Cesium.Cartesian3.fromDegrees(longitude, latitude, height, ellipsoid, result)
      //   const boundingSphere = new Cesium.BoundingSphere(
      //       Cesium.Cartesian3.fromDegrees(104.81769266666667, 28.169435333333332, 1000),
      //       900
      //   );
      // 定位到初始位置
      // this.viewer.camera.flyToBoundingSphere(boundingSphere, {
      //     // 动画，定位到初始位置的过渡时间，设置成0，就没有动画
      //     duration: 0,
      // });
      // 默认视角
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          104.81769266666667,
          28.169435333333332,
          1600.97
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0), // 水平旋转  -正北方向
          pitch: Cesium.Math.toRadians(-30), // 上下旋转  --俯视朝向
          roll: 0, // 视口翻滚角度
        },
      });
      this.viewer._cesiumWidget._creditContainer.style.display = "none"; // 隐藏版权
      // this.viewer.scene.globe.depthTestAgainstTerrain = true; //开启地形
      this.renderRealtimeSnapshot(this.mapList);
      this.updatedMapSize();
      //加载城市模型
      // var base = "/glb/Macao_Buildings.json";
      // const buildingUrl = "/glb/Macao_Buildings.json"; //"http://192.168.3.203:8088/leiyangBuildings/tileset.json";
      // let leiyangBuilding;
      // leiyangBuilding = new Cesium.Cesium3DTileset({
      //   url: buildingUrl,
      // });
      // this.viewer.scene.primitives.add(leiyangBuilding);
      // var geojsonOptions = {
      //   clampToGround: true //使数据贴地
      // };
      // var entities;
      // var promise = Cesium.GeoJsonDataSource.load('/glb/Macao_Buildings.json', geojsonOptions);


    },
    // 清除
    remove() {
      if (!this.isViewerReady()) {
        return;
      }
      this.destroyScreenSpaceHandler();
      this.viewer.entities.removeAll();
      this.viewer.dataSources.removeAll();
      this.realtimeEntityIds = [];
      this.realtimeBarStates = [];
      this.realtimeBarCursor = 0;
      this.realtimeRouteState = null;
      this.latestRealtimeBarId = null;
      this.requestRender();
    },
    // 实时绘制切换气体种类清除之前绘制
    removeBar() {
      if (!this.isViewerReady()) {
        return;
      }
      this.viewer.entities.removeAll();
      this.realtimeEntityIds = [];
      this.realtimeBarStates = [];
      this.realtimeBarCursor = 0;
      this.realtimeRouteState = null;
      this.latestRealtimeBarId = null;
      this.index = this.mapList.length > 0 ? (this.mapList.length - 1) : 0;
      var cutArr = this.mapList.slice(0, this.index);
      if (this.index > 0) {
        this.moveBar(cutArr);
      }
      this.requestRender();
    },
    redrawConcentrationByGas(gasType, points = this.mapList) {
      this.gasType = gasType;
      const nextPoints = Array.isArray(points) ? points : [];
      this.dataList = nextPoints;

      if (!this.isViewerReady()) {
        return;
      }

      this.remove();
      this.index = nextPoints.length > 0 ? nextPoints.length - 1 : 0;
      if (!nextPoints.length) {
        this.requestRender();
        return;
      }

      const historyPoints = nextPoints.slice(0, this.index);
      this.prevData = this.index > 0 ? nextPoints[this.index - 1] : nextPoints[0];
      if (historyPoints.length) {
        this.moveBar(historyPoints);
      }
      this.nowBar(nextPoints[this.index]);
      this.updateRealtimeRoute(nextPoints);
      this.requestRender();
    },
    redrawRealtimeWindow(gasType, points = this.mapList) {
      this.redrawConcentrationByGas(gasType, points);
    },
    renderRealtimeSnapshot(points = this.mapList) {
      const nextPoints = Array.isArray(points) ? points : [];
      this.dataList = nextPoints;
      if (!this.isViewerReady() || !nextPoints.length) {
        return;
      }

      this.index = nextPoints.length - 1;
      this.prevData = this.index > 0 ? nextPoints[this.index - 1] : nextPoints[0];
      const historyPoints = nextPoints.slice(0, this.index);
      if (historyPoints.length) {
        this.moveBar(historyPoints);
      }
      this.nowBar(nextPoints[this.index]);
      this.updateRealtimeRoute(nextPoints);
    },
    updateRealtimeRoute(points = this.dataList) {
      if (!this.isViewerReady()) {
        return;
      }

      const coordinates = (Array.isArray(points) ? points : []).reduce(
        (result, point) => {
          const longitude = Number(point && point.longitude);
          const latitude = Number(point && point.latitude);
          if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
            result.push(longitude, latitude, REALTIME_ROUTE_HEIGHT);
          }
          return result;
        },
        [],
      );
      if (coordinates.length < 4) {
        return;
      }

      const positions =
        Cesium.Cartesian3.fromDegreesArrayHeights(coordinates);
      const route = this.viewer.entities.getById("realtime-route");
      if (route && route.polyline && this.realtimeRouteState) {
        this.realtimeRouteState.positions = positions;
      } else {
        if (route) {
          this.viewer.entities.removeById("realtime-route");
        }
        const routeState = { positions };
        this.realtimeRouteState = routeState;
        this.viewer.entities.add({
          id: "realtime-route",
          name: "实时轨迹",
          polyline: {
            positions: new Cesium.CallbackProperty(
              () => routeState.positions,
              false,
            ),
            material: Cesium.Color.fromCssColorString("#12FF9B").withAlpha(
              0.95,
            ),
            width: 5,
            clampToGround: false,
          },
        });
      }
      this.requestRender();
    },
    upsertRealtimeBar(dataPoint, slotIndex, gasType = this.gasType) {
      if (!dataPoint) {
        return;
      }

      const longitude = Number(dataPoint.longitude);
      const latitude = Number(dataPoint.latitude);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        return;
      }

      const barData = this.getColor(dataPoint[gasType]);
      const height = Number(barData.height);
      const safeHeight = Number.isFinite(height) ? height : 40;
      const position = Cesium.Cartesian3.fromDegrees(
        longitude,
        latitude,
        safeHeight / 2,
      );
      const dimensions = new Cesium.Cartesian3(6, 6, safeHeight);
      const material = Cesium.Color.fromCssColorString(
        barData.color,
      ).withAlpha(0.5);
      const entityId = `realtime-bar-${slotIndex}`;
      const entity = this.viewer.entities.getById(entityId);
      const state = this.realtimeBarStates[slotIndex];

      if (entity && entity.box && state) {
        state.position = position;
        state.dimensions = dimensions;
        state.color = material;
        entity.show = true;
        return entityId;
      }

      if (entity) {
        this.viewer.entities.removeById(entityId);
      }

      const nextState = {
        position,
        dimensions,
        color: material,
      };
      this.realtimeBarStates[slotIndex] = nextState;
      this.viewer.entities.add({
        name: `Redbox${slotIndex}`,
        id: entityId,
        position: new Cesium.CallbackProperty(
          () => nextState.position,
          false,
        ),
        box: {
          scale: 1,
          dimensions: new Cesium.CallbackProperty(
            () => nextState.dimensions,
            false,
          ),
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(
              () => nextState.color,
              false,
            ),
          ),
          outline: false,
          outlineColor: Cesium.Color.WHITE,
          heightReference: Cesium.HeightReference.NONE,
        },
      });
      this.trackRealtimeEntity(entityId);
      return entityId;
    },
    setLatestRealtimeBar(entityId) {
      if (
        this.latestRealtimeBarId &&
        this.latestRealtimeBarId !== entityId
      ) {
        const previousBar = this.viewer.entities.getById(
          this.latestRealtimeBarId,
        );
        if (previousBar) {
          previousBar.show = true;
        }
      }

      const currentBar = entityId
        ? this.viewer.entities.getById(entityId)
        : null;
      if (currentBar) {
        currentBar.show = false;
      }
      this.latestRealtimeBarId = entityId || null;
    },
    // 实时绘制历史柱状图
    moveBar(list) {
      if (!this.isViewerReady()) {
        return;
      }
      const flightData = Array.isArray(list)
        ? list.slice(-MAX_REALTIME_BARS)
        : [];
      if (flightData && flightData.length > 0) {
        // 绘制之前存储的
        for (let i = 0; i < flightData.length; i++) {
          this.upsertRealtimeBar(flightData[i], i);
        }

        this.realtimeBarCursor =
          flightData.length % MAX_REALTIME_BARS;
        this.requestRender();
      }
    },
    //实时新增
    nowBar(data) {
      if (!this.isViewerReady() || !data) {
        return;
      }
      const slotIndex =
        Number.isInteger(this.realtimeBarCursor)
          ? this.realtimeBarCursor
          : 0;
      const entityId = this.upsertRealtimeBar(data, slotIndex);
      this.setLatestRealtimeBar(entityId);
      this.realtimeBarCursor =
        (slotIndex + 1) % MAX_REALTIME_BARS;

      //加入车辆信息
      if (!this.viewer.entities.getById("model")) {
        var model = new Cesium.Entity({
          id: "model", //id 唯一
          name: "小车模型", //名称
          show: true, //显示
          position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 0), //小车位置
          // orientation: new Cesium.VelocityOrientationProperty(Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 0)),
          model: {
            uri: "/glb/Cesium_Car.glb",
            scale: 1,
            minimumPixelSize: 70,
            maximumScale: 70,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, //贴地
          },
          // orientation: Cesium.Transforms.headingPitchRollQuaternion(
          //   Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 0),
          //   new Cesium.HeadingPitchRoll(
          //     Cesium.Math.toRadians(turf.rhumbBearing(coordItem[0], coordItem[1])),
          //     Cesium.Math.toRadians(0),
          //     Cesium.Math.toRadians(0)
          //   )
          // ),

          // 根据位置移动自动计算方向
          // orientation: new Cesium.VelocityOrientationProperty(positionProperty),
        });
        this.viewer.entities.add(model);
      } else {

        //更新位置
        var carPosition = Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 0);//(经度，纬度，高程)
        this.viewer.entities.getById("model").position = carPosition;

        let coordItem = [[this.prevData.longitude, this.prevData.latitude], [data.longitude, data.latitude]]
        //获取两个点之间的中心点坐标
        // let centerPoint = twoToCenter(coordItem[0], coordItem[1])
        //通过 turf 计算两个点的方向向量
        let angle = turf.rhumbBearing(coordItem[0], coordItem[1])
        //转换成cesium的角度
        const angleInRadians = Cesium.Math.toRadians(angle - 90)
        this.viewer.entities.getById("model").orientation = Cesium.Transforms.headingPitchRollQuaternion(
          Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, 0),
          new Cesium.HeadingPitchRoll(
            angleInRadians,
            Cesium.Math.toRadians(0),
            Cesium.Math.toRadians(0)
          )
        );
      }
      this.changeView(this.$parent.viewFlag)
      this.requestRender();
    },

    // 历史气体浓度监测

    echartsPlay(data) {
      if (!data || !Array.isArray(data.data) || !this.isViewerReady()) {
        return;
      }
      this.remove();
      var flightData = data.data;
      this.viewer.scene.globe.depthTestAgainstTerrain = true; //开启深度
      if (flightData && flightData.length > 0) {
        // var centerNum = Math.round(flightData.length / 2);
        flightData.forEach((item, i) => {
          var barData = this.getColor(item[this.gasType]);
          var color = barData.color;
          var height = barData.height;
          const position = Cesium.Cartesian3.fromDegrees(
            item.longitude,
            item.latitude,
            0
          );
          if (!this.viewer.entities.getById(item.time + "_" + i)) {
            this.viewer.entities.add({
              name: "Redbox" + i,
              id: item.time + "_" + i,
              position: position,

              box: {
                scale: 1,
                dimensions: new Cesium.Cartesian3(6, 6, height), //设置长宽高
                // material: new Cesium.Color.GREENYELLOW.withAlpha(0.5), //设置颜色
                material: new Cesium.Color.fromCssColorString(color).withAlpha(
                  0.5
                ), //材料
                outline: false, //设置指定box是否有轮廓的Property 默认false
                outlineColor: Cesium.Color.WHITE, //设置轮廓线
                heightReference: Cesium.HeightReference.NONE,
                // heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,//贴地设置
              },
            });
          }
        })

        if (this.viewer.entities.values && this.viewer) {
          this.viewer.flyTo(this.viewer.entities.values, {
            duration: 1, // 以秒为单位的飞行持续时间。
            offset: {
              heading: Cesium.Math.toRadians(0.0), // 以弧度为单位的航向角。
              // pitch: -Math.PI / 4, // 以弧度为单位的俯仰角。
              pitch: Cesium.Math.toRadians(-30),
              range: 1500, // 到中心的距离，以米为单位。
            },
          });
          // this.viewer.scene.globe.depthTestAgainstTerrain = false; //开启地形

        }

        // 点击事件
        var that = this;
        this.destroyScreenSpaceHandler();
        this.screenSpaceHandler = new Cesium.ScreenSpaceEventHandler(
          that.viewer.scene.canvas
        );
        var colored_entity_id = 0; //记录换颜色的模型id
        var color_material = null;
        this.screenSpaceHandler.setInputAction(function (movement) {
          var pick = that.viewer.scene.pick(movement.position);
          if (Cesium.defined(pick)) {
            var id = pick.id._id;

            var pickedEntity = that.viewer.entities.getById(id);
            var colored_entity =
              that.viewer.entities.getById(colored_entity_id); //查看是否已有换颜色的模型
            if (Cesium.defined(colored_entity)) {
              //如果有，先将换颜色的模型换回来，在把当前模型换色
              if (colored_entity_id == id) {
                pickedEntity.box.material = color_material;
                colored_entity_id = 0;
              } else {
                const prevPickedEntity =
                  that.viewer.entities.getById(colored_entity_id);
                prevPickedEntity.box.material = color_material;
                color_material = pickedEntity.box.material;
                pickedEntity.box.material = new Cesium.Color.fromCssColorString(
                  "#0095FF"
                ).withAlpha(0.5);
                var flagId = id.split('_')[0];
                const list = flightData.filter((item) => {
                  return item.time == flagId;
                });
                if (list.length > 0) {
                  that.$emit("getTimePointer", list[0]);
                }
                colored_entity_id = pick.id._id;
              }
            } else {
              //如果没有，直接把当前模型换色
              color_material = pickedEntity.box.material;
              pickedEntity.box.material = new Cesium.Color.fromCssColorString(
                "#0095FF"
              ).withAlpha(0.5);
              const list = flightData.filter((item) => {
                var time = id.split('_')[0]
                return item.time == time;
              });

              if (list.length > 0) {

                that.$emit("getTimePointer", list[0]);
              }

              colored_entity_id = pick.id._id;
            }
            that.requestRender();
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.requestRender();
      }

    },

    // 绘制轨迹线
    drawLine(data) {
      if (!data || !Array.isArray(data.data) || !data.data.length || !this.isViewerReady()) {
        return;
      }
      this.destroyScreenSpaceHandler();
      this.remove();
      var flightData = data.data;
      //创建DataSource
      var datasource = new Cesium.CustomDataSource("enetiestestdata");
      this.viewer.dataSources.add(datasource);
      var lujingdata = [];
      flightData.forEach((item) => {
        lujingdata.push([item.longitude, item.latitude, 0]);
      });
      //添加线
      datasource.entities.add({
        name: "line",
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(
            lujingdata.flat()
          ),
          material: Cesium.Color.fromCssColorString("#12FF9B"),
          width: 5,
        },
      });

      var property = new Cesium.SampledPositionProperty();
      var starttime = new Date(flightData[0].time);
      var stoptime = new Date(flightData[flightData.length - 1].time);
      var timestamp = starttime.getTime();

      lujingdata.forEach((pos, index) => {
        var time = new Date(timestamp + index * 100);
        // stoptime = time;
        var position = Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2]);
        property.addSample(Cesium.JulianDate.fromDate(time), position);
      });
      property.setInterpolationOptions({
        interpolationDegree: 0.0001,
        interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
      });
      var entitydd = datasource.entities.add({
        availability: new Cesium.TimeIntervalCollection([
          new Cesium.TimeInterval({
            start: Cesium.JulianDate.fromDate(starttime),
            stop: Cesium.JulianDate.fromDate(new Date(stoptime)),
          }),
        ]),
        position: property, // 点集
        //朝向
        orientation: new Cesium.VelocityOrientationProperty(property),
        model: {
          uri: "/glb/Cesium_Car.glb",
          scale: 1,
          minimumPixelSize: 70,
          maximumScale: 70,
        },
      });
      this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(starttime); //修改时间轴的当前时间
      this.viewer.clock.startTime = Cesium.JulianDate.fromDate(starttime); //开始时间
      this.viewer.clock.stopTime = Cesium.JulianDate.fromDate(new Date(stoptime)); //结束时间
      this.viewer.zoomTo(datasource);
      // this.viewer.clock.onTick.addEventListener((tick) => {
      //   entitydd.position.getValue(tick.currentTime);

      //   //转为经纬度
      //   var cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
      //     entitydd.position.getValue(tick.currentTime)
      //   );
      //   cartographic.longitude = Cesium.Math.toDegrees(cartographic.longitude);
      //   cartographic.latitude = Cesium.Math.toDegrees(cartographic.latitude);

      //   // viewer.clock.shouldAnimate = false;
      //   // entitydd.label.text = Number(cartographic.longitude).toFixed(4) + "," + Number(cartographic.Latitude).toFixed(4);
      // });
      //视角跟随车辆
      this.viewer.trackedEntity = entitydd;
      entitydd.viewFrom = new Cesium.Cartesian3(0, -50, 400);
      this.requestRender();
    },
    // 视角方向
    changeView(flag) {
      if (!this.isViewerReady()) {
        return;
      }
      const model = this.viewer.entities.getById("model");
      if (flag) {
        if (!model) {
          return;
        }
        model.viewFrom = new Cesium.Cartesian3(0, -250, 450);
        const modelPosition = model.position.getValue(
          this.viewer.clock.currentTime,
        );
        if (modelPosition) {
          this.viewer.camera.lookAt(
            modelPosition,
            new Cesium.HeadingPitchRange(
              0,
              -Math.PI / 6,
              600,
            ),
          );
        }
        this.viewer.trackedEntity = undefined;
        this.following = true;
      } else if (this.following || this.viewer.trackedEntity) {
        if (this.viewer.camera && this.viewer.camera.cancelFlight) {
          this.viewer.camera.cancelFlight();
        }
        this.viewer.trackedEntity = undefined;
        if (
          this.viewer.camera &&
          this.viewer.camera.lookAtTransform
        ) {
          this.viewer.camera.lookAtTransform(
            Cesium.Matrix4.IDENTITY,
          );
        }
        this.following = false;
      }
      this.requestRender();
    },
    updatedMapSize() {
      if (!this.isViewerReady()) {
        return;
      }
      if (typeof this.viewer.resize === "function") {
        this.viewer.resize();
      }
      this.requestRender();
    },
    isViewerReady() {
      return Boolean(
        this.viewer &&
        (!this.viewer.isDestroyed || !this.viewer.isDestroyed()),
      );
    },
    requestRender() {
      if (this.isViewerReady() && this.viewer.scene) {
        this.viewer.scene.requestRender();
      }
    },
    trackRealtimeEntity(entityId) {
      if (!Array.isArray(this.realtimeEntityIds)) this.realtimeEntityIds = [];
      if (this.realtimeEntityIds.includes(entityId)) return;
      this.realtimeEntityIds.push(entityId);
      while (this.realtimeEntityIds.length > MAX_REALTIME_BARS) {
        const staleId = this.realtimeEntityIds.shift();
        if (staleId && typeof this.viewer.entities.removeById === "function") {
          this.viewer.entities.removeById(staleId);
        }
      }
    },
    destroyScreenSpaceHandler() {
      if (
        this.screenSpaceHandler &&
        (!this.screenSpaceHandler.isDestroyed ||
          !this.screenSpaceHandler.isDestroyed())
      ) {
        this.screenSpaceHandler.destroy();
      }
      this.screenSpaceHandler = null;
    },
    addHeight() {
      if (this.dlEllipse.ellipse.extrudedHeight < 15) {
        this.dlEllipse.ellipse.extrudedHeight += 1.5;
      }
    },
    // 获取浓度颜色
    getColor(num) {
      var type = this.$parent.gasName;
      var numArea = this.$store.getters.GET_GasData;
      // 获取当前选中的气体范围
      var data = numArea[type];
      var color = "";
      var height = 0;
      if (num > data[0][0] && num <= data[0][1]) {
        color = this.colorList[0];
        // height = 55;
        height = ((num - data[0][0]) / (data[0][1] - data[0][0])).toFixed(5) * 15 + 40;

      } else if (num > data[1][0] && num <= data[1][1]) {
        color = this.colorList[1];
        // height = 70;
        height = ((num - data[1][0]) / (data[1][1] - data[1][0])).toFixed(5) * 15 + 55;
      } else if (num > data[2][0] && num <= data[2][1]) {

        color = this.colorList[2];
        // height = 85;
        height = ((num - data[2][0]) / (data[2][1] - data[2][0])).toFixed(5) * 15 + 70;
      } else if (num > data[3][0] && num <= data[3][1]) {
        color = this.colorList[3];
        // height = 100;
        height = ((num - data[3][0]) / (data[3][1] - data[3][0])).toFixed(5) * 15 + 85;
      } else if (num > data[4][0] && num <= data[4][1]) {
        color = this.colorList[4];
        // height = 115;
        height = ((num - data[4][0]) / (data[4][1] - data[4][0])).toFixed(5) * 15 + 100;
      } else {
        color = this.colorList[5];
        height = 40;
      }
      return { color: color, height: height };
    },
    // 计算两点之间的朝向
    getModelMatrix(pointA, pointB) {
      //向量AB
      const vector2 = Cesium.Cartesian3.subtract(
        pointB,
        pointA,
        new Cesium.Cartesian3()
      );
      //归一化
      const normal = Cesium.Cartesian3.normalize(vector2, new Cesium.Cartesian3());
      //旋转矩阵 rotationMatrixFromPositionVelocity源码中有，并未出现在cesiumAPI中
      const rotationMatrix3 = Cesium.Transforms.rotationMatrixFromPositionVelocity(
        pointA,
        normal,
        Cesium.Ellipsoid.WGS84
      );
      const modelMatrix4 = Cesium.Matrix4.fromRotationTranslation(
        rotationMatrix3,
        pointA
      );
      return modelMatrix4;
    },
    getHeadingPitchRoll(m) {
      var m1 = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Matrix4.getTranslation(m, new Cesium.Cartesian3()),
        Cesium.Ellipsoid.WGS84,
        new Cesium.Matrix4()
      );
      // 矩阵相除
      var m3 = Cesium.Matrix4.multiply(
        Cesium.Matrix4.inverse(m1, new Cesium.Matrix4()),
        m,
        new Cesium.Matrix4()
      );
      // 得到旋转矩阵
      var mat3 = Cesium.Matrix4.getMatrix3(m3, new Cesium.Matrix3());
      // 计算四元数
      var q = Cesium.Quaternion.fromRotationMatrix(mat3);
      // 计算旋转角(弧度)
      var hpr = Cesium.HeadingPitchRoll.fromQuaternion(q);
      return hpr;
    }
  }
};
</script>
<style lang="scss" scoped>
.app-content {
  width: 100%;
  height: 100%;

  #cesiumContainer {
    width: 100%;
    height: 100%;
  }
}
</style>
