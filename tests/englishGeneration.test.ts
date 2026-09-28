import { describe, expect, it } from 'vitest';
import { analyzeIntent } from '@/lib/intent';
import { buildTargetVector } from '@/lib/intentVector';
import { selectMaterials } from '@/lib/materialSelector';
import { solveFormula } from '@/lib/optimizer';
import { buildOptimizedReply } from '@/lib/explain';
import { materialDisplayName } from '@/lib/localization';

const CJK = /[\u3400-\u9fff]/;

describe('English generation', () => {
  it('returns English copy for every customer-facing formula field', () => {
    const intent = analyzeIntent('A fresh, clean scent for a morning meeting');
    const solved = solveFormula(selectMaterials(intent), buildTargetVector(intent), 'en');
    expect(solved).not.toBeNull();

    const formula = solved!.formula;
    const customerCopy = JSON.stringify({
      fragrancePositioning: formula.fragrancePositioning,
      blendingSuggestion: formula.blendingSuggestion,
      finalEffect: formula.finalEffect,
      adjustments: formula.adjustments,
      safetyNote: formula.safetyNote,
      noteNames: [
        ...formula.formula.topNotes,
        ...formula.formula.heartNotes,
        ...formula.formula.baseNotes
      ].map((note) => materialDisplayName(note.name, 'en')),
      replyText: buildOptimizedReply(formula, 'en')
    });

    expect(customerCopy).not.toMatch(CJK);
  });
});
