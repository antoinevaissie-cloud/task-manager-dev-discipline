import { format, parseISO } from 'date-fns';

export function formatDisplayDate(isoDate: string) {
  return format(parseISO(isoDate), 'MM/dd/yyyy');
}

export function toDateKey(input: string | Date) {
  const date = typeof input === 'string' ? parseISO(input) : input;
  return format(date, 'yyyy-MM-dd');
}

export function formatRelativeLabel(isoDate: string) {
  const date = parseISO(isoDate);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const key = format(date, 'yyyy-MM-dd');

  if (key === todayKey) {
    return 'Today';
  }

  const tomorrowKey = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), 'yyyy-MM-dd');
  if (key === tomorrowKey) {
    return 'Tomorrow';
  }

  return formatDisplayDate(isoDate);
}
