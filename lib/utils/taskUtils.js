export const isTaskOverdue = (task) => {
  if (!task.due_date || task.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDueDate = new Date(task.due_date);
  taskDueDate.setHours(0, 0, 0, 0);
  return taskDueDate < today;
};

export const getLabelColorClass = (label) => {
  if (!label) return 'border-gray-300';
  const colors = [
    'border-purple-500', 'border-indigo-500', 'border-pink-500',
    'border-teal-500', 'border-orange-500', 'border-lime-500',
    'border-cyan-500', 'border-fuchsia-500'
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const sortTasksByDate = (tasks) => {
  return tasks.sort((a, b) => {
    const dateComparison = new Date(a.due_date) - new Date(b.due_date);
    if (dateComparison !== 0) return dateComparison;
    if (a.start_time && b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    return 0;
  });
};