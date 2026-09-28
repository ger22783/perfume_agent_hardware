'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeHardwareProfile, type PumpSlot } from '@/data/hardwareProfile';
import type { ChatMessage, GenerateResponse, NoteItem } from '@/lib/types';
import { quickPrompts, type Lang, t } from '@/lib/i18n';
import {
  BATCH_GRAM_OPTIONS,
  buildHardwareSteps,
  DEFAULT_BATCH_GRAMS,
  type DispatchResponse,
  type HardwareStep
} from '@/lib/hardwareRecipe';

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(GenerateResponse & { debug?: string }) | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<'' | 'sending' | 'sent' | 'error'>('');
  const [dispatchMode, setDispatchMode] = useState<'hardware' | 'simulated'>('simulated');
  const [batchGrams, setBatchGrams] = useState<number>(DEFAULT_BATCH_GRAMS);
  const [dispatchDetails, setDispatchDetails] = useState<DispatchResponse | null>(null);

  const prompts = useMemo(() => quickPrompts.map((prompt) => prompt[lang]), [lang]);
  const scrollingPrompts = useMemo(() => [...prompts, ...prompts], [prompts]);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  function tr(key: keyof typeof t) {
    return t[key][lang];
  }

  function changeLanguage(nextLang: Lang) {
    if (nextLang === lang) return;
    setLang(nextLang);
    setHistory([]);
    setResult(null);
    setSessionId('');
    setInput('');
    setError('');
    setRating(0);
    setComment('');
    setFeedbackStatus('');
    setDispatchStatus('');
    setDispatchDetails(null);
  }

  async function handleGenerate(nextInput?: string) {
    const message = (nextInput ?? input).trim();
    if (!message) return;
    const userMessage: ChatMessage = { role: 'user', content: message };
    const nextHistory = [...history, userMessage];

    setLoading(true);
    setError('');
    setFeedbackStatus('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, sessionId, currentFormula: result?.formula, lang })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || tr('fallbackReply'));
      const reply = data.mode === 'fallback' && !data.replyText ? tr('fallbackReply') : (data.replyText || '');
      setHistory([...nextHistory, { role: 'assistant', content: reply }]);
      setResult(data);
      setSessionId(data.sessionId || sessionId);
      setInput('');
      setRating(0);
      setComment('');
      setDispatchStatus('');
      setDispatchDetails(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : tr('fallbackReply'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!result || dispatchStatus === 'sending') return;
    setDispatchStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          formula: result.formula,
          targetTotalG: batchGrams
        })
      });
      const data = await response.json();
      setDispatchDetails(data?.recipe && Array.isArray(data?.results) ? data : null);
      if (!response.ok || data?.ok === false) throw new Error(data?.error || tr('dispatchFailed'));
      setDispatchMode(data?.mode === 'hardware' ? 'hardware' : 'simulated');
      setDispatchStatus('sent');
    } catch (caughtError) {
      setDispatchStatus('error');
      setError(caughtError instanceof Error ? caughtError.message : tr('dispatchFailed'));
    }
  }

  function handleReset() {
    setHistory([]);
    setResult(null);
    setSessionId('');
    setInput('');
    setError('');
    setRating(0);
    setComment('');
    setFeedbackStatus('');
    setDispatchStatus('');
    setDispatchDetails(null);
  }

  async function handleFeedback() {
    if (!result || !rating) return;
    setFeedbackStatus('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: result.sessionId, rating, comment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || tr('feedbackHint'));
      setFeedbackStatus(tr('feedbackThanks'));
    } catch (caughtError) {
      setFeedbackStatus(caughtError instanceof Error ? caughtError.message : tr('feedbackHint'));
    }
  }

  let hardwarePreview: HardwareStep[] = [];
  let hardwarePreviewError = '';
  if (result) {
    try {
      hardwarePreview = buildHardwareSteps(result.formula, batchGrams);
    } catch (previewError) {
      hardwarePreviewError = previewError instanceof Error ? previewError.message : 'Hardware recipe unavailable';
    }
  }

  const listSeparator = lang === 'en' ? ', ' : '、';

  return (
    <main className="booth-page">
      <div className="paper-grain" aria-hidden="true" />
      <div className="doodle doodle-orbit" aria-hidden="true" />
      <div className="doodle doodle-spark" aria-hidden="true">✦</div>

      <div className="booth-shell">
        <header className="site-header">
          <div className="brand-lockup">
            <img src="/brand/team-logo-westlake.png" alt="Westlake iGEM" className="brand-logo" />
            <div>
              <p className="brand-name">{tr('brandName')}</p>
              <p className="brand-team">{tr('brandTeam')}</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="mode-pill"><span className="mode-dot" />{result?.mode === 'enum' ? tr('modeEnum') : result?.mode === 'explain' ? tr('modeExplain') : tr('modeHeuristic')}</span>
            <div className="language-switch" aria-label="Language">
              <button onClick={() => changeLanguage('zh')} className={lang === 'zh' ? 'is-active' : ''}>ZH</button>
              <button onClick={() => changeLanguage('en')} className={lang === 'en' ? 'is-active' : ''}>EN</button>
            </div>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">{tr('eyebrow')}</p>
            <h1>{lang === 'zh' ? <>几十秒，<span className="hero-title-tail">生成属于你的专属香水</span></> : tr('heroTitle')}</h1>
            <p className="hero-description">{tr('heroDesc')}</p>
            <div className="hand-line" aria-hidden="true" />
          </div>
          <div className="mascot-stage" aria-label={lang === 'zh' ? '走动的团队吉祥物' : 'Walking team mascot'}>
            <img src="/brand/floral-mascot.gif" alt="" aria-hidden="true" />
          </div>
        </section>

        <Panel className="materials-panel">
          <div className="panel-heading-row">
            <div><p className="section-kicker">00 · MATERIAL LIBRARY</p><h2>{tr('materialLibraryTitle')}</h2></div>
            <span className="panel-hint">{tr('materialLibraryHint')}</span>
          </div>
          <div className="material-grid">
            {activeHardwareProfile.pumps.map((slot) => <MaterialCard key={slot.pump} slot={slot} lang={lang} tr={tr} />)}
          </div>
        </Panel>

        <section className="workspace-grid">
          <div className="left-column">
            <Panel>
              <div className="panel-heading-row">
                <div><p className="section-kicker">01 · INSPIRATION</p><h2>{tr('quickTitle')}</h2></div>
                <span className="panel-hint">{tr('quickHint')}</span>
              </div>
              <div className="quick-prompt-rail">
                <div className="quick-prompt-track">
                  {scrollingPrompts.map((prompt, index) => (
                    <button key={`${prompt}-${index}`} onClick={() => handleGenerate(prompt)} disabled={loading} className="quick-prompt-chip">{prompt}</button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <p className="section-kicker">02 · YOUR IDEA</p>
              <label className="input-label">{tr('inputLabel')}</label>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleGenerate();
                  }
                }}
                className="idea-input"
                placeholder={tr('inputPlaceholder')}
              />

              {result ? (
                <div className="hardware-preview">
                  <div className="hardware-preview-head">
                    <div><strong>{tr('hardwarePreviewTitle')}</strong><span>{tr('hardwarePreviewHint')}</span></div>
                    <label><span>{tr('batchWeight')}</span>
                      <select
                        value={batchGrams}
                        onChange={(event) => {
                          setBatchGrams(Number(event.target.value));
                          setDispatchStatus('');
                          setDispatchDetails(null);
                        }}
                      >
                        {BATCH_GRAM_OPTIONS.map((grams) => <option key={grams} value={grams}>{grams}g</option>)}
                      </select>
                    </label>
                  </div>
                  {hardwarePreviewError ? <p className="error-message">{hardwarePreviewError}</p> : (
                    <div className="dosing-grid">
                      {hardwarePreview.map((step) => <DosingRow key={step.pump} step={step} lang={lang} pumpLabel={tr('pumpLabel')} />)}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="form-actions">
                {!result ? (
                  <button onClick={() => handleGenerate()} disabled={loading || !input.trim()} className="primary-button">
                    {loading ? tr('btnLoading') : tr('btnFirst')}
                  </button>
                ) : (
                  <>
                    <button onClick={handleConfirm} disabled={loading || dispatchStatus === 'sending'} className="primary-button dispatch-button">
                      {dispatchStatus === 'sending' ? tr('btnDispatchSending') : tr('btnConfirm')}
                    </button>
                    <button onClick={() => handleGenerate()} disabled={loading || !input.trim()} className="primary-button">
                      {loading ? tr('btnLoading') : tr('btnContinue')}
                    </button>
                    <button onClick={handleReset} className="secondary-button">{tr('btnRegenerate')}</button>
                  </>
                )}
              </div>

              {dispatchStatus === 'sent' ? <p className="status-message success">{tr('btnDispatched')}{dispatchMode === 'simulated' ? ` · ${tr('dispatchSimulated')}` : ''}</p> : null}
              {dispatchStatus === 'error' ? <p className="status-message error">{tr('dispatchFailed')}</p> : null}
              {result && !dispatchStatus ? <p className="follow-up-hint">{tr('dispatchHint')}</p> : null}

              {dispatchDetails ? (
                <div className="execution-card">
                  <strong>{tr('executionResultTitle')}</strong>
                  {dispatchDetails.results.map((step) => (
                    <div key={`${dispatchDetails.recipe.jobId}-${step.pump}`} className="execution-row">
                      <span>{tr('pumpLabel')}{step.pump} · {step.materialName}</span>
                      <span className={step.ok ? 'is-ok' : 'is-error'}>{tr('targetWeight')} {step.grams.toFixed(1)}g · {tr('actualWeight')} {step.actualG === null ? '-' : `${step.actualG.toFixed(1)}g`}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {result ? <p className="follow-up-hint">{tr('hintFollowUp')}</p> : null}
              {error ? <p className="error-message">{error}</p> : null}
              {result?.debug ? <div className="debug-card"><strong>{tr('debugTitle')}</strong><span>{result.debug}</span></div> : null}
            </Panel>

            <Panel>
              <p className="section-kicker">03 · CONVERSATION</p>
              <h2>{tr('historyTitle')}</h2>
              <div className="history-list">
                {history.length === 0 ? <p className="empty-copy">{tr('historyEmpty')}</p> : history.map((message, index) => (
                  <div key={index} className={`message-card ${message.role === 'user' ? 'message-user' : 'message-agent'}`}>
                    <p className="message-role">{message.role === 'user' ? tr('roleYou') : tr('roleAgent')}</p>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <section className="right-column">
            <Panel className="result-panel">
              <div className="result-heading">
                <div><p className="section-kicker">{tr('cardNumber')}</p><h2>{tr('resultTitle')}</h2></div>
                <span className="bottle-doodle" aria-hidden="true">♧</span>
              </div>
              <p className="result-hint">{tr('resultHint')}</p>
              {loading ? (
                <div className="loading-stack">{[0, 1, 2, 3].map((item) => <div key={item} />)}</div>
              ) : !result ? (
                <div className="result-empty"><div className="empty-flower" aria-hidden="true">✿</div><p>{tr('resultEmpty')}</p></div>
              ) : (
                <div className="result-content">
                  <Block title={tr('blockAIReply')}><p>{result.replyText}</p></Block>
                  <Block title={tr('blockBlending')}>
                    <FormulaRatioBar
                      topNotes={result.formula.formula.topNotes}
                      heartNotes={result.formula.formula.heartNotes}
                      baseNotes={result.formula.formula.baseNotes}
                      labels={{ top: tr('topNotes'), heart: tr('heartNotes'), base: tr('baseNotes') }}
                    />
                    <p className="safety-note">{result.formula.safetyNote}</p>
                  </Block>
                  <div className="two-up">
                    <Block title={tr('blockPositioning')}>
                      <Line label={tr('labelStyle')} value={result.formula.fragrancePositioning.style} />
                      <Line label={tr('labelKeywords')} value={result.formula.fragrancePositioning.keywords.join(listSeparator)} />
                      <Line label={tr('labelScenarios')} value={result.formula.fragrancePositioning.suitableScenarios.join(listSeparator)} />
                    </Block>
                    <Block title={tr('blockEffect')}>
                      <Line label={tr('labelOpening')} value={result.formula.finalEffect.opening} />
                      <Line label={tr('labelHeart')} value={result.formula.finalEffect.heart} />
                      <Line label={tr('labelDrydown')} value={result.formula.finalEffect.drydown} />
                      <Line label={tr('labelSillage')} value={result.formula.finalEffect.sillage} />
                      <Line label={tr('labelLongevity')} value={result.formula.finalEffect.longevity} />
                    </Block>
                  </div>
                  <Block title={tr('blockFormula')}>
                    <div className="notes-grid">
                      <NotesSection title={tr('topNotes')} items={result.formula.formula.topNotes} />
                      <NotesSection title={tr('heartNotes')} items={result.formula.formula.heartNotes} />
                      <NotesSection title={tr('baseNotes')} items={result.formula.formula.baseNotes} />
                    </div>
                  </Block>
                  {result.formula.error ? <ErrorBlock result={result} tr={tr} /> : null}
                </div>
              )}
            </Panel>

            {result ? (
              <Panel>
                <p className="section-kicker">04 · FEEDBACK</p>
                <h2>{tr('feedbackTitle')}</h2>
                <p className="panel-hint feedback-hint">{tr('feedbackHint')}</p>
                <div className="rating-row">
                  {[1, 2, 3, 4, 5].map((score) => <button key={score} onClick={() => setRating(score)} className={score <= rating ? 'is-selected' : ''}>{score}</button>)}
                </div>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="feedback-input" placeholder={tr('feedbackPlaceholder')} />
                <div className="feedback-actions">
                  <button onClick={handleFeedback} disabled={!rating} className="primary-button small">{tr('feedbackSubmit')}</button>
                  {feedbackStatus ? <span>{feedbackStatus}</span> : null}
                </div>
              </Panel>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`paper-panel ${className}`}>{children}</div>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="result-block"><h3>{title}</h3>{children}</section>;
}

function MaterialCard({ slot, lang, tr }: { slot: PumpSlot; lang: Lang; tr: (key: keyof typeof t) => string }) {
  return (
    <article className="material-card">
      <div className="material-card-head">
        <span className="liquid-swatch" style={{ '--liquid-color': slot.colorHex } as React.CSSProperties} />
        <div><p className="pump-tag">PUMP {slot.pump}</p><h3>{lang === 'zh' ? slot.materialName : slot.materialNameEn}</h3></div>
      </div>
      <p className="material-role">{lang === 'zh' ? slot.noteRoleZh : slot.noteRoleEn}</p>
      <dl>
        <div><dt>{tr('materialColor')}</dt><dd>{lang === 'zh' ? slot.colorNameZh : slot.colorNameEn}</dd></div>
        <div><dt>{tr('materialConcentration')}</dt><dd>{slot.dyeConcentrationPctWv}% w/v</dd></div>
        <div><dt>{tr('materialDensity')}</dt><dd>≈ {slot.estimatedDensityGPerMl.toFixed(3)} g/mL</dd></div>
      </dl>
    </article>
  );
}

function DosingRow({ step, lang, pumpLabel }: { step: HardwareStep; lang: Lang; pumpLabel: string }) {
  const slot = activeHardwareProfile.pumps.find((item) => item.pump === step.pump);
  const estimatedMl = slot ? step.grams / slot.estimatedDensityGPerMl : step.grams;
  return (
    <div className="dosing-row">
      <span className="dosing-dot" style={{ background: slot?.colorHex || '#9fd9bf' }} />
      <span>{pumpLabel}{step.pump} · {lang === 'en' ? slot?.materialNameEn || step.materialName : step.materialName}</span>
      <strong>{step.grams.toFixed(1)}g <small>≈ {estimatedMl.toFixed(1)}mL</small></strong>
    </div>
  );
}

function FormulaRatioBar({ topNotes, heartNotes, baseNotes, labels }: {
  topNotes: NoteItem[];
  heartNotes: NoteItem[];
  baseNotes: NoteItem[];
  labels: { top: string; heart: string; base: string };
}) {
  const segments = [
    ...topNotes.map((note) => ({ ...note, role: labels.top })),
    ...heartNotes.map((note) => ({ ...note, role: labels.heart })),
    ...baseNotes.map((note) => ({ ...note, role: labels.base }))
  ].map((segment) => ({
    ...segment,
    color: activeHardwareProfile.pumps.find((slot) => slot.materialName === segment.name)?.colorHex || '#9fd9bf'
  }));
  if (segments.length === 0) return null;

  return (
    <div className="formula-ratio">
      <div className="ratio-track">
        {segments.map((segment) => <div key={segment.name} style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }}><span>{segment.percentage}%</span></div>)}
      </div>
      <div className="ratio-legend">
        {segments.map((segment) => (
          <div key={segment.name}>
            <span className="legend-dot" style={{ backgroundColor: segment.color }} />
            <span>{segment.name}</span><small>{segment.role}</small><strong>{segment.percentage}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <p className="detail-line"><span>{label}</span>{value || '-'}</p>;
}

function NotesSection({ title, items }: { title: string; items: NoteItem[] }) {
  return (
    <div className="notes-section">
      <p className="notes-title">{title}</p>
      {items.map((item) => {
        const color = activeHardwareProfile.pumps.find((slot) => slot.materialName === item.name)?.colorHex;
        return <div key={`${title}-${item.name}`} className="note-card"><span className="legend-dot" style={{ backgroundColor: color }} /><strong>{item.name}</strong><span>{item.percentage}%</span></div>;
      })}
    </div>
  );
}

function ErrorBlock({ result, tr }: { result: GenerateResponse; tr: (key: keyof typeof t) => string }) {
  const error = result.formula.error;
  if (!error) return null;
  return (
    <Block title={tr('errorTitle')}>
      <p className="result-hint">{tr('errorHint')}</p>
      <div className="error-dimensions">
        {error.perDimension.map((item) => (
          <div key={item.dim} className="error-dimension">
            <div><span>{item.label}</span><small>{item.target} → {item.actual} · Δ{item.diff}</small></div>
            <div className="comparison-bars"><i style={{ width: `${Math.min(100, (item.target / 5) * 100)}%` }} /><b style={{ width: `${Math.min(100, (item.actual / 5) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="error-total">{tr('labelTotalError')} = {error.total} · {tr('labelL1Error')} = {error.l1}</p>
    </Block>
  );
}
