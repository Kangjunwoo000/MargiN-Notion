export const DAYS = ['월', '화', '수', '목', '금'];
export const TASKS = {
  presentation: { id: 'presentation', title: '교양 수업 발표 자료', detail: '슬라이드 10장 · 조사부터 최종 검토까지', icon: 'presentation', color: 'mint', duration: 200, due: 4 * 1440 + 1080, phases: [['자료 조사', 70], ['발표 구성', 30], ['슬라이드 제작', 80], ['최종 검토', 20]] },
  statistics: { id: 'statistics', title: '통계 연습문제', detail: '12문항 · 풀이와 답안 검토', icon: 'chart', color: 'blue', duration: 100, due: 2 * 1440 + 1080, phases: [['문제 풀이', 80], ['답안 검토', 20]] },
  essay: { id: 'essay', title: '독후감 작성', detail: 'A4 2쪽 · 초안과 다듬기', icon: 'book', color: 'purple', duration: 100, due: 4 * 1440 + 1080, phases: [['초안 작성', 70], ['문장 다듬기', 30]] },
};
export function activeTasks(scenario) { return scenario === 'single' ? [TASKS.presentation] : [TASKS.statistics, TASKS.presentation, TASKS.essay]; }
export function clock(t) { const m = ((t % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
export function dateLabel(t) { const d = Math.floor(t / 1440); return `9/${21 + d} (${DAYS[d] || '?'})`; }
export function dateValue(t) { return `2026-09-${String(21 + Math.floor(t / 1440)).padStart(2, '0')}`; }
export function windows(scenario) { return Array.from({ length: scenario === 'single' ? 5 : 4 }, (_, d) => ({ day: d, start: d * 1440 + (d === 4 ? 780 : 1140), end: d * 1440 + (d === 4 ? 1080 : scenario === 'single' ? 1190 : 1260) })); }
function blocksFrom(sequence, starts) { const offsets = {}; return sequence.map((task, i) => { const order = offsets[task] || 0; offsets[task] = order + 50; return { id: `${task}-${order}`, task, order, start: starts[i], duration: 50 }; }); }
function multiPlans(priority) {
  const starts = [1140, 1200, 2580, 2640, 4020, 4080, 5460, 5520];
  const found = []; const left = { presentation: 4, statistics: 2, essay: 2 };
  function walk(seq) {
    if (seq.length === 8) {
      const first = priority === 'essay' ? 'essay' : 'presentation'; const last = first === 'essay' ? 'presentation' : 'essay';
      if (seq.lastIndexOf(first) > seq.lastIndexOf(last)) return;
      found.push(blocksFrom(seq, starts)); return;
    }
    for (const task of Object.keys(left)) { if (!left[task] || (task === 'statistics' && seq.length >= 4)) continue; left[task]--; walk([...seq, task]); left[task]++; }
  }
  walk([]); return found;
}
export function plan(scenario, pace, priority, mode = 'recommended') {
  if (scenario === 'single') {
    const start = mode === 'deadline' ? 4 * 1440 + 845 : 4 * 1440 + 820;
    const starts = mode === 'recommended' && pace === 'spread' ? [1140, 2580, 4020, 5460] : [start, start + 60, start + 120, start + 180];
    return blocksFrom(Array(4).fill('presentation'), starts);
  }
  const candidates = multiPlans(priority);
  const score = rows => {
    const p = rows.filter(r => r.task === 'presentation');
    if (mode === 'deadline') return p[0].start * 1000 + rows.filter(r => r.task === 'statistics').at(-1).start;
    if (pace === 'late') {
      return activeTasks('multiple').reduce((sum, task) => sum + rows.filter(r => r.task === task.id).at(-1).start, 0) * 100 + rows.filter(r => r.task === (priority === 'essay' ? 'presentation' : 'essay'))[0].start;
    }
    const diversity = activeTasks('multiple').reduce((sum, task) => sum + new Set(rows.filter(r => r.task === task.id).map(r => Math.floor(r.start / 1440))).size, 0);
    return diversity * 100000 - p[0].start;
  };
  candidates.sort((a, b) => score(b) - score(a)); return candidates[0];
}
export function phasesFor(block, rows) {
  const prior = rows.filter(r => r.task === block.task && r.order < block.order).reduce((sum, r) => sum + (Number(r.duration) || 0), 0);
  let cursor = 0; const labels = [];
  for (const [name, count] of TASKS[block.task].phases) { const overlap = Math.min(prior + Number(block.duration), cursor + count) - Math.max(prior, cursor); if (overlap > 0) labels.push(`${name} ${overlap}분`); cursor += count; }
  return labels.join(' + ') || '작업 분량 확인';
}
export function splitBlock(rows, id, minutes) {
  const row = rows.find(r => r.id === id); const amount = Number(minutes);
  if (!row || !Number.isInteger(amount) || amount < 1 || amount >= row.duration) throw new Error('원래 작업보다 짧은 양의 정수(분)를 입력해 주세요.');
  const later = rows.filter(r => r.task === row.task && r.order > row.order).sort((a,b) => a.order-b.order)[0];
  const order = later ? (row.order + later.order) / 2 : row.order + 1;
  return rows.flatMap(r => r.id !== id ? [r] : [{ ...r, duration: amount }, { ...r, id: `${r.id}-split-${order}`, order, start: r.start + amount, duration: r.duration - amount }]);
}
export function validate(rows, scenario, priority) {
  const issues = []; const available = windows(scenario); const tasks = activeTasks(scenario); let remaining = 0;
  const valid = rows.filter(r => Number.isInteger(r.start) && Number.isInteger(r.duration) && r.duration > 0);
  if (valid.length !== rows.length) issues.push('날짜·시작 시각과 1분 이상의 작업 시간을 입력해 주세요.');
  for (const task of tasks) {
    const taskRows = valid.filter(r => r.task === task.id); const sum = taskRows.reduce((s, r) => s + r.duration, 0); const diff = task.duration - sum;
    if (diff > 0) { remaining += diff; issues.push(`${task.title}: 아직 ${diff}분을 배치하지 않았어요.`); }
    if (diff < 0) issues.push(`${task.title}: 필요한 분량보다 ${-diff}분 많아요.`);
    const ordered = [...taskRows].sort((a, b) => a.order - b.order);
    if (ordered.some((r, i) => i && r.start < ordered[i - 1].start + ordered[i - 1].duration)) issues.push(`${task.title}: 작업 단계 순서를 지켜 주세요.`);
    const end = Math.max(...taskRows.map(r => r.start + r.duration));
    if (end > task.due) issues.push(`${task.title}: 제출 마감을 ${end - task.due}분 넘겨요.`);
    else if (end > task.due - 5) issues.push(`${task.title}: 제출용 5분을 확보해 주세요.`);
  }
  for (const row of valid) if (!available.some(w => row.start >= w.start && row.start + row.duration <= w.end)) issues.push(`${dateLabel(row.start)} ${clock(row.start)}: 작업 가능한 시간을 벗어났어요.`);
  const sorted = [...valid].sort((a, b) => a.start - b.start); let focus = 0;
  sorted.forEach((row, i) => {
    const previous = sorted[i - 1]; const gap = previous ? row.start - previous.start - previous.duration : Infinity;
    if (gap < 0) issues.push(`${dateLabel(row.start)} ${clock(row.start)}: 작업 시간이 ${Math.min(-gap, row.duration)}분 겹쳐요.`);
    if (gap >= 10) focus = 0;
    focus += row.duration;
    if (focus > 50) issues.push('연속 작업이 50분을 넘어요. 작업을 나누고 중간에 10분 쉬어 주세요.');
  });
  if (scenario === 'multiple') {
    const finish = task => Math.max(...valid.filter(r => r.task === task).map(r => r.start + r.duration));
    if (finish(priority) > finish(priority === 'essay' ? 'presentation' : 'essay')) issues.push('같은 마감 과제의 완료 순서가 선택한 순서와 달라요.');
  }
  const p = sorted.filter(r => r.task === 'presentation');
  return { ok: issues.length === 0, issues: [...new Set(issues)], remaining, start: p[0]?.start, end: p.length ? Math.max(...p.map(r => r.start + r.duration)) : undefined, total: valid.reduce((s, r) => s + r.duration, 0) };
}
