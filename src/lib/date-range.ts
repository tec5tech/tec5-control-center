import { format, isValid, parseISO, startOfDay, endOfDay, subDays } from "date-fns";

export type DateRange = { from: Date; to: Date };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): DateRange {
  const now = new Date();
  return {
    from: startOfDay(subDays(now, 30)),
    to: endOfDay(now),
  };
}

export function parseDateRange(searchParams: { from?: string; to?: string }): DateRange {
  const rawFrom = searchParams.from;
  const rawTo = searchParams.to;

  if (!rawFrom || !rawTo || !ISO_DATE_RE.test(rawFrom) || !ISO_DATE_RE.test(rawTo)) {
    return defaultRange();
  }

  const parsedFrom = parseISO(rawFrom);
  const parsedTo = parseISO(rawTo);

  if (!isValid(parsedFrom) || !isValid(parsedTo)) {
    return defaultRange();
  }

  const from = startOfDay(parsedFrom);
  const to = endOfDay(parsedTo);

  // Si el rango está invertido, usamos el default en lugar de swapear silenciosamente
  if (from > to) return defaultRange();

  return { from, to };
}

export function formatDateRangeForUrl(range: DateRange): { from: string; to: string } {
  return {
    from: format(range.from, "yyyy-MM-dd"),
    to: format(range.to, "yyyy-MM-dd"),
  };
}
