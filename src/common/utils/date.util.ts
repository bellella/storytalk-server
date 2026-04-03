/** 한국은 일광절약시간 없음 — 항상 UTC+9 */
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 인스턴트 기준 Asia/Seoul 달력 연·월·일 */
function seoulCalendarParts(d: Date): { y: number; m: number; day: number } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [y, m, day] = s.split('-').map(Number);
  return { y, m, day };
}

/**
 * 서울 달력의 해당 일 00:00:00 ~ 23:59:59.999 (KST)에 해당하는 UTC 구간.
 * 서버 TZ와 무관하게 동일한 “한국 하루”를 쓴다.
 */
export function startOfSeoulCalendarDay(
  year: number,
  month: number,
  day: number
): Date {
  return new Date(Date.UTC(year, month - 1, day) - SEOUL_OFFSET_MS);
}

/**
 * 오늘(한국 날짜) 00:00:00 KST ~ 오늘 23:59:59.999 KST 에 해당하는 UTC 시각 범위
 */
export const getTodayRange = (): { start: Date; end: Date } => {
  const { y, m, day } = seoulCalendarParts(new Date());
  const start = startOfSeoulCalendarDay(y, m, day);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

/** 출석/일일 usage row 키 등 “오늘 자정(서울)” 한 점만 필요할 때 */
export function getSeoulTodayStart(): Date {
  return getTodayRange().start;
}

/** Date → "오전 9:30", "오후 3:58" 형식 (항상 한국시간 Asia/Seoul) */
export function formatCreatedAtDisplay(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
