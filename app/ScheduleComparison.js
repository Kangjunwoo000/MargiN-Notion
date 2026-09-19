import { clock, dateLabel } from '../lib/planner.mjs';
import { compareSchedules } from '../lib/comparison.mjs';

function duration(value) {
  const days = Math.floor(value / 1440);
  const hours = Math.floor((value % 1440) / 60);
  const minutes = value % 60;
  return [days && `${days}일`, hours && `${hours}시간`, (minutes || !value) && `${minutes}분`].filter(Boolean).join(' ');
}
function timestamp(value) { return value === null ? '계산 보류' : `${dateLabel(value)} ${clock(value)}`; }
function buffer(value) { return value === null ? '계산 보류' : value < 0 ? `${duration(-value)} 초과` : `${duration(value)} 남음`; }
function change(value, isBuffer) {
  if (value === null) return '작업 분량과 입력을 확인해 주세요';
  if (!value) return '변경 없음';
  return `${duration(Math.abs(value))} ${isBuffer ? (value > 0 ? '늘어남' : '줄어듦') : (value > 0 ? '늦어짐' : '빨라짐')}`;
}

export default function ScheduleComparison({ before, after, scenario, priority }) {
  const comparison = compareSchedules(before, after, scenario, priority);
  return <section className="schedule-comparison" aria-labelledby="comparison-title" aria-live="polite">
    <div className="comparison-heading"><div><p className="eyebrow">BEFORE & AFTER</p><h3 id="comparison-title">조정 전후, 이렇게 달라졌어요</h3><p>조정 전은 현재 성향의 추천 일정이에요. 반복 확인해도 기준은 그대로예요.</p></div><span className={`comparison-status ${comparison.validation.ok ? '' : 'needs-review'}`}>{comparison.validation.ok ? '일정 확인 완료' : '수정 필요 · 참고 수치'}</span></div>
    {!comparison.validation.ok && <p className="comparison-caution">시간 겹침이나 입력 오류가 있어 아직 실행 가능한 일정은 아니에요. 분량이 부족하거나 입력이 비어 있는 과제는 완료 시각과 여유를 계산하지 않아요.</p>}
    {comparison.tasks.map(({task, before: previous, after: current, delta}) => <article className="task-comparison" key={task.id}>
      <h4><span className={`color-dot ${task.color}`}/>{task.title}<span>{current.allocated} / {task.duration}분 배치</span></h4>
      <div className="comparison-grid">{[
        ['시작 시각', timestamp(previous.start), timestamp(current.start), delta?.start ?? null, false],
        ['작업 완료', timestamp(previous.end), timestamp(current.end), delta?.end ?? null, false],
        ['제출까지 여유', buffer(previous.buffer), buffer(current.buffer), delta?.buffer ?? null, true],
      ].map(([label, oldValue, newValue, difference, isBuffer]) => <div className={`comparison-cell ${isBuffer ? 'buffer-cell' : ''}`} key={label}>
        <span className="comparison-label">{label}</span>
        <div className="comparison-value"><span>조정 전</span><span>{oldValue}</span></div>
        <div className="comparison-value after"><span>조정 후</span><strong>{newValue}</strong></div>
        <p className={difference === null ? 'pending-delta' : isBuffer && difference < 0 ? 'reduced-delta' : ''}>{change(difference, isBuffer)}</p>
      </div>)}</div>
    </article>)}
  </section>;
}
