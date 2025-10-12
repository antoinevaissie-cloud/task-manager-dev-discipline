import { addDays, startOfDay } from 'date-fns';

export function toStartOfDay(date: Date | string) {
  return startOfDay(typeof date === 'string' ? new Date(date) : date);
}

export function moveToNextDay(date: Date) {
  return toStartOfDay(addDays(date, 1));
}

export function moveToPlusTwoDays(date: Date) {
  return toStartOfDay(addDays(date, 2));
}

export function moveToNextWeek(date: Date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday ... 6 = Saturday
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  return toStartOfDay(addDays(date, daysUntilMonday === 0 ? 7 : daysUntilMonday));
}
