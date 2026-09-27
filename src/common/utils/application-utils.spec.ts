import { DayOfWeek } from '@prisma/client';
import { getDayFromDate } from './dayofweek.util';
import {
  getSessionCalendarLabels,
  getSessionTimeLabel,
} from './session.util';
import { slugify } from './slugify.util';
import { toMinutes, toTime } from './time.util';

describe('application utilities', () => {
  it('creates stable URL slugs from punctuation and accented text', () => {
    expect(slugify('  Déjà Vu: Math & Science_101!  ')).toBe(
      'deja-vu-math-science-101',
    );
  });

  it('converts between HH:mm values and minutes', () => {
    expect(toMinutes('13:45')).toBe(825);
    expect(toTime(825)).toBe('13:45');
  });

  it('uses UTC for session labels so servers produce identical output', () => {
    const sessionDate = new Date('2026-09-23T13:05:00.000Z');

    expect(getSessionCalendarLabels(sessionDate)).toEqual({
      monthLabel: 'SEP',
      dateLabel: '23',
      dayLabel: 'WED',
    });
    expect(getSessionTimeLabel(sessionDate)).toBe('1:05 PM');
  });

  it('maps a UTC date to the Prisma day enum', () => {
    expect(getDayFromDate('2026-09-23T23:30:00.000Z')).toBe(DayOfWeek.WED);
  });

  it('rejects invalid dates', () => {
    expect(() => getDayFromDate('not-a-date')).toThrow('Invalid date');
  });
});
