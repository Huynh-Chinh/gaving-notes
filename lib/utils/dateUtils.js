export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

export const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const endOfWeek = new Date(d.setDate(diff));
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

export const getStartOfMonth = (date) => {
  const d = new Date(date);
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
};

export const getEndOfMonth = (date) => {
  const d = new Date(date);
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  return endOfMonth;
};