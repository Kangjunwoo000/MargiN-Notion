'use client';

import { useEffect, useMemo, useState } from 'react';
import ScheduleComparison from './ScheduleComparison';
import { TASKS, DAYS, activeTasks, clock, dateLabel, dateValue, windows, plan, phasesFor, splitBlock, validate } from '../lib/planner.mjs';

function Icon({name, size = 20, ...props}) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>, back: <path d="M19 12H5m5-5-5 5 5 5"/>, check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>, calendar: <><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m3 0h2"/></>,
    presentation: <><rect x="3" y="4" width="18" height="12" rx="2"/><path d="m8 21 4-5 4 5M7 12l3-3 3 2 4-4"/></>,
    chart: <><path d="M4 3v17h17M9 16v-5m5 5V7m5 9v-7"/></>, book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/></>,
    leaf: <><path d="M19 4C8 2 3 7 5 14c2 7 13 6 14-10Z"/><path d="m4 21 10-12"/></>, bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>, sliders: <><path d="M5 3v18M12 3v18m7-18v18"/><path d="M2 8h6m1 8h6m1-10h6"/></>,
    split: <><path d="M12 21v-8c0-5-6-5-6-10m6 10c0-5 6-5 6-10M3 6l3-3 3 3m6 0 3-3 3 3"/></>, reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,
    up: <path d="m6 14 6-6 6 6"/>, down: <path d="m6 10 6 6 6-6"/>, close: <path d="m6 6 12 12M6 18 18 6"/>, coffee: <><path d="M4 9h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/></>, layers: <><path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.calendar}</svg>;
}
function Logo(){ return <span className="brand"><span className="brand-mark"><i/><i/><i/></span><span>마지노선<span className="brand-en">MargiN-Notion</span></span></span>; }
function minutes(n){ return n >= 60 ? `${Math.floor(n/60)}시간${n%60 ? ` ${n%60}분` : ''}` : `${n}분`; }
function TaskIcon({task}) { return <span className={`task-icon ${task.color}`}><Icon name={task.icon} size={23}/></span>; }

export default function Planner(){
  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState('single');
  const [pace, setPace] = useState('spread');
  const [priority, setPriority] = useState('essay');
  const [mode, setMode] = useState('recommended');
  const [custom, setCustom] = useState([]);
  const [checked, setChecked] = useState(false);
  const [splitId, setSplitId] = useState(null);
  const [splitAmount, setSplitAmount] = useState('25');
  const [splitError, setSplitError] = useState('');
  const tasks = activeTasks(scenario);
  const recommended = useMemo(() => plan(scenario, pace, priority), [scenario, pace, priority]);
  const deadline = useMemo(() => plan(scenario, pace, priority, 'deadline'), [scenario, pace, priority]);
  const rows = mode === 'custom' ? custom : mode === 'deadline' ? deadline : recommended;
  const analysis = validate(rows, scenario, priority);
  const recAnalysis = validate(recommended, scenario, priority);
  const lastAnalysis = validate(deadline, scenario, priority);
  const total = tasks.reduce((sum,t)=>sum+t.duration,0);
  const splitRow = custom.find(r=>r.id===splitId);

  function go(next){setStep(next); setSplitId(null); window.scrollTo({top:0,behavior:'instant'});}
  function showResults(){setMode('recommended');setCustom(recommended.map(r=>({...r})));setChecked(false);go(2);}
  function selectMode(next){if(next==='custom'&&!custom.length)setCustom(recommended.map(r=>({...r})));setMode(next);setSplitId(null);}
  function update(id,key,value){setCustom(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));setChecked(false);}
  function resetCustom(){setCustom(recommended.map(r=>({...r})));setChecked(false);setSplitId(null);}
  function doSplit(event){event.preventDefault();try{setCustom(splitBlock(custom,splitId,splitAmount));setSplitId(null);setChecked(false);}catch(e){setSplitError(e.message);}}
  function changeScenario(next){setScenario(next);setCustom([]);setChecked(false);}

  useEffect(()=>{
    const context = document.modelContext; if (!context?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(context.registerTool({name:'read_planner_state',title:'현재 과제 계획 확인',description:'Read the visible demo planner selection and schedule validation without changing it.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({step,scenario,pace,priority,mode,rows,validation:analysis})},{signal:controller.signal})).catch(()=>{});
    return ()=>controller.abort();
  },[step,scenario,pace,priority,mode,rows]);

  const finishBuffer = analysis.end === undefined ? 0 : TASKS.presentation.due-analysis.end;
  let coaching = scenario==='single' && pace==='spread' && mode==='recommended' ? ['하루 50분씩, 차근차근 해도 괜찮아요.','목요일에 끝내고, 금요일은 여유로 남겨 두세요.'] : finishBuffer<=5 ? ['휴대폰은 잠시 내려놓고, 집중할 시간이에요.','제출용 5분만 남긴 일정이에요. 계획에 포함된 휴식은 지켜 주세요.'] : scenario==='multiple' ? ['가능한 시간을 나누면, 세 과제도 한눈에.','이번 주 작업 구간을 모두 사용해요. 한 구간을 미루면 다른 과제에도 영향을 줘요.'] : [`마감까지 ${minutes(finishBuffer)}의 여유가 있어요.`, '50분 집중하고 10분씩 쉬어 가세요. 제출 전에 파일을 한 번 더 확인해요.'];
  if(mode==='custom') coaching = !checked ? ['내가 정한 일정, 한 번 확인해 볼까요?','날짜와 분량을 바꾼 다음 ‘이 일정으로 확인’을 눌러 주세요.'] : !analysis.ok ? ['조금만 조정하면 더 좋은 계획이 돼요.','아래 확인 사항을 먼저 해결해 주세요. 아직 마감 가능한 일정으로 확정할 수 없어요.'] : coaching;

  return <>
    <header className="site-header"><div className="header-inner"><Logo/><div className="header-right"><span className="sample-pill"><span/>테스트 데이터 체험</span><span className="header-date">2026년 9월</span><span className="avatar" aria-label="샘플 사용자">나</span></div></div></header>
    <main className="shell">
      <nav className="steps" aria-label="계획 단계">{['과제 확인','내 페이스','시작 시점'].map((label,i)=><button key={label} disabled={i>step} className={`step ${step===i?'current':''} ${step>i?'complete':''}`} onClick={()=>go(i)} aria-current={step===i?'step':undefined}><span>{step>i?<Icon name="check" size={14}/>:String(i+1).padStart(2,'0')}</span>{label}{i<2&&<i/>}</button>)}</nav>

      {step===0&&<>
        <div className="page-title"><div><p className="eyebrow">MargiN-Notion · STARTLINE</p><h1>마지노선(MargiN-Notion)</h1><p className="slogan">"과제 마감에 대한 새로운 생각(Notion), 나만의 마지노선"</p></div><span className="week-tag"><Icon name="calendar" size={16}/>9.21 — 9.25</span></div>
        <div className="setup-grid"><section className="setup-main">
          <div className="scenario-options" role="group" aria-label="과제 예시 선택">{[['single','과제 하나','하나의 과제에 집중하고 싶어요.','presentation'],['multiple','과제 여러 개','겹치는 마감을 함께 계획해요.','layers']].map(([key,title,desc,icon])=><button key={key} className={`scenario-card ${scenario===key?'selected':''}`} aria-pressed={scenario===key} onClick={()=>changeScenario(key)}><div className="choice-top"><span className="choice-icon"><Icon name={icon} size={25}/></span><span className="radio-dot">{scenario===key&&<span/>}</span></div><strong>{title}</strong><span>{desc}</span></button>)}</div>
          <section className="panel task-panel"><div className="section-heading"><h2>이번 주 해야 할 일 <span className="count">{tasks.length}</span></h2><span className="small-label">샘플 과제</span></div>
            {tasks.map(task=><div className="task-item" key={task.id}><TaskIcon task={task}/><div className="task-copy"><h3>{task.title}</h3><p>{task.detail}</p><div className="task-tags"><span><Icon name="calendar" size={13}/>{dateLabel(task.due)} 18:00 마감</span><span><Icon name="clock" size={13}/>{minutes(task.duration)}</span></div></div></div>)}
            {scenario==='single'&&<div className="phase-bar">{TASKS.presentation.phases.map(([label,n])=><div key={label} style={{flex:n}}><span>{label}</span><strong>{n}<small>분</small></strong></div>)}</div>}
            {scenario==='multiple'&&<div className="priority-box"><div><h3>마감이 같다면, 먼저 끝낼 과제는?</h3><p>금요일 마감 두 과제의 완료 순서를 정해 주세요.</p></div><div className="priority-list">{[priority,priority==='essay'?'presentation':'essay'].map((id,i)=><div key={id}><span className="order-number">{i+1}</span><span>{TASKS[id].title}</span><button className="icon-button" aria-label={`${TASKS[id].title} ${i?'먼저':'나중에'} 끝내기`} onClick={()=>setPriority(priority==='essay'?'presentation':'essay')}><Icon name={i?'up':'down'} size={17}/></button></div>)}</div></div>}
            <div className="panel-total"><span>예상 작업 시간</span><strong>{minutes(total)} <small>휴식 별도</small></strong></div>
          </section>
        </section><aside className="setup-aside"><Availability scenario={scenario}/><div className="gentle-note"><Icon name="leaf" size={22}/><div><strong>시간을 잘 쓰는 첫걸음</strong><p>얼마나 걸리는지 아는 것부터.<br/>내 기록과 페이스로 계획해요.</p></div></div></aside></div>
        <div className="flow-footer"><p><Icon name="info" size={15}/>지금은 준비된 과제와 시간표로 체험해요.</p><button className="primary" onClick={()=>go(1)}>내 페이스 선택하기 <Icon name="arrow" size={18}/></button></div>
      </>}

      {step===1&&<>
        <div className="page-title"><div><p className="eyebrow">A PLAN THAT FITS YOU</p><h1>어떤 페이스가 편한가요?</h1><p>계획에 나를 맞추지 말고, 나에게 계획을 맞춰요.</p></div></div>
        <div className="setup-grid"><section className="setup-main"><div className="pace-options">{[['spread','leaf','조금씩, 미리 나눠서','하루에 조금씩 진행하고, 마감일은 가볍게.','매일 짧게 · 여유 있게'],['late','bolt','제출일 가까이, 몰아서','마감이 가까워질 때 집중해서 마무리해요.','늦게 시작해도 · 휴식은 꼭']].map(([id,icon,title,desc,tag])=><button key={id} className={`pace-card ${pace===id?'selected':''}`} aria-pressed={pace===id} onClick={()=>{setPace(id);setCustom([]);}}><span className={`pace-icon ${id}`}><Icon name={icon} size={30}/></span><div><h2>{title}</h2><p>{desc}</p><span className="pace-tag">{tag}</span></div><span className="radio-dot">{pace===id&&<span/>}</span></button>)}</div>
          <section className="panel rhythm-panel"><div className="section-heading"><h2>집중도, 휴식도 내 리듬대로</h2><span className="small-label">샘플 설정</span></div><div className="rhythm"><div><Icon name="clock"/><strong>50<small>분</small></strong><span>집중 시간</span></div><span className="rhythm-divider">＋</span><div><Icon name="coffee"/><strong>10<small>분</small></strong><span>쉬어 가기</span></div><div className="rhythm-visual"><i/><i/><i/><i/><i/><b/><small>집중 뒤에는 잠깐의 쉼</small></div></div></section>
          <div className="record-note"><span className="record-icon"><Icon name="chart"/></span><div><strong>지난 기록에서 가져온 나의 속도</strong><p>자료 조사는 예상 40분보다 긴 <b>70분</b>이 걸렸어요.<br/>이번 계획에도 70분을 반영했어요. <span>가상 작업 기록</span></p></div></div>
        </section><aside className="setup-aside"><section className="panel summary-panel"><p className="eyebrow">MY PLAN</p><h2>이번 주 계획 요약</h2><div className="summary-big">{tasks.length}<span>개의 과제</span></div><dl><div><dt>전체 작업</dt><dd>{minutes(total)}</dd></div><div><dt>마감 주간</dt><dd>9.21 — 9.25</dd></div><div><dt>작업 성향</dt><dd>{pace==='spread'?'조금씩 나눠서':'제출일 가까이'}</dd></div><div><dt>제출용 시간</dt><dd>최소 5분 확보</dd></div></dl><div className="soft-message"><Icon name="info" size={16}/><span>추천 후에도 직접 시간을 나누고 조정할 수 있어요.</span></div></section></aside></div>
        <div className="flow-footer"><button className="text-button" onClick={()=>go(0)}><Icon name="back" size={17}/>과제 다시 보기</button><button className="primary" onClick={showResults}>내 시작 시점 보기 <Icon name="arrow" size={18}/></button></div>
      </>}

      {step===2&&<>
        <div className="page-title result-title"><div><p className="eyebrow">YOUR TIME, YOUR MAGINOT</p><h1>시작할 때를 알면, 마음이 가벼워져요.</h1><p>{scenario==='multiple'?'세 과제를 함께 고려한 발표 과제의 시작 시점이에요.':'발표 과제에 필요한 시간과 나의 리듬을 함께 계산했어요.'}</p></div><button className="outline-button" onClick={()=>go(0)}><Icon name="sliders" size={16}/>조건 다시 보기</button></div>
        <div className="result-metrics"><button className={`metric recommended ${mode==='recommended'?'active':''}`} onClick={()=>selectMode('recommended')}><div className="metric-label"><span><Icon name="leaf" size={18}/>MargiN-Notion 추천 시작</span><span className="metric-badge">{pace==='spread'?'조금씩 나눠서':'제출일 가까이'}</span></div><div className="metric-time">{dateLabel(recAnalysis.start)}<strong>{clock(recAnalysis.start)}</strong></div><p>{scenario==='single'?(pace==='spread'?'하루 50분씩, 목요일에 마무리해요.':'금요일 17:30 완료 · 제출까지 30분 여유'):'선택한 완료 순서와 다른 과제도 함께 반영했어요.'}</p><span className="metric-orbit" aria-hidden="true"/></button>
          <button className={`metric deadline ${mode==='deadline'?'active':''}`} onClick={()=>selectMode('deadline')}><div className="metric-label"><span><Icon name="clock" size={18}/>늦어도 이때는 시작</span><span className="metric-badge">시작 마지노선</span></div><div className="metric-time">{dateLabel(lastAnalysis.start)}<strong>{clock(lastAnalysis.start)}</strong></div><p>{scenario==='single'?'금요일 17:55 완료 · 제출용 5분만 남겨요.':'남은 작업 구간을 모두 활용하는 기준이에요.'}</p></button></div>
        <div className={`coaching ${mode==='custom'&&checked&&!analysis.ok?'warning':''}`} role="status"><span className="coach-symbol"><Icon name={analysis.ok?'leaf':'info'} size={23}/></span><div><strong>{coaching[0]}</strong><p>{coaching[1]}</p></div><span className="coach-label">MargiN NOTE</span></div>
        <section className="schedule-section"><div className="schedule-heading"><div><h2>나의 주간 일정</h2><p>2026년 9월 21일 — 25일</p></div><div className="tabs" role="tablist" aria-label="일정 보기 방식">{[['recommended','추천 일정','leaf'],['deadline','마지노선 일정','clock'],['custom','직접 조정','sliders']].map(([id,label,icon])=><button key={id} role="tab" id={`tab-${id}`} aria-selected={mode===id} aria-controls="schedule-panel" tabIndex={mode===id?0:-1} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const keys=['recommended','deadline','custom'];const next=keys[(keys.indexOf(mode)+(e.key==='ArrowRight'?1:2))%3];selectMode(next);document.getElementById(`tab-${next}`)?.focus();}}} onClick={()=>selectMode(id)}><Icon name={icon} size={15}/>{label}</button>)}</div></div>
          <div id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
          {mode==='custom'&&<section className="editor panel"><div className="editor-heading"><div><h3>나에게 맞게, 시간을 다시 나눠요</h3><p>25분 + 25분도 괜찮아요. 작업 총량과 휴식은 지켜 주세요.</p></div><button className="text-button" onClick={resetCustom}><Icon name="reset" size={15}/>추천으로 되돌리기</button></div>
            <div className="editor-rows">{custom.map((row,index)=><div className="editor-row" key={row.id}><div className="edit-task"><span className={`color-dot ${TASKS[row.task].color}`}/><div><strong>{TASKS[row.task].title}</strong><span>{phasesFor(row,custom)}</span></div></div><div className="edit-fields"><label>날짜<input aria-label={`작업 ${index+1} 날짜`} type="date" min="2026-09-21" max="2026-09-25" value={Number.isFinite(row.start)?dateValue(row.start):''} onChange={e=>{const day=Number(e.target.value.slice(-2))-21;update(row.id,'start',e.target.value?day*1440+(Number.isFinite(row.start)?row.start%1440:1140):NaN);}}/></label><label>시작<input aria-label={`작업 ${index+1} 시작`} type="time" value={Number.isFinite(row.start)?clock(row.start):''} onChange={e=>{const [h,m]=e.target.value.split(':').map(Number);update(row.id,'start',e.target.value?Math.floor((Number.isFinite(row.start)?row.start:0)/1440)*1440+h*60+m:NaN);}}/></label><label>작업 분량<div className="number-field"><input aria-label={`작업 ${index+1} 분량`} type="number" min="1" max="400" step="1" value={row.duration} onChange={e=>update(row.id,'duration',e.target.value===''?'':Number(e.target.value))}/><span>분</span></div></label><button className="split-button" disabled={row.duration<2} aria-label={`작업 ${index+1} 나누기`} onClick={()=>{setSplitId(row.id);setSplitAmount(String(Math.floor(row.duration/2)));setSplitError('');}}><Icon name="split" size={16}/>나누기</button></div></div>)}</div>
            <div className="editor-actions"><span>배치한 작업 <strong>{analysis.total} / {total}분</strong>{analysis.remaining>0&&<em> · {analysis.remaining}분 미배치</em>}</span><button className="primary small" onClick={()=>setChecked(true)}>이 일정으로 확인 <Icon name="check" size={17}/></button></div>
            {checked&&<><div className={`validation ${analysis.ok?'valid':'invalid'}`} role="status"><strong><Icon name={analysis.ok?'check':'info'} size={18}/>{analysis.ok?'마감과 휴식을 지키는 일정이에요.':'아직 확인할 부분이 있어요.'}</strong>{analysis.ok?<p>발표 완료 {dateLabel(analysis.end)} {clock(analysis.end)} · 제출까지 {minutes(finishBuffer)} 남아요.</p>:<ul>{analysis.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}</div><ScheduleComparison before={recommended} after={custom} scenario={scenario} priority={priority}/></>}
          </section>}
          <div className="calendar"><div className="calendar-top"><span><Icon name="calendar" size={16}/>{mode==='recommended'?'추천 일정':mode==='deadline'?'발표 마지노선 기준 일정':'직접 조정한 일정'}</span><div className="legend">{tasks.map(t=><span key={t.id}><i className={t.color}/>{t.id==='presentation'?'발표':t.id==='statistics'?'통계':'독후감'}</span>)}<span><i className="break-dot"/>휴식</span></div></div><div className="week-grid">{DAYS.map((day,d)=>{
            const daily=rows.filter(r=>Number.isFinite(r.start)&&Math.floor(r.start/1440)===d).sort((a,b)=>a.start-b.start);
            return <div className={`day-column ${d===4?'due-day':''}`} key={day}><div className="day-header"><span>{day}요일</span><strong>{21+d}</strong>{d===4&&<small>제출일</small>}</div><div className="day-content">{daily.length?daily.map((r,i)=><div key={r.id}>{i>0&&r.start-daily[i-1].start-daily[i-1].duration>=10&&r.start-daily[i-1].start-daily[i-1].duration<=60&&<div className="break-slot"><Icon name="coffee" size={12}/>{r.start-daily[i-1].start-daily[i-1].duration}분 쉬어 가기</div>}<div className={`work-block ${TASKS[r.task].color} ${scenario==='multiple'&&r.task==='presentation'?'focus-task':''}`}><span className="block-time">{clock(r.start)} — {Number(r.duration)>0?clock(r.start+Number(r.duration)):'--:--'}</span><strong>{TASKS[r.task].title}</strong><p>{phasesFor(r,rows)}</p><span className="duration-tag">{r.duration||0}분</span></div></div>):<div className="empty-day"><Icon name={d===4&&scenario==='single'?'leaf':'clock'} size={23}/><span>{windows(scenario).some(w=>w.day===d)?'비워 둔 시간':'작업 가능 시간 없음'}</span></div>}{tasks.filter(t=>Math.floor(t.due/1440)===d).map(t=><div key={t.id} className="deadline-event"><span className={`color-dot ${t.color}`}/><div><strong>{t.id==='presentation'?'발표':t.id==='statistics'?'통계':'독후감'} 제출</strong><span>18:00 마감 · 제출용 5분 확보</span></div></div>)}</div></div>;
          })}</div></div>
          </div>
          <div className="schedule-bottom"><span><Icon name="clock" size={15}/>총 작업 {minutes(total)} · 연속 집중 50분 후 10분 휴식</span><span>{scenario==='multiple'?'자동 일정은 50분 작업 구간 기준 · 직접 조정은 자유롭게':'마지막 작업 뒤에는 휴식을 추가하지 않아요.'}</span></div>
        </section>
        <div className="result-explanation"><Icon name="info" size={18}/><div><strong>시작 마지노선은 어떻게 정했나요?</strong><p>{scenario==='single'?'작업 200분 + 중간 휴식 30분 + 제출용 5분을 마감에서 역산했어요.':'발표에 필요한 네 구간을 확보하면서, 통계 마감과 선택한 완료 순서도 지켰어요. 과제별 마지노선을 모두 동시에 선택할 수 있는 것은 아니에요.'} 실제 작업이 길어지면 마감에 영향을 줄 수 있어요.</p></div></div>
        <div className="flow-footer"><button className="text-button" onClick={()=>go(1)}><Icon name="back" size={16}/>성향 다시 선택</button><button className="outline-button" onClick={()=>go(0)}>다른 예시 체험하기 <Icon name="arrow" size={16}/></button></div>
      </>}
      <footer className="site-footer"><Logo/><p>가상 기록 기반 시연 · 실제 AI 분석 및 캘린더 연결 없음</p><span>"과제 마감에 대한 새로운 생각(Notion), 나만의 마지노선"</span></footer>
    </main>
    {splitRow&&<div className="modal-backdrop" onClick={()=>setSplitId(null)}><section className="split-dialog" role="dialog" aria-modal="true" aria-labelledby="split-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setSplitId(null);if(e.key==='Tab'){const controls=[...e.currentTarget.querySelectorAll('button,input')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}><button className="dialog-close icon-button" aria-label="나누기 닫기" onClick={()=>setSplitId(null)}><Icon name="close"/></button><span className="dialog-icon"><Icon name="split" size={27}/></span><h2 id="split-title">{splitRow.duration}분을 어떻게 나눌까요?</h2><p>먼저 할 분량을 입력해 주세요.<br/>나머지 작업은 뒤에 새 구간으로 만들어 드려요.</p><form onSubmit={doSplit}><label>먼저 할 작업 시간<div className="split-number"><input autoFocus type="number" min="1" max={splitRow.duration-1} step="1" required value={splitAmount} onChange={e=>setSplitAmount(e.target.value)}/>분</div></label><div className="split-preview"><span>첫 번째 <b>{Number(splitAmount)||0}분</b></span><Icon name="arrow" size={18}/><span>두 번째 <b>{splitRow.duration-(Number(splitAmount)||0)}분</b></span></div><p className="split-help">나눈 뒤 각 구간의 날짜와 시작 시간을 바꿀 수 있어요.</p>{splitError&&<p role="alert">{splitError}</p>}<button className="primary" type="submit">두 구간으로 나누기 <Icon name="split" size={17}/></button></form></section></div>}
  </>;
}

function Availability({scenario}){ return <section className="panel availability"><div className="section-heading"><h2><Icon name="calendar" size={19}/>작업 가능한 시간</h2></div><p className="aside-description">수업과 약속을 제외한 시간이에요.</p><div className="availability-list">{DAYS.map((d,i)=>{const w=windows(scenario).find(w=>w.day===i);return <div key={d}><span>{d}<small>{21+i}</small></span><div>{w?<><i style={{width:i===4?'100%':scenario==='single'?'46%':'76%'}}/><strong>{clock(w.start)} — {clock(w.end)}</strong></>:<span className="unavailable">예정된 일정이 있어요</span>}</div></div>;})}</div><div className="availability-note"><Icon name="info" size={15}/><span>가능한 시간 안에서 작업과 휴식을 함께 배치해요.</span></div></section>; }
