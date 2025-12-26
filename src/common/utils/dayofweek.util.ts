import { DayOfWeek } from '@prisma/client';

export function getDayFromDate(date: string | Date): DayOfWeek {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }

  const day = d.getUTCDay(); 
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const map: Record<number, DayOfWeek> = {
    0: DayOfWeek.SUN,
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
    6: DayOfWeek.SAT,
  };

  return map[day];
}
