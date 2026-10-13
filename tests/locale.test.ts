import {describe,it,expect} from 'vitest';
import {affinities,contexts,sweetness,presence,experience,exploration,avoidances,emptyAnswers} from '../lib/accounts/questionnaire';
import {copy,localizedOptions,localizedFamilies,localizedProfileSummary,localizedError} from '../lib/accounts/locale';
describe('中英文账号与问卷',()=>{
 it('翻译保持选项编号与顺序，不改变保存答案',()=>{
  for(const [group,items] of Object.entries({affinities,contexts,sweetness,presence,experience,exploration,avoidances})){
   const translated=localizedOptions(items,group,'en');expect(translated.map(i=>i[0])).toEqual(items.map(i=>i[0]));expect(/[\u3400-\u9fff]/u.test(translated.map(i=>i[1]).join(''))).toBe(false);
  }
  expect(/[\u3400-\u9fff]/u.test(localizedFamilies('en').map(i=>i.slice(1).join('')).join(''))).toBe(false);
 });
 it('英文摘要与校验错误可读，用户自由文本保留原话',()=>{
  const a={...emptyAnswers('Test'),usualContexts:['commute'],familyAffinity:{woody:'like'},sweetnessPreference:'slight',presencePreference:'light',odorAvoidances:['none'],explorationPreference:'familiar'};
  expect(/[\u3400-\u9fff]/u.test(localizedProfileSummary(a,'en'))).toBe(false);
  expect(localizedProfileSummary({...a,likedExamplesText:'喜欢乌龙茶'},'en')).toContain('喜欢乌龙茶');
  expect(localizedError('请回答使用经验，也可以选择不确定。','en')).toContain('experience');
  expect(copy('en','两次输入的密码不一致，请重新确认。')).toContain('do not match');
 });
});
