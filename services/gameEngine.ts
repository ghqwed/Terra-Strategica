
import { City, TerrainType, OwnerType, Resources, CityType, GameState, GameStatus, TroopMovement } from '../types';
import { TERRAIN_MODIFIERS, COMBAT_CONSTANTS, GAME_BALANCE, CITY_NAMES_PREFIX, CITY_NAMES_SUFFIX } from '../constants';

const generateName = (id: number) => {
  const p = CITY_NAMES_PREFIX[id % CITY_NAMES_PREFIX.length];
  const s = CITY_NAMES_SUFFIX[(id * 3) % CITY_NAMES_SUFFIX.length];
  return `${p}${s}`;
};

export const processTick = (state: GameState): GameState => {
  if (state.status !== GameStatus.PLAYING) return state;

  let nextCities = state.cities.map(c => ({ ...c }));
  let nextMovements = [...state.movements];
  let nextStockpiles: Record<OwnerType, Resources> = {
      [OwnerType.PLAYER]: { ...state.globalStockpiles[OwnerType.PLAYER] },
      [OwnerType.AI_EMPIRE]: { ...state.globalStockpiles[OwnerType.AI_EMPIRE] },
      [OwnerType.INDEPENDENT]: { ...state.globalStockpiles[OwnerType.INDEPENDENT] },
      [OwnerType.BARBARIAN]: { ...state.globalStockpiles[OwnerType.BARBARIAN] }
  };
  
  // Initialize nextRates
  let nextRates: Record<OwnerType, Resources> = {
      [OwnerType.PLAYER]: { food:0, industry:0, money:0, science:0, materials:0, manpower:0 },
      [OwnerType.AI_EMPIRE]: { food:0, industry:0, money:0, science:0, materials:0, manpower:0 },
      [OwnerType.INDEPENDENT]: { food:0, industry:0, money:0, science:0, materials:0, manpower:0 },
      [OwnerType.BARBARIAN]: { food:0, industry:0, money:0, science:0, materials:0, manpower:0 }
  };

  // --- 1. GLOBAL ECONOMY & CITY UPDATES ---
  nextCities = nextCities.map(city => {
    if (city.terrain === TerrainType.WATER) return city;

    const mods = TERRAIN_MODIFIERS[city.terrain];
    const efficiency = city.type === CityType.WILDERNESS ? 0.1 : 1.0;

    // Production based on Attribute Levels
    // IndLevel -> Industry, EcoLevel -> Money, LiveLevel -> Manpower
    const production: Resources = {
      food: city.population * 0.01 * mods.food, // basic subsistence
      industry: city.indLevel * 0.5 * mods.ind * efficiency,
      money: city.ecoLevel * 1.0 * mods.money * efficiency,
      manpower: city.liveLevel * 0.5 * mods.food * efficiency,
      science: 0,
      materials: 0
    };

    // Maintenance
    const maintenance = city.garrison * GAME_BALANCE.MAINTENANCE_PER_TROOP;

    // Global Stockpile Update
    const ownerStock = nextStockpiles[city.owner];
    if (ownerStock) {
        ownerStock.industry += production.industry;
        ownerStock.money = Math.max(0, ownerStock.money + production.money - maintenance);
        ownerStock.manpower += production.manpower;
    }
    
    // Update Rates
    const ownerRates = nextRates[city.owner];
    if (ownerRates) {
        ownerRates.food += production.food;
        ownerRates.industry += production.industry;
        ownerRates.money += production.money - maintenance;
        ownerRates.manpower += production.manpower;
        ownerRates.science += production.science;
        ownerRates.materials += production.materials;
    }

    // Population Growth
    let r = 0.01 + (city.liveLevel * 0.005); // More housing = faster growth
    if (city.isUnderSiege) r = -0.05;
    const growth = r * city.population * (1 - city.population / (city.carryingCapacity + city.level * 200));
    const newPop = Math.max(0, city.population + (isNaN(growth) ? 0 : growth));

    return {
      ...city,
      population: newPop,
      productionPerTick: production,
    };
  });

  // --- 2. MOVEMENT & COLLISION ---
  // Advance all movements
  const remainingMovements: TroopMovement[] = [];
  const cityMap = new Map(nextCities.map(c => [c.id, c]));

  nextMovements.forEach(mov => {
      // Maintenance for moving troops
      const upkeep = mov.amount * GAME_BALANCE.MAINTENANCE_PER_TROOP;
      const ownerStock = nextStockpiles[mov.owner];
      const ownerRate = nextRates[mov.owner];

      if (ownerStock) {
          ownerStock.money = Math.max(0, ownerStock.money - upkeep);
      }
      if (ownerRate) {
          ownerRate.money -= upkeep;
      }

      mov.progress += GAME_BALANCE.MOVEMENT_SPEED;
      
      if (mov.progress >= 1.0) {
          // ARRIVAL LOGIC
          const target = cityMap.get(mov.targetId);
          if (target) {
              if (target.owner === mov.owner) {
                  // Reinforce
                  target.garrison += mov.amount;
              } else {
                  // Combat / Invasion
                  resolveArrivalCombat(mov, target, nextStockpiles);
              }
          }
      } else {
          remainingMovements.push(mov);
      }
  });

  // --- 3. AI LOGIC ---
  if (state.tickCount % GAME_BALANCE.AI_THINK_INTERVAL === 0) {
      processAiTurn(nextCities, nextStockpiles, remainingMovements);
  }

  // --- 4. GAME OVER CHECK ---
  const playerCities = nextCities.filter(c => c.owner === OwnerType.PLAYER);
  const totalCities = nextCities.filter(c => c.type === CityType.CITY).length;
  let newStatus: GameStatus = state.status;
  let winner = state.winner;

  if (playerCities.length === 0 && state.tickCount > 10) {
      newStatus = GameStatus.DEFEAT;
      winner = OwnerType.AI_EMPIRE;
  } else if (playerCities.length === totalCities && totalCities > 0) {
      newStatus = GameStatus.VICTORY;
      winner = OwnerType.PLAYER;
  }

  return {
      ...state,
      cities: nextCities,
      globalStockpiles: nextStockpiles,
      globalRates: nextRates,
      movements: remainingMovements,
      status: newStatus,
      winner: winner
  };
};

// --- COMBAT LOGIC ---
const resolveArrivalCombat = (mov: TroopMovement, defender: City, stockpiles: Record<OwnerType, Resources>) => {
    // Instant resolution for gameplay speed
    const terrain = TERRAIN_MODIFIERS[defender.terrain];
    
    // Defender Bonus: Base + DefLevel * 5% + Terrain
    const defBonus = 1 + (defender.defLevel * 0.05) + terrain.def;
    
    // Attacker Damage
    const atkDmg = mov.amount * COMBAT_CONSTANTS.BASE_DAMAGE;
    // Defender Damage
    const defDmg = defender.garrison * COMBAT_CONSTANTS.BASE_DAMAGE * defBonus;

    // Apply casualties
    const defLoss = Math.min(defender.garrison, atkDmg);
    const atkLoss = Math.min(mov.amount, defDmg);

    defender.garrison -= defLoss;
    const survivors = mov.amount - atkLoss;

    // Logs
    const now = Math.floor(Date.now() / 1000);
    defender.lastCombatLog = { attackerName: "Invasion Force", damageTaken: defLoss, round: now };

    // Conquest
    if (defender.garrison <= 1 && survivors > 0) {
        // City falls
        const oldOwner = defender.owner;
        
        defender.owner = mov.owner;
        defender.garrison = survivors;
        defender.morale = 50;
        
        // Loot
        if (stockpiles[oldOwner] && stockpiles[mov.owner]) {
             stockpiles[mov.owner].money += stockpiles[oldOwner].money * 0.1;
             stockpiles[oldOwner].money *= 0.9;
        }

        // Damage infrastructure
        if (defender.type === CityType.CITY) {
            defender.level = Math.max(1, defender.level - 1);
            defender.defLevel = Math.max(0, defender.defLevel - 1);
        }
    }
    // If defenders hold, attack is repelled (survivors retreat or die - simplifying to die/disband for now)
};

// --- AI LOGIC ---
const processAiTurn = (cities: City[], stockpiles: Record<OwnerType, Resources>, movements: TroopMovement[]) => {
    const aiStock = stockpiles[OwnerType.AI_EMPIRE];
    // Filter only AI owned cities (both wilderness and cities)
    const aiHoldings = cities.filter(c => c.owner === OwnerType.AI_EMPIRE);

    // 1. DEVELOPMENT LOGIC (Founding Cities & Upgrades)
    aiHoldings.forEach(holding => {
        // A. FOUND CITY: Convert conquered wilderness into productive cities
        if (holding.type === CityType.WILDERNESS) {
             const costM = GAME_BALANCE.FOUND_CITY_COST_MONEY;
             const costI = GAME_BALANCE.FOUND_CITY_COST_IND;
             const costP = GAME_BALANCE.FOUND_CITY_COST_MANPOWER;
             
             if (aiStock.money > costM * 1.5 && aiStock.industry > costI * 1.5 && aiStock.manpower > costP * 1.5) {
                 // Call the founding logic manually here to update state in place for this tick
                 aiStock.money -= costM;
                 aiStock.industry -= costI;
                 aiStock.manpower -= costP;
                 
                 holding.name = generateName(holding.id);
                 holding.type = CityType.CITY;
                 holding.level = 1;
                 holding.indLevel = 1; holding.ecoLevel = 1; holding.liveLevel = 1; holding.defLevel = 1;
                 holding.population = 500;
                 holding.carryingCapacity = TERRAIN_MODIFIERS[holding.terrain].cap;
                 holding.garrison += 50; // Initial defense for new city
             }
             return; // Skip other upgrades if it's wilderness
        }

        // B. UPGRADE ATTRIBUTES: Balance economy and military
        // Prioritize Economy (Money) -> Industry -> Livelihood (Manpower) -> Defense
        // Only upgrade if we have surplus funds (save for army maintenance)
        if (holding.level < 5 && Math.random() > 0.7) {
             const costM = GAME_BALANCE.UPGRADE_BASE_MONEY * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.level);
             
             if (aiStock.money > costM * 3) { // Ensure safe buffer
                 // Upgrade City Hall first if maxed out attributes
                 if (holding.indLevel >= holding.level && holding.ecoLevel >= holding.level) {
                     aiStock.money -= costM;
                     aiStock.industry -= GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.level);
                     holding.level++;
                 } else {
                     // Upgrade attributes
                     const attrCostM = GAME_BALANCE.UPGRADE_BASE_MONEY * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.indLevel);
                     if (aiStock.money > attrCostM * 2) {
                         // Pick based on need
                         if (aiStock.money < 500 && holding.ecoLevel < holding.level) {
                             aiStock.money -= attrCostM;
                             aiStock.industry -= GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.ecoLevel);
                             holding.ecoLevel++;
                         } else if (aiStock.industry < 300 && holding.indLevel < holding.level) {
                             aiStock.money -= attrCostM;
                             aiStock.industry -= GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.indLevel);
                             holding.indLevel++;
                         } else if (holding.liveLevel < holding.level) {
                             aiStock.money -= attrCostM;
                             aiStock.industry -= GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, holding.liveLevel);
                             holding.liveLevel++;
                         }
                     }
                 }
             }
        }
    });

    // 2. RECRUITMENT LOGIC
    // Maintain a baseline defense in all cities
    aiHoldings.forEach(city => {
        if (city.type === CityType.WILDERNESS) return;
        
        const maxGar = GAME_BALANCE.TROOP_CAP_BASE + city.level * GAME_BALANCE.TROOP_CAP_PER_LEVEL;
        const maintenanceCost = (city.garrison + 20) * GAME_BALANCE.MAINTENANCE_PER_TROOP;
        
        // Only recruit if we can afford the upkeep projected
        if (city.garrison < maxGar * 0.8 && aiStock.money > 200 && aiStock.manpower > 50) {
             // Check if future income can support it
             // Simple heuristic: current money stockpile > 200 means we are okay for now
             const recruitAmount = 20;
             const costM = recruitAmount * GAME_BALANCE.RECRUIT_COST_MONEY;
             
             if (aiStock.money > costM && aiStock.manpower > recruitAmount) {
                 aiStock.money -= costM;
                 aiStock.industry -= recruitAmount * GAME_BALANCE.RECRUIT_COST_IND;
                 aiStock.manpower -= recruitAmount;
                 city.garrison += recruitAmount;
             }
        }
    });

    // 3. EXPANSION / MILITARY LOGIC
    aiHoldings.forEach(city => {
        if (city.garrison > 50) {
            // Find target
            const neighbors = city.neighbors.map(id => cities.find(c => c.id === id)!).filter(n => n);
            
            // PRIORITY 1: Conquering neighboring Wilderness (Easy Expansion)
            const wildNeighbors = neighbors.filter(n => n.type === CityType.WILDERNESS && n.owner !== OwnerType.AI_EMPIRE);
            if (wildNeighbors.length > 0) {
                 const target = wildNeighbors[0];
                 // Attack if we have enough troops to surely win (Wilderness usually has 10-20 garrison)
                 if (city.garrison > 40) {
                      const amount = 30;
                      city.garrison -= amount;
                      movements.push({
                          id: `ai-exp-${Date.now()}-${city.id}`,
                          sourceId: city.id,
                          targetId: target.id,
                          owner: OwnerType.AI_EMPIRE,
                          amount: amount,
                          progress: 0,
                          startPos: city.pos,
                          endPos: target.pos,
                          color: '#ef4444'
                      });
                      return; // One action per city per turn
                 }
            }

            // PRIORITY 2: Attack Enemies (Player or Independent Cities)
            const enemies = neighbors.filter(n => n.owner !== OwnerType.AI_EMPIRE && n.owner !== OwnerType.BARBARIAN && n.type === CityType.CITY);
            if (enemies.length > 0) {
                // Find weakest neighbor
                const target = enemies.sort((a,b) => a.garrison - b.garrison)[0];
                
                // Attack if we have advantage (e.g. 1.5x troops)
                if (city.garrison > target.garrison * 1.5 && city.garrison > 60) {
                    const amount = city.garrison * 0.7; // Commit 70% of forces
                    city.garrison -= amount;
                    movements.push({
                        id: `ai-atk-${Date.now()}-${city.id}`,
                        sourceId: city.id,
                        targetId: target.id,
                        owner: OwnerType.AI_EMPIRE,
                        amount: amount,
                        progress: 0,
                        startPos: city.pos,
                        endPos: target.pos,
                        color: '#ef4444'
                    });
                }
            }
        }
    });
};


// --- PLAYER ACTIONS ---

export const recruitTroops = (city: City, amount: number, stockpiles: Record<OwnerType, Resources>): { city: City, stockpiles: Record<OwnerType, Resources> } => {
    const ownerStock = stockpiles[city.owner];
    const moneyCost = amount * GAME_BALANCE.RECRUIT_COST_MONEY;
    const indCost = amount * GAME_BALANCE.RECRUIT_COST_IND;
    const manCost = amount * GAME_BALANCE.RECRUIT_COST_MANPOWER;
    
    // Check Cap
    const maxGar = GAME_BALANCE.TROOP_CAP_BASE + city.level * GAME_BALANCE.TROOP_CAP_PER_LEVEL;
    const actualAmount = Math.min(amount, maxGar - city.garrison);

    if (actualAmount <= 0) return { city, stockpiles };

    if (ownerStock.money >= moneyCost && ownerStock.industry >= indCost && ownerStock.manpower >= manCost) {
        ownerStock.money -= moneyCost;
        ownerStock.industry -= indCost;
        ownerStock.manpower -= manCost;
        return { city: { ...city, garrison: city.garrison + actualAmount }, stockpiles };
    }
    return { city, stockpiles };
};

export const upgradeAttribute = (city: City, type: 'level' | 'ind' | 'eco' | 'live' | 'def', stockpiles: Record<OwnerType, Resources>): { city: City, stockpiles: Record<OwnerType, Resources> } => {
    const currentLvl = type === 'level' ? city.level : (city as any)[`${type}Level`];
    
    // Check Cap: Attributes cannot exceed City Level (except City Level itself)
    if (type !== 'level' && currentLvl >= city.level) return { city, stockpiles };

    const costM = GAME_BALANCE.UPGRADE_BASE_MONEY * Math.pow(GAME_BALANCE.UPGRADE_EXP, currentLvl);
    const costI = GAME_BALANCE.UPGRADE_BASE_IND * Math.pow(GAME_BALANCE.UPGRADE_EXP, currentLvl);
    
    const ownerStock = stockpiles[city.owner];
    if (ownerStock.money >= costM && ownerStock.industry >= costI) {
        ownerStock.money -= costM;
        ownerStock.industry -= costI;
        
        const newCity = { ...city };
        if (type === 'level') newCity.level++;
        else if (type === 'ind') newCity.indLevel++;
        else if (type === 'eco') newCity.ecoLevel++;
        else if (type === 'live') newCity.liveLevel++;
        else if (type === 'def') newCity.defLevel++;

        return { city: newCity, stockpiles };
    }
    return { city, stockpiles };
};

export const dispatchTroops = (source: City, targetId: number, amount: number, allCities: City[], stockpiles: Record<OwnerType, Resources>): { city: City, movement: TroopMovement | null } => {
    if (source.garrison < amount) return { city: source, movement: null };

    const target = allCities.find(c => c.id === targetId);
    if (!target) return { city: source, movement: null };

    const newCity = { ...source, garrison: source.garrison - amount };
    const movement: TroopMovement = {
        id: `pl-${Date.now()}`,
        sourceId: source.id,
        targetId: targetId,
        owner: source.owner,
        amount: amount,
        progress: 0,
        startPos: source.pos,
        endPos: target.pos,
        color: '#3b82f6'
    };
    
    return { city: newCity, movement };
};

export const foundCity = (city: City, stockpiles: Record<OwnerType, Resources>): { city: City, stockpiles: Record<OwnerType, Resources> } => {
    const costM = GAME_BALANCE.FOUND_CITY_COST_MONEY;
    const costI = GAME_BALANCE.FOUND_CITY_COST_IND;
    const costMan = GAME_BALANCE.FOUND_CITY_COST_MANPOWER;
    const ownerStock = stockpiles[city.owner];
    
    if (city.type === CityType.WILDERNESS && ownerStock.money >= costM && ownerStock.industry >= costI && ownerStock.manpower >= costMan) {
        ownerStock.money -= costM;
        ownerStock.industry -= costI;
        ownerStock.manpower -= costMan;
        
        return { 
            city: {
                ...city,
                name: generateName(city.id),
                type: CityType.CITY,
                level: 1,
                indLevel: 1, ecoLevel: 1, liveLevel: 1, defLevel: 1,
                population: 500,
                carryingCapacity: TERRAIN_MODIFIERS[city.terrain].cap,
                // Do not reset garrison. Keep existing troops and add bonus 50 militia.
                garrison: city.garrison + 50
            }, 
            stockpiles 
        };
    }
    return { city, stockpiles };
};
