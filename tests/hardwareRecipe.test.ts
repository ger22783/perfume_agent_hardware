import { describe, expect, it } from 'vitest';
import { activeMaterialIds } from '@/data/hardwareProfile';
import { analyzeIntent } from '@/lib/intent';
import { buildTargetVector } from '@/lib/intentVector';
import { buildHardwareSteps } from '@/lib/hardwareRecipe';
import { selectMaterials } from '@/lib/materialSelector';
import { solveFormula } from '@/lib/optimizer';
import type { FormulaResponse } from '@/lib/types';

function formulaWith(names: { top: string; heart: string; base: string }): FormulaResponse {
  return {
    fragrancePositioning: { style: 'test', keywords: [], suitableScenarios: [] },
    formula: {
      topNotes: [{ name: names.top, percentage: 25 }],
      heartNotes: [{ name: names.heart, percentage: 35 }],
      baseNotes: [{ name: names.base, percentage: 40 }]
    },
    blendingSuggestion: { recommendedConcentration: '' },
    boothSteps: [],
    finalEffect: { opening: '', heart: '', drydown: '', sillage: '', longevity: '' },
    safetyNote: ''
  };
}

describe('Aromacell hardware recipe adapter', () => {
  it('maps loaded materials to pumps and converts percentages to exact grams', () => {
    const formula = formulaWith({
      top: '日系柑橘',
      heart: '桂花乌龙',
      base: '无人之境玫瑰'
    });
    const steps = buildHardwareSteps(formula, 20);
    expect(steps.map((step) => [step.pump, step.grams])).toEqual([
      [1, 5],
      [3, 7],
      [4, 8]
    ]);
    expect(steps.reduce((sum, step) => sum + step.grams, 0)).toBe(20);
  });

  it('rejects a formula containing material not loaded in the four pumps', () => {
    const formula = formulaWith({
      top: '青盈绿茶',
      heart: '桂花乌龙',
      base: '无人之境玫瑰'
    });
    expect(() => buildHardwareSteps(formula, 20)).toThrow('当前没有装入 Aromacell');
  });

  it('generation constrained to the hardware profile only emits mounted materials', () => {
    const intent = analyzeIntent('想要清爽水感、带一点温暖花香');
    const plan = selectMaterials(intent, activeMaterialIds);
    const solved = solveFormula(plan, buildTargetVector(intent));
    expect(solved).not.toBeNull();
    const notes = [
      ...solved!.formula.formula.topNotes,
      ...solved!.formula.formula.heartNotes,
      ...solved!.formula.formula.baseNotes
    ];
    const mountedNames = new Set(['日系柑橘', '海上风铃', '桂花乌龙', '无人之境玫瑰']);
    notes.forEach((note) => expect(mountedNames.has(note.name)).toBe(true));
  });

  it('four-pump profile keeps a valid base note for a not-sweet request', () => {
    const intent = analyzeIntent('清爽、不甜、适合夏天通勤');
    const plan = selectMaterials(intent, activeMaterialIds);
    const solved = solveFormula(plan, buildTargetVector(intent));
    expect(solved).not.toBeNull();
    expect(solved!.formula.formula.baseNotes.length).toBeGreaterThanOrEqual(1);
    const notes = [
      ...solved!.formula.formula.topNotes,
      ...solved!.formula.formula.heartNotes,
      ...solved!.formula.formula.baseNotes
    ];
    expect(new Set(notes.map((note) => note.name)).size).toBe(notes.length);
    expect(buildHardwareSteps(solved!.formula, 20).reduce((sum, step) => sum + step.grams, 0)).toBe(20);
  });
});
