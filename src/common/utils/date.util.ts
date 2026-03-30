export const getTodayRange = (): { start: Date; end: Date } => {
  // 오늘 날짜 범위 (KST 기준)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Date → "오전 9:30", "오후 3:58" 형식 (항상 한국시간 Asia/Seoul) */
export function formatCreatedAtDisplay(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
