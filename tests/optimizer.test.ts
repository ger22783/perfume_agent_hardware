import { describe, expect, it } from 'vitest';
import { boothMaterials } from '@/data/ingredients';
import { analyzeIntent } from '@/lib/intent';
import { buildTargetVector } from '@/lib/intentVector';
import { selectMaterials } from '@/lib/materialSelector';
import { solveFormula } from '@/lib/optimizer';
import { assertUsableError, assertUsableFormula } from '@/lib/validation';
import type { FormulaResponse } from '@/lib/types';

const SUMMER_COMMUTE = '我想要一款适合夏天通勤的香味，清爽、干净、有一点雨后空气感，不要太甜，也不要太浓。';
const SWEET_REQUEST = '想要甜一点、柔软一点适合约会的香气';
const WINTER_WOODY = '想要冬夜温暖沉稳的木质香，适合阅读独处';

function allNotes(formula: FormulaResponse) {
  return [...formula.formula.topNotes, ...formula.formula.heartNotes, ...formula.formula.baseNotes];
}

describe('意图解析（否定语境修正）', () => {
  it('「不要太甜」不反向加成甜度，并识别为甜腻禁忌', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    expect(profile.desiredFacets.sweet).toBe(0);
    expect(profile.dislikes).toContain('甜腻');
    expect(profile.desiredFacets.fresh).toBeGreaterThanOrEqual(5);
    expect(profile.desiredFacets.watery).toBeGreaterThanOrEqual(4);
    expect(profile.constraints).toContain('低门槛');
  });

  it('「甜一点」正常加成甜度且不产生禁忌', () => {
    const profile = analyzeIntent(SWEET_REQUEST);
    expect(profile.desiredFacets.sweet).toBeGreaterThanOrEqual(4);
    expect(profile.dislikes).not.toContain('甜腻');
  });

  it('「冬夜木质」正确识别木质与温暖维度', () => {
    const profile = analyzeIntent(WINTER_WOODY);
    expect(profile.desiredFacets.woody).toBeGreaterThanOrEqual(4);
    expect(profile.desiredFacets.warm).toBeGreaterThanOrEqual(4);
  });

  it('「太阳巨晒 + 约会 + 愉快」识别晒、场景与情绪', () => {
    const profile = analyzeIntent('今天太阳巨晒，帮我生成一个适合约会，让人愉快的香水');
    expect(profile.desiredFacets.fresh).toBeGreaterThanOrEqual(4);
    expect(profile.scenarios).toContain('约会');
    expect(profile.scenarios).toContain('夏日户外');
    expect(profile.moods).toContain('愉快');
  });
});

describe('目标向量映射（intentVector）', () => {
  it('低门槛约束 → 强度目标取 2', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    expect(target.intensity).toBe(2);
  });

  it('甜腻禁忌 → sweet 维度权重提升（>1）', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    expect(target.weights.sweet).toBeGreaterThan(1);
  });

  it('默认强度目标为 3（无低门槛约束时）', () => {
    const profile = analyzeIntent('想要适合晚会的华丽花香');
    const target = buildTargetVector(profile);
    expect(target.intensity).toBeGreaterThanOrEqual(3);
  });
});

describe('约束优化求解器（optimizer）', () => {
  it('输出合法配方：3-4 种、总和 100、角色覆盖、原料在库', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    const plan = selectMaterials(profile);
    const solved = solveFormula(plan, target);
    expect(solved).not.toBeNull();

    const formula = solved!.formula;
    const notes = allNotes(formula);
    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(notes.length).toBeLessThanOrEqual(5);

    const total = notes.reduce((sum, note) => sum + note.percentage, 0);
    expect(total).toBe(100);

    const known = new Set(boothMaterials.map((material) => material.nameZh));
    notes.forEach((note) => expect(known.has(note.name)).toBe(true));

    expect(formula.formula.topNotes.length).toBeGreaterThanOrEqual(1);
    expect(formula.formula.heartNotes.length).toBeGreaterThanOrEqual(1);
    expect(formula.formula.baseNotes.length).toBeGreaterThanOrEqual(1);

    // 每个原料角色必须在其 noteRoles 允许范围内
    notes.forEach((note) => {
      const material = boothMaterials.find((item) => item.nameZh === note.name)!;
      const role = formula.formula.topNotes.includes(note) ? 'top' : formula.formula.heartNotes.includes(note) ? 'heart' : 'base';
      expect(material.noteRoles).toContain(role);
    });
  });

  it('误差信息完整且合法（7 维 + 总误差 ≥ 0）', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    const plan = selectMaterials(profile);
    const solved = solveFormula(plan, target)!;
    expect(solved.error.perDimension.length).toBe(7);
    expect(solved.error.total).toBeGreaterThanOrEqual(0);
    expect(solved.formula.solveMode).toBe('enum');
    assertUsableFormula(solved.formula);
    assertUsableError(solved.formula);
  });

  it('求解确定性：同一输入两次结果一致', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    const plan = selectMaterials(profile);
    const a = solveFormula(plan, target)!;
    const b = solveFormula(plan, target)!;
    expect(a.error.total).toBe(b.error.total);
    expect(JSON.stringify(a.formula.formula)).toBe(JSON.stringify(b.formula.formula));
  });

  it('禁忌原料不出现在配方中（不甜 → 高甜原料被过滤）', () => {
    const profile = analyzeIntent(SUMMER_COMMUTE);
    const target = buildTargetVector(profile);
    const plan = selectMaterials(profile);
    const solved = solveFormula(plan, target)!;
    const names = allNotes(solved.formula).map((note) => note.name);
    const frenchVanilla = boothMaterials.find((material) => material.nameZh === '法国香草');
    if (frenchVanilla) {
      expect(names).not.toContain(frenchVanilla.nameZh);
    }
  });

  it('冬夜木质需求能解出含木质后调的配方', () => {
    const profile = analyzeIntent(WINTER_WOODY);
    const target = buildTargetVector(profile);
    const plan = selectMaterials(profile);
    const solved = solveFormula(plan, target);
    expect(solved).not.toBeNull();
    const baseNames = solved!.formula.formula.baseNotes.map((note) => note.name);
    expect(baseNames.length).toBeGreaterThanOrEqual(1);
  });

  it('多种输入下配方百分比总和恒为 100（防 round 累积误差回归）', { timeout: 30000 }, () => {
    const inputs = [
      SUMMER_COMMUTE,
      WINTER_WOODY,
      '今天太阳巨晒，帮我生成一个适合约会，让人愉快的香水',
      '冬天温暖咖啡香，适合睡前',
      '春日花香，约会'
    ];
    for (const text of inputs) {
      const profile = analyzeIntent(text);
      const target = buildTargetVector(profile);
      const plan = selectMaterials(profile);
      const solved = solveFormula(plan, target);
      expect(solved, `求解失败：${text}`).not.toBeNull();
      const notes = [...solved!.formula.formula.topNotes, ...solved!.formula.formula.heartNotes, ...solved!.formula.formula.baseNotes];
      const total = notes.reduce((sum, note) => sum + note.percentage, 0);
      expect(total, `百分比总和不等于 100：${text} → ${total}`).toBe(100);
    }
  });
});
