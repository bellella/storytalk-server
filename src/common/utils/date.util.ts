export const getTodayRange = (): { start: Date; end: Date } => {
  // 오늘 날짜 범위 (KST 기준)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Date → "오전 9:30", "오후 3:58" 형식 */
export function formatCreatedAtDisplay(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const minStr = minutes.toString().padStart(2, '0');
  return `${period} ${hour12}:${minStr}`;
}
