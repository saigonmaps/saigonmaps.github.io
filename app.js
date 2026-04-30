import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  StyleSwitcherControl,
  modifyBaseStyle,
  setupKeyboardControls,
  createPopupHTML,
  initPopupCarousel,
  POPUP_OFFSET,
  FLY_TO_OFFSET,
} from "./shared.js";

// --- 1. CONSTANTS ---
// TODO: Update these paths when you have your GeoJSON files ready
const GEOJSON_PATH = "saigon_streets.geojson";
const BUILDINGS_GEOJSON_PATH = "saigon_buildings.geojson";

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

  const streetBtn = document.createElement("button");
  streetBtn.id = "street-view-btn";
  streetBtn.title = "Toggle Street View (P)";
  streetBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="style-switcher-icon">
      <path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-5l-3 3-3-3H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke-linecap="round"/>
      <rect x="7" y="7" width="10" height="2" fill="black" stroke="none"/>
      <rect x="7" y="11" width="6" height="2" fill="black" stroke="none"/>
    </svg>
  `;
  topRightControls.insertBefore(streetBtn, topRightControls.firstChild);

  setupMapLayers();

  if (mapData.length > 0) {
    map.fitBounds(mapData[0].extent, { padding: 50, duration: 0 });
  }

  map.addControl(
    new maplibregl.NavigationControl({ showCompass: false }),
    "top-left"
  );
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "top-left"
  );

  const styleSwitcher = new StyleSwitcherControl({
    streets: STREETS_STYLE,
    satellite: SATELLITE_HYBRID_STYLE,
  });
  map.addControl(styleSwitcher, "top-left");

  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://github.com/saigonmaps/saigonmaps.github.io" target="_blank" style="text-decoration: underline">Saigon Maps</a>',
      compact: true,
    }),
    "bottom-left"
  );

  setupKeyboardControls(map, layerSelect, opacitySlider, styleSwitcher);

  // TODO: Add fetch logic for GeoJSONs here when files are ready

  streetBtn.addEventListener("click", () => {
    isStreetViewActive = !isStreetViewActive;
    streetBtn.classList.toggle("active", isStreetViewActive);
    const visibility = isStreetViewActive ? "visible" : "none";
    [
      "streets-line",
      "streets-line-hit-area",
      "buildings-fill",
      "buildings-outline",
      "buildings-fill-hit-area",
    ].forEach((layerId) => {
      if (map.getLayer(layerId))
        map.setLayoutProperty(layerId, "visibility", visibility);
    });
    if (!isStreetViewActive) {
      if (window.currentPopup) {
        window.currentPopup.remove();
        window.currentPopup = null;
      }
      clearSelection();
    }
  });

  map.on(
    "mouseenter",
    "streets-line-hit-area",
    () => (map.getCanvas().style.cursor = "pointer")
  );
  map.on(
    "mouseleave",
    "streets-line-hit-area",
    () => (map.getCanvas().style.cursor = "")
  );
  map.on(
    "mouseenter",
    "buildings-fill-hit-area",
    () => (map.getCanvas().style.cursor = "pointer")
  );
  map.on(
    "mouseleave",
    "buildings-fill-hit-area",
    () => (map.getCanvas().style.cursor = "")
  );

  map.on("click", (e) => {
    const hitLayers = [];
    if (map.getLayer("streets-line-hit-area"))
      hitLayers.push("streets-line-hit-area");
    if (map.getLayer("buildings-fill-hit-area"))
      hitLayers.push("buildings-fill-hit-area");
    const features = hitLayers.length
      ? map.queryRenderedFeatures(e.point, { layers: hitLayers })
      : [];
    if (!features.length) {
      clearSelection();
      if (window.currentPopup) {
        window.currentPopup.remove();
        window.currentPopup = null;
      }
    }
  });

  map.on("click", "streets-line-hit-area", (e) =>
    handleFeatureClick(e, "osm-streets", "selectedStreetId")
  );
  map.on("click", "buildings-fill-hit-area", (e) =>
    handleFeatureClick(e, "osm-buildings", "selectedBuildingId")
  );
});

function handleFeatureClick(e, source, idVar) {
  if (e.features.length > 0) {
    const feature = e.features[0];
    const newId = feature.id;
    map.flyTo({
      center: e.lngLat,
      duration: 900,
      curve: 1.42,
      essential: true,
      offset: FLY_TO_OFFSET,
    });
    clearSelection();
    if (source === "osm-streets") selectedStreetId = newId;
    else selectedBuildingId = newId;
    map.setFeatureState({ source, id: newId }, { selected: true });
    showPopupForFeature(feature, e.lngLat);
  }
}

function clearSelection() {
  if (selectedStreetId !== null && map.getSource("osm-streets")) {
    map.setFeatureState(
      { source: "osm-streets", id: selectedStreetId },
      { selected: false }
    );
    selectedStreetId = null;
  }
  if (selectedBuildingId !== null && map.getSource("osm-buildings")) {
    map.setFeatureState(
      { source: "osm-buildings", id: selectedBuildingId },
      { selected: false }
    );
    selectedBuildingId = null;
  }
}

map.on("styledata", () => {
  setTimeout(() => {
    setupMapLayers();
    applyLayerVisibility();
    changeOpacity();
  }, 50);
});

layerSelect.addEventListener("change", changeHistoricLayer);
opacitySlider.addEventListener("input", changeOpacity);

function showPopupForFeature(feature, lngLat) {
  if (window.currentPopup) window.currentPopup.remove();
  const contentHtml = createPopupHTML(feature.properties);
  window.currentPopup = new maplibregl.Popup({
    maxWidth: "340px",
    closeButton: false,
    anchor: "bottom",
    offset: POPUP_OFFSET,
  })
    .setLngLat(lngLat)
    .setHTML(contentHtml)
    .addTo(map);
  setTimeout(initPopupCarousel, 100);
}

function setupMapLayers() {
  symbolLayerIds = map
    .getStyle()
    .layers.filter((layer) => layer.type === "symbol")
    .map((layer) => layer.id);
  modifyBaseStyle(map);
  setupBuildingLayers();
  setupStreetLayers();

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
    tiles: [`/tiles/${data.year}/{z}/{x}/{y}.webp`],
    scheme: "tms",
    tileSize: 256,
    minzoom: data.minzoom || minZoomLevel,
    maxzoom: data.maxzoom || 18,
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

function setupBuildingLayers() {
  if (!buildingData) return;
  if (!map.getSource("osm-buildings"))
    map.addSource("osm-buildings", { type: "geojson", data: buildingData });
  else map.getSource("osm-buildings").setData(buildingData);
  const firstSymbolId = map
    .getStyle()
    .layers.find((l) => l.type === "symbol")?.id;
  const visibility = isStreetViewActive ? "visible" : "none";
  if (!map.getLayer("buildings-fill")) {
    map.addLayer(
      {
        id: "buildings-fill",
        type: "fill",
        source: "osm-buildings",
        layout: { visibility },
        paint: {
          "fill-color": ["coalesce", ["get", "building:colour"], "#B9A973"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.8,
            0.55,
          ],
        },
      },
      firstSymbolId
    );
  }
}

function setupStreetLayers() {
  if (!streetData) return;
  if (!map.getSource("osm-streets"))
    map.addSource("osm-streets", { type: "geojson", data: streetData });
  const visibility = isStreetViewActive ? "visible" : "none";
  if (!map.getLayer("streets-line")) {
    map.addLayer({
      id: "streets-line",
      type: "line",
      source: "osm-streets",
      layout: { visibility, "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#292991",
          "#4d94ff",
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 16, 6],
        "line-opacity": 0.8,
      },
    });
  }
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
  const symbolsVisible = opacity >= 0.85 ? "none" : "visible";
  symbolLayerIds.forEach((id) => {
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", symbolsVisible);
  });
}
