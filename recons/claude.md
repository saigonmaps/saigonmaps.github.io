# PIPELINE V2: HISTORICAL AERIAL TO OSM RECONSTRUCTION

## CONSTRAINTS

- Hardware: MacBook M1 Pro, no dedicated GPU, MPS backend available
- Scope: District 1, Saigon / Hanoi colonial-era aerials
- Mode: per-building sessions, personal use, manual review acceptable
- Preference: free, open source, self-hosted, minimal dependencies

## PHASE 1: IMAGE CONDITIONING AND GEORECTIFICATION

- Run OpenCV CLAHE on input raster to normalize lighting and enhance edges
- Open image in QGIS Georeferencer plugin, manually place 15 GCPs against current satellite basemap
- Save GCP file per image as .points for reuse
- Run gdalwarp with TPS transformation, output WGS84 GeoTIFF
- Run gdal_translate -of COG to convert output to Cloud-Optimized GeoTIFF for lower RAM usage downstream

## PHASE 2: BUILDING FOOTPRINT EXTRACTION

- Install samgeo (segment-geospatial), which wraps SAM with CRS-aware tiling built in
- Run samgeo with tile size 512x512, overlap 64px, no custom code needed for sliding window
- Label 30-50 buildings in Label Studio (local install, free) to create a small fine-tuning set
- Fine-tune SAM mask decoder only (not ViT backbone) using MPS backend, ~1hr on M1 Pro
- Apply morphological opening then closing to remove noise from trees and vehicles

## PHASE 3: VECTORIZATION AND GEOMETRIC REGULARIZATION

- Convert binary masks to GeoJSON using rasterio.features.shapes
- Project to local UTM zone, apply Douglas-Peucker simplification with 0.5m tolerance via Shapely
- Run building-regularization (Zorzi et al.) instead of generic L-shape or MBB fitting
  - handles courtyard-style and rectangular colonial footprints better than heuristics
- Validate topology with Shapely is_valid, fix with buffer(0)

## PHASE 4: OSM INTEGRATION AND CONFLICT RESOLUTION

- Fetch current OSM building layer for bounding box via overpy (simpler than osmium at this scale)
- Spatial join historical polygons against OSM polygons, compute IoU per overlapping pair
- Output three GeoJSON categories:
  - historical-only: no OSM match (IoU < 0.1)
  - high-match: IoU > 0.6, safe to replace
  - conflict: IoU 0.1-0.6, needs manual review in QGIS before pushing
- Merge street names and district attributes from OSM onto new historical features
- Review high-match set in QGIS before any OSM upload

## PHASE 5: HEIGHT ESTIMATION AND INPAINTING

- Estimate building height from shadow: height = shadow_length \* tan(sun_elevation)
- Set sun_elevation manually per session via a YAML config file (use a solar calculator for Saigon latitude and approximate decade)
- For occluded or blurred areas, run LaMa inpainting (~10s on M1 MPS, no prompt needed, uses surrounding pixels)
- Log each session to a per-building YAML: image_id, sun_elevation, estimated_height, inpaint_used, confidence
- Export final dataset as GeoJSON with height and base_height properties

## PHASE 6: VISUALIZATION

- Load GeoJSON into MapLibre GL JS, configure fill-extrusion layer using height attribute
- Overlay georeferenced GeoTIFF at 0.5 opacity for visual verification
- Add time-slider to toggle between historical 3D view and current OSM data
- Add per-building popup showing confidence tier and session YAML fields
- Serve as single index.html + flat GeoJSON, no backend, deployable on GitHub Pages

## STACK

kept:

- GDAL, rasterio, Shapely, Fiona, Pyproj
- OpenCV
- overpy
- MapLibre GL JS
- Python 3.10+

added:

- samgeo (geospatial SAM wrapper)
- Label Studio (local, for labeling fine-tune set)
- LaMa (fast structural inpainting, replaces Stable Diffusion)
- building-regularization (Zorzi et al., replaces L-shape/MBB)
- QGIS (GCP placement and conflict review)
- YAML session logs per building

removed:

- Stable Diffusion + ControlNet (too slow on CPU, hallucinates style)
- Mask R-CNN (dropped in favor of samgeo)
- Deck.gl (overkill for single-city personal project)
- osmium (overpy sufficient at District 1 scale)
