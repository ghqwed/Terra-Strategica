
import React, { useState, useEffect } from 'react';
import { City, TerrainType, Language, OwnerType, CityType, Resources } from '../types';
import { TERRAIN_MODIFIERS, STRINGS, GAME_BALANCE } from '../constants';

interface InfoPanelProps {
  city: City | null;
  globalStockpile: Resources;
  globalRates?: Resources;
  totalMaintenance: number;
  lang: Language;
  onUpgradeAttribute: (type: 'level' | 'ind' | 'eco' | 'live' | 'def') => void;
  onFoundCity: () => void;
  onRecruit: (amount: number) => void;
  onDispatch: (targetId: number, amount: number) => void;
  targetingId: number | null; 
  onEnterTargeting: () => void;
  onCancelTargeting: () => void;
  allCities: City[]; 
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
    city, globalStockpile, globalRates, totalMaintenance, lang, 
    onUpgradeAttribute, onFoundCity, onRecruit, onDispatch, 
    targetingId, onEnterTargeting, onCancelTargeting, allCities
}) => {
  const t = STRINGS[lang];
  const [recruitAmount, setRecruitAmount] = useState(10);
  const [dispatchAmount, setDispatchAmount] = useState(10);

  // Reset local state when city changes
  useEffect(() => {
      setRecruitAmount(10);
      setDispatchAmount(10);
  }, [city?.id]);

  const formatRate = (val: number | undefined) => {
      if (val === undefined) return '';
      const sign = val >= 0 ? '+' : '';
      const color = val >= 0 ? 'text-green-400' : 'text-red-400';
      return <span className={`text-[10px] ml-1 ${color}`}>({sign}{val.toFixed(1)})</span>;
  };

  const Treasury = () => (
      <div className="p-4 bg-slate-800 border-b border-slate-700">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
              <span>{t.panel.treasury}</span>
              <span className="text-red-400 text-[10px] normal-case">{t.panel.upkeep}: -${totalMaintenance.toFixed(1)}/tick</span>
          </h3>
          <div className="grid grid-cols-1 gap-1 text-sm">
              <div className="flex justify-between items-center text-yellow-400" title={t.resources.money}>
                  <span><i className="fas fa-coins w-5"></i> {Math.floor(globalStockpile.money)}</span>
                  {formatRate(globalRates?.money)}
              </div>
              <div className="flex justify-between items-center text-orange-400" title={t.resources.industry}>
                  <span><i className="fas fa-hammer w-5"></i> {Math.floor(globalStockpile.industry)}</span>
                  {formatRate(globalRates?.industry)}
              </div>
              <div className="flex justify-between items-center text-blue-400" title={t.resources.manpower}>
                  <span><i className="fas fa-user-friends w-5"></i> {Math.floor(globalStockpile.manpower)}</span>
                  {formatRate(globalRates?.manpower)}
              </div>
          </div>
      </div>
  );

  // LOGIC for Dispatch Mode
  const sourceCity = (targetingId !== null) ? allCities.find(c => c.id === targetingId) : null;
  const isTargetingMode = !!sourceCity;
  
  // If we have selected a different city while in targeting mode, that is our candidate target
  const isTargetSelected = isTargetingMode && city && city.id !== sourceCity?.id;
  
  // Check if it is a valid neighbor
  const isValidTarget = isTargetSelected && sourceCity?.neighbors.includes(city!.id);

  if (!city && !isTargetingMode) {
    return (
      <div className="w-96 bg-slate-900 h-full border-l border-slate-700 flex flex-col">
          <Treasury />
          <div className="flex-1 flex items-center justify-center text-slate-500">
             <div className="text-center">
                <i className="fas fa-globe-asia text-4xl mb-4 opacity-50"></i>
                <p>{t.panel.selectHint}</p>
             </div>
          </div>
      </div>
    );
  }

  // Determine which city to show information for.
  const displayCity = (isTargetingMode && !isTargetSelected) ? sourceCity! : city!;

  const isPlayer = displayCity.owner === OwnerType.PLAYER;
  const isCity = displayCity.type === CityType.CITY;
  const maxGar = GAME_BALANCE.TROOP_CAP_BASE + displayCity.level * GAME_BALANCE.TROOP_CAP_PER_LEVEL;

  // Render Upgrade Helper
  const UpgradeBtn = ({ type, level, icon, label }: { type: any, level: number, icon: string, label: string }) => {
       const costM = Math.floor(GAME_BALANCE.UPGRADE_BASE_MONEY * Math.pow(GAME_BALANCE.UPGRADE_EXP, level));
       const costI = Math.floor(GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, level));
       
       const affordM = globalStockpile.money >= costM;
       const affordI = globalStockpile.industry >= costI;
       const canAfford = affordM && affordI;
       
       const locked = type !== 'level' && level >= displayCity.level;

       return (
           <div className="flex items-center justify-between bg-slate-800 p-2 rounded mb-1">
               <div className="flex items-center text-sm">
                   <i className={`fas ${icon} w-5 text-slate-400`}></i>
                   <span className="text-slate-300 w-16 truncate">{label}</span>
                   <span className="text-white font-bold ml-2">Lv {level}</span>
               </div>
               {isPlayer && isCity && (
                   <button 
                       onClick={() => onUpgradeAttribute(type)}
                       disabled={!canAfford || locked}
                       className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded text-xs text-white flex flex-col items-end min-w-[65px]"
                       title={locked ? `Req: City Lv ${level + 1}` : `Cost: $${costM} + ${costI} Ind`}
                   >
                       <span><i className="fas fa-arrow-up"></i></span>
                       {!locked && (
                           <div className="flex flex-col items-end text-[9px] leading-tight mt-1">
                               <span className={affordM ? "text-slate-300" : "text-red-400 font-bold"}>${costM}</span>
                               <span className={affordI ? "text-slate-300" : "text-red-400 font-bold"}>{costI} Ind</span>
                           </div>
                       )}
                   </button>
               )}
           </div>
       );
  };

  const foundM = GAME_BALANCE.FOUND_CITY_COST_MONEY;
  const foundI = GAME_BALANCE.FOUND_CITY_COST_IND;
  const foundP = GAME_BALANCE.FOUND_CITY_COST_MANPOWER;
  const canFound = globalStockpile.money >= foundM && globalStockpile.industry >= foundI && globalStockpile.manpower >= foundP;

  return (
    <div className="w-96 bg-slate-900 h-full flex flex-col border-l border-slate-700 overflow-y-auto">
      <Treasury />

      {/* DISPATCH MODE HEADER OVERLAY */}
      {isTargetingMode && (
          <div className="bg-yellow-900/40 border-b border-yellow-600 p-4 text-center">
              <div className="text-yellow-400 font-bold mb-1">{t.panel.dispatchBtn}</div>
              <div className="text-xs text-yellow-200 mb-2">From: {sourceCity?.name}</div>
              <div className="text-xs text-slate-300">
                  {isValidTarget ? `To: ${city?.name}` : (isTargetSelected ? "Invalid Target (Not Neighbor)" : t.targetHint)}
              </div>
              <button onClick={onCancelTargeting} className="mt-2 text-xs text-white underline">{t.panel.cancel}</button>
          </div>
      )}

      {/* City Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-800/50">
           <h2 className="text-2xl font-bold text-white mb-1">{displayCity.name}</h2>
           <div className="flex items-center gap-2 mb-2">
               <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{t.terrain[displayCity.terrain]}</span>
               {isCity ? <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-200">Lv {displayCity.level}</span> : 
                         <span className="text-xs px-2 py-0.5 rounded bg-amber-900 text-amber-200">{t.panel.wilderness}</span>}
           </div>
           
           <div className="bg-slate-700 h-4 rounded-full overflow-hidden relative">
               <div className="bg-red-500 h-full transition-all" style={{width: `${(displayCity.garrison / maxGar) * 100}%`}}></div>
               <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow">
                   {Math.floor(displayCity.garrison)} / {maxGar}
               </span>
           </div>
      </div>

      {/* DISPATCH ACTION PANEL (Overrides other panels if targeting and valid) */}
      {isTargetingMode && isValidTarget ? (
           <div className="p-6 bg-slate-800 animate-fade-in">
               <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-600 pb-2">Confirm Orders</h3>
               
               <div className="flex justify-between text-sm mb-2 text-slate-300">
                   <span>Amount: {dispatchAmount}</span>
                   <span>Available: {Math.floor(sourceCity!.garrison)}</span>
               </div>
               <input 
                   type="range" min="1" max={Math.floor(sourceCity!.garrison)} value={dispatchAmount}
                   onChange={(e) => setDispatchAmount(parseInt(e.target.value))}
                   className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer mb-4"
               />
               <button 
                   onClick={() => onDispatch(city!.id, dispatchAmount)}
                   className="w-full py-3 bg-red-600 hover:bg-red-500 rounded text-white font-bold shadow-lg"
               >
                   <i className="fas fa-person-marching mr-2"></i> {t.panel.dispatchBtn}
               </button>
           </div>
      ) : (
        <>
            {/* 1. ATTRIBUTES */}
            {isCity && !isTargetingMode && (
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">{t.panel.attributes}</h3>
                    <UpgradeBtn type="level" level={displayCity.level} icon="fa-landmark" label={t.panel.cityLevel} />
                    <UpgradeBtn type="ind" level={displayCity.indLevel} icon="fa-industry" label={t.panel.indLevel} />
                    <UpgradeBtn type="eco" level={displayCity.ecoLevel} icon="fa-coins" label={t.panel.ecoLevel} />
                    <UpgradeBtn type="live" level={displayCity.liveLevel} icon="fa-home" label={t.panel.liveLevel} />
                    <UpgradeBtn type="def" level={displayCity.defLevel} icon="fa-shield-alt" label={t.panel.defLevel} />
                </div>
            )}

            {/* 2. RECRUITMENT */}
            {isPlayer && isCity && !isTargetingMode && (
                <div className="p-6 border-b border-slate-800 bg-blue-900/10">
                    <h3 className="text-xs font-bold text-blue-400 uppercase mb-3">{t.panel.recruit}</h3>
                    <div className="flex flex-col mb-2 text-sm text-slate-300">
                        <div className="flex justify-between">
                            <span>{t.panel.recruitBtn}: {recruitAmount}</span>
                            <span className="text-xs opacity-60">{Math.floor(recruitAmount * GAME_BALANCE.RECRUIT_COST_MONEY)}$ / {Math.floor(recruitAmount * GAME_BALANCE.RECRUIT_COST_MANPOWER)}MP</span>
                        </div>
                        <div className="text-[10px] text-red-400 text-right mt-1">
                            {t.panel.recruitMaintenance} ${(recruitAmount * GAME_BALANCE.MAINTENANCE_PER_TROOP).toFixed(2)}/tick
                        </div>
                    </div>
                    <input 
                        type="range" min="1" max={Math.max(1, maxGar - displayCity.garrison)} value={recruitAmount} 
                        onChange={(e) => setRecruitAmount(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-3"
                    />
                    <button 
                        onClick={() => onRecruit(recruitAmount)}
                        disabled={globalStockpile.manpower < recruitAmount || globalStockpile.money < recruitAmount * GAME_BALANCE.RECRUIT_COST_MONEY}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 rounded text-sm font-bold text-white"
                    >
                        {t.panel.recruitBtn}
                    </button>
                </div>
            )}

            {/* 3. ACTIONS */}
            {isPlayer && !isTargetingMode && (
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">{t.panel.actions}</h3>
                    {isCity ? (
                        <button 
                            onClick={onEnterTargeting}
                            disabled={displayCity.garrison < 1}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold mb-2 border border-slate-600"
                        >
                            <i className="fas fa-route mr-2"></i> {t.panel.dispatchBtn}
                        </button>
                    ) : (
                        <button 
                            onClick={onFoundCity}
                            disabled={!canFound} 
                            className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-bold border border-amber-600 flex flex-col items-center justify-center"
                        >
                            <span><i className="fas fa-hammer mr-2"></i> {t.panel.foundCity}</span>
                            <span className="text-[10px] font-normal opacity-80 mt-1">
                                ${foundM} + {foundI} Ind + {foundP} MP
                            </span>
                        </button>
                    )}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default InfoPanel;
