
import { TerrainType, OwnerType, CityType } from './types';

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
export const NUM_SITES = 150; 
export const NUM_RELAXATION_STEPS = 2; 

export const COLORS = {
  [TerrainType.PLAINS]: '#86efac', 
  [TerrainType.FOREST]: '#166534', 
  [TerrainType.DESERT]: '#fde047', 
  [TerrainType.MOUNTAIN]: '#94a3b8', 
  [TerrainType.WATER]: '#3b82f6', 
  [TerrainType.SWAMP]: '#4d7c0f', 
};

export const OWNER_COLORS = {
  [OwnerType.PLAYER]: '#3b82f6', 
  [OwnerType.AI_EMPIRE]: '#ef4444', 
  [OwnerType.INDEPENDENT]: '#f97316', 
  [OwnerType.BARBARIAN]: '#374151', 
};

export const GAME_BALANCE = {
  TROOP_CAP_PER_LEVEL: 100,
  TROOP_CAP_BASE: 50,
  
  // Upgrade Costs
  UPGRADE_BASE_MONEY: 100,
  UPGRADE_BASE_IND: 50,
  UPGRADE_EXP: 1.2, // Cost multiplier per level

  // Recruitment
  RECRUIT_COST_MONEY: 1, // per soldier
  RECRUIT_COST_IND: 0.5, // per soldier
  RECRUIT_COST_MANPOWER: 1, // per soldier
  MAINTENANCE_PER_TROOP: 0.02, // Money per tick per soldier

  FOUND_CITY_COST_MONEY: 500,
  FOUND_CITY_COST_IND: 300,
  FOUND_CITY_COST_MANPOWER: 200,

  AI_THINK_INTERVAL: 20,
  MOVEMENT_SPEED: 0.02, // Progress per tick (approx 50 ticks to travel)
};

export const TERRAIN_MODIFIERS = {
  [TerrainType.PLAINS]: { food: 1.5, ind: 1.0, money: 1.0, sci: 0.8, mat: 0.5, cap: 2000, def: 0.5, combatWidth: 1000 }, 
  [TerrainType.FOREST]: { food: 0.8, ind: 1.5, money: 0.8, sci: 0.9, mat: 1.5, cap: 1200, def: 1.2, combatWidth: 50 },  
  [TerrainType.DESERT]: { food: 0.2, ind: 0.5, money: 2.0, sci: 1.2, mat: 0.8, cap: 500, def: 0.8, combatWidth: 1000 },
  [TerrainType.MOUNTAIN]: { food: 0.3, ind: 0.8, money: 0.5, sci: 1.5, mat: 2.0, cap: 300, def: 2.0, combatWidth: 20 }, 
  [TerrainType.SWAMP]: { food: 0.9, ind: 0.4, money: 0.4, sci: 1.1, mat: 0.6, cap: 800, def: 0.9, combatWidth: 40 },
  [TerrainType.WATER]: { food: 0, ind: 0, money: 0, sci: 0, mat: 0, cap: 0, def: 0, combatWidth: 0 },
};

export const COMBAT_CONSTANTS = {
  BASE_DAMAGE: 0.2, // Higher damage for instant resolution
  SIEGE_THRESHOLD: 0.2, 
  WAR_AGGRESSION: 0.01 
};

export const CITY_NAMES_PREFIX = ["天", "龙", "金", "北", "南", "西", "东", "长", "安", "宁", "平", "定", "盛", "新"];
export const CITY_NAMES_SUFFIX = ["京", "都", "城", "港", "州", "山", "原", "堡", "镇", "关", "江", "川"];

export const STRINGS = {
  en: {
    appTitle: "TERRA STRATEGICA",
    year: "Year",
    pop: "Pop",
    cities: "Cities",
    generating: "Generating World...",
    clickHint: "Click a region to inspect",
    targetHint: "SELECT DESTINATION",
    menu: {
      start: "START GAME",
      resume: "RESUME",
      restart: "PLAY AGAIN",
      returnMenu: "RETURN TO MENU",
      resign: "RESIGN",
      victory: "VICTORY!",
      defeat: "DEFEAT",
      victoryDesc: "You have united the continent.",
      defeatDesc: "Your civilization has fallen."
    },
    legend: {
      title: "Dominions",
      player: "Player",
      empire: "Rival Empire",
      cityState: "City State",
      barbarian: "Wilderness",
      siege: "Siege"
    },
    panel: {
      selectHint: "Select a region.",
      treasury: "National Treasury",
      cityLevel: "City Hall",
      attributes: "Infrastructure",
      indLevel: "Industry",
      ecoLevel: "Commerce",
      liveLevel: "Housing",
      defLevel: "Defense",
      recruit: "Recruitment",
      recruitBtn: "Recruit",
      recruitHint: "Cost: $1 + 0.5 Ind + 1 Manpower per unit",
      recruitMaintenance: "Upkeep increase:",
      dispatch: "Dispatch Army",
      dispatchBtn: "March",
      target: "Target",
      none: "None",
      actions: "Actions",
      foundCity: "Found City",
      wilderness: "Wilderness",
      siege: "Siege",
      garrison: "Garrison",
      cap: "Cap",
      upgrade: "Upgrade",
      max: "Max",
      cancel: "Cancel",
      upkeep: "Upkeep"
    },
    resources: {
      food: "Food",
      industry: "Ind",
      money: "Money",
      science: "Sci",
      manpower: "Manpower",
      material: "Mat"
    },
    terrain: {
      [TerrainType.PLAINS]: 'Plains',
      [TerrainType.FOREST]: 'Forest',
      [TerrainType.DESERT]: 'Desert',
      [TerrainType.MOUNTAIN]: 'Mountain',
      [TerrainType.WATER]: 'Water',
      [TerrainType.SWAMP]: 'Swamp'
    },
    terrainDesc: {
        [TerrainType.MOUNTAIN]: "Mountain",
        [TerrainType.PLAINS]: "Plains",
        [TerrainType.DESERT]: "Desert",
        [TerrainType.FOREST]: "Forest",
        [TerrainType.SWAMP]: "Swamp",
        [TerrainType.WATER]: "Water"
    }
  },
  zh: {
    appTitle: "泰拉战略：地缘模拟",
    year: "年份",
    pop: "总人口",
    cities: "城市",
    generating: "正在生成世界...",
    clickHint: "点击区域查看详细数据",
    targetHint: "请点击目的地进行调动或进攻",
    menu: {
      start: "开始游戏",
      resume: "继续游戏",
      restart: "重新开始",
      returnMenu: "返回主菜单",
      resign: "放弃 / 退出",
      victory: "征服胜利！",
      defeat: "帝国陨落",
      victoryDesc: "您已将这片大陆统一。",
      defeatDesc: "您的文明已消逝。"
    },
    legend: {
      title: "势力范围",
      player: "玩家直辖",
      empire: "敌对帝国",
      cityState: "独立城邦",
      barbarian: "荒野/蛮族",
      siege: "被围困"
    },
    panel: {
      selectHint: "请选择一个区域。",
      treasury: "国家战略资源",
      cityLevel: "市政厅等级",
      attributes: "城市基础设施",
      indLevel: "工业区",
      ecoLevel: "商业区",
      liveLevel: "居民区",
      defLevel: "防御工事",
      recruit: "征召部队",
      recruitBtn: "征兵",
      recruitHint: "单兵成本：$1 + 0.5工业 + 1人力",
      recruitMaintenance: "新增维护费:",
      dispatch: "军事行动",
      dispatchBtn: "出征 / 调动",
      target: "目标区域",
      none: "未选择",
      actions: "行政指令",
      foundCity: "建立新城",
      wilderness: "荒野区域",
      siege: "被围困",
      garrison: "当前驻军",
      cap: "上限",
      upgrade: "升级",
      max: "最大",
      cancel: "取消",
      upkeep: "军队总维护费"
    },
    resources: {
      food: "食物",
      industry: "工业",
      money: "金钱",
      science: "科研",
      manpower: "人力",
      material: "物资"
    },
    terrain: {
      [TerrainType.PLAINS]: '平原',
      [TerrainType.FOREST]: '森林',
      [TerrainType.DESERT]: '沙漠',
      [TerrainType.MOUNTAIN]: '山脉',
      [TerrainType.WATER]: '水域',
      [TerrainType.SWAMP]: '沼泽'
    },
    terrainDesc: {
        [TerrainType.MOUNTAIN]: "天险地形。防御加成极高。",
        [TerrainType.PLAINS]: "开阔地形。适合大军团作战。",
        [TerrainType.DESERT]: "贫瘠之地。补给困难。",
        [TerrainType.FOREST]: "林地。提供防御掩护。",
        [TerrainType.SWAMP]: "沼泽。行军缓慢。",
        [TerrainType.WATER]: "不可通行。"
    }
  }
};
