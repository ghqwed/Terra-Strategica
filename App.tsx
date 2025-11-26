
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, City, Language, OwnerType, GameStatus } from './types';
import { generateWorld } from './services/mapService';
import { processTick, recruitTroops, foundCity, upgradeAttribute, dispatchTroops } from './services/gameEngine';
import WorldMap from './components/WorldMap';
import InfoPanel from './components/InfoPanel';
import { STRINGS, GAME_BALANCE } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    cities: [],
    globalStockpiles: { [OwnerType.PLAYER]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.AI_EMPIRE]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.INDEPENDENT]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.BARBARIAN]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 } },
    globalRates: { [OwnerType.PLAYER]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.AI_EMPIRE]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.INDEPENDENT]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.BARBARIAN]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 } },
    movements: [],
    selectedCityId: null,
    targetingSourceId: null,
    tickCount: 0,
    isPaused: true,
    speed: 1,
    language: 'zh',
    status: GameStatus.MENU,
    winner: null,
    globalStats: { totalPop: 0, totalCities: 0, year: 1000 }
  });

  const timerRef = useRef<number | null>(null);

  const initGame = () => {
      const initialCities = generateWorld();
      setGameState({
          cities: initialCities,
          globalStockpiles: {
              [OwnerType.PLAYER]: { food: 500, industry: 500, money: 500, science: 0, materials: 0, manpower: 500 },
              [OwnerType.AI_EMPIRE]: { food: 500, industry: 500, money: 500, science: 0, materials: 0, manpower: 500 },
              [OwnerType.INDEPENDENT]: { food: 100, industry: 100, money: 100, science: 0, materials: 0, manpower: 100 },
              [OwnerType.BARBARIAN]: { food: 0, industry: 0, money: 0, science: 0, materials: 0, manpower: 0 }
          },
          globalRates: { [OwnerType.PLAYER]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.AI_EMPIRE]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.INDEPENDENT]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 }, [OwnerType.BARBARIAN]: { money:0, industry:0, food:0, science:0, materials:0, manpower:0 } },
          movements: [],
          selectedCityId: initialCities[0]?.id || null, 
          targetingSourceId: null,
          tickCount: 0,
          isPaused: false,
          speed: 1,
          language: gameState.language,
          status: GameStatus.PLAYING,
          winner: null,
          globalStats: {
              totalPop: initialCities.reduce((acc, c) => acc + c.population, 0),
              totalCities: initialCities.length,
              year: 1000
          }
      });
  };

  const goToMenu = () => {
      setGameState(prev => ({
          ...prev,
          status: GameStatus.MENU,
          cities: [],
          isPaused: true
      }));
  };

  const tick = useCallback(() => {
    setGameState(prev => {
      if (prev.isPaused || prev.status !== GameStatus.PLAYING) return prev;

      const nextState = processTick(prev);
      
      const globalStats = {
          totalPop: nextState.cities.reduce((acc, c) => acc + c.population, 0),
          totalCities: nextState.cities.length,
          year: 1000 + Math.floor(nextState.tickCount / 12) 
      };

      return {
        ...nextState,
        tickCount: prev.tickCount + 1,
        globalStats
      };
    });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!gameState.isPaused && gameState.status === GameStatus.PLAYING) {
      const ms = 1000 / gameState.speed;
      timerRef.current = window.setInterval(tick, ms);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isPaused, gameState.speed, gameState.status, tick]);

  // ACTIONS
  const handleSelectCity = (id: number) => {
    setGameState(prev => {
        if (prev.targetingSourceId !== null) {
            // In targeting mode, we just update selection to let UI show the candidate target
            return { ...prev, selectedCityId: id };
        }
        return { ...prev, selectedCityId: id, targetingSourceId: null };
    });
  };
  
  const onMapSelect = (id: number) => handleSelectCity(id);

  const handleUpgradeAttribute = (type: 'level' | 'ind' | 'eco' | 'live' | 'def') => {
    setGameState(prev => {
        if (prev.selectedCityId === null) return prev;
        const target = prev.cities.find(c => c.id === prev.selectedCityId);
        if (!target) return prev;
        
        const result = upgradeAttribute(target, type, prev.globalStockpiles);
        
        return { 
            ...prev, 
            cities: prev.cities.map(c => c.id === prev.selectedCityId ? result.city : c),
            globalStockpiles: result.stockpiles
        };
    });
  };

  const handleRecruit = (amount: number) => {
    setGameState(prev => {
        if (prev.selectedCityId === null) return prev;
        const target = prev.cities.find(c => c.id === prev.selectedCityId);
        if (!target) return prev;

        const result = recruitTroops(target, amount, prev.globalStockpiles);

        return { 
            ...prev, 
            cities: prev.cities.map(c => c.id === prev.selectedCityId ? result.city : c),
            globalStockpiles: result.stockpiles
        };
    });
  };

  const handleFoundCity = () => {
    setGameState(prev => {
        if (prev.selectedCityId === null) return prev;
        const target = prev.cities.find(c => c.id === prev.selectedCityId);
        if (!target) return prev;
        const result = foundCity(target, prev.globalStockpiles);
        return { 
            ...prev, 
            cities: prev.cities.map(c => c.id === prev.selectedCityId ? result.city : c),
            globalStockpiles: result.stockpiles
        };
    });
  };

  const handleDispatch = (targetId: number, amount: number) => {
      setGameState(prev => {
          if (prev.targetingSourceId === null) return prev;
          const source = prev.cities.find(c => c.id === prev.targetingSourceId);
          if (!source) return prev;

          const result = dispatchTroops(source, targetId, amount, prev.cities, prev.globalStockpiles);
          
          if (result.movement) {
              return {
                  ...prev,
                  cities: prev.cities.map(c => c.id === source.id ? result.city : c),
                  movements: [...prev.movements, result.movement],
                  targetingSourceId: null,
                  selectedCityId: null // Deselect to see map clearly
              };
          }
          return prev;
      });
  };

  const handleEnterTargeting = () => {
      setGameState(prev => ({ ...prev, targetingSourceId: prev.selectedCityId }));
  };

  const handleCancelTargeting = () => {
      setGameState(prev => ({ ...prev, targetingSourceId: null }));
  };

  const togglePause = () => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  const setSpeed = (s: number) => setGameState(prev => ({ ...prev, speed: s }));
  const toggleLanguage = () => setGameState(prev => ({ ...prev, language: prev.language === 'en' ? 'zh' : 'en' }));

  const selectedCity = gameState.cities.find(c => c.id === gameState.selectedCityId) || null;
  const t = STRINGS[gameState.language];

  // FIX: Calculate total upkeep including movements
  const playerCities = gameState.cities.filter(c => c.owner === OwnerType.PLAYER);
  const cityUpkeep = playerCities.reduce((acc, c) => acc + (c.garrison * GAME_BALANCE.MAINTENANCE_PER_TROOP), 0);
  const playerMovements = gameState.movements.filter(m => m.owner === OwnerType.PLAYER);
  const movementUpkeep = playerMovements.reduce((acc, m) => acc + (m.amount * GAME_BALANCE.MAINTENANCE_PER_TROOP), 0);
  
  const totalUpkeep = cityUpkeep + movementUpkeep;

  if (gameState.status === GameStatus.MENU) {
      return (
          <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-8 tracking-tighter z-10">
                   {t.appTitle}
               </h1>
               <div className="bg-slate-900/80 p-8 rounded-xl border border-slate-700 shadow-2xl backdrop-blur z-10">
                   <button onClick={initGame} className="w-64 py-4 bg-blue-600 hover:bg-blue-500 rounded text-xl font-bold transition-all shadow-lg hover:shadow-blue-500/50">
                       {t.menu.start}
                   </button>
               </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {(gameState.status === GameStatus.VICTORY || gameState.status === GameStatus.DEFEAT) && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
               <div className="bg-slate-900 border-2 border-slate-600 p-10 rounded-2xl max-w-lg text-center shadow-2xl">
                    <h2 className={`text-5xl font-bold mb-4 ${gameState.status === GameStatus.VICTORY ? 'text-yellow-400' : 'text-red-500'}`}>
                        {gameState.status === GameStatus.VICTORY ? t.menu.victory : t.menu.defeat}
                    </h2>
                    <p className="text-slate-300 text-lg mb-8">
                        {gameState.status === GameStatus.VICTORY ? t.menu.victoryDesc : t.menu.defeatDesc}
                    </p>
                    <button onClick={goToMenu} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-lg border border-slate-500">
                        {t.menu.returnMenu}
                    </button>
               </div>
          </div>
      )}

      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            {t.appTitle}
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="flex gap-4 text-sm font-mono text-slate-400">
            <div><i className="fas fa-calendar-alt mr-2"></i>{t.year} {gameState.globalStats.year}</div>
            <div><i className="fas fa-users mr-2"></i>{t.pop}: {Math.floor(gameState.globalStats.totalPop).toLocaleString()}</div>
            <div><i className="fas fa-city mr-2"></i>{t.cities}: {gameState.globalStats.totalCities}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <button onClick={goToMenu} className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded border border-red-700 font-bold text-xs">
                <i className="fas fa-times-circle mr-1"></i> {t.menu.resign}
            </button>
            <div className="h-6 w-px bg-slate-700"></div>
            <button onClick={toggleLanguage} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 font-mono">
                {gameState.language === 'en' ? '中文' : 'ENG'}
            </button>
            <div className="flex items-center gap-2">
                <button onClick={togglePause} className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${gameState.isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                    <i className={`fas ${gameState.isPaused ? 'fa-play' : 'fa-pause'}`}></i>
                </button>
                <div className="bg-slate-800 rounded flex overflow-hidden border border-slate-700">
                    <button onClick={() => setSpeed(1)} className={`px-3 py-2 text-xs ${gameState.speed === 1 ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>1x</button>
                    <button onClick={() => setSpeed(5)} className={`px-3 py-2 text-xs ${gameState.speed === 5 ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>5x</button>
                    <button onClick={() => setSpeed(20)} className={`px-3 py-2 text-xs ${gameState.speed === 20 ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>20x</button>
                </div>
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-black">
           <WorldMap 
              cities={gameState.cities} 
              movements={gameState.movements}
              selectedId={gameState.selectedCityId}
              targetingSourceId={gameState.targetingSourceId}
              onSelect={onMapSelect}
              lang={gameState.language}
            />
            {!gameState.selectedCityId && !gameState.targetingSourceId && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur pointer-events-none border border-white/10">
                    {t.clickHint}
                </div>
            )}
            {gameState.targetingSourceId && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-yellow-900/80 text-white px-6 py-3 rounded-lg shadow-xl text-sm font-bold animate-pulse border border-yellow-500 z-50 pointer-events-none">
                    <i className="fas fa-crosshairs mr-2"></i> {t.targetHint}
                </div>
            )}
        </main>

        <aside className="h-full z-10 shadow-xl">
           <InfoPanel 
             city={selectedCity} 
             allCities={gameState.cities}
             globalStockpile={gameState.globalStockpiles[OwnerType.PLAYER]}
             globalRates={gameState.globalRates[OwnerType.PLAYER]}
             totalMaintenance={totalUpkeep}
             lang={gameState.language} 
             onUpgradeAttribute={handleUpgradeAttribute}
             onFoundCity={handleFoundCity}
             onRecruit={handleRecruit}
             onDispatch={handleDispatch}
             targetingId={gameState.targetingSourceId}
             onEnterTargeting={handleEnterTargeting}
             onCancelTargeting={handleCancelTargeting}
            />
        </aside>
      </div>
    </div>
  );
};

export default App;
