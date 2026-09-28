export type Lang = 'zh' | 'en';

export type LocalizedText = Record<Lang, string>;

export const quickPrompts: LocalizedText[] = [
  { zh: '清爽、不甜、适合夏天通勤', en: 'Fresh, not sweet, for a summer commute' },
  { zh: '雨天、安静、像图书馆', en: 'Quiet and library-like on a rainy day' },
  { zh: '温柔一点，适合约会', en: 'Soft and gentle for a date' },
  { zh: '木质、沉稳、适合阅读', en: 'Woody and grounded for reading' },
  { zh: '适合运动后，清凉、轻盈', en: 'Cool and light after a workout' },
  { zh: '想要茶香，不要太花', en: 'Tea-like, without too many florals' },
  { zh: '今天心情低落，想要治愈一点', en: 'Something comforting for a low mood' },
  { zh: '想要海风感，清透、干净', en: 'Airy and clean like a sea breeze' },
  { zh: '适合第一次体验，安全不出错', en: 'A safe first-time formula' },
  { zh: '浪漫、有记忆点，但不要太甜', en: 'Romantic and memorable, but not too sweet' }
];

export const t = {
  siteTitle: { zh: 'Aromacell Formula Lab', en: 'Aromacell Formula Lab' },
  brandName: { zh: 'AI 个性化香氛', en: 'AI Personalized Fragrance' },
  brandTeam: { zh: '西湖大学 iGEM 2026', en: 'iGEM Westlake 2026' },
  eyebrow: { zh: 'PERFUME AGENT · 定制香水', en: 'PERFUME AGENT · CUSTOM FRAGRANCE' },
  cardNumber: { zh: '配方工作台 · 专业版', en: 'FORMULA DESK · PRO EDITION' },
  heroTitle: { zh: '几十秒，生成属于你的专属香水', en: 'Your signature fragrance in seconds' },
  heroDesc: {
    zh: '告诉它你今天想要的感觉——清爽、水感、木质还是甜暖，你今天的任何需求——约会、开会还是参加户外活动，或者今天的天气情况。Agent 会从原料库中求解出最贴近你需求的配方，一键发送到你的 Aromacell，由它按比例自动调配出专属于你的香水。',
    en: 'Tell it how you want to feel today—fresh, watery, woody, or warm and sweet—and what you need it for, from a date or meeting to an outdoor event or the day’s weather. The Agent solves the closest formula from the material library and sends it to Aromacell for automatic proportional blending.'
  },
  qrHint: { zh: '扫码在手机上体验', en: 'Scan to try on your phone' },
  modeEnum: { zh: '约束优化', en: 'Optimized' },
  modeHeuristic: { zh: '本地求解', en: 'Local solver' },
  modeExplain: { zh: '配方解释', en: 'Explanation' },
  modeLLM: { zh: '在线模型', en: 'Live model' },
  modeFallback: { zh: '本地求解', en: 'Local solver' },
  sourceLLM: { zh: 'AI 实时回答', en: 'Live AI response' },
  sourceLocal: { zh: '本地模板', en: 'Local template' },
  errorTitle: { zh: '目标 vs 实际', en: 'Target vs actual' },
  errorHint: { zh: '约束优化求解的逐维匹配误差', en: 'Per-dimension match error from constrained optimization' },
  labelTarget: { zh: '目标', en: 'Target' },
  labelActual: { zh: '实际', en: 'Actual' },
  labelError: { zh: '误差', en: 'Error' },
  labelTotalError: { zh: '总误差 ||Aw−y||²', en: 'Total error ||Aw−y||²' },
  labelL1Error: { zh: 'L1 误差', en: 'L1 error' },
  inputLabel: { zh: '你想要什么感觉？', en: 'What feeling do you want?' },
  inputPlaceholder: {
    zh: '例如：今天很热，想要清爽、不甜、适合通勤的香气',
    en: 'Example: It is hot today. I want something fresh, not sweet, and commute-friendly.'
  },
  btnFirst: { zh: '生成配方', en: 'Create formula' },
  btnConfirm: { zh: '确定并调配', en: 'Confirm and blend' },
  btnContinue: { zh: '继续修改', en: 'Refine' },
  btnRegenerate: { zh: '重新生成', en: 'Restart' },
  btnLoading: { zh: '生成中...', en: 'Generating...' },
  btnDispatchSending: { zh: '发送中...', en: 'Sending...' },
  btnDispatched: { zh: '配方已发送到 Aromacell', en: 'Formula sent to your Aromacell' },
  dispatchSimulated: { zh: '演示模式，未连接 Aromacell', en: 'Demo mode, no Aromacell connected' },
  dispatchFailed: { zh: '发送失败，请重试', en: 'Dispatch failed, please retry' },
  dispatchHint: {
    zh: '确定后将配方发送到 Aromacell 自动调配；继续修改则按输入框里的新需求调整。',
    en: 'Confirm to send this formula to your Aromacell for automatic mixing; or refine it with a new request.'
  },
  hardwarePreviewTitle: { zh: 'Aromacell 加注预览', en: 'Aromacell dosing preview' },
  hardwarePreviewHint: {
    zh: '百分比已换算为克数与估算体积；确认后将按泵号顺序加注。',
    en: 'Percentages are converted to grams and estimated volume, then dispensed sequentially.'
  },
  materialLibraryTitle: { zh: '四路精选原料库', en: 'Four-channel material library' },
  materialLibraryHint: {
    zh: '四种精选原料覆盖前、中、后调，配方比例直接对应四路泵位。',
    en: 'Four selected materials cover top, heart, and base notes, with every ratio mapped directly to a pump.'
  },
  materialColor: { zh: '显色', en: 'Color' },
  materialConcentration: { zh: '建议工作浓度', en: 'Suggested working concentration' },
  materialDensity: { zh: '估算密度（20°C）', en: 'Estimated density (20°C)' },
  batchWeight: { zh: '总质量', en: 'Total weight' },
  pumpLabel: { zh: '泵', en: 'Pump ' },
  executionResultTitle: { zh: '硬件执行结果', en: 'Hardware execution result' },
  targetWeight: { zh: '目标', en: 'Target' },
  actualWeight: { zh: '实际', en: 'Actual' },
  hintFollowUp: {
    zh: '也可以继续说：更清爽一点 / 不要玫瑰 / 更甜一点 / 更适合雨天',
    en: 'Try: fresher / no rose / sweeter / more rainy-day friendly'
  },
  quickTitle: { zh: '快速选择', en: 'Quick picks' },
  quickHint: { zh: '点击任意需求即可生成', en: 'Click any prompt to generate' },
  historyTitle: { zh: '调整记录', en: 'Refinement history' },
  historyEmpty: {
    zh: '生成后可以继续输入新需求，让 Agent 沿着上一版配方调整。',
    en: 'After generating, you can keep refining or asking about the previous formula.'
  },
  resultTitle: { zh: '你的香水配方', en: 'Your perfume formula' },
  resultHint: {
    zh: '确认后配方会发送到 Aromacell，由 Aromacell 按比例自动调配。',
    en: 'Confirm to send this formula to your Aromacell for automatic crafting.'
  },
  resultEmpty: {
    zh: '先输入一个需求，或点击左侧快速选择。',
    en: 'Enter a request or choose a quick pick.'
  },
  blockAIReply: { zh: 'Agent 建议', en: 'Agent suggestion' },
  blockPositioning: { zh: '香气定位', en: 'Scent positioning' },
  blockBlending: { zh: '配方比例', en: 'Formula ratios' },
  blockFormula: { zh: '配方结构', en: 'Formula structure' },
  blockEffect: { zh: '闻起来会怎样', en: 'Expected scent' },
  blockSafety: { zh: '安全提醒', en: 'Safety note' },
  labelStyle: { zh: '风格', en: 'Style' },
  labelKeywords: { zh: '关键词', en: 'Keywords' },
  labelScenarios: { zh: '适合场景', en: 'Scenarios' },
  labelOpening: { zh: '前段', en: 'Opening' },
  labelHeart: { zh: '中段', en: 'Heart' },
  labelDrydown: { zh: '尾调', en: 'Drydown' },
  labelSillage: { zh: '扩散', en: 'Sillage' },
  labelLongevity: { zh: '留香', en: 'Longevity' },
  topNotes: { zh: '前调', en: 'Top notes' },
  heartNotes: { zh: '中调', en: 'Heart notes' },
  baseNotes: { zh: '后调', en: 'Base notes' },
  roleYou: { zh: '你', en: 'You' },
  roleAgent: { zh: 'Agent', en: 'Agent' },
  debugTitle: { zh: '调试信息', en: 'Debug info' },
  fallbackReply: {
    zh: '约束优化暂时不可用，已切换到本地演示规则生成。',
    en: 'Constrained optimization is unavailable, switched to local demo rules.'
  },
  feedbackTitle: { zh: '使用反馈', en: 'Feedback' },
  feedbackHint: {
    zh: '使用后给这版配方打个分，帮助我们让配方更懂你。',
    en: 'Rate this formula after trying it, so we can match you better.'
  },
  feedbackPlaceholder: {
    zh: '可选：哪里喜欢，哪里想改？',
    en: 'Optional: what worked, what should change?'
  },
  feedbackSubmit: { zh: '提交反馈', en: 'Submit feedback' },
  feedbackThanks: { zh: '已记录，谢谢你的反馈。', en: 'Feedback saved. Thank you.' }
} as const;
