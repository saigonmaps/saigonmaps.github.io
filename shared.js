export const apiKey = "yirfoVznNRHBz863QlU2"; // Using the key from your index.html

export const STREETS_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;
export const SATELLITE_HYBRID_STYLE = {
  version: 8,
  metadata: {
    "maplibregl:arbitrary-bottom-layer-id": "aerial-layer",
  },
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    "maptiler-streets": {
      type: "vector",
      url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${apiKey}`,
    },
  },
  glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${apiKey}`,
  center: [106.6953, 10.7769], // Saigon Center
  zoom: 12,
  layers: [
    {
      id: "aerial-layer",
      type: "raster",
      source: "esri-world-imagery",
      minzoom: 0,
      maxzoom: 24,
    },
    {
      id: "road_label",
      type: "symbol",
      source: "maptiler-streets",
      "source-layer": "transportation_name",
      minzoom: 12,
      layout: {
        "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]],
        "text-font": ["Roboto Regular", "Arial Unicode MS Regular"],
        "text-size": {
          base: 1.2,
          stops: [
            [12, 10],
            [15, 12],
            [18, 14],
          ],
        },
        "text-transform": "uppercase",
        "text-rotation-alignment": "map",
        "symbol-placement": "line",
        "symbol-spacing": 350,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#d9d9d9",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "place_label",
      type: "symbol",
      source: "maptiler-streets",
      "source-layer": "place",
      layout: {
        "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]],
        "text-font": ["Roboto Regular", "Arial Unicode MS Regular"],
        "text-size": 14,
        "text-variable-anchor": ["bottom"],
        "text-radial-offset": 0.5,
        "text-justify": "auto",
        "symbol-sort-key": ["get", "rank"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.5,
      },
    },
  ],
};

export class StyleSwitcherControl {
  constructor(styles, onStyleLoad) {
    this._streets = styles.streets;
    this._satellite = styles.satellite;
    this._isSatellite = false;
    this._onStyleLoad = onStyleLoad;
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this._button = document.createElement("button");
    this._button.type = "button";
    this._button.className = "style-switcher-button";
    this._button.onclick = () => this.toggleStyle();
    this._button.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="style-switcher-icon"
      >
        <title>Toggle Map Style</title>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;
    this._container.appendChild(this._button);

    this.updateButton();
    return this._container;
  }

  updateButton() {
    if (this._isSatellite) {
      this._button.classList.add("is-satellite");
      this._button.title = "Switch to Streets";
    } else {
      this._button.classList.remove("is-satellite");
      this._button.title = "Switch to Satellite";
    }
  }

  toggleStyle() {
    if (window.currentPopup) {
      window.currentPopup.remove();
      window.currentPopup = null;
    }

    this._isSatellite = !this._isSatellite;
    this.updateButton();

    const newStyleUrl = this._isSatellite ? this._satellite : this._streets;
    this._map.setStyle(newStyleUrl);
    this._map.once("styledata", () => this._onStyleLoad?.());
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

export function modifyBaseStyle(map) {
  const layersToRecolor = ["Grass", "Meadow", "Forest", "Wood", "Scrub"];
  const layersToHide = [
    "Residential",
    "Industrial",
    "Other border",
    "Disputed border",
  ];
  const pathsToRecolor = ["Path", "Path minor"];

  const applyProperty = (layerIds, type, key, value) => {
    layerIds.forEach((id) => {
      if (map.getLayer(id)) {
        if (type === "paint") map.setPaintProperty(id, key, value);
        if (type === "layout") map.setLayoutProperty(id, key, value);
      }
    });
  };

  applyProperty(layersToRecolor, "paint", "fill-color", "#A1E8A1");
  applyProperty(layersToHide, "layout", "visibility", "none");
  applyProperty(pathsToRecolor, "paint", "line-color", "#efeeef");

  if (map.getLayer("Building") || map.getLayer("Building 3D")) {
    map.setLayerZoomRange("Building", 14, 24);
    map.setLayerZoomRange("Building 3D", 14, 24);
  }

  localizeLabels(map, "vi");
}

/**
 * Localizes map labels to a specific language if available in the vector tiles.
 */
export function localizeLabels(map, lang = "vi") {
  const style = map.getStyle();
  if (!style || !style.layers) return;

  style.layers.forEach((layer) => {
    if (layer.type === "symbol") {
      const textField = map.getLayoutProperty(layer.id, "text-field");
      if (textField) {
        if (typeof textField === "string" && textField.includes("{name}")) {
          const localized = textField.replace("{name}", `{name:${lang}}`);
          map.setLayoutProperty(layer.id, "text-field", localized);
        } else if (JSON.stringify(textField).includes('"name"')) {
          if (!JSON.stringify(textField).includes(`"name:${lang}"`)) {
            map.setLayoutProperty(layer.id, "text-field", [
              "coalesce",
              ["get", `name:${lang}`],
              ["get", "name:latin"],
              ["get", "name"],
              textField,
            ]);
          }
        }
      }
    }
  });
}

export function setupKeyboardControls(
  map,
  layerSelect,
  opacitySlider,
  styleSwitcher
) {
  document.addEventListener("keydown", (event) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" ||
        (activeEl.tagName === "INPUT" && activeEl.type === "text"))
    ) {
      return;
    }
    const panAmount = 100;

    switch (event.key) {
      case "0": {
        styleSwitcher.toggleStyle();
        break;
      }

      case "ArrowLeft": {
        event.preventDefault();
        const select = layerSelect;
        if (select.selectedIndex > 0) {
          select.selectedIndex -= 1;
        } else {
          select.selectedIndex = select.options.length - 1;
        }
        layerSelect.dispatchEvent(new Event("change"));
        break;
      }

      case "ArrowRight": {
        event.preventDefault();
        const select = layerSelect;
        if (select.selectedIndex < select.options.length - 1) {
          select.selectedIndex += 1;
        } else {
          select.selectedIndex = 0;
        }
        layerSelect.dispatchEvent(new Event("change"));
        break;
      }

      case "ArrowUp": {
        event.preventDefault();
        const slider = opacitySlider;
        let value = parseFloat(slider.value);
        value = Math.min(1.0, value + 0.1);
        slider.value = value.toFixed(1);
        slider.dispatchEvent(new Event("input"));
        break;
      }

      case "ArrowDown": {
        event.preventDefault();
        const slider = opacitySlider;
        let value = parseFloat(slider.value);
        value = Math.max(0.0, value - 0.1);
        slider.value = value.toFixed(1);
        slider.dispatchEvent(new Event("input"));
        break;
      }

      case "+":
      case "=": {
        event.preventDefault();
        map.zoomIn();
        break;
      }

      case "-": {
        event.preventDefault();
        map.zoomOut();
        break;
      }

      case "i":
      case "w": {
        event.preventDefault();
        map.panBy([0, -panAmount], { duration: 100 });
        break;
      }

      case "k":
      case "s": {
        event.preventDefault();
        map.panBy([0, panAmount], { duration: 100 });
        break;
      }

      case "a":
      case "j": {
        event.preventDefault();
        map.panBy([-panAmount, 0], { duration: 100 });
        break;
      }

      case "l":
      case "d": {
        event.preventDefault();
        map.panBy([panAmount, 0], { duration: 100 });
        break;
      }

      case "p": {
        const streetBtn = document.getElementById("street-view-btn");
        if (streetBtn) {
          streetBtn.click();
        }
        break;
      }
    }
  });
}
export const POPUP_OFFSET = [0, -10];
export const FLY_TO_OFFSET = [0, 120];

export function createPopupHTML(props) {
  let mediaList =
    props.media ||
    props.all_media_urls ||
    (props.media_url ? [props.media_url] : []);
  if (typeof mediaList === "string") {
    try {
      mediaList = JSON.parse(mediaList);
    } catch (e) {
      if (mediaList.startsWith("media/"))
        mediaList = [{ media_url: mediaList }];
    }
  }

  mediaList = Array.isArray(mediaList)
    ? mediaList.map((m) => (typeof m === "string" ? { media_url: m } : m))
    : [];

  const totalSlides = 1 + mediaList.length;

  let headerHtml = "";
  if (props.timestamp || props.text) {
    const dateObject = props.timestamp ? new Date(props.timestamp) : new Date();
    const dateString = `${String(dateObject.getDate()).padStart(
      2,
      "0"
    )}/${String(dateObject.getMonth() + 1).padStart(
      2,
      "0"
    )}/${dateObject.getFullYear()}`;
    headerHtml = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #eee; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.05);">
          <!-- TODO: Update your avatar path -->
          <img src="/ava.jpg" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=S&background=random'">
        </div>
        <div style="overflow: hidden;">
          <div class="popup-title" style="margin-bottom: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@saigonmaps</div>
          <div class="popup-subtitle" style="margin-bottom: 0; font-size: 12px; color: #999;">${dateString}</div>
        </div>
      </div>
    `;
  } else {
    headerHtml = `
      <div class="popup-title">${
        props.french_name || props.address || props.name || "Unknown Location"
      }</div>
      ${
        props.french_name || props.address
          ? `<div class="popup-subtitle">${
              props.name || props.french_address || ""
            }</div>`
          : ""
      }
    `;
  }

  const descriptionSlide = `
    <div class="popup-carousel-slide" style="flex:0 0 100%;width:100%;height:100%;scroll-snap-align:start;overflow-y:auto;box-sizing:border-box;">
      <div class="description-text">${(
        props.description ||
        props.text ||
        "No description available."
      ).replace(
        /(<b>(?:Các lần đổi tên):<\/b>.*)/i,
        '<span class="name-change">$1</span>'
      )}</div>
      ${
        props.type
          ? `<div style="font-size:12px; margin-top:8px; color:#666;">Nhóm: ${props.type}</div>`
          : ""
      }
      ${
        props.permalink
          ? `<div style="margin-top:12px;"><a href="${props.permalink}" target="_blank" style="color:#0095f6; text-decoration:none; font-size:13px; font-weight:600;">Xem trên Threads &rarr;</a></div>`
          : ""
      }
    </div>
  `;

  const imageSlides = mediaList
    .map(
      (m, index) => `
    <div class="popup-carousel-slide image-slide">
      <img src="${
        m.media_url.startsWith("/") || m.media_url.startsWith("http") ? "" : "/"
      }${m.media_url}" loading="lazy">
      <div class="popup-img-tap-zone" onclick='openLightbox(${JSON.stringify(
        mediaList.map((item) => item.media_url)
      )}, ${index})'></div>
    </div>`
    )
    .join("");

  return `
    <div class="popup-container">
      <div class="popup-header">${headerHtml}</div>
      <div class="popup-carousel-container">
        <div class="popup-carousel-wrapper" onscroll="updateCarouselButtons(this)">
          ${descriptionSlide}
          ${imageSlides}
        </div>
        ${
          totalSlides > 1
            ? `
          <button class="carousel-nav-btn prev" style="display:none;" onclick="moveCarousel(this,-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="carousel-nav-btn next" style="display:flex;" onclick="moveCarousel(this,1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        `
            : ""
        }
      </div>
    </div>
  `;
}

export function initPopupCarousel() {
  const wrapper = document.querySelector(".popup-carousel-wrapper");
  if (wrapper) updateCarouselButtons(wrapper);
}

// --- LIGHTBOX LOGIC ---
let currentLightboxImages = [];
let currentLightboxIndex = 0;

window.openLightbox = (images, index) => {
  currentLightboxImages = images;
  currentLightboxIndex = index;
  const lightbox = document.getElementById("img-lightbox");
  if (!lightbox) return;

  lightbox.classList.add("open");
  updateLightboxImage();
  document.body.style.overflow = "hidden";
};

window.closeLightbox = () => {
  const lightbox = document.getElementById("img-lightbox");
  if (lightbox) lightbox.classList.remove("open");
  document.body.style.overflow = "";
};

window.moveLightbox = (direction) => {
  currentLightboxIndex =
    (currentLightboxIndex + direction + currentLightboxImages.length) %
    currentLightboxImages.length;
  updateLightboxImage();
};

function updateLightboxImage() {
  const img = document.getElementById("img-lightbox-img");
  const prevBtn = document.getElementById("img-lightbox-prev");
  const nextBtn = document.getElementById("img-lightbox-next");
  if (!img) return;

  const url = currentLightboxImages[currentLightboxIndex];
  img.src = url.startsWith("/") || url.startsWith("http") ? url : "/" + url;

  if (prevBtn && nextBtn) {
    prevBtn.style.display = currentLightboxImages.length > 1 ? "flex" : "none";
    nextBtn.style.display = currentLightboxImages.length > 1 ? "flex" : "none";
  }
}

window.moveCarousel = (btn, direction) => {
  const container = btn.parentElement.querySelector(".popup-carousel-wrapper");
  if (container) {
    const slideWidth = container.offsetWidth;
    container.scrollBy({
      left: direction * slideWidth,
      behavior: "smooth",
    });
  }
};

window.updateCarouselButtons = (container) => {
  const prevBtn = container.parentElement.querySelector(
    ".carousel-nav-btn.prev"
  );
  const nextBtn = container.parentElement.querySelector(
    ".carousel-nav-btn.next"
  );
  if (!prevBtn || !nextBtn) return;
  const scrollLeft = container.scrollLeft;
  const maxScroll = container.scrollWidth - container.offsetWidth;
  prevBtn.style.display = scrollLeft <= 5 ? "none" : "flex";
  nextBtn.style.display = scrollLeft >= maxScroll - 5 ? "none" : "flex";
};

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("img-lightbox-close");
  const prevBtn = document.getElementById("img-lightbox-prev");
  const nextBtn = document.getElementById("img-lightbox-next");
  const lightbox = document.getElementById("img-lightbox");

  if (closeBtn) closeBtn.onclick = window.closeLightbox;
  if (prevBtn) prevBtn.onclick = () => window.moveLightbox(-1);
  if (nextBtn) nextBtn.onclick = () => window.moveLightbox(1);
  if (lightbox) {
    lightbox.onclick = (e) => {
      if (e.target === lightbox) window.closeLightbox();
    };
  }
});
