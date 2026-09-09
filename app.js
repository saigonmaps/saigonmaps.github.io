import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  ExpandableMenuControl,
  StyleSwitcherControl,
  addCompassControl,
  createSiteNavPanel,
  modifyBaseStyle,
  setupMapKeyboardShortcuts,
} from "./shared.js";

// --- 1. CONSTANTS ---

const mapData = [
  {
    year: "1864",
    title: "1864",
    extent: [
      106.69003036813785, 10.75856567494783, 106.71852604465771,
      10.79886536073849,
    ],
  },
  {
    year: "1866",
    title: "1866",
    extent: [
      106.69132363202537, 10.75160139367789, 106.72504792762645,
      10.79953991472363,
    ],
  },
  {
    year: "1867",
    title: "1867",
    extent: [
      106.67712000180096, 10.75076052726249, 106.72026303464581,
      10.80775625921822,
    ],
  },
  {
    year: "1872",
    title: "1872",
    extent: [
      106.68687380233162, 10.76114748686954, 106.71679682572932,
      10.79841474728841,
    ],
  },
  {
    year: "1873",
    title: "1873",
    extent: [
      106.68627807477218, 10.75972705953421, 106.71684770453298,
      10.80086110733836,
    ],
  },
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
    year: "1890",
    title: "1890",
    extent: [
      106.64444972024987, 10.73454741194546, 106.73586452277483,
      10.82198577249812,
    ],
  },
  {
    year: "1893",
    title: "1893",
    extent: [
      106.68403738606688, 10.75963781764586, 106.71482740517132,
      10.79808982702576,
    ],
  },
  {
    year: "1895",
    title: "1895",
    extent: [
      106.59971165640843, 10.71898951011474, 106.81182001941959,
      10.86331905832662,
    ],
  },
  {
    year: "1898",
    title: "1898",
    extent: [
      106.6748629209779, 10.75455970087413, 106.72512243898761,
      10.79995555587477,
    ],
  },
  {
    year: "1900",
    title: "1900",
    extent: [
      106.68128509796892, 10.75693129906108, 106.71984731892108,
      10.80228566153856,
    ],
  },
  {
    year: "1905",
    title: "1905",
    extent: [
      106.66631526168608, 10.74192951510859, 106.72865957880693,
      10.81338579480951,
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
    year: "1921",
    title: "1921",
    extent: [
      106.66622814020415, 10.74794110175467, 106.72501527035836,
      10.80008496328281,
    ],
  },
  {
    year: "1923",
    title: "1923",
    extent: [
      106.60892762283467, 10.69890009927918, 106.73468874540568,
      10.80690287815901,
    ],
  },
  {
    year: "1935",
    title: "1935",
    extent: [
      106.62654046003418, 10.71252416151775, 106.73007855949243,
      10.81139969635581,
    ],
  },
  {
    year: "1937",
    title: "1937",
    extent: [
      106.66721662559867, 10.74769039196421, 106.72296536667501,
      10.80402933772158,
    ],
  },
  {
    year: "1942",
    title: "1942",
    extent: [
      106.60585854117896, 10.70585963658603, 106.74599361955148,
      10.79908630481296,
    ],
  },
  {
    year: "1946",
    title: "1946",
    extent: [
      106.66628360407418, 10.7486813350353, 106.73122753571964,
      10.80065981542849,
    ],
  },
  {
    year: "1947",
    title: "1947",
    extent: [
      106.6139068725999, 10.70309779817302, 106.72984389269691,
      10.80190754977686,
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
    extent: [
      106.62514593895938, 10.71911876657395, 106.72711331429993,
      10.84730018915248,
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

mapData.sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));

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

  const topNavMenuControl = new ExpandableMenuControl(
    createSiteNavPanel("maps")
  );
  map.addControl(topNavMenuControl, "top-left");

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
  addCompassControl(map, "top-left");

  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://threads.com/@tomeyinhanoi" target="_blank" style="text-decoration: underline">By Tomey</a>',
      compact: true,
    }),
    "bottom-left"
  );

  setupMapKeyboardShortcuts({
    map,
    layerSelect,
    opacitySlider,
    styleSwitcher,
    enableStyleToggle: true,
    enableYearSwitch: true,
    enableOpacity: true,
    enableStreetToggle: false,
    enablePan: true,
    enableZoom: true,
  });

  map.on("click", () => {
    topNavMenuControl.close();
  });
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
  if (selectedMap) {
    map.fitBounds(selectedMap.extent, { padding: 50 });
  }
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

mapData.forEach((data) => {
  const option = document.createElement("option");
  option.value = data.year;
  option.textContent = data.title;
  layerSelect.appendChild(option);
});

const setSelectWidth = () => {
  const len = layerSelect.options[layerSelect.selectedIndex]?.text.length || 4;
  layerSelect.style.width = `${(len + 1) * 10}px`;
};
setSelectWidth();
layerSelect.addEventListener("change", setSelectWidth);
