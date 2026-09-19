import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, splitBlock } from '../lib/planner.mjs';
import { compareSchedules } from '../lib/comparison.mjs';

const baseline = plan('single', 'late', 'essay');
test('20 minutes later leaves 10 minutes, while preserving the recommendation', () => {
  const moved = baseline.map(row => ({...row, start: row.start + 20}));
  const result = compareSchedules(baseline, moved, 'single', 'essay');
  assert.equal(result.validation.ok, true);
  assert.equal(result.tasks[0].before.buffer, 30);
  assert.equal(result.tasks[0].after.buffer, 10);
  assert.deepEqual(result.tasks[0].delta, {start:20,end:20,buffer:-20});
  assert.equal(compareSchedules(baseline, baseline, 'single', 'essay').tasks[0].delta.buffer, 0);
});
test('earlier schedule gains buffer and dates remain absolute across days', () => {
  const moved = baseline.map(row => ({...row, start:row.start-20}));
  assert.equal(compareSchedules(baseline,moved,'single','essay').tasks[0].after.buffer,50);
  const spread = plan('single','spread','essay');
  const delta = compareSchedules(spread,baseline,'single','essay').tasks[0].delta;
  assert.ok(delta.start>1440);
});
test('overdue result is negative and cannot be shown as feasible', () => {
  const moved = baseline.map(row => ({...row,start:row.start+50}));
  const result = compareSchedules(baseline,moved,'single','essay');
  assert.equal(result.validation.ok,false);
  assert.equal(result.tasks[0].after.buffer,-20);
});
test('incomplete or invalid tasks have no misleading completion or buffer', () => {
  for (const edit of [{duration:25},{start:NaN},{duration:''},{duration:75},{duration:0}]) {
    const rows=baseline.map((row,i)=>i===0?{...row,...edit}:row);
    const result=compareSchedules(baseline,rows,'single','essay');
    assert.equal(result.validation.ok,false);
    assert.equal(result.tasks[0].after.end,null);
    assert.equal(result.tasks[0].after.buffer,null);
    assert.equal(result.tasks[0].delta,null);
  }
});
test('splitting without moving keeps the same totals and timing', () => {
  const split=splitBlock(baseline,baseline[0].id,25);
  const result=compareSchedules(baseline,split,'single','essay');
  assert.equal(result.validation.ok,true);
  assert.deepEqual(result.tasks[0].delta,{start:0,end:0,buffer:0});
});
test('multiple tasks are compared independently; all pace/order combinations stay valid', () => {
  for(const pace of ['spread','late']) for(const priority of ['essay','presentation']){
    const before=plan('multiple',pace,priority);
    const after=plan('multiple',pace,priority,'deadline');
    const result=compareSchedules(before,after,'multiple',priority);
    assert.equal(result.tasks.length,3);
    assert.equal(result.validation.ok,true);
    for(const item of result.tasks) assert.equal(item.after.allocated,item.task.duration);
  }
});
