export const getTodayRange = (): { start: Date; end: Date } => {
  // 오늘 날짜 범위 (KST 기준)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

