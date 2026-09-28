export type PumpSlot = {
  pump: 1 | 2 | 3 | 4;
  materialId: string;
  materialName: string;
  materialNameEn: string;
  noteRoleZh: string;
  noteRoleEn: string;
  colorNameZh: string;
  colorNameEn: string;
  colorHex: string;
  dyeRecipeZh: string;
  dyeRecipeEn: string;
  /** 路演模拟液的建议起始浓度，质量/体积百分比（% w/v），不是真实香精浓度。 */
  dyeConcentrationPctWv: number;
  /** 20°C 下的估算密度；正式使用前应逐泵实测。 */
  estimatedDensityGPerMl: number;
};

export type HardwareProfile = {
  deviceId: string;
  name: string;
  pumps: PumpSlot[];
};

/**
 * 四泵路演固定装载方案。真实换瓶时只改这里，不改配方算法和串口代码。
 * 实体介质是食品级水溶性色素模拟液；香气名称仅表示 Agent 中的概念角色。
 * 浓度为低染色风险的建议起点，密度按近似纯水估算，正式路演前必须逐泵称量校准。
 */
export const activeHardwareProfile: HardwareProfile = {
  deviceId: 'aromacell-01',
  name: 'Aromacell 四泵彩色液体演示机',
  pumps: [
    {
      pump: 1,
      materialId: 'japanese-citrus',
      materialName: '日系柑橘',
      materialNameEn: 'Japanese Citrus',
      noteRoleZh: '明亮前调',
      noteRoleEn: 'Bright top note',
      colorNameZh: '柠檬黄',
      colorNameEn: 'Lemon yellow',
      colorHex: '#F2C94C',
      dyeRecipeZh: '蒸馏水 + 食品级柠檬黄色素',
      dyeRecipeEn: 'Distilled water + food-grade yellow dye',
      dyeConcentrationPctWv: 0.02,
      estimatedDensityGPerMl: 0.998
    },
    {
      pump: 2,
      materialId: 'sea-breeze-bell',
      materialName: '海上风铃',
      materialNameEn: 'Sea Breeze Bell',
      noteRoleZh: '水感前/中调',
      noteRoleEn: 'Watery top/heart note',
      colorNameZh: '海盐蓝',
      colorNameEn: 'Sea-salt blue',
      colorHex: '#58B9D4',
      dyeRecipeZh: '蒸馏水 + 食品级亮蓝色素',
      dyeRecipeEn: 'Distilled water + food-grade blue dye',
      dyeConcentrationPctWv: 0.005,
      estimatedDensityGPerMl: 0.998
    },
    {
      pump: 3,
      materialId: 'osmanthus-oolong',
      materialName: '桂花乌龙',
      materialNameEn: 'Osmanthus Oolong',
      noteRoleZh: '柔和中调',
      noteRoleEn: 'Soft heart note',
      colorNameZh: '桂花琥珀',
      colorNameEn: 'Osmanthus amber',
      colorHex: '#E69555',
      dyeRecipeZh: '蒸馏水 + 黄色/红色食用色素（约 6:1）',
      dyeRecipeEn: 'Distilled water + yellow/red food dye (about 6:1)',
      dyeConcentrationPctWv: 0.014,
      estimatedDensityGPerMl: 0.998
    },
    {
      pump: 4,
      materialId: 'desert-rose',
      materialName: '无人之境玫瑰',
      materialNameEn: 'Desert Rose',
      noteRoleZh: '花香木质后调',
      noteRoleEn: 'Floral woody base note',
      colorNameZh: '玫瑰红',
      colorNameEn: 'Rose pink',
      colorHex: '#D96B86',
      dyeRecipeZh: '蒸馏水 + 食品级红色色素',
      dyeRecipeEn: 'Distilled water + food-grade red dye',
      dyeConcentrationPctWv: 0.008,
      estimatedDensityGPerMl: 0.998
    }
  ]
};

export const activeMaterialIds = activeHardwareProfile.pumps.map((slot) => slot.materialId);

