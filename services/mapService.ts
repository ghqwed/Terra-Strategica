import { Delaunay } from 'd3-delaunay';
import { City, TerrainType, OwnerType, Coordinates, CityType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, NUM_SITES, NUM_RELAXATION_STEPS, TERRAIN_MODIFIERS, CITY_NAMES_PREFIX, CITY_NAMES_SUFFIX } from '../constants';

const noise = (x: number, y: number, seed: number) => {
  return Math.sin(x * 0.01 + seed) * Math.cos(y * 0.01 + seed * 2);
};

const generateName = (id: number) => {
  const p = CITY_NAMES_PREFIX[id % CITY_NAMES_PREFIX.length];
  const s = CITY_NAMES_SUFFIX[(id * 3) % CITY_NAMES_SUFFIX.length];
  return `${p}${s}`;
};

export const generateWorld = (): City[] => {
  let points: [number, number][] = Array.from({ length: NUM_SITES }, () => [
    Math.random() * MAP_WIDTH,
    Math.random() * MAP_HEIGHT
  ]);

  for (let i = 0; i < NUM_RELAXATION_STEPS; i++) {
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, MAP_WIDTH, MAP_HEIGHT]);
    points = points.map((_, j) => {
      const cell = voronoi.cellPolygon(j);
      if (!cell) return points[j];
      const centroid = d3PolygonCentroid(cell);
      return centroid;
    });
  }

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, MAP_WIDTH, MAP_HEIGHT]);

  const cities: City[] = points.map((p, i) => {
    const elevation = (noise(p[0], p[1], 42) + 1) / 2;
    const moisture = (noise(p[0], p[1], 123) + 1) / 2;
    
    let terrain = TerrainType.PLAINS;
    if (elevation > 0.8) terrain = TerrainType.MOUNTAIN;
    else if (elevation < 0.2) terrain = TerrainType.WATER;
    else {
      if (moisture > 0.6) terrain = TerrainType.FOREST;
      else if (moisture < 0.3) terrain = TerrainType.DESERT;
      else if (moisture > 0.8 && elevation < 0.4) terrain = TerrainType.SWAMP;
      else terrain = TerrainType.PLAINS;
    }

    let owner = OwnerType.BARBARIAN;
    let type = CityType.WILDERNESS;
    let level = 0;

    if (terrain === TerrainType.WATER) {
        owner = OwnerType.INDEPENDENT;
        type = CityType.WILDERNESS;
    } else if (i === 0) {
        // Player Start
        owner = OwnerType.PLAYER;
        type = CityType.CITY;
        level = 1;
    } else if (i === 1) {
        // AI Empire Start (Fixed: Only 1 city to match player)
        owner = OwnerType.AI_EMPIRE;
        type = CityType.CITY;
        level = 1;
    } else if (i < 7) {
        // Independent City States
        owner = OwnerType.INDEPENDENT;
        type = CityType.CITY;
        level = 1;
    } 

    const neighbors = Array.from(delaunay.neighbors(i)) as number[];
    const mods = TERRAIN_MODIFIERS[terrain];
    const isCity = type === CityType.CITY;
    const initialPop = terrain === TerrainType.WATER ? 0 : (isCity ? Math.floor(Math.random() * 500) + 100 : Math.floor(Math.random() * 50) + 10);
    
    return {
      id: i,
      name: isCity ? generateName(i) : `Region ${i}`,
      pos: { x: p[0], y: p[1] },
      cellPolygon: voronoi.cellPolygon(i) as [number, number][],
      terrain,
      owner,
      type,
      neighbors,
      
      level: level, 
      indLevel: isCity ? 1 : 0,
      ecoLevel: isCity ? 1 : 0,
      liveLevel: isCity ? 1 : 0,
      defLevel: isCity ? 1 : 0,

      population: initialPop,
      carryingCapacity: mods.cap * (isCity ? 1 : 0.2), 
      growthRate: 0.05,
      productionPerTick: { food: 0, industry: 0, money: 0, science: 0, materials: 0, manpower: 0 },
      
      garrison: owner === OwnerType.BARBARIAN ? 10 : 0, 
      morale: 100,
      isUnderSiege: false,
      siegeTimer: 0,
    };
  });

  return cities;
};

function d3PolygonCentroid(polygon: [number, number][]): [number, number] {
  let i = -1,
      n = polygon.length,
      x = 0,
      y = 0,
      a,
      b = polygon[n - 1],
      c,
      k = 0;

  while (++i < n) {
    a = b;
    b = polygon[i];
    k += c = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * c;
    y += (a[1] + b[1]) * c;
  }

  return k *= 3, [x / k, y / k];
}