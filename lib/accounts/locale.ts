import type { Lang } from '@/lib/i18n';
import {families,affinities,contexts,avoidances,sweetness,presence,experience,exploration,profileSummary,type Answers} from './questionnaire';
export const englishCopy:Record<string,string>={
 '返回香气工作台':'Return to the fragrance workspace','AI 个性化香氛':'AI Personalized Fragrance','西湖大学 iGEM 2026':'iGEM Westlake 2026','你的香气手记':'Your scent journal',
 '一份属于你的香气':'A scent of your own','从你的喜好，':'From your preferences,','开始调香。':'to your own fragrance.',
 '记下平时喜欢的气味，让每一次新的灵感，都有属于你的起点。':'Keep your everyday scent preferences as the starting point for each new idea.',
 '欢迎回来':'Welcome back','创建你的香气账号':'Create your scent account','首次登录后填写问卷，之后可以随时修改。':'Complete your preference questionnaire after signing in. You can update it at any time.',
 '昵称（可选）':'Nickname (optional)','邮箱':'Email','密码':'Password','确认密码':'Confirm password','使用至少12个字符的密码。':'Use at least 12 characters. ',
 '尚未配置邮件找回密码，请妥善保存密码。':'Password recovery by email is not available. Please keep your password safe.',
 '请稍候…':'Please wait…','注册并填写问卷':'Register and complete the questionnaire','登录':'Sign in','已有账号，去登录':'Already have an account? Sign in','没有账号？创建账号':'New here? Create an account',
 '正在读取账号…':'Loading your account…','账号服务暂时不可用':'Account service unavailable','重试':'Try again','本次偏好':'Preferences for this visit','已载入日常偏好':'Everyday preferences loaded','待填写偏好':'Preferences not yet completed',
 '数据后台':'Data dashboard','偏好与记忆':'Preferences & memories',' · 有待确认':' · Awaiting confirmation','退出账号':'Sign out',
 '你的香气偏好':'Your scent preferences','我们这样理解你的日常偏好':'Your everyday preference summary','让我们先了解你喜欢的香气':'Let us get to know the scents you enjoy',
 '回答平时的偏好，每次生成仍可提出不同要求。没有标准答案，说不清时可以选不确定；答案以后可以修改。':'Tell us your usual preferences. You can ask for something different each time. There are no right answers; choose “not sure” whenever needed. You can edit your answers later.',
 '基本情况':'About you','气味喜好':'Scent preferences','日常目标与避让':'Everyday goals & avoidances','补充与确认':'Examples & review',
 '1. 我们可以怎么称呼你？（可选）':'1. What would you like us to call you? (optional)','昵称就可以，不需要真实姓名':'A nickname is enough; no real name needed',
 '2. 你对香水的使用经验更接近哪一种？':'2. Which best describes your experience with perfume?',
 '3. 你通常想在哪些场景使用香水？':'3. When do you usually want to wear perfume?','其他场景':'Other occasions',
 '4. 对下面这些气味，你平时的感受是什么？':'4. How do you usually feel about these scent families?',
 '喜欢程度与希望它有多浓不同。这些例子帮助理解类别，不代表同一类气味你都喜欢。':'Liking a scent and wanting it to be strong are different. These examples explain each family; you may enjoy some scents within a family and dislike others.',
 '把尚未回答的类别标为“说不清”':'Mark unanswered families as “not sure”',
 '5. 你平时希望香水里有多少甜感？':'5. How much sweetness do you usually prefer?',
 '可以喜欢香草，同时只希望配方有一点甜感。':'You can enjoy vanilla while preferring only a little sweetness in the blend.',
 '6. 你希望香气的存在感怎样？':'6. How noticeable would you like the fragrance to be?',
 '这里问容易被闻到的程度，不是持续多久。':'This asks how noticeable it is, rather than how long it lasts.',
 '7. 有没有希望配方尽量避免的气味？':'7. Are there scent qualities you would prefer to avoid?',
 '希望避免的特定花香':'Specific floral scents to avoid','例如玫瑰':'For example, rose','其他希望避免的气味':'Other scents to avoid',
 '8. 有没有希望系统始终排除的具体原料？':'8. Are there specific materials you always want excluded?',
 '有，我知道具体名称':'Yes, I know the specific names','目前没有已知需要排除的原料':'No known materials to exclude','我不清楚':'I am not sure','暂不提供':'Prefer not to provide this',
 '不喜欢某种气味可以填上一题。原料排除需要核对，记录要求不等于安全保证。':'Use the previous question for scent dislikes. Material exclusions need to be checked against the material library; recording an exclusion is not a safety guarantee.',
 '请填写原料名称，多项可用顿号分隔':'Material names (separate multiple names with commas)',
 '填写具体名称；无法核对时系统会提示，不会忽略。':'Use specific names. If a name cannot be verified, the system will ask you to check it.',
 '9. 没有特别要求时，希望推荐多接近已有偏好？':'9. Without a special request, how closely should recommendations follow your usual preferences?',
 '10. 有没有具体气味或香水，能帮助我们了解你？（可选）':'10. Are there specific scents or perfumes that help describe your preferences? (optional)',
 '你喜欢什么，喜欢它的哪一点？':'What do you enjoy, and what do you like about it?',
 '例如：喜欢乌龙茶，但不想要明显甜感':'For example: I enjoy oolong tea, but do not want noticeable sweetness',
 '你不喜欢什么，不喜欢它的哪一点？':'What do you dislike, and what bothers you about it?',
 '生活中的气味也可以，不需要专业术语':'Everyday smells are welcome; no specialist terms needed',
 '这些偏好如何使用？':'How would you like to use these preferences?',
 '保存到账号，以后继续使用':'Save to my account for future visits','仅用于本次，不保存为长期偏好':'Use for this visit without saving as long-term preferences',
 '生成时，必要偏好和本次需求会提供给 AI；邮箱和登录凭证不会作为调香信息发送。仅本次模式不会替换已保存的原料排除要求。':'Relevant preferences and your current request are provided to the AI. Your email and login credentials are not sent as fragrance inputs. Preferences for this visit cannot remove saved material exclusions.',
 '取消修改':'Cancel changes','上一步':'Back','下一步':'Next','正在保存…':'Saving…','确认并保存，开始生成':'Save preferences and start creating','确认，开始生成':'Confirm and start creating','查看画像摘要':'Review preference summary',
 '你的偏好与记忆':'Your preferences & memories','修改问卷':'Edit questionnaire','返回生成':'Return to creating',
 '从反馈得到的记忆':'Memories from your feedback','只有你确认的记忆才影响以后的生成。撤销后恢复问卷或仍有效的其他记忆。':'Only memories you confirm affect future formulas. Revoking a memory restores your questionnaire preference or another active memory.',
 '日常甜感':'Everyday sweetness','日常存在感':'Everyday scent presence','依据：':'Evidence: ','确认记住':'Confirm memory','不记住':'Do not remember','撤销记忆':'Revoke memory','还没有从反馈产生的记忆。':'No memories have been proposed from your feedback yet.',
 '账号管理':'Account settings','邮箱用于登录，尚未进行邮件验证。导出包含你的问卷、配方和反馈。':'Your email is your login identifier and has not been verified by email. Your export includes your questionnaire, formulas and feedback.',
 '下载我的数据':'Download my data','当前密码':'Current password','新密码':'New password','更新密码':'Update password','密码已更新。':'Password updated.',
 '删除账号与个人数据':'Delete account and personal data','删除账号将删除问卷、记忆、配方和反馈。请输入当前密码确认：':'Deleting your account removes your questionnaire, memories, formulas and feedback. Enter your current password to confirm:',
 '操作失败，请稍后重试。':'The operation failed. Please try again.','保存失败。':'Could not save your preferences.','账号服务暂时不可用。':'The account service is temporarily unavailable.',
 '请回答使用经验和场景，也可以选择不确定。':'Please answer the experience and occasion questions. You may choose “not sure”.','请评价每类气味，也可以选择说不清。':'Please answer each scent family. You may choose “not sure”.',
 '请选择保存到账号，或仅用于本次。':'Choose whether to save your preferences or use them for this visit.',
 '两次输入的密码不一致，请重新确认。':'The two passwords do not match. Please check them.',
 '请填写密码并再次确认。':'Enter your password and confirm it.','注册信息格式不正确。':'The registration information is invalid.',
 '问卷格式不正确。':'The questionnaire format is invalid.','问卷版本已更新，请刷新后填写。':'The questionnaire has changed. Reload the page before completing it.',
 '请填写希望避免的特定花香。':'Enter the specific floral scents you wish to avoid.','请填写希望避免的其他气味。':'Enter the other scents you wish to avoid.','请填写要排除的具体原料。':'Enter the specific materials to exclude.',
 '偏好已在另一处更新，请刷新后再修改。':'Your preferences were updated elsewhere. Reload before editing.',
 '偏好版本已变化，请刷新后重试。':'Your preferences have changed. Reload and try again.','服务暂时不可用，请稍后重试。':'The service is temporarily unavailable. Please try again.',
 '请先登录。':'Please sign in.','此入口仅向管理员开放。':'This page is available to administrators only.','记忆不存在或已经失效。':'The memory is missing or no longer active.',
 '香气手记 · 数据管理':'Scent journal · Data dashboard','账号、画像与反馈':'Accounts, profiles & feedback',
 '选择一个账号，查看问卷、有效画像、配方与反馈记忆。':'Select an account to review its questionnaire, effective profile, formulas and feedback memories.',
 '下载配方与反馈 CSV':'Download formulas & feedback CSV','返回工作台':'Return to workspace','注册账号':'Registered accounts','已保存问卷':'Saved questionnaires','生成配方':'Generated formulas','反馈记录':'Feedback entries',
 '返回账号列表':'Back to accounts','当前有效画像':'Current effective profile','尚未保存长期问卷。':'No long-term questionnaire has been saved.','查看用户原始问卷':'View original questionnaire','查看结构化答案':'View structured answers',
 '反馈记忆':'Feedback memories','甜感偏好':'Sweetness preference','存在感偏好':'Scent presence preference','待确认':'Awaiting confirmation','已确认':'Confirmed','已撤销':'Revoked','已由问卷更新替代':'Superseded by a questionnaire update',
 '原始反馈：':'Original feedback: ','记录值：':'Recorded value: ','暂无反馈记忆。':'No feedback memories yet.','配方与反馈':'Formulas & feedback',
 '硬件 Agent':'AromaCell Agent','无硬件 Agent':'Booth Agent','仅本次':'This visit only','配方记录':'Formula record','本次需求：':'Request: ','Agent 回复：':'Agent response: ','反馈：':'Feedback: ',
 '无文字反馈':'No written feedback','尚未提交':'Not submitted','自述已实际闻过':'Reported smelling the sample','未确认实际闻过':'Has not confirmed smelling the sample','适用于日常偏好':'Applies to everyday preferences','仅针对本次':'Applies to this formula only',
 '画像':'Profile ','查看配方数据':'View formula data','暂无生成记录。':'No generated formulas yet.','搜索账号':'Search accounts','邮箱或昵称':'Email or nickname','搜索':'Search','未保存问卷':'Questionnaire not saved','没有匹配的账号。':'No matching accounts.','上一页':'Previous page','下一页':'Next page','读取失败':'Could not load the data',
 '我实际闻过这份配方的香水样品':'I have smelled a perfume sample made from this formula',
 '我实际闻过这份配方的香水样品（彩色液体演示不算）':'I have smelled a perfume sample made from this formula (colored demonstration liquid does not count)',
 '这次反馈适用于哪里？':'Where should this feedback apply?','这次反馈希望适用于哪里？':'Where should this feedback apply?',
 '以后的日常偏好（确认后记住）':'Future everyday preferences (confirm before remembering)','以后的日常偏好（系统会先让我确认）':'Future everyday preferences (confirm before remembering)'
};
export function copy(lang:Lang,text:string){return lang==='en'?englishCopy[text]||text:text;}
const optionLabels:Record<string,Record<string,string>>={
 families:{citrus:'Citrus',floral:'Floral',tea:'Tea',green_herbal:'Green / herbal',woody:'Woody',aquatic:'Aquatic / marine',fruity:'Fruit (excluding citrus)',gourmand:'Gourmand'},
 hints:{citrus:'For example, orange peel or lemon peel',floral:'For example, rose, jasmine or osmanthus',tea:'For example, green tea or oolong',green_herbal:'For example, grass or freshly rubbed leaves',woody:'For example, wood or sawdust; smokiness is asked separately',aquatic:'For example, sea-breeze or watery perfume accords',fruity:'For example, pear, peach or berries',gourmand:'For example, vanilla or caramel'},
 affinities:{strongly_like:'Like very much',like:'Like somewhat',neutral:'No strong like or dislike',dislike:'Dislike somewhat',strongly_dislike:'Dislike very much',unknown:'Unfamiliar or not sure'},
 contexts:{commute:'Work / commuting',study:'Study / campus',leisure:'Leisure / outings',sport:'Before or after exercise',social:'Dates / social occasions',formal:'Formal events',relax:'Quiet time / relaxation',other:'Other',unknown:'No usual occasion / not sure'},
 avoidances:{cloying:'Cloying sweetness',powdery:'Powdery character',smoky:'Smokiness',incense:'Incense',leather:'Leather',alcohol:'Noticeable alcohol smell',specific_floral:'Specific floral scents',other:'Other scents',none:'No particular avoidances',unknown:'Not sure'},
 sweetness:{almost_none:'Almost no sweetness',slight:'A little sweetness',medium:'Moderate sweetness',pronounced:'Noticeable sweetness',strong:'Strong sweetness',varies:'Depends on the occasion; no fixed preference',unknown:'Not sure'},
 presence:{very_light:'Very light: mostly noticed up close by me',light:'Light: noticeable at close range',medium:'Moderate: noticeable to people nearby',noticeable:'Noticeable: easy for others to notice',strong:'Very noticeable: a strong presence',varies:'Depends on the occasion; no fixed preference',unknown:'Not sure'},
 experience:{beginner:'Never or rarely use perfume',unfamiliar:'Have used perfume, but am less familiar with different scents',familiar:'Use perfume often and know my preferences',unspecified:'Not sure / prefer not to answer'},
 exploration:{familiar:'Stay close to scents I already enjoy',small_variation:'Mostly familiar scents with a little variation',explore:'Try something different from my usual preferences',unknown:'Not sure; start with my existing preferences'}
};
export function localizedOptions<T extends readonly(readonly[string,string])[]>(items:T,group:string,lang:Lang):readonly(readonly[string,string])[]{return items.map(([id,label])=>[id,lang==='en'?optionLabels[group]?.[id]||copy(lang,label):label] as const);}
export function localizedFamilies(lang:Lang){return families.map(([id,label,hint])=>[id,lang==='en'?optionLabels.families[id]:label,lang==='en'?optionLabels.hints[id]:hint] as const);}
export function localizedProfileSummary(a:Answers,lang:Lang){
 if(lang==='zh')return profileSummary(a);
 const label=(group:string,id:string)=>optionLabels[group]?.[id]||id;
 const liked=families.filter(([id])=>['like','strongly_like'].includes(a.familyAffinity[id])).map(([id])=>label('families',id));
 const disliked=families.filter(([id])=>['dislike','strongly_dislike'].includes(a.familyAffinity[id])).map(([id])=>label('families',id));
 return [`Usual occasions: ${a.usualContexts.map(id=>label('contexts',id)).join(', ')}${a.contextOther?` (${a.contextOther})`:''}.`,liked.length?`Enjoys: ${liked.join(', ')}.`:'No preferred scent families declared.',disliked.length?`Dislikes: ${disliked.join(', ')}.`:'',`Sweetness: ${label('sweetness',a.sweetnessPreference)}; presence: ${label('presence',a.presencePreference)}.`,`Prefer to avoid: ${a.odorAvoidances.map(id=>label('avoidances',id)).join(', ')}${a.specificFloral?` (${a.specificFloral})`:''}${a.odorAvoidanceOtherText?` (${a.odorAvoidanceOtherText})`:''}.`,a.ingredientExclusionAnswer==='named'?`Material exclusions: ${a.ingredientExclusionText} (actual composition must be checked).`:'No specific material exclusions provided; this is not evidence of safety.',`Exploration: ${label('exploration',a.explorationPreference)}.`,a.likedExamplesText?`Enjoyed examples, in your words: ${a.likedExamplesText}`:'',a.dislikedExamplesText?`Disliked examples, in your words: ${a.dislikedExamplesText}`:''].filter(Boolean).join('\n');
}
export function localizedError(message:string,lang:Lang){
 if(lang==='zh'||!/[\u3400-\u9fff]/u.test(message))return message;
 if(englishCopy[message])return englishCopy[message];
 const fieldNames:Record<string,string>={'昵称':'nickname','使用经验':'experience','使用场景':'occasions','其他场景':'other occasions','气味喜好':'scent preferences','甜感偏好':'sweetness preference','存在感偏好':'scent presence','避让气味':'scent avoidances','特定花香':'specific floral scents','其他气味':'other scents','原料排除':'material exclusions','排除原料':'excluded materials','探索意愿':'exploration preference','喜欢的例子':'enjoyed examples','不喜欢的例子':'disliked examples'};
 let m=message.match(/^请回答(.+)，也可以选择不确定。$/);if(m)return `Please answer ${fieldNames[m[1]]||'this question'}, or choose “not sure”.`;
 m=message.match(/^请回答(.+)。$/);if(m)return `Please answer ${fieldNames[m[1]]||'this question'}.`;
 m=message.match(/^(.+)的选项互相冲突。$/);if(m)return `The selected options for ${fieldNames[m[1]]||'this question'} conflict.`;
 m=message.match(/^(.+)格式不正确或太长。$/);if(m)return `The ${fieldNames[m[1]]||'input'} is invalid or too long.`;
 m=message.match(/^排除原料“(.+)”尚不能核对到材料库/);if(m)return `Excluded material “${m[1]}” could not be verified in the material library. Check its name in your preferences before generating a formula.`;
 return 'The request could not be completed. Check your input, or reload and try again.';
}
