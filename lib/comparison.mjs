import { activeTasks, validate } from './planner.mjs';

// Compare with the current recommendation, not the previous check or a partial edit.
export function compareSchedules(before, after, scenario, priority) {
  function summarize(rows, task) {
    const blocks = rows.filter(row => row.task === task.id);
    const valid = blocks.every(row => Number.isInteger(row.start) && Number.isInteger(row.duration) && row.duration > 0);
    const allocated = blocks.reduce((sum, row) => sum + (Number.isInteger(row.duration) && row.duration > 0 ? row.duration : 0), 0);
    const complete = blocks.length > 0 && valid && allocated === task.duration;
    const start = complete ? Math.min(...blocks.map(row => row.start)) : null;
    const end = complete ? Math.max(...blocks.map(row => row.start + row.duration)) : null;
    return { complete, allocated, start, end, buffer: complete ? task.due - end : null };
  }
  return {
    validation: validate(after, scenario, priority),
    tasks: activeTasks(scenario).map(task => {
      const previous = summarize(before, task);
      const current = summarize(after, task);
      const comparable = previous.complete && current.complete;
      return { task, before: previous, after: current,
        delta: comparable ? { start: current.start - previous.start, end: current.end - previous.end, buffer: current.buffer - previous.buffer } : null,
      };
    }),
  };
}
