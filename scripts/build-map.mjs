// Pre-renders a world land outline and origin coordinates for the sourcing map.
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const topo = JSON.parse(await readFile(join(ROOT, 'node_modules/world-atlas/land-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);
const W = 1000, H = 500;
const projection = geoEqualEarth().fitSize([W, H], { type: 'Sphere' });
const d = geoPath(projection.precision(0.5))(land).replace(/(\.\d)\d+/g, '$1');

const places = { hub: ['Krimpen aan den IJssel', 4.61, 51.91], origins: [
  ['Ghana', -1.0, 7.9], ['Nigeria', 8.1, 9.1], ['Suriname', -56.0, 4.0],
  ['India', 79.0, 21.0], ['China', 104.0, 35.0], ['Indonesia', 113.9, -0.8],
] };
const pt = ([name, lon, lat]) => { const [x, y] = projection([lon, lat]); return { name, x: +x.toFixed(1), y: +y.toFixed(1) }; };
await writeFile(join(ROOT, 'src/data/map.json'), JSON.stringify({ w: W, h: H, d, hub: pt(places.hub), origins: places.origins.map(pt) }));
console.log('map path bytes', d.length);
