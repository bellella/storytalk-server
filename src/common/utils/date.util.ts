/** 한국은 일광절약시간 없음 — 항상 UTC+9 */
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 인스턴트 기준 Asia/Seoul 달력 연·월·일
 * (로컬 getFullYear/getDate와 무관 — 서버 TZ에 의존하지 않음)
 */
export function getSeoulDateParts(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    throw new Error('Invalid Seoul date parts');
  }
  return { y, m, day };
}

/** 서울 달력 기준 YYYY-MM-DD 문자열 */
export function formatSeoulYmd(d: Date): string {
  const { y, m, day } = getSeoulDateParts(d);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
  const { y, m, day } = getSeoulDateParts(new Date());
  const start = startOfSeoulCalendarDay(y, m, day);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

/** 출석/일일 usage row 키 등 “오늘 자정(서울)” 한 점만 필요할 때 */
export function getSeoulTodayStart(): Date {
  return getTodayRange().start;
}

/**
 * “지금” 서울 달력의 날짜로 자정 시각 + YMD (출석 등에서 동일 기준으로 쓰기)
 */
export function getSeoulNowDay(): {
  start: Date;
  y: number;
  m: number;
  day: number;
  ymdKey: number;
  ymdString: string;
} {
  const { y, m, day } = getSeoulDateParts(new Date());
  const start = startOfSeoulCalendarDay(y, m, day);
  const ymdString = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const ymdKey = y * 10000 + m * 100 + day;
  return { start, y, m, day, ymdKey, ymdString };
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
