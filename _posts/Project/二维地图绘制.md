# OpenLayers地图绘制笔记

## 从0到1绘制地图

Web地图的核心本质是将画布挂载到DOM容器上，整个绘制流程分为三步：创建容器、初始化地图实例、添加底图，三步缺一不可。

### 地图容器创建

首先在页面中定义一个DOM容器，用于承载OpenLayers渲染的地图，需设置固定的宽高（百分比或具体像素均可），否则地图无法正常显示。

```vue
<template>
  <div class="map-container">
    <div id="mapView" class="mapView"></div>
  </div>
</template>

<style scoped>
.map-container { width: 100%; height: 100vh; } /* 占满整个视口高度 */
.mapView { width: 100%; height: 100%; } /* 与父容器尺寸一致 */
</style>
```

知识点对应问题：地图容器为什么必须设置宽高？若不设置会出现什么问题？

### Map实例初始化

通过`new Map()`创建地图实例，核心配置参数包括`target`（挂载容器）、`layers`（地图图层）、`view`（地图视图），其中`view`决定地图的初始中心点、缩放级别和投影方式。

```javascript
<script lang="ts" setup>
  import Map from "ol/Map"; // 核心地图类
  import View from "ol/View"; // 地图视图类
  import { ref, onMounted, onBeforeUnmount } from "vue";

  const map = ref(null); // 存储地图实例，便于后续操作

  onMounted(() => {
    // 组件挂载后初始化地图，避免DOM未渲染导致挂载失败
    map.value = new Map({
      target: "mapView", // 对应DOM容器的id
      view: new View({
        center: [0, 0], // 初始中心点坐标（默认EPSG:3857坐标系）
        zoom: 2, // 初始缩放级别（1-18，数字越大视图越近）
        projection: "EPSG:3857" // 可选，默认就是EPSG:3857，也可设置为EPSG:4326
      }),
      layers: [] // 初始为空，后续添加底图和业务图层
    });
  });

  onBeforeUnmount(() => {
    // 组件销毁前移除地图容器引用，防止内存泄漏
    if (map.value) {
      map.value.setTarget(null);
    }
  });
</script>
```

注意：此时地图仍为空白，因为未添加任何图层，图层是地图的可视化载体。

知识点对应问题：为什么要在`onMounted`中初始化地图？`onBeforeUnmount`中移除地图容器引用的作用是什么？

### 添加底图

底图是地图的基础参照系，OpenLayers中常用`Tile`（瓦片图层）作为底图载体，搭配`XYZ`数据源加载瓦片，最常用的底图来源是天地图、高德地图等第三方地图服务。

以下以天地图矢量底图为例，演示添加流程，需注意天地图使用前需申请`tk`（密钥），且需匹配密钥的权限类型（如浏览器端密钥）。

```javascript
<script lang="ts" setup>
  import Map from "ol/Map";
  import View from "ol/View";
  import Tile from "ol/layer/Tile"; // 瓦片图层类
  import XYZ from "ol/source/XYZ"; // XYZ数据源类
  import { ref, onMounted, onBeforeUnmount } from "vue";

  const map = ref(null);

  // 1. 创建天地图XYZ数据源
  const tiandituSource = new XYZ({
    // 天地图WMTS服务转XYZ格式的请求地址，替换为自己的tk
    url: "http://t0.tianditu.gov.cn/vec_w/wmts?" +
         "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
         "&LAYER=vec&STYLE=default&TILEMATRIXSET=w" +
         "&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
         "&tk=你的天地图密钥",
    crossOrigin: "anonymous" // 解决跨域问题
  });

  // 2. 创建瓦片图层
  const tiandituLayer = new Tile({
    source: tiandituSource, // 绑定数据源
    zIndex: 1 // 图层层级，数字越小越靠下
  });

  onMounted(() => {
    map.value = new Map({
      target: "mapView",
      layers: [tiandituLayer], // 将底图图层加入地图
      view: new View({
        center: [0, 0],
        zoom: 2
      })
    });
  });

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.setTarget(null);
    }
  });
</script>
```

知识点对应问题：底图为什么优先使用`Tile`瓦片图层？`XYZ`数据源的`{z}{x}{y}`分别代表什么含义？

## Layer图层详解

OpenLayers中，`Layer`（图层）负责控制地图内容的显示方式（顺序、可见性、透明度），`Source`（数据源）负责提供地图数据（来源、加载方式），二者是分离的设计，便于灵活切换数据和显示样式。

图层按架构主要分为三大类：栅格图层（Raster）、矢量图层（Vector）、特殊用途图层（Specialized），其中栅格图层和矢量图层是开发中最常用的两类。

### Tile瓦片图层（最常用）

Tile图层是将地图按固定规则切分成大量256×256像素的小图片（瓦片），浏览器仅加载当前视野内的瓦片，是底图的首选图层类型。

#### 核心特点

- 瓦片提前在服务端切分好，加载速度快，性能稳定
- 支持多级缩放，不同缩放级别对应不同精度的瓦片
- 浏览器按需加载瓦片，减少网络请求量
- 样式固定在瓦片中，无法在前端动态修改

#### 适用场景与局限

适用场景：基础底图（行政区划、道路、水系）、卫星影像、大范围地图展示（如全国、省级地图），例如天地图、高德地图的底图。

局限：无法对单个地图要素（如一条道路、一个建筑）进行交互（点击、高亮），样式不可动态修改。

#### 工程实操要点

开发中通常将Tile图层作为最底层的基础底图，再在其上方叠加业务图层（如矢量图层），示例如下：

```javascript
// 底图图层（Tile）
const baseLayer = new Tile({
  source: new XYZ({ url: "天地图/高德瓦片地址" }),
  zIndex: 1
});

// 业务图层（后续添加的矢量图层）
const businessLayer = new VectorLayer({ ... });

// 地图加载时，底图在最下层
map.value = new Map({
  target: "mapView",
  layers: [baseLayer, businessLayer],
  view: new View({ ... })
});
```

知识点对应问题：Tile图层的瓦片加载机制是什么？为什么不适合用于需要交互的业务场景？

### Image影像图层

Image图层与Tile图层不同，它在当前视图范围内只请求一整张图片，不进行瓦片拆分，图片通常由服务端动态生成。

#### 核心特点

- 每次视图变化（缩放、拖拽）都会重新请求整张图片
- 渲染逻辑主要在服务端，前端仅负责显示图片
- 支持复杂的专题渲染（如统计热区、等值线）

#### 适用场景与局限

适用场景：后端动态制图、专题分析图（如管网压力分布图、泄漏概率专题图）、不方便切片的数据展示。

局限：视图频繁变化时，会频繁请求新图片，性能不如Tile图层；无法进行要素级交互。

知识点对应问题：Image图层与Tile图层的核心区别是什么？什么时候优先选择Image图层？

### Vector矢量图层

**Vector图层是OpenLayers中唯一支持要素级渲染、样式控制和交互的图层类型**，将点、线、面等要素直接加载到浏览器内存中，由前端负责渲染和交互，适合承载所有需要参与业务逻辑的地图对象。

#### 核心特点

- 每个要素（Feature）是独立对象，可单独设置样式、监听事件
- 样式完全由前端控制，支持动态修改（如高亮、变色）
- 支持要素级交互（点击、选中、编辑）
- 不适合超大规模数据（几十万要素会出现卡顿）

#### 三层结构（必记）

一个完整的Vector图层必须包含三层结构，缺一不可：

1. Feature（要素）：承载几何数据和属性信息，如一个点、一条线
2. VectorSource（数据源）：存储多个Feature，是要素的容器
3. VectorLayer（图层）：负责将数据源中的要素渲染到地图上，并提供交互能力

#### 基础实操示例

```javascript
<script lang="ts" setup>
  import Map from "ol/Map";
  import View from "ol/View";
  import VectorLayer from "ol/layer/Vector"; // 矢量图层类
  import VectorSource from "ol/source/Vector"; // 矢量数据源类
  import Feature from "ol/Feature"; // 要素类
  import Point from "ol/geom/Point"; // 点几何类
  import { ref, onMounted, onBeforeUnmount } from "vue";

  const map = ref(null);

  onMounted(() => {
    // 1. 创建要素（点要素，坐标为EPSG:3857）
    const pointFeature = new Feature({
      geometry: new Point([12000000, 3500000]), // 经纬度需转换为EPSG:3857坐标
      name: "监测点", // 要素属性，可自定义
      type: "warning" // 自定义属性，用于区分要素类型
    });

    // 2. 创建矢量数据源，添加要素
    const vectorSource = new VectorSource({
      features: [pointFeature] // 可传入多个Feature组成的数组
    });

    // 3. 创建矢量图层，绑定数据源
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 10 // 层级高于底图，确保能显示
    });

    // 4. 初始化地图，添加矢量图层
    map.value = new Map({
      target: "mapView",
      layers: [vectorLayer], // 可搭配Tile底图一起添加
      view: new View({
        center: [12000000, 3500000],
        zoom: 10
      })
    });
  });

  onBeforeUnmount(() => {
    if (map.value) {
      // 销毁矢量图层，防止内存泄漏
      const vectorLayer = map.value.getLayers().item(0);
      const vectorSource = vectorLayer.getSource();
      vectorSource.clear(); // 清空数据源
      map.value.removeLayer(vectorLayer); // 移除图层
      map.value.setTarget(null);
    }
  });
</script>
```

知识点对应问题：Vector图层的三层结构分别是什么？各自的作用是什么？为什么Vector图层支持要素级交互而Tile图层不支持？

### VectorImage图层

VectorImage图层是Vector图层的优化版本，数据仍然是矢量，但在渲染阶段会先将矢量要素转换为图片再显示，兼顾性能和部分样式能力。

核心特点：渲染性能优于Vector图层，保留部分样式控制能力，但交互能力弱于Vector图层，不适合高频交互场景。

适用场景：不需要点选的业务区域、静态展示但样式复杂的图层（如管网分区背景层、风险等级区域渲染层）。

知识点对应问题：VectorImage图层与Vector图层的区别是什么？适合用于什么场景？

### VectorTile矢量瓦片图层

VectorTile图层结合了Tile图层的性能优势和Vector图层的样式优势，将矢量数据在服务端切成瓦片，前端按瓦片加载矢量要素，支持超大规模数据展示。

核心特点：加载速度快，支持前端自定义样式，可承载全国级、城市级的矢量数据，但服务端配置复杂度较高，数据更新成本高。

适用场景：城市道路、建筑物、大规模管网、行政区划动态渲染（如城市级管网全量展示）。

知识点对应问题：VectorTile图层的优势是什么？与Tile图层、Vector图层相比，适用场景有何不同？

## 天地图API集成

天地图本质是一个WMTS（Web地图瓦片服务）服务集，提供多种类型的地图瓦片（矢量、影像、地形等），所有类型的服务请求方式、瓦片规则、API结构一致，仅图层名称（Layer参数）不同。

### 天地图核心服务类型

- 矢量地图（vec）：基础矢量底图，包含道路、行政区划等
- 影像地图（img）：卫星影像底图，清晰度高
- 地形地图（ter）：带有地形晕渲的底图，能体现地势起伏
- 注记图层（cva/cia/cta）：分别对应矢量、影像、地形底图的文字标注，单独拆分便于更新和多语言支持

### 天地图使用注意事项

- 使用前必须申请天地图Key（密钥），Key分为不同权限类型（如浏览器端、服务端），需匹配使用场景，否则会出现“权限类型错误”（如文档中出现的code:301012报错）。
- 天地图服务支持HTTP和HTTPS协议，二级域名包括t0-t7，可随机选择使用（如t1.tianditu.gov.cn），分散请求压力。
- 注记图层需与对应底图搭配使用，例如矢量底图（vec）搭配矢量注记（cva），影像底图（img）搭配影像注记（cia）。
- 直接访问天地图WMTS服务地址（如http://t0.tianditu.gov.cn/vec_w/wmts）会出现“网页解析失败”，需携带完整请求参数（如SERVICE、REQUEST、tk等）。

### 天地图多图层加载示例

同时加载矢量底图、全球境界、矢量注记，通过`zIndex`控制层级（注记层级最高，确保能显示在最上方）：

```javascript
<script lang="ts" setup>
  import Map from "ol/Map";
  import View from "ol/View";
  import Tile from "ol/layer/Tile";
  import XYZ from "ol/source/XYZ";
  import { ref, onMounted, onBeforeUnmount } from "vue";

  const map = ref(null);
  const tk = "你的天地图密钥"; // 替换为自己的密钥

  // 1. 矢量底图（球面墨卡托投影）
  const vecLayer = new Tile({
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
      crossOrigin: "anonymous"
    }),
    zIndex: 1
  });

  // 2. 全球境界图层
  const boundaryLayer = new Tile({
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/ibo_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ibo&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
      crossOrigin: "anonymous"
    }),
    zIndex: 2
  });

  // 3. 矢量注记图层（显示文字标注）
  const labelLayer = new Tile({
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tk}`,
      crossOrigin: "anonymous"
    }),
    zIndex: 10 // 注记层级最高，避免被遮挡
  });

  onMounted(() => {
    map.value = new Map({
      target: "mapView",
      layers: [vecLayer, boundaryLayer, labelLayer],
      view: new View({
        center: [12000000, 3500000],
        zoom: 5
      })
    });
  });

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.setTarget(null);
    }
  });
</script>
```

知识点对应问题：天地图注记图层为什么要单独拆分？使用天地图时出现“权限类型错误”或“网页解析失败”的原因可能有哪些？

## VectorLayer样式机制

VectorLayer本身不自带样式，因为要素（Feature）仅包含几何数据，样式完全由前端控制，且支持多种样式设置方式，可根据业务需求灵活选择。

### 核心样式组成

一个完整的矢量样式（Style）主要包含以下部分，根据几何类型（点、线、面）选择性使用：

- `image`：点要素的图形样式（如圆点、图标），仅对Point/MultiPoint生效
- `stroke`：线要素或面要素的边框样式
- `fill`：面要素或圆点的填充样式
- `text`：文字标注样式，可叠加在所有几何类型上
- `zIndex`：样式的绘制层级，决定要素显示顺序

### 常用样式实操

#### 1. 圆点样式（CircleStyle）

适用于监测点、采样点、事件点等，可通过半径、颜色区分要素级别：

```javascript
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

// 定义圆点样式
const circleStyle = new Style({
  image: new CircleStyle({
    radius: 6, // 圆点半径
    fill: new Fill({ color: "#ff0000" }), // 填充颜色
    stroke: new Stroke({
      color: "#ffffff", // 描边颜色
      width: 1 // 描边宽度
    })
  })
});

// 给单个要素设置样式
pointFeature.setStyle(circleStyle);

// 给整个图层设置统一样式（推荐工程做法）
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: circleStyle
});
```

#### 2. 图标样式（Icon）

适用于车辆、设备、人员等具有明确图标的要素，支持缩放、旋转：

```javascript
import Icon from "ol/style/Icon";

const iconStyle = new Style({
  image: new Icon({
    src: "car.png", // 图标地址
    scale: 0.6, // 缩放比例
    rotation: Math.PI / 4, // 旋转角度（弧度）
    anchor: [0.5, 0.5], // 锚点（中心点）
    opacity: 1 // 透明度
  })
});
```

#### 3. 文字标注样式（Text）

适用于要素名称、数值显示，可设置偏移、描边增强可读性：

```javascript
import Text from "ol/style/Text";

const textStyle = new Style({
  text: new Text({
    text: "监测点A", // 标注内容
    font: "12px sans-serif", // 字体大小和类型
    fill: new Fill({ color: "#000000" }), // 文字颜色
    stroke: new Stroke({ color: "#ffffff", width: 2 }), // 文字描边
    offsetY: -15 // 垂直偏移，避免遮挡要素
  })
});
```

#### 4. 线条样式（Stroke）

适用于轨迹、管线、边界线，可通过线宽、颜色、虚线区分状态：

```javascript
const lineStyle = new Style({
  stroke: new Stroke({
    color: "#12FF9B", // 线颜色
    width: 2, // 线宽
    lineDash: [6, 4], // 虚线样式（6px实线，4px空白）
    lineCap: "round", // 线端样式（圆角）
    lineJoin: "round" // 转角样式（圆角）
  })
});
```

#### 5. 面样式（Fill + Stroke）

适用于区域、范围、影响区，通常使用半透明填充+实线边界：

```javascript
const polygonStyle = new Style({
  fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }), // 半透明填充
  stroke: new Stroke({ color: "#ff0000", width: 2 }) // 实线边界
});
```

### 样式的三种使用方式

#### 1. 图层统一样式

给整个VectorLayer设置固定样式，适用于静态要素、样式一致的图层：

```javascript
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: fixedStyle // 提前定义好的样式
});
```

#### 2. 样式函数（常用进阶）

根据要素的属性动态生成样式，适用于实时数据、数值分级渲染：

```javascript
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: (feature, resolution) => {
    // 根据要素的type属性设置不同样式
    const type = feature.get("type");
    return new Style({
      image: new CircleStyle({
        radius: type === "warning" ? 8 : 4, // 警告类型要素半径更大
        fill: new Fill({
          color: type === "warning" ? "red" : "blue" // 不同类型不同颜色
        })
      })
    });
  }
});
```

#### 3. 交互中动态设置样式

在用户交互（如点击）时，动态修改要素样式，适用于高亮、选中态切换：

```javascript
// 定义默认样式和高亮样式
const defaultStyle = new Style({ ... });
const highlightStyle = new Style({ ... });

let selectedFeature = null;

// 监听地图点击事件
map.value.on("singleclick", (evt) => {
  // 取消上一个选中要素的高亮
  if (selectedFeature) {
    selectedFeature.setStyle(defaultStyle);
    selectedFeature = null;
  }

  // 获取点击位置的要素
  map.value.forEachFeatureAtPixel(evt.pixel, (feature) => {
    selectedFeature = feature;
    feature.setStyle(highlightStyle); // 设置高亮样式
  });
});
```

知识点对应问题：VectorLayer的样式有哪三种使用方式？分别适用于什么场景？如何根据要素属性动态设置样式？

## VectorLayer交互能力

VectorLayer的核心优势的是支持要素级交互，常用交互场景包括点击要素、高亮选中、编辑要素等，其中点击和高亮是开发中最常用的交互效果。

### 点击要素（最常用）

通过监听地图的`singleclick`事件，获取点击位置的要素，进而获取要素属性或执行相关业务逻辑：

```javascript
map.value.on("singleclick", (evt) => {
  // forEachFeatureAtPixel：获取点击位置的所有要素
  map.value.forEachFeatureAtPixel(evt.pixel, (feature) => {
    // 获取要素的所有属性
    const properties = feature.getProperties();
    console.log("点击的要素属性：", properties);
    // 执行业务逻辑，如弹窗显示要素信息
  });
});
```

### 高亮选中（典型模式）

结合点击事件，实现“点击选中、再次点击取消”的高亮效果，需维护一个选中要素的变量：

```javascript
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";

// 定义默认样式和高亮样式
const defaultStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: "blue" })
  })
});

const highlightStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: "red" })
  })
});

let selectedFeature = null;

// 初始化时给所有要素设置默认样式
vectorSource.getFeatures().forEach(feature => {
  feature.setStyle(defaultStyle);
});

// 监听点击事件
map.value.on("singleclick", (evt) => {
  // 取消上一个选中要素的高亮
  if (selectedFeature) {
    selectedFeature.setStyle(defaultStyle);
    selectedFeature = null;
  }

  // 获取点击的要素
  map.value.forEachFeatureAtPixel(evt.pixel, (feature) => {
    selectedFeature = feature;
    feature.setStyle(highlightStyle); // 高亮选中要素
  });
});
```

### 生命周期管理（防内存泄漏）

VectorLayer的生命周期需与组件生命周期同步，避免内存泄漏，核心操作在`onBeforeUnmount`中执行：

```javascript
onBeforeUnmount(() => {
  if (map.value && vectorLayer) {
    // 1. 清空数据源中的所有要素
    vectorSource.clear();
    // 2. 从地图中移除矢量图层
    map.value.removeLayer(vectorLayer);
    // 3. 移除地图容器引用
    map.value.setTarget(null);
  }
});
```

知识点对应问题：如何实现VectorLayer要素的点击高亮？为什么要管理VectorLayer的生命周期？

## 自定义瓦片加载

当使用自定义地图服务（如自己部署的GeoServer服务、QGS服务）时，需要自定义瓦片加载规则，核心是通过`TileWMS`数据源和`tileLoadFunction`自定义加载逻辑（如携带Token权限、自定义请求头）。

### 核心流程

自定义瓦片加载分为5个阶段：创建瓦片网格（TileGrid）→ 创建TileWMS数据源 → 创建Tile图层 → 触发加载 → 自定义加载逻辑执行。

### 完整实操示例

```javascript
import Map from "ol/Map";
import View from "ol/View";
import Tile from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import TileGrid from "ol/tilegrid/TileGrid";
import { ref, onMounted, onBeforeUnmount } from "vue";

const map = ref(null);
const baseURL = "你的后端地图服务地址";
const props = { qgsMapPath: "你的QGS工程路径", tifMapPath: "你的TIF地图路径" };

// 创建自定义瓦片图层（QGS服务）
const createCustomTileLayer = () => {
  // 1. 创建自定义瓦片网格（TileGrid），定义瓦片规则
  const customTileGrid = new TileGrid({
    tileSize: 1024, // 瓦片大小（根据服务端配置调整）
    origin: [-180, 90], // 瓦片网格原点（EPSG:4326常用值）
    resolutions: [
      0.703125, // 缩放级别0对应的分辨率（度/像素）
      0.3515625, // 缩放级别1
      0.17578125 // 缩放级别2，可根据实际需求扩展
    ]
  });

  // 2. 获取权限Token（从本地存储或接口获取）
  const token = JSON.parse(localStorage.getItem("leiyangUser"))?.token;

  // 3. 创建TileWMS数据源，配置服务请求参数
  const customSource = new TileWMS({
    url: `${baseURL}/map/getmap`, // 后端地图服务地址
    params: {
      SERVICE: "WMS", // 服务类型
      VERSION: "1.1.0", // 服务版本
      REQUEST: "GetMap", // 请求类型
      Map: props.qgsMapPath, // 业务参数（QGS工程路径）
      LAYERS: props.tifMapPath, // 业务参数（TIF地图路径）
      FORMAT: "image/png", // 图片格式
      CRS: "EPSG:4326", // 坐标系
      language: "zh-CN" // 自定义业务参数
    },
    tileGrid: customTileGrid, // 绑定自定义瓦片网格
    serverType: "geoserver", // 服务端类型（如geoserver）

    // 4. 自定义瓦片加载函数（核心），接管默认加载逻辑
    tileLoadFunction: function (imageTile, src) {
      // src：自动生成的瓦片请求URL
      fetch(src, {
        headers: {
          Token: `${token}` // 携带权限Token，解决接口权限问题
        }
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("瓦片加载失败");
          }
          return response.blob(); // 将响应转为二进制 blob
        })
        .then((blob) => {
          // 将blob转为浏览器可识别的图片URL
          const objectUrl = URL.createObjectURL(blob);
          // 将图片URL赋值给瓦片对象，完成加载
          imageTile.getImage().src = objectUrl;
        })
        .catch((err) => {
          console.error("Tile loading error:", err);
        });
    }
  });

  // 5. 创建Tile图层，返回给地图使用
  return new Tile({
    zIndex: 2,
    source: customSource,
    minZoom: 0, // 最小缩放级别
    maxZoom: 12 // 最大缩放级别
  });
};

onMounted(() => {
  const customLayer = createCustomTileLayer();
  map.value = new Map({
    target: "mapView",
    layers: [customLayer],
    view: new View({
      center: [120, 30], // EPSG:4326坐标系坐标
      zoom: 1,
      projection: "EPSG:4326"
    })
  });
});

onBeforeUnmount(() => {
  if (map.value) {
    map.value.setTarget(null);
  }
});
```

### 关键知识点解析

- `TileGrid`：定义瓦片的切割规则，包括瓦片大小、原点、分辨率，必须与服务端配置一致，否则瓦片会错位。
- `tileLoadFunction`：自定义加载逻辑的核心，默认加载逻辑是`img.src = src`，无法携带自定义请求头，通过`fetch`可实现携带Token、自定义Header等需求。
- 服务端逻辑：后端收到瓦片请求后，会校验Token权限、解析请求参数，根据BBOX（瓦片地理范围）、宽高从源数据（TIF/数据库）中裁剪并渲染成PNG，返回给前端。

为什么必须使用Blob？

`Blob`（Binary Large Object）是浏览器中用于表示**不可变二进制数据**的对象。

因为瓦片图片具备以下特性：

- 是二进制数据（`PNG`/`JPEG`格式）
- 不是 `JSON` 格式
- 不是文本格式

因此，你不能使用以下方式解析（会报错或破坏数据）：

```javascript
r.json()  // 错误，无法解析二进制图片
r.text()  // 错误，会破坏图片二进制数据
```

必须使用以下方式获取瓦片原始数据：

```javascript
r.blob()
```

`URL.createObjectURL(blob)`：生成临时资源地址

```javascript
const objectUrl = URL.createObjectURL(blob);
```

OpenLayers 默认的 `tileLoadFunction` 仅实现基础的图片地址赋值，完全依赖浏览器原生加载机制，无法注入自定义请求头，因此在需要 Token 鉴权或安全控制的场景下，通常需要重写该函数。

```javascript
function defaultTileLoadFunction(imageTile, src) {
  imageTile.getImage().src = src;
}
```

**Blob（Binary Large Object）** 是浏览器中用于表示**不可变二进制数据**的对象。

因为瓦片图片：

- 是二进制数据（PNG / JPEG）
- 不是 JSON
- 不是文本

你不能：

```JavaScript
r.json()  // 错误
r.text()  // 会破坏图片数据
必须使用：
r.blob()
```

`URL.createObjectURL(blob)`：生成临时资源地址

 const objectUrl = URL.createObjectURL(blob);

OpenLayers 默认的 `tileLoadFunction` 只是将瓦片 URL 直接赋值给图片元素，完全依赖浏览器加载机制，无法注入自定义请求头，因此在需要 Token 鉴权或安全控制的场景下通常需要重写该函数。

```JavaScript
 function defaultTileLoadFunction(imageTile, src) {
    imageTile.getImage().src = src;
}
```

知识点对应问题：自定义瓦片加载的核心是什么？`tileLoadFunction`的作用是什么？为什么需要自定义瓦片加载？

## 地图绘制内容

OpenLayers中，矢量图层的绘制本质是“几何 + 样式 + 属性”的组合，常见可绘制内容分为点、线、面三大类，所有复杂绘制都是基于这三类几何的扩展。

### 核心几何类型

#### 1. 点（Point / MultiPoint）

表示单一空间位置，由一个坐标对`[x, y]`定义，可附带任意属性，适用于监测点、设备位置、事件点等。

```javascript
import Point from "ol/geom/Point";
import Feature from "ol/Feature";

// 单个点要素（EPSG:3857坐标系）
const singlePoint = new Feature({
  geometry: new Point([12000000, 3500000]),
  name: "监测点A",
  value: 25 // 自定义属性
});

// 多个点（MultiPoint）
import MultiPoint from "ol/geom/MultiPoint";
const multiPoint = new Feature({
  geometry: new MultiPoint([
    [12000000, 3500000],
    [12100000, 3600000],
    [12200000, 3550000]
  ]),
  type: "multiple"
});
```

#### 2. 线（LineString / MultiLineString）

表示由多个点按顺序连接形成的路径，至少包含两个坐标点，适用于轨迹、管线、边界线等，可分段绘制（每两个相邻点生成一段线）。

```javascript
import LineString from "ol/geom/LineString";
import Feature from "ol/Feature";

// 单条线要素
const singleLine = new Feature({
  geometry: new LineString([
    [12000000, 3500000],
    [12100000, 3600000],
    [12200000, 3550000]
  ]),
  name: "运输轨迹",
  speed: 60
});

// 多条线（MultiLineString）
import MultiLineString from "ol/geom/MultiLineString";
const multiLine = new Feature({
  geometry: new MultiLineString([
    [[12000000, 3500000], [12100000, 3600000]],
    [[12100000, 3600000], [12200000, 3550000]]
  ]),
  type: "pipe"
});

// 分段绘制线（适合实时轨迹回放）
const drawLineBySegment = (points) => {
  const features = [];
  for (let i = 0; i < points.length - 1; i++) {
    const lineFeature = new Feature({
      geometry: new LineString([points[i], points[i+1]])
    });
    features.push(lineFeature);
  }
  return features;
};
```

#### 3. 面（Polygon / MultiPolygon）

表示由闭合线围成的区域，必须保证起点和终点坐标一致（闭合），适用于区域、范围、影响区、行政区等。

```javascript
import Polygon from "ol/geom/Polygon";
import Feature from "ol/Feature";

// 单个面要素（闭合）
const singlePolygon = new Feature({
  geometry: new Polygon([[
    [12000000, 3500000],
    [12100000, 3500000],
    [12100000, 3600000],
    [12000000, 3600000],
    [12000000, 3500000] // 起点和终点一致，确保闭合
  ]]),
  name: "管控区域",
  level: "high"
});

// 多个面（MultiPolygon）
import MultiPolygon from "ol/geom/MultiPolygon";
const multiPolygon = new Feature({
  geometry: new MultiPolygon([
    [[
      [12000000, 3500000],
      [12100000, 3500000],
      [12100000, 3600000],
      [12000000, 3600000],
      [12000000, 3500000]
    ]],
    [[
      [12200000, 3550000],
      [12300000, 3550000],
      [12300000, 3650000],
      [12200000, 3650000],
      [12200000, 3550000]
    ]]
  ]),
  type: "multipleArea"
});
```

### 关键注意事项

- OpenLayers默认坐标系是`EPSG:3857`，若使用`EPSG:4326`（经纬度），需在View中明确设置`projection: "EPSG:4326"`，否则坐标会错位。
- 面要素必须闭合，否则无法正常渲染填充样式。
- 复杂绘制（如动态轨迹、多边形编辑）本质是对Feature的几何数据进行实时修改，再重新渲染样式。

知识点对应问题：OpenLayers中常用的几何类型有哪三种？各自适用于什么场景？面要素为什么必须闭合？
