/* eslint-env jest, node */
import fs from "fs";
import path from "path";
import { parseComponent } from "vue-template-compiler";

function loadComponentAt(componentPath, dependencies = {}) {
  const source = fs.readFileSync(componentPath, "utf-8");
  const script = parseComponent(source).script.content;
  const factorySource = script
    .replace(/import\s+["'][^"']+["'];\s*/g, "")
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];\s*/g, "")
    .replace(/^\/\* global Cesium \*\/\s*/m, "")
    .replace("export default", "return");
  const names = Object.keys(dependencies);

  return new Function(...names, factorySource)(...names.map((name) => dependencies[name]));
}

function loadComponent(fileName, dependencies = {}) {
  return loadComponentAt(
    path.resolve(
      __dirname,
      `../../src/views/DataVisualization/components/${fileName}`,
    ),
    dependencies,
  );
}

class FakeFeature {
  constructor(properties = {}) {
    this.properties = { ...properties };
    this.id = undefined;
    this.style = null;
  }

  setId(id) {
    this.id = id;
  }

  getId() {
    return this.id;
  }

  get(key) {
    return this.properties[key];
  }

  setStyle(style) {
    this.style = style;
  }

  getStyle() {
    return this.style;
  }

  setGeometry(geometry) {
    this.properties.geometry = geometry;
  }
}

class FakeVectorSource {
  constructor() {
    this.features = [];
    this.featureIds = new Set();
  }

  addFeature(feature) {
    const id = feature.getId && feature.getId();
    if (id !== undefined && id !== null) {
      const key = String(id);
      if (this.featureIds.has(key)) {
        return;
      }
      this.featureIds.add(key);
    }
    this.features.push(feature);
  }

  clear() {
    this.features = [];
    this.featureIds.clear();
  }

  getFeatures() {
    return this.features;
  }

  removeFeature(feature) {
    this.features = this.features.filter((item) => item !== feature);
  }

  getFeatureById(id) {
    if (id === undefined || id === null) {
      throw new Error("feature id is required");
    }
    return this.features.find(
      (feature) => String(feature.getId()) === String(id),
    );
  }
}

class FakePoint {
  constructor(coordinates) {
    this.coordinates = coordinates;
  }
}

class FakeLineString {
  constructor(coordinates) {
    this.coordinates = coordinates;
  }
}

function loadPlanimetricComponent() {
  return loadComponent("PlanimetricMap.vue", {
    Map: class {},
    View: class {},
    TileLayer: class {},
    VectorLayer: class {},
    XYZ: class {},
    OSM: class {},
    VectorSource: FakeVectorSource,
    Feature: FakeFeature,
    Point: FakePoint,
    LineString: FakeLineString,
    defaultControls: jest.fn(),
    unByKey: jest.fn(),
    transform: jest.fn((lonlat) => [lonlat[0] * 1000, lonlat[1] * 1000]),
    Style: class {},
    Icon: class {},
    Fill: class {},
    Stroke: class {},
    CircleStyle: class {},
    iconSrc: "",
  });
}

function bindOptionalMapHelpers(component, vm) {
  [
    "buildFeatureId",
    "hasValidGeoLocation",
    "drawRouteSegment",
    "drawRouteSegments",
    "drawRealtimePoint",
    "pruneRealtimeLayers",
    "removeTC",
    "redrawRealtimeWindow",
    "drawHistoryPoints",
    "redrawConcentrationByGas",
    "createCircle",
    "handleMapClick",
    "to3857",
    "getColor",
  ].forEach((methodName) => {
    if (component.methods[methodName]) {
      vm[methodName] = component.methods[methodName].bind(vm);
    }
  });
}

function createPlanimetricVm(component, overrides = {}) {
  const view = { setCenter: jest.fn() };
  const pointSource = new FakeVectorSource();
  const routeSource = new FakeVectorSource();
  const iconSource = new FakeVectorSource();
  const map = {
    updateSize: jest.fn(),
    getView: jest.fn(() => view),
    forEachFeatureAtPixel: jest.fn(),
  };
  const vm = {
    map,
    pointSource,
    routeSource,
    iconSource,
    iconLayer: { getSource: jest.fn(() => iconSource) },
    iconFeature: null,
    timer: null,
    points: [],
    index: 0,
    gasRange: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
    gasType: "pri_ch4",
    viewFollow: true,
    colorList: ["#00FF44", "#FCFF63", "#FF7B10", "#F90000", "#9900FF", "#ADADAD"],
    $parent: {
      viewFlag: true,
      gasName: "CH4",
    },
    $emit: jest.fn(),
    getCurrentGasRange: jest.fn(() => [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ]),
    ensureOrUpdateCar: jest.fn(),
    ...overrides,
  };
  bindOptionalMapHelpers(component, vm);
  return { vm, map, view, pointSource, routeSource, iconSource };
}

function createRealtimeWindow(latestPoint) {
  const points = Array.from({ length: 300 }, (_, index) => ({
    geo_location: [104 + index * 0.0001, 28 + index * 0.0001],
    pri_ch4: 1.5,
    time: `2026-07-20 12:${String(index % 60).padStart(2, "0")}:00`,
  }));
  points[298] = {
    geo_location: [104.1, 28.1],
    pri_ch4: 1.5,
    time: "2026-07-20 12:58:00",
  };
  points[299] = latestPoint;
  return points;
}

describe("map lifecycle ownership", () => {
  test("OpenLayers click listener is registered once and released on destroy", () => {
    const unByKey = jest.fn();
    const component = loadComponent("PlanimetricMap.vue", {
      Map: class {},
      View: class {},
      TileLayer: class {},
      VectorLayer: class {},
      XYZ: class {},
      VectorSource: class {},
      Feature: class {},
      Point: class {},
      LineString: class {},
      defaultControls: jest.fn(),
      unByKey,
      transform: jest.fn(),
      Style: class {},
      Icon: class {},
      Fill: class {},
      Stroke: class {},
      CircleStyle: class {},
      iconSrc: "",
    });
    const key = {};
    const map = { on: jest.fn(() => key), setTarget: jest.fn() };
    const vm = {
      mapClickKey: null,
      mapClickHandler: null,
      map,
      timer: null,
      handleMapClick: jest.fn(),
    };

    component.methods.bindClickEvent.call(vm);
    component.methods.bindClickEvent.call(vm);

    expect(map.on).toHaveBeenCalledTimes(1);
    expect(vm.mapClickHandler).toBe(map.on.mock.calls[0][1]);

    component.beforeDestroy.call(vm);

    expect(unByKey).toHaveBeenCalledWith(key);
    expect(map.setTarget).toHaveBeenCalledWith(null);
  });

  test("OpenLayers uses a global road-map fallback outside China", () => {
    const TileLayer = jest.fn();
    const XYZ = jest.fn();
    const OSM = jest.fn();
    const View = jest.fn();
    const component = loadComponent("PlanimetricMap.vue", {
      Map: jest.fn(),
      View,
      TileLayer,
      VectorLayer: class {},
      XYZ,
      OSM,
      VectorSource: class {},
      Feature: class {},
      Point: class {},
      LineString: class {},
      defaultControls: jest.fn(),
      unByKey: jest.fn(),
      transform: jest.fn(),
      Style: class {},
      Icon: class {},
      Fill: class {},
      Stroke: class {},
      CircleStyle: class {},
      iconSrc: "",
    });
    const vm = {
      map: null,
      to3857: jest.fn(() => []),
      getMapToken: component.methods.getMapToken,
      initIconLayer: jest.fn(),
      initRouteLayer: jest.fn(),
      initPointLayer: jest.fn(),
    };
    const originalToken = process.env.VUE_APP_TDT_TOKEN;
    const originalLegacyToken = process.env.VUE_APP_TIANDITU_TOKEN;

    try {
      delete process.env.VUE_APP_TDT_TOKEN;
      delete process.env.VUE_APP_TIANDITU_TOKEN;
      component.methods.initMap.call(vm);
      expect(XYZ).toHaveBeenCalledTimes(1);
      expect(XYZ).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
          maxZoom: 20,
        }),
      );
      expect(View).toHaveBeenLastCalledWith(
        expect.objectContaining({
          zoom: 21,
          maxZoom: expect.closeTo(20 / Math.log2(1.6), 5),
        }),
      );
      expect(OSM).not.toHaveBeenCalled();
      expect(TileLayer).toHaveBeenCalledTimes(1);

      XYZ.mockClear();
      OSM.mockClear();
      TileLayer.mockClear();
      View.mockClear();
      process.env.VUE_APP_TDT_TOKEN = "test-map-token";
      component.methods.initMap.call(vm);

      expect(XYZ).toHaveBeenCalledTimes(2);
      expect(XYZ.mock.calls.map(([options]) => options.url)).toEqual([
        expect.stringMatching(
          /^https:\/\/t0\.tianditu\.gov\.cn\/.*&tk=test-map-token$/,
        ),
        expect.stringMatching(
          /^https:\/\/t0\.tianditu\.gov\.cn\/.*&tk=test-map-token$/,
        ),
      ]);
      expect(XYZ.mock.calls.every(([options]) => options.maxZoom === 18)).toBe(
        true,
      );
      expect(View).toHaveBeenLastCalledWith(
        expect.objectContaining({
          zoom: 21,
          maxZoom: expect.closeTo(18 / Math.log2(1.6), 5),
        }),
      );
      expect(TileLayer).toHaveBeenCalledTimes(2);
      expect(OSM).not.toHaveBeenCalled();

      XYZ.mockClear();
      TileLayer.mockClear();
      delete process.env.VUE_APP_TDT_TOKEN;
      process.env.VUE_APP_TIANDITU_TOKEN = "legacy-map-token";
      component.methods.initMap.call(vm);

      expect(XYZ).toHaveBeenCalledTimes(2);
      expect(XYZ.mock.calls.map(([options]) => options.url)).toEqual([
        expect.stringMatching(
          /^https:\/\/t0\.tianditu\.gov\.cn\/.*&tk=legacy-map-token$/,
        ),
        expect.stringMatching(
          /^https:\/\/t0\.tianditu\.gov\.cn\/.*&tk=legacy-map-token$/,
        ),
      ]);
    } finally {
      if (originalToken === undefined) {
        delete process.env.VUE_APP_TDT_TOKEN;
      } else {
        process.env.VUE_APP_TDT_TOKEN = originalToken;
      }
      if (originalLegacyToken === undefined) {
        delete process.env.VUE_APP_TIANDITU_TOKEN;
      } else {
        process.env.VUE_APP_TIANDITU_TOKEN = originalLegacyToken;
      }
    }
  });

  test("2D vehicle layer stays above route and concentration layers", () => {
    const VectorLayer = jest.fn((options) => options);
    const component = loadComponent("PlanimetricMap.vue", {
      Map: class {},
      View: class {},
      TileLayer: class {},
      VectorLayer,
      XYZ: class {},
      VectorSource: FakeVectorSource,
      Feature: FakeFeature,
      Point: FakePoint,
      LineString: FakeLineString,
      defaultControls: jest.fn(),
      unByKey: jest.fn(),
      transform: jest.fn(),
      Style: class {},
      Icon: class {},
      Fill: class {},
      Stroke: class {},
      CircleStyle: class {},
      iconSrc: "",
    });
    const vm = {
      map: { addLayer: jest.fn() },
      iconSource: null,
      iconLayer: null,
    };

    component.methods.initIconLayer.call(vm);

    expect(vm.iconLayer.zIndex).toBeGreaterThan(1006);
    expect(vm.map.addLayer).toHaveBeenCalledWith(vm.iconLayer);
  });

  test("2D vehicle uses the original image without the broken color tint", () => {
    const Icon = jest.fn((options) => options);
    const Style = jest.fn((options) => options);
    const component = loadComponent("PlanimetricMap.vue", {
      Map: class {},
      View: class {},
      TileLayer: class {},
      VectorLayer: class {},
      XYZ: class {},
      VectorSource: FakeVectorSource,
      Feature: FakeFeature,
      Point: FakePoint,
      LineString: FakeLineString,
      defaultControls: jest.fn(),
      unByKey: jest.fn(),
      transform: jest.fn(),
      Style,
      Icon,
      Fill: class {},
      Stroke: class {},
      CircleStyle: class {},
      iconSrc: "truck.png",
    });
    const vm = {
      iconSource: new FakeVectorSource(),
      iconFeature: null,
    };

    component.methods.ensureOrUpdateCar.call(vm, [100, 200]);

    expect(Icon).toHaveBeenCalledWith({
      crossOrigin: "anonymous",
      src: "truck.png",
      opacity: 1,
      scale: 0.6,
    });
    expect(Style).toHaveBeenCalledWith(
      expect.objectContaining({ zIndex: 2000 }),
    );
  });

  test("2D realtime map keeps drawing concentration points when the data window stays at 300 points", () => {
    const component = loadPlanimetricComponent();
    const { vm, pointSource } = createPlanimetricVm(component);

    vm.points = createRealtimeWindow({
      geo_location: [104.2, 28.2],
      pri_ch4: 1.5,
      time: "2026-07-20 13:00:00",
    });
    vm.index = 299;
    component.methods.drawRealtimePoint.call(vm);

    vm.points = createRealtimeWindow({
      geo_location: [104.3, 28.3],
      pri_ch4: 1.8,
      time: "2026-07-20 13:00:01",
    });
    vm.index = 299;
    component.methods.drawRealtimePoint.call(vm);

    expect(pointSource.getFeatures()).toHaveLength(2);
    expect(
      new Set(pointSource.getFeatures().map((feature) => feature.getId())).size,
    ).toBe(2);
  });

  test("2D realtime map refreshes size, follows the latest point, and draws route segments", () => {
    const component = loadPlanimetricComponent();
    const { vm, map, view, routeSource } = createPlanimetricVm(component);

    vm.points = [
      {
        geo_location: [104.1, 28.1],
        pri_ch4: 1.5,
        time: "2026-07-20 13:00:00",
      },
      {
        geo_location: [104.2, 28.2],
        pri_ch4: 1.8,
        time: "2026-07-20 13:00:01",
      },
    ];
    vm.index = 1;

    component.methods.drawRealtimePoint.call(vm);

    expect(map.updateSize).toHaveBeenCalledTimes(1);
    expect(view.setCenter).toHaveBeenCalledWith([104200, 28200]);
    expect(routeSource.getFeatures()).toHaveLength(1);
  });

  test("2D realtime map preserves the current camera when follow is disabled", () => {
    const component = loadPlanimetricComponent();
    const { vm, map, view } = createPlanimetricVm(component, {
      $parent: {
        viewFlag: false,
        gasName: "CH4",
      },
    });
    vm.points = [
      {
        geo_location: [104.1, 28.1],
        pri_ch4: 1.5,
        time: "2026-07-20 13:00:00",
      },
      {
        geo_location: [104.2, 28.2],
        pri_ch4: 1.8,
        time: "2026-07-20 13:00:01",
      },
    ];
    vm.index = 1;

    component.methods.drawRealtimePoint.call(vm);

    expect(map.updateSize).not.toHaveBeenCalled();
    expect(view.setCenter).not.toHaveBeenCalled();
  });

  test("hidden 2D map defers realtime drawing until it becomes active", () => {
    const component = loadPlanimetricComponent();
    const drawRealtimePoint = jest.fn();
    const vm = {
      $parent: { mapType: 2 },
      points: [],
      index: 0,
      dataForm: {},
      drawRealtimePoint,
    };

    component.watch.mapList.handler.call(vm, [
      { geo_location: [104.2, 28.2] },
    ]);

    expect(drawRealtimePoint).not.toHaveBeenCalled();
  });

  test("2D follow mode immediately centers the latest point when enabled", () => {
    const component = loadPlanimetricComponent();
    const { vm, map, view } = createPlanimetricVm(component, {
      viewFollow: false,
      points: [
        {
          geo_location: [104.4, 28.4],
          pri_ch4: 1.8,
          time: "2026-07-20 13:00:01",
        },
      ],
      index: 0,
    });

    expect(component.methods.setFollowMode).toEqual(expect.any(Function));
    component.methods.setFollowMode.call(vm, true);

    expect(map.updateSize).toHaveBeenCalledTimes(1);
    expect(view.setCenter).toHaveBeenCalledWith([104400, 28400]);
  });

  test("2D history concentration rendering also draws the route line", () => {
    const component = loadPlanimetricComponent();
    const { vm, pointSource, routeSource } = createPlanimetricVm(component);

    component.methods.createCircle.call(vm, [
      {
        geo_location: [104.1, 28.1],
        pri_ch4: 1.5,
        time: "2026-07-20 13:00:00",
      },
      {
        geo_location: [104.2, 28.2],
        pri_ch4: 1.8,
        time: "2026-07-20 13:00:01",
      },
      {
        geo_location: [104.3, 28.3],
        pri_ch4: 2.8,
        time: "2026-07-20 13:00:02",
      },
    ]);

    expect(pointSource.getFeatures()).toHaveLength(3);
    expect(routeSource.getFeatures()).toHaveLength(2);
  });

  test("2D concentration redraw clears previous gas colors when selected gas changes", () => {
    const component = loadPlanimetricComponent();
    const { vm, pointSource } = createPlanimetricVm(component);
    const points = [
      {
        geo_location: [104.1, 28.1],
        pri_ch4: 1.5,
        pri_co2: 4.5,
        time: "2026-07-20 13:00:00",
      },
      {
        geo_location: [104.2, 28.2],
        pri_ch4: 1.8,
        pri_co2: 4.8,
        time: "2026-07-20 13:00:01",
      },
    ];

    component.methods.drawHistoryPoints.call(vm, points);
    expect(pointSource.getFeatures().map((feature) => feature.get("color"))).toEqual([
      "#FCFF63",
      "#FCFF63",
    ]);

    component.methods.redrawConcentrationByGas.call(
      vm,
      "pri_co2",
      "CO2",
      points,
    );

    expect(pointSource.getFeatures()).toHaveLength(2);
    expect(pointSource.getFeatures().map((feature) => feature.get("color"))).toEqual([
      "#9900FF",
      "#9900FF",
    ]);
  });

  test("2D realtime window redraw paints all latest five-minute points and route", () => {
    const component = loadPlanimetricComponent();
    const { vm, map, view, pointSource, routeSource } =
      createPlanimetricVm(component);
    const stalePoint = new FakeFeature({ Type: "数据点" });
    stalePoint.setId("stale-point");
    pointSource.addFeature(stalePoint);
    routeSource.addFeature(new FakeFeature({ type: "LineString" }));
    const points = [
      {
        geo_location: [104.1, 28.1],
        pri_ch4: 1.5,
        time: "2026-07-20 13:00:00",
      },
      {
        geo_location: [104.2, 28.2],
        pri_ch4: 1.8,
        time: "2026-07-20 13:00:01",
      },
      {
        geo_location: [104.3, 28.3],
        pri_ch4: 2.8,
        time: "2026-07-20 13:00:02",
      },
    ];

    component.methods.redrawRealtimeWindow.call(vm, "pri_ch4", "CH4", points);

    expect(vm.points).toBe(points);
    expect(vm.index).toBe(2);
    expect(pointSource.getFeatures()).toHaveLength(3);
    expect(pointSource.getFeatures().map((feature) => feature.get("data"))).toEqual(
      points,
    );
    expect(routeSource.getFeatures()).toHaveLength(2);
    expect(map.updateSize).toHaveBeenCalledTimes(1);
    expect(view.setCenter).toHaveBeenCalledWith([104300, 28300]);
    expect(vm.ensureOrUpdateCar).toHaveBeenCalledWith([104300, 28300]);
  });

  test("2D map click ignores route and vehicle features instead of querying an undefined point id", () => {
    const component = loadPlanimetricComponent();
    const lineFeature = new FakeFeature({ type: "LineString" });
    const { vm, map, pointSource } = createPlanimetricVm(component);
    pointSource.getFeatureById = jest.fn(() => {
      throw new Error("should not query non-point feature");
    });
    map.forEachFeatureAtPixel.mockReturnValue(lineFeature);

    expect(() =>
      component.methods.handleMapClick.call(vm, { pixel: [10, 10] }),
    ).not.toThrow();
    expect(pointSource.getFeatureById).not.toHaveBeenCalled();
  });

  test("2D realtime layers keep a bounded 300-point window", () => {
    const component = loadPlanimetricComponent();
    const { vm, pointSource, routeSource } = createPlanimetricVm(component);
    Array.from({ length: 305 }, (_, index) => {
      const point = new FakeFeature();
      point.setId(`point-${index}`);
      pointSource.addFeature(point);
      const route = new FakeFeature();
      route.setId(`route-${index}`);
      routeSource.addFeature(route);
    });

    component.methods.pruneRealtimeLayers.call(vm, 300);

    expect(pointSource.getFeatures()).toHaveLength(300);
    expect(routeSource.getFeatures()).toHaveLength(299);
    expect(pointSource.getFeatures()[0].getId()).toBe("point-5");
  });

  test("Cesium realtime entities evict the oldest concentration bar", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const removeById = jest.fn();
    const vm = {
      realtimeEntityIds: Array.from({ length: 300 }, (_, index) => `bar-${index}`),
      viewer: { entities: { removeById } },
    };

    component.methods.trackRealtimeEntity.call(vm, "bar-300");

    expect(vm.realtimeEntityIds).toHaveLength(300);
    expect(vm.realtimeEntityIds[0]).toBe("bar-1");
    expect(removeById).toHaveBeenCalledWith("bar-0");
  });

  test("Cesium builds initial realtime bars in fixed slots without moving the camera", () => {
    const fromDegrees = jest.fn((longitude, latitude, height) => ({
      longitude,
      latitude,
      height,
    }));
    class Cartesian3 {
      static fromDegrees = fromDegrees;

      constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    }
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        Cartesian3,
        Color: {
          fromCssColorString: jest.fn(() => ({
            withAlpha: jest.fn(() => "bar-color"),
          })),
          WHITE: "white",
        },
        HeightReference: { CLAMP_TO_GROUND: "ground" },
        Math: { toRadians: jest.fn((value) => value) },
      },
    });
    const entities = {
      values: [],
      getById: jest.fn(() => undefined),
      add: jest.fn(),
    };
    const vm = {
      viewer: {
        entities,
        flyTo: jest.fn(),
      },
      gasType: "pri_ch4",
      realtimeBarCursor: 0,
      isViewerReady: jest.fn(() => true),
      getColor: jest.fn(() => ({ color: "#00FF44", height: 40 })),
      upsertRealtimeBar: jest.fn(),
      trackRealtimeEntity: jest.fn(),
      requestRender: jest.fn(),
    };
    const points = [
      {
        time: "2026-08-23 08:00:00",
        longitude: 104.1,
        latitude: 28.1,
        pri_ch4: 1.8,
      },
      {
        time: "2026-08-23 08:00:01",
        longitude: 104.2,
        latitude: 28.2,
        pri_ch4: 1.9,
      },
    ];

    component.methods.moveBar.call(vm, points);

    expect(vm.viewer.flyTo).not.toHaveBeenCalled();
    expect(vm.upsertRealtimeBar).toHaveBeenNthCalledWith(
      1,
      points[0],
      0,
    );
    expect(vm.upsertRealtimeBar).toHaveBeenNthCalledWith(
      2,
      points[1],
      1,
    );
    expect(vm.realtimeBarCursor).toBe(2);
  });

  test("Cesium reuses a fixed realtime bar slot instead of replacing entities", () => {
    const fromDegrees = jest.fn((longitude, latitude, height) => ({
      longitude,
      latitude,
      height,
    }));
    class Cartesian3 {
      static fromDegrees = fromDegrees;

      constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    }
    const material = { name: "bar-color" };
    const existing = Object.freeze({
      position: "position-callback",
      box: Object.freeze({
        dimensions: "dimensions-callback",
        material: "material-property",
        heightReference: "none",
      }),
    });
    const state = {
      position: null,
      dimensions: null,
      color: null,
    };
    const entities = {
      getById: jest.fn(() => existing),
      add: jest.fn(),
      removeById: jest.fn(),
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        Cartesian3,
        Color: {
          fromCssColorString: jest.fn(() => ({
            withAlpha: jest.fn(() => material),
          })),
          WHITE: "white",
        },
        HeightReference: {
          NONE: "none",
          CLAMP_TO_GROUND: "ground",
        },
      },
    });
    const vm = {
      viewer: { entities },
      realtimeBarStates: [state],
      getColor: jest.fn(() => ({ color: "#00FF44", height: 60 })),
    };

    expect(component.methods.upsertRealtimeBar).toEqual(expect.any(Function));
    component.methods.upsertRealtimeBar.call(
      vm,
      {
        longitude: 104.1,
        latitude: 28.1,
        pri_ch4: 1.8,
      },
      0,
      "pri_ch4",
    );

    expect(entities.getById).toHaveBeenCalledWith("realtime-bar-0");
    expect(entities.add).not.toHaveBeenCalled();
    expect(entities.removeById).not.toHaveBeenCalled();
    expect(fromDegrees).toHaveBeenCalledWith(104.1, 28.1, 30);
    expect(state.position).toEqual({
      longitude: 104.1,
      latitude: 28.1,
      height: 30,
    });
    expect(state.dimensions).toEqual({ x: 6, y: 6, z: 60 });
    expect(state.color).toBe(material);
    expect(existing.position).toBe("position-callback");
    expect(existing.box.dimensions).toBe("dimensions-callback");
    expect(existing.box.material).toBe("material-property");
  });

  test("Cesium creates realtime bars with dynamic properties", () => {
    const CallbackProperty = jest.fn((callback, isConstant) => ({
      callback,
      isConstant,
    }));
    const ColorMaterialProperty = jest.fn((color) => ({ color }));
    class Cartesian3 {
      static fromDegrees = jest.fn((longitude, latitude, height) => ({
        longitude,
        latitude,
        height,
      }));

      constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    }
    const entities = {
      getById: jest.fn(() => undefined),
      add: jest.fn(),
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        CallbackProperty,
        Cartesian3,
        ColorMaterialProperty,
        Color: {
          fromCssColorString: jest.fn(() => ({
            withAlpha: jest.fn(() => "bar-color"),
          })),
          WHITE: "white",
        },
        HeightReference: { NONE: "none" },
      },
    });
    const vm = {
      viewer: { entities },
      realtimeBarStates: [],
      getColor: jest.fn(() => ({ color: "#00FF44", height: 60 })),
      trackRealtimeEntity: jest.fn(),
    };

    component.methods.upsertRealtimeBar.call(
      vm,
      {
        longitude: 104.1,
        latitude: 28.1,
        pri_ch4: 1.8,
      },
      0,
      "pri_ch4",
    );

    expect(CallbackProperty).toHaveBeenCalledTimes(3);
    expect(ColorMaterialProperty).toHaveBeenCalledTimes(1);
    expect(entities.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "realtime-bar-0",
        position: expect.objectContaining({ isConstant: false }),
        box: expect.objectContaining({
          dimensions: expect.objectContaining({ isConstant: false }),
          material: expect.objectContaining({
            color: expect.objectContaining({ isConstant: false }),
          }),
          heightReference: "none",
        }),
      }),
    );
    expect(vm.trackRealtimeEntity).toHaveBeenCalledWith("realtime-bar-0");
  });

  test("Cesium keeps the vehicle visible by hiding only the current bar", () => {
    const previousBar = { show: false };
    const currentBar = { show: true };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const vm = {
      latestRealtimeBarId: "realtime-bar-4",
      viewer: {
        entities: {
          getById: jest.fn((id) => {
            if (id === "realtime-bar-4") return previousBar;
            if (id === "realtime-bar-5") return currentBar;
            return undefined;
          }),
        },
      },
    };

    expect(component.methods.setLatestRealtimeBar).toEqual(
      expect.any(Function),
    );
    component.methods.setLatestRealtimeBar.call(vm, "realtime-bar-5");

    expect(previousBar.show).toBe(true);
    expect(currentBar.show).toBe(false);
    expect(vm.latestRealtimeBarId).toBe("realtime-bar-5");
  });

  test("Cesium uses global road tiles that stay visible over the ocean", () => {
    const OpenStreetMapImageryProvider = jest.fn((options) => ({
      type: "osm",
      options,
    }));
    const UrlTemplateImageryProvider = jest.fn((options) => ({
      type: "url-template",
      options,
    }));
    const WebMapTileServiceImageryProvider = jest.fn((options) => ({
      type: "wmts",
      options,
    }));
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        OpenStreetMapImageryProvider,
        UrlTemplateImageryProvider,
        WebMapTileServiceImageryProvider,
        GeographicTilingScheme: jest.fn(),
      },
    });

    expect(component.methods.createBaseImageryProvider).toEqual(
      expect.any(Function),
    );
    expect(
      component.methods.createBaseImageryProvider.call({}, ""),
    ).toMatchObject({
      type: "url-template",
      options: {
        url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        maximumLevel: 20,
      },
    });
    expect(UrlTemplateImageryProvider).toHaveBeenCalledTimes(1);
    expect(OpenStreetMapImageryProvider).not.toHaveBeenCalled();
    expect(WebMapTileServiceImageryProvider).not.toHaveBeenCalled();
  });

  test("Cesium uses an ocean-colored globe while imagery is loading", () => {
    const oceanColor = { name: "ocean" };
    const spaceColor = { name: "space" };
    const Cesium = {
      Color: {
        fromCssColorString: jest.fn((value) =>
          value === "#90DAEE" ? oceanColor : spaceColor,
        ),
      },
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium,
    });
    const vm = {
      viewer: {
        scene: {
          globe: { baseColor: null },
          skyAtmosphere: { show: true },
          fog: { enabled: true },
          backgroundColor: null,
          requestRender: jest.fn(),
        },
        isDestroyed: jest.fn(() => false),
      },
    };
    vm.isViewerReady = component.methods.isViewerReady.bind(vm);
    vm.requestRender = component.methods.requestRender.bind(vm);

    component.methods.configureGlobeAppearance.call(vm);

    expect(Cesium.Color.fromCssColorString).toHaveBeenCalledWith("#90DAEE");
    expect(Cesium.Color.fromCssColorString).toHaveBeenCalledWith("#020A18");
    expect(vm.viewer.scene.globe.baseColor).toBe(oceanColor);
    expect(vm.viewer.scene.skyAtmosphere.show).toBe(false);
    expect(vm.viewer.scene.fog.enabled).toBe(false);
    expect(vm.viewer.scene.backgroundColor).toBe(spaceColor);
    expect(vm.viewer.scene.requestRender).toHaveBeenCalledTimes(1);
  });

  test("Cesium renders the latest vehicle immediately after initialization", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const points = [
      { longitude: 104.1, latitude: 28.1 },
      { longitude: 104.2, latitude: 28.2 },
      { longitude: 104.3, latitude: 28.3 },
    ];
    const vm = {
      mapList: points,
      dataList: [],
      index: 0,
      prevData: null,
      isViewerReady: jest.fn(() => true),
      moveBar: jest.fn(),
      nowBar: jest.fn(),
      updateRealtimeRoute: jest.fn(),
    };

    component.methods.renderRealtimeSnapshot.call(vm, points);

    expect(vm.dataList).toBe(points);
    expect(vm.index).toBe(2);
    expect(vm.prevData).toBe(points[1]);
    expect(vm.moveBar).toHaveBeenCalledWith([points[0], points[1]]);
    expect(vm.nowBar).toHaveBeenCalledWith(points[2]);
    expect(vm.updateRealtimeRoute).toHaveBeenCalledWith(points);
  });

  test("Cesium creates a realtime trajectory through valid map points", () => {
    const positions = [{ x: 1 }, { x: 2 }];
    const color = { withAlpha: jest.fn(() => "route-color") };
    const CallbackProperty = jest.fn((callback, isConstant) => ({
      callback,
      isConstant,
    }));
    const Cesium = {
      Cartesian3: {
        fromDegreesArrayHeights: jest.fn(() => positions),
      },
      CallbackProperty,
      Color: {
        fromCssColorString: jest.fn(() => color),
      },
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium,
    });
    const entities = {
      getById: jest.fn(() => undefined),
      add: jest.fn(),
    };
    const vm = {
      viewer: {
        entities,
        scene: { requestRender: jest.fn() },
        isDestroyed: jest.fn(() => false),
      },
      realtimeRouteState: null,
    };
    vm.isViewerReady = component.methods.isViewerReady.bind(vm);
    vm.requestRender = component.methods.requestRender.bind(vm);

    component.methods.updateRealtimeRoute.call(vm, [
      { longitude: 104.1, latitude: 28.1 },
      { longitude: "invalid", latitude: 28.2 },
      { longitude: 104.3, latitude: 28.3 },
    ]);

    expect(Cesium.Cartesian3.fromDegreesArrayHeights).toHaveBeenCalledWith([
      104.1,
      28.1,
      2,
      104.3,
      28.3,
      2,
    ]);
    expect(CallbackProperty).toHaveBeenCalledTimes(1);
    expect(vm.realtimeRouteState.positions).toBe(positions);
    expect(entities.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "realtime-route",
        polyline: expect.objectContaining({
          positions: expect.objectContaining({ isConstant: false }),
          width: 5,
          material: "route-color",
          clampToGround: false,
        }),
      }),
    );
  });

  test("Cesium updates the realtime trajectory without replacing its dynamic property", () => {
    const positions = [{ x: 1 }, { x: 2 }];
    const route = {
      polyline: Object.freeze({
        positions: "positions-callback",
        clampToGround: false,
      }),
    };
    const entities = {
      getById: jest.fn(() => route),
      add: jest.fn(),
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        Cartesian3: {
          fromDegreesArrayHeights: jest.fn(() => positions),
        },
        Color: {
          fromCssColorString: jest.fn(() => ({
            withAlpha: jest.fn(() => "route-color"),
          })),
        },
      },
    });
    const routeState = { positions: null };
    const vm = {
      viewer: {
        entities,
        scene: { requestRender: jest.fn() },
        isDestroyed: jest.fn(() => false),
      },
      realtimeRouteState: routeState,
    };
    vm.isViewerReady = component.methods.isViewerReady.bind(vm);
    vm.requestRender = component.methods.requestRender.bind(vm);

    component.methods.updateRealtimeRoute.call(vm, [
      { longitude: 104.1, latitude: 28.1 },
      { longitude: 104.2, latitude: 28.2 },
    ]);

    expect(routeState.positions).toBe(positions);
    expect(route.polyline.positions).toBe("positions-callback");
    expect(entities.add).not.toHaveBeenCalled();
  });

  test("Cesium explicitly installs the selected base imagery layer", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const provider = { type: "osm" };
    const imageryLayers = {
      removeAll: jest.fn(),
      addImageryProvider: jest.fn(),
    };
    const vm = {
      viewer: { imageryLayers },
      createBaseImageryProvider: jest.fn(() => provider),
      createAnnotationImageryProvider: jest.fn(() => null),
    };

    expect(component.methods.configureImageryLayers).toEqual(
      expect.any(Function),
    );
    component.methods.configureImageryLayers.call(vm, "");

    expect(imageryLayers.removeAll).toHaveBeenCalledTimes(1);
    expect(imageryLayers.addImageryProvider).toHaveBeenCalledWith(provider);
  });

  test("Cesium follow mode tracks the vehicle and cancels camera flight when disabled", () => {
    const Cartesian3 = jest.fn((x, y, z) => ({ x, y, z }));
    const HeadingPitchRange = jest.fn((heading, pitch, range) => ({
      heading,
      pitch,
      range,
    }));
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {
        Cartesian3,
        Math: { toRadians: jest.fn((value) => value) },
        HeadingPitchRange,
        Matrix4: { IDENTITY: { id: "identity" } },
      },
    });
    const modelPosition = { x: 104, y: 28, z: 0 };
    const model = {
      id: "model",
      position: { getValue: jest.fn(() => modelPosition) },
    };
    const viewer = {
      trackedEntity: undefined,
      entities: { getById: jest.fn(() => model) },
      camera: {
        cancelFlight: jest.fn(),
        lookAt: jest.fn(),
        lookAtTransform: jest.fn(),
      },
      clock: { currentTime: {} },
      scene: { requestRender: jest.fn() },
      isDestroyed: jest.fn(() => false),
      flyTo: jest.fn(),
    };
    const vm = {
      viewer,
      isViewerReady: component.methods.isViewerReady,
      requestRender: component.methods.requestRender,
    };

    component.methods.changeView.call(vm, true);

    expect(viewer.trackedEntity).toBeUndefined();
    expect(model.viewFrom).toEqual({ x: 0, y: -250, z: 450 });
    expect(viewer.camera.lookAt).toHaveBeenCalledWith(modelPosition, {
      heading: 0,
      pitch: -Math.PI / 6,
      range: 600,
    });

    component.methods.changeView.call(vm, true);
    expect(viewer.camera.lookAt).toHaveBeenCalledTimes(2);
    expect(viewer.flyTo).not.toHaveBeenCalled();

    component.methods.changeView.call(vm, false);

    expect(viewer.camera.cancelFlight).toHaveBeenCalledTimes(1);
    expect(viewer.camera.lookAtTransform).toHaveBeenCalledWith({
      id: "identity",
    });
    expect(viewer.trackedEntity).toBeUndefined();
  });

  test("Cesium mutations request a frame and destruction owns each handle once", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const handler = { destroy: jest.fn() };
    const viewer = {
      entities: { removeAll: jest.fn() },
      dataSources: { removeAll: jest.fn() },
      isDestroyed: jest.fn(() => false),
      destroy: jest.fn(),
      scene: { requestRender: jest.fn() },
    };
    const vm = {
      screenSpaceHandler: handler,
      viewer,
    };
    vm.isViewerReady = component.methods.isViewerReady.bind(vm);
    vm.requestRender = component.methods.requestRender.bind(vm);
    vm.destroyScreenSpaceHandler =
      component.methods.destroyScreenSpaceHandler.bind(vm);

    component.methods.remove.call(vm);
    expect(handler.destroy).toHaveBeenCalledTimes(1);
    expect(vm.screenSpaceHandler).toBeNull();

    component.beforeDestroy.call(vm);

    expect(viewer.scene.requestRender).toHaveBeenCalledTimes(1);
    expect(handler.destroy).toHaveBeenCalledTimes(1);
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
  });

  test("Cesium releases a previous click handler before changing render mode", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const handler = { destroy: jest.fn() };
    const vm = { screenSpaceHandler: handler };

    component.methods.destroyScreenSpaceHandler.call(vm);

    expect(handler.destroy).toHaveBeenCalledTimes(1);
    expect(vm.screenSpaceHandler).toBeNull();
  });

  test("Cesium concentration redraw rebuilds bars for the selected gas only", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const points = [
      { longitude: 104.1, latitude: 28.1, pri_ch4: 1.5, pri_co2: 4.5 },
      { longitude: 104.2, latitude: 28.2, pri_ch4: 1.8, pri_co2: 4.8 },
    ];
    const vm = {
      gasType: "pri_ch4",
      mapList: points,
      dataList: [],
      index: 0,
      prevData: null,
      remove: jest.fn(),
      moveBar: jest.fn(),
      nowBar: jest.fn(),
      updateRealtimeRoute: jest.fn(),
      requestRender: jest.fn(),
      isViewerReady: jest.fn(() => true),
    };

    component.methods.redrawConcentrationByGas.call(vm, "pri_co2", points);

    expect(vm.gasType).toBe("pri_co2");
    expect(vm.remove).toHaveBeenCalledTimes(1);
    expect(vm.moveBar).toHaveBeenCalledWith([points[0]]);
    expect(vm.nowBar).toHaveBeenCalledWith(points[1]);
    expect(vm.updateRealtimeRoute).toHaveBeenCalledWith(points);
    expect(vm.requestRender).toHaveBeenCalledTimes(1);
  });

  test("Cesium realtime window redraw rebuilds history bars and latest bar", () => {
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium: {},
    });
    const points = [
      { longitude: 104.1, latitude: 28.1, pri_ch4: 1.5 },
      { longitude: 104.2, latitude: 28.2, pri_ch4: 1.8 },
      { longitude: 104.3, latitude: 28.3, pri_ch4: 2.8 },
    ];
    const vm = {
      gasType: "pri_co2",
      mapList: points,
      dataList: [],
      index: 0,
      prevData: null,
      remove: jest.fn(),
      moveBar: jest.fn(),
      nowBar: jest.fn(),
      updateRealtimeRoute: jest.fn(),
      requestRender: jest.fn(),
      isViewerReady: jest.fn(() => true),
      redrawConcentrationByGas:
        component.methods.redrawConcentrationByGas,
    };

    component.methods.redrawRealtimeWindow.call(vm, "pri_ch4", points);

    expect(vm.gasType).toBe("pri_ch4");
    expect(vm.remove).toHaveBeenCalledTimes(1);
    expect(vm.moveBar).toHaveBeenCalledWith([points[0], points[1]]);
    expect(vm.nowBar).toHaveBeenCalledWith(points[2]);
    expect(vm.updateRealtimeRoute).toHaveBeenCalledWith(points);
    expect(vm.requestRender).toHaveBeenCalledTimes(1);
  });

  test("Cesium trajectory rendering releases a concentration click handler", () => {
    const dataSource = {
      entities: { add: jest.fn(() => ({})) },
    };
    const Cesium = {
      CustomDataSource: jest.fn(() => dataSource),
      Cartesian3: class {
        static fromDegreesArrayHeights = jest.fn();
        static fromDegrees = jest.fn();
      },
      SampledPositionProperty: class {
        addSample() {}
        setInterpolationOptions() {}
      },
      JulianDate: { fromDate: jest.fn() },
      LagrangePolynomialApproximation: {},
      TimeIntervalCollection: class {},
      TimeInterval: class {},
      VelocityOrientationProperty: class {},
      Color: { fromCssColorString: jest.fn() },
    };
    const component = loadComponent("StereoscopicMap.vue", {
      turf: {},
      Cesium,
    });
    const handler = { destroy: jest.fn() };
    const viewer = {
      entities: { removeAll: jest.fn() },
      dataSources: { add: jest.fn(), removeAll: jest.fn() },
      isDestroyed: jest.fn(() => false),
      scene: { requestRender: jest.fn() },
      clock: {},
      zoomTo: jest.fn(),
    };
    const vm = { screenSpaceHandler: handler, viewer };
    vm.isViewerReady = component.methods.isViewerReady.bind(vm);
    vm.requestRender = component.methods.requestRender.bind(vm);
    vm.destroyScreenSpaceHandler =
      component.methods.destroyScreenSpaceHandler.bind(vm);
    vm.remove = component.methods.remove.bind(vm);

    component.methods.drawLine.call(vm, {
      data: [
        { longitude: 104.8, latitude: 28.1, time: "2026-07-19 10:00:00" },
      ],
    });

    expect(handler.destroy).toHaveBeenCalledTimes(1);
    expect(vm.screenSpaceHandler).toBeNull();
  });
});
