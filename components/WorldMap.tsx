
import React, { useMemo } from 'react';
import { City, TerrainType, OwnerType, Language, CityType, TroopMovement } from '../types';
import { COLORS, OWNER_COLORS, MAP_WIDTH, MAP_HEIGHT, STRINGS } from '../constants';

interface WorldMapProps {
  cities: City[];
  movements: TroopMovement[];
  selectedId: number | null;
  targetingSourceId: number | null;
  onSelect: (id: number) => void;
  lang: Language;
}

const WorldMap: React.FC<WorldMapProps> = ({ cities, movements, selectedId, targetingSourceId, onSelect, lang }) => {
  const t = STRINGS[lang];

  const paths = useMemo(() => {
    return cities.map(city => {
      if (!city.cellPolygon) return null;
      return {
        id: city.id,
        d: `M${city.cellPolygon.join("L")}Z`,
        fill: COLORS[city.terrain],
        center: city.pos
      };
    });
  }, [cities.length]); 

  // Neighbor Highlight Logic
  const validTargets = useMemo(() => {
    if (targetingSourceId === null) return new Set<number>();
    const source = cities.find(c => c.id === targetingSourceId);
    if (!source) return new Set<number>();
    return new Set(source.neighbors); // Can move to any neighbor now
  }, [cities, targetingSourceId]);

  return (
    <div className={`relative w-full h-full bg-slate-900 overflow-hidden ${targetingSourceId !== null ? 'cursor-crosshair' : ''}`}>
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-full preserve-3d">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Terrain Layer */}
        {paths.map((p, idx) => {
            if (!p) return null;
            const isTarget = validTargets.has(p.id);
            return (
                <path
                    key={`cell-${p.id}`}
                    d={p.d}
                    fill={p.fill}
                    stroke={selectedId === p.id ? "#ffffff" : (isTarget ? "#fbbf24" : "rgba(0,0,0,0.1)")}
                    strokeWidth={selectedId === p.id ? 3 : (isTarget ? 3 : 1)}
                    className={`transition-all duration-300 hover:opacity-90 ${isTarget ? 'animate-pulse' : ''}`}
                    onClick={() => onSelect(p.id)}
                />
            );
        })}

        {/* Borders */}
        {cities.map(city => (
            (city.type === CityType.CITY || city.owner === OwnerType.PLAYER) && city.terrain !== TerrainType.WATER && (
                <path 
                    key={`border-${city.id}`}
                    d={`M${city.cellPolygon.join("L")}Z`}
                    fill="none"
                    stroke={OWNER_COLORS[city.owner]}
                    strokeWidth={city.type === CityType.CITY ? 2 : 1}
                    strokeOpacity={0.8}
                    strokeDasharray={city.type === CityType.WILDERNESS ? "4,4" : "none"}
                    className="pointer-events-none"
                />
            )
        ))}

        {/* MOVEMENTS LAYER */}
        {movements.map(mov => {
            // Linear Interpolation
            const x = mov.startPos.x + (mov.endPos.x - mov.startPos.x) * mov.progress;
            const y = mov.startPos.y + (mov.endPos.y - mov.startPos.y) * mov.progress;
            return (
                <g key={mov.id} className="pointer-events-none">
                    <line 
                        x1={`${mov.startPos.x}`} y1={`${mov.startPos.y}`} 
                        x2={`${mov.endPos.x}`} y2={`${mov.endPos.y}`} 
                        stroke={mov.color} strokeWidth="2" strokeDasharray="4,4" opacity="0.5" 
                    />
                    <circle cx={x} cy={y} r="4" fill={mov.color} stroke="white" strokeWidth="1">
                        <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                    </circle>
                </g>
            );
        })}

        {/* City Icons */}
        {cities.map(city => {
           if (city.terrain === TerrainType.WATER) return null;
           const isCity = city.type === CityType.CITY;
           const size = isCity ? Math.max(4, Math.min(14, Math.sqrt(city.population) * 0.5 + city.level)) : 2;
           
           return (
             <g key={`city-${city.id}`} className="pointer-events-none" transform={`translate(${city.pos.x}, ${city.pos.y})`}>
                {city.lastCombatLog && (Date.now() / 1000 - city.lastCombatLog.round < 2) && (
                    <text x="10" y="-10" fontSize="14" fill="red">⚔️</text>
                )}
                <circle 
                  r={size} 
                  fill={city.owner === OwnerType.PLAYER ? "#fff" : "#1f2937"} 
                  stroke={isCity ? OWNER_COLORS[city.owner] : "#000"}
                  strokeWidth={isCity ? 2 : 0.5}
                  opacity={isCity ? 1 : 0.4}
                />
                {isCity && city.level > 1 && (
                     <text x={-3} y={3} fontSize="8" fill={city.owner === OwnerType.PLAYER ? "black" : "white"} fontWeight="bold">
                        {city.level}
                     </text>
                )}
                {city.id === 0 && (
                   <text x="-4" y="-8" fontSize="10" fill="#fbbf24">★</text>
                )}
             </g>
           );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur p-3 rounded text-xs text-white border border-slate-700 select-none pointer-events-none">
        <div className="font-bold mb-2">{t.legend.title}</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> {t.legend.player}</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> {t.legend.empire}</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> {t.legend.cityState}</div>
      </div>
    </div>
  );
};

export default WorldMap;
