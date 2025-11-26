
export enum TerrainType {
  PLAINS = 'PLAINS',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  MOUNTAIN = 'MOUNTAIN',
  WATER = 'WATER',
  SWAMP = 'SWAMP'
}

export enum OwnerType {
  PLAYER = 'PLAYER',
  AI_EMPIRE = 'AI_EMPIRE',
  INDEPENDENT = 'INDEPENDENT',
  BARBARIAN = 'BARBARIAN'
}

export enum CityType {
  CITY = 'CITY',
  WILDERNESS = 'WILDERNESS' // Needs to be founded/rebuilt
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT'
}

export type Language = 'en' | 'zh';

export interface Coordinates {
  x: number;
  y: number;
}

export interface Resources {
  food: number;
  industry: number;
  money: number;
  science: number;
  manpower: number; // New: Global Manpower pool
  materials: number;
}

export interface TroopMovement {
  id: string;
  sourceId: number;
  targetId: number;
  owner: OwnerType;
  amount: number;
  progress: number; // 0.0 to 1.0
  startPos: Coordinates;
  endPos: Coordinates;
  color: string;
}

export interface City {
  id: number;
  name: string;
  pos: Coordinates;
  cellPolygon: [number, number][]; // Array of points defining the Voronoi cell
  terrain: TerrainType;
  owner: OwnerType;
  type: CityType;
  neighbors: number[]; // Adjacency list (Graph edges)
  
  // RPG Attributes
  level: number;     // City Hall: Cap for others, Garrison Cap
  indLevel: number;  // Industry: Industry Production
  ecoLevel: number;  // Economy: Money Production
  liveLevel: number; // Livelihood: Manpower Growth
  defLevel: number;  // Fortification: Defense Bonus

  // Demographics
  population: number;
  carryingCapacity: number; 
  growthRate: number; 
  
  // Buffers (Visualization only)
  productionPerTick: Resources;
  
  // Military
  garrison: number; // Current troops
  morale: number;
  
  // Simulation State
  isUnderSiege: boolean;
  siegeTimer: number;
  lastCombatLog?: {
    attackerName: string;
    damageTaken: number;
    round: number;
  };
}

export interface GameState {
  cities: City[];
  globalStockpiles: Record<OwnerType, Resources>;
  globalRates: Record<OwnerType, Resources>; // Added for resource income tracking
  movements: TroopMovement[]; // Active marching armies
  selectedCityId: number | null;
  targetingSourceId: number | null; 
  tickCount: number;
  isPaused: boolean;
  speed: number;
  language: Language;
  status: GameStatus;
  winner: OwnerType | null;
  globalStats: {
    totalPop: number;
    totalCities: number;
    year: number;
  }
}
