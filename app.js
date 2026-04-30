import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  StyleSwitcherControl,
  modifyBaseStyle,
  setupKeyboardControls,
  // createPopupHTML,
  // initPopupCarousel,
  // POPUP_OFFSET,
  // FLY_TO_OFFSET,
} from "./shared.js";

// --- 1. CONSTANTS ---
// TODO: Update these paths when you have your GeoJSON files ready
// const GEOJSON_PATH = "saigon_streets.geojson";
// const BUILDINGS_GEOJSON_PATH = "saigon_buildings.geojson";

let streetData = null;
let buildingData = null;
let isStreetViewActive = false;
let selectedStreetId = null;
let selectedBuildingId = null;

const mapData = [
  {
    year: "1878",
    title: "1878",
    extent: [
      106.65838083284288, 10.73443252900415, 106.73487895970867,
      10.82043771097355,
    ],
  },
  {
    year: "1882",
    title: "1882",
    extent: [
      106.687435426734, 10.75946531022461, 106.71604631458322,
      10.79760022241773,
    ],
  },
  {
    year: "1920",
    title: "1920",
    extent: [
      106.67260235251175, 10.7600634311456, 106.71795463819578,
      10.79701296069667,
    ],
  },
  {
    year: "1960",
    title: "1960",
    extent: [
      106.63986717020128, 10.72754518476272, 106.72452232633253,
      10.80500557574007,
    ],
  },
  {
    year: "1963",
    title: "1963",
    extent: [106.62514593895938, 10.71911876657395, 106.72711331429993, 10.84730018915248],
  },
  {
    year: "1964",
    title: "1964",
    extent: [
      106.63798293471126, 10.74058143634881, 106.71736300069307,
      10.80787295593966,
    ],
  },
  {
    year: "1966",
    title: "1966",
    extent: [
      106.61583653929023, 10.71540008003535, 106.73577791789104,
      10.8129810830023,
    ],
  },
  {
    year: "1968",
    title: "1968",
    extent: [
      106.61696378684933, 10.71375524854973, 106.72836061777582,
      10.85809237226164,
    ],
  },
  {
    year: "1974",
    title: "1974",
    extent: [
      106.60501567871637, 10.71077141358406, 106.74077257489118,
      10.84086140486104,
    ],
  },
];

const minZoomLevel = 12;
const layerSelect = document.getElementById("layer-select");
const opacitySlider = document.getElementById("opacity-slider");
let symbolLayerIds = [];

const map = new maplibregl.Map({
  container: "map",
  style: STREETS_STYLE,
  center: [106.6953, 10.7769],
  zoom: minZoomLevel,
  maxBounds: [
    [106.5, 10.6],
    [107.0, 10.9],
  ],
  attributionControl: false,
});

map.keyboard.disable();

map.on("load", () => {
  let topRightControls = document.getElementById("top-right-controls");
  if (!topRightControls) {
    topRightControls = document.createElement("div");
    topRightControls.id = "top-right-controls";
    topRightControls.className = "top-right-controls";
    document.body.appendChild(topRightControls);
  }

  setupMapLayers();

  if (mapData.length > 0) {
    map.fitBounds(mapData[0].extent, { padding: 50, duration: 0 });
  }

  // Restore NavigationControl with compass enabled (rotating maps icon)
  map.addControl(new maplibregl.NavigationControl(), "top-left");

  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "top-left"
  );

  const styleSwitcher = new StyleSwitcherControl(
    { streets: STREETS_STYLE, satellite: SATELLITE_HYBRID_STYLE },
    () => {
      symbolLayerIds = map
        .getStyle()
        .layers.filter((layer) => layer.type === "symbol")
        .map((layer) => layer.id);
      modifyBaseStyle(map);
      const year = layerSelect.value;
      loadHistoricLayer(year);
      map.setLayoutProperty(`historic-${year}`, "visibility", "visible");
      changeOpacity();
    }
  );
  map.addControl(styleSwitcher, "top-left");

  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://threads.com/@tomeyinhanoi" target="_blank" style="text-decoration: underline">By Tomey</a>',
      compact: true,
    }),
    "bottom-left"
  );

  setupKeyboardControls(map, layerSelect, opacitySlider, styleSwitcher);
});

function setupMapLayers() {
  symbolLayerIds = map
    .getStyle()
    .layers.filter((layer) => layer.type === "symbol")
    .map((layer) => layer.id);
  modifyBaseStyle(map);

  if (mapData.length > 0) {
    const selectedYear = layerSelect.value || mapData[0].year;
    loadHistoricLayer(selectedYear);
    map.setLayoutProperty(`historic-${selectedYear}`, "visibility", "visible");
  }
}

function loadHistoricLayer(year) {
  const data = mapData.find((d) => d.year === year);
  if (!data || map.getSource(`historic-${data.year}`)) return;
  const firstSymbolId = map
    .getStyle()
    .layers.find((l) => l.type === "symbol")?.id;
  map.addSource(`historic-${data.year}`, {
    type: "raster",
    // Restore Cloudflare R2 tiles URL
    tiles: [
      `https://pub-866936cf194140d79d9f7a415b98d490.r2.dev/tiles/${data.year}/{z}/{x}/{y}.png`,
    ],
    scheme: "tms",
    tileSize: 256,
    minzoom: minZoomLevel,
    maxzoom: 18,
    bounds: data.extent,
  });
  map.addLayer(
    {
      id: `historic-${data.year}`,
      type: "raster",
      source: `historic-${data.year}`,
      paint: { "raster-opacity": parseFloat(opacitySlider.value) },
      layout: { visibility: "none" },
    },
    firstSymbolId
  );
}

function applyLayerVisibility() {
  const selectedYear = layerSelect.value;
  loadHistoricLayer(selectedYear);
  mapData.forEach((data) => {
    if (map.getLayer(`historic-${data.year}`))
      map.setLayoutProperty(
        `historic-${data.year}`,
        "visibility",
        data.year === selectedYear ? "visible" : "none"
      );
  });
}

function changeHistoricLayer() {
  const selectedYear = layerSelect.value;
  loadHistoricLayer(selectedYear);
  applyLayerVisibility();
  const selectedMap = mapData.find((data) => data.year === selectedYear);
  if (selectedMap) map.fitBounds(selectedMap.extent, { padding: 50 });
}

function changeOpacity() {
  const opacity = parseFloat(opacitySlider.value);
  mapData.forEach((data) => {
    if (map.getLayer(`historic-${data.year}`))
      map.setPaintProperty(`historic-${data.year}`, "raster-opacity", opacity);
  });
  const symbolsVisible = opacity >= 0.8 ? "none" : "visible";
  symbolLayerIds.forEach((id) => {
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", symbolsVisible);
  });
}

layerSelect.addEventListener("change", changeHistoricLayer);
opacitySlider.addEventListener("input", changeOpacity);

// Populate dropdown
mapData.forEach((data) => {
  const option = document.createElement("option");
  option.value = data.year;
  option.textContent = data.title;
  layerSelect.appendChild(option);
});
