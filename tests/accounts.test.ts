import { validatePasswordConfirmation } from '../lib/accounts/registration';
import { sessionsToCsv } from '../lib/records';
import {describe,it,expect} from 'vitest';
import {emptyAnswers,validateAnswers,profileSummary,families} from '@/lib/accounts/questionnaire';
import {personalizeIntent,resolveExclusions,assertExclusions} from '@/lib/accounts/personalization';
import {feedbackCandidates} from '@/lib/accounts/repository';
import {analyzeIntent} from '@/lib/intent';
import {selectMaterials} from '@/lib/materialSelector';
import {generateFallback} from '@/lib/generator';
const complete=()=>({...emptyAnswers('试填'),experienceLevel:'beginner',usualContexts:['commute'],familyAffinity:Object.fromEntries(families.map(([id])=>[id,'unknown'])),sweetnessPreference:'slight',presencePreference:'light',odorAvoidances:['none'],ingredientExclusionAnswer:'none_known' as const,explorationPreference:'familiar'});
describe('问卷与画像',()=>{
  it('未回答不默认为中性，必须显式选择未知',()=>{
    expect(()=>validateAnswers(emptyAnswers())).toThrow();
    const a=validateAnswers(complete());expect(a.familyAffinity.woody).toBe('unknown');
    expect(profileSummary(a)).not.toContain('喜欢：木质');
  });
  it('互斥选项和未知枚举不能从API混入',()=>{
    expect(()=>validateAnswers({...complete(),odorAvoidances:['none','smoky']})).toThrow();
    expect(()=>validateAnswers({...complete(),sweetnessPreference:'super-sweet'})).toThrow();
    expect(()=>validateAnswers({...complete(),usualContexts:['unknown','commute']})).toThrow();
  });
  it('很喜欢木质不转成强度5，低甜与喜欢甜食可以共存',()=>{
    const a=complete();a.familyAffinity.woody='strongly_like';a.familyAffinity.gourmand='strongly_like';
    const intent=personalizeIntent(analyzeIntent('帮我做一份'),a);
    expect(intent.preferenceTargets).toEqual({sweet:1,intensity:2});
    expect(intent.desiredFacets.woody).not.toBe(5);
  });
  it('本次明确甜度和浓淡覆盖长期软偏好',()=>{
    const intent=personalizeIntent(analyzeIntent('今天想要甜一点，浓一点'),complete());
    expect(intent.preferenceTargets?.sweet).toBeUndefined();
    expect(intent.desiredFacets.sweet).toBeGreaterThan(1);
    expect(intent.preferenceTargets?.intensity).toBe(4);
    const notSweet=personalizeIntent(analyzeIntent('这次不要甜'),{...complete(),sweetnessPreference:'strong'});
    expect(notSweet.desiredFacets.sweet).toBe(0);
  });
  it('具体材料排除先过滤候选池，未知名称不被忽略',()=>{
    const a={...complete(),ingredientExclusionAnswer:'named' as const,ingredientExclusionText:'桂花乌龙'};
    const intent=personalizeIntent(analyzeIntent('清爽'),a);
    expect(selectMaterials(intent).candidates.some(c=>c.material.id==='osmanthus-oolong')).toBe(false);
    expect(resolveExclusions({...a,ingredientExclusionText:'不明化学成分'}).unresolved).toEqual(['不明化学成分']);
    expect(()=>personalizeIntent(analyzeIntent('清爽'),{...a,ingredientExclusionText:'不明化学成分'})).toThrow();
  });
  it('生成后的独立校验也阻断排除材料',async()=>{
    const a=complete();const generated=await generateFallback('清爽',selectMaterials(personalizeIntent(analyzeIntent('清爽'),a)));
    expect(generated.formula.targetVector?.facets.sweet).toBe(1);
    expect(generated.formula.targetVector?.intensity).toBe(2);
    const name=generated.formula.formula.heartNotes[0].name;
    expect(()=>assertExclusions(generated.formula,{...a,ingredientExclusionAnswer:'named',ingredientExclusionText:name})).toThrow();
  });
});
describe('反馈候选记忆',()=>{
  it('单次反馈、未闻样品和朋友意见不形成长期候选',()=>{
    expect(feedbackCandidates('太甜了',true,'current')).toEqual([]);
    expect(feedbackCandidates('太甜了',false,'global')).toEqual([]);
    expect(feedbackCandidates('朋友觉得太甜',true,'global')).toEqual([]);
  });
  it('明确长期范围、实际闻过、明确维度才提议记忆',()=>{
    expect(feedbackCandidates('以后淡一点',true,'global')).toEqual([{field:'presencePreference',value:'light'}]);
    expect(feedbackCandidates('尾调木质太重',true,'global')).toEqual([]);
    expect(feedbackCandidates('不好闻',true,'global')).toEqual([]);
  });
});

describe('管理员CSV导出',()=>{
  it('用户输入不会成为电子表格公式',()=>{
    const csv=sessionsToCsv([{sessionId:'safe',createdAt:'2026-10-12T00:00:00Z',updatedAt:'2026-10-12T00:00:00Z',userInput:'=1+1',replyText:'  @SUM(1)',formula:null,mode:'fallback',rating:1,comment:'+123'}]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"\'  @SUM(1)"');
    expect(csv).toContain('"\'+123"');
  });
});

describe('注册密码确认',()=>{
  it('缺少确认或两次不一致都会被拒绝',()=>{
    expect(()=>validatePasswordConfirmation(null)).toThrow();
    expect(()=>validatePasswordConfirmation({password:'correct-password'})).toThrow();
    expect(()=>validatePasswordConfirmation({password:'correct-password',passwordConfirm:'different-password'})).toThrow();
    expect(()=>validatePasswordConfirmation({password:'correct-password',passwordConfirm:'correct-password'})).not.toThrow();
  });
});
