// save as generateMapData.js
import fs from "fs/promises";
import path from "path";

const tilesDir = path.join(process.cwd(), "tiles");

async function getExtentFromXML(xmlPath) {
  const xml = await fs.readFile(xmlPath, "utf8");
  const match = xml.match(
    /<BoundingBox\s+minx="([^"]+)"\s+miny="([^"]+)"\s+maxx="([^"]+)"\s+maxy="([^"]+)"\s*\/>/
  );
  if (!match) return null;
  return [
    parseFloat(match[1]),
    parseFloat(match[2]),
    parseFloat(match[3]),
    parseFloat(match[4]),
  ];
}

async function main() {
  const subfolders = await fs.readdir(tilesDir, { withFileTypes: true });
  const mapData = [];

  for (const dirent of subfolders) {
    if (dirent.isDirectory()) {
      const year = dirent.name;
      const xmlPath = path.join(tilesDir, year, "tilemapresource.xml");
      try {
        const extent = await getExtentFromXML(xmlPath);
        if (extent) {
          mapData.push({
            year,
            title: year,
            extent,
          });
        }
      } catch (e) {
        // skip if file not found or parse error
      }
    }
  }

  // Output as JS array for index.html
  console.log("const mapData = [");
  for (const entry of mapData) {
    console.log(
      `  { year: "${entry.year}", title: "${
        entry.title
      }", extent: [${entry.extent.join(", ")}] },`
    );
  }
  console.log("];");
}

main();
