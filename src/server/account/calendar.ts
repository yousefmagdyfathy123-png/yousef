type Calendar = { timeZone: string; businessDates: readonly string[]; policyText: string };

export function configuredDeletionCalendar(): Calendar | null {
  try {
    const { timeZone, businessDates, policyText } = JSON.parse(process.env.DELETION_BUSINESS_CALENDAR ?? 'null');
    new Intl.DateTimeFormat('en-US', { timeZone });
    if (typeof timeZone !== 'string' || typeof policyText !== 'string' || !policyText.trim() ||
        !Array.isArray(businessDates) || businessDates.length < 8 ||
        !businessDates.every((day, index) => typeof day === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(day) && new Date(day).toISOString().slice(0, 10) === day &&
          (!index || businessDates[index - 1] < day))) return null;
    return { timeZone, businessDates, policyText };
  } catch {
    return null;
  }
}

function localDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function deletionDeadline(calendar: Calendar, submittedAt: Date): Date | null {
  const local = localDate(submittedAt, calendar.timeZone);
  if (local < calendar.businessDates[0]) return null;
  const seventh = calendar.businessDates.filter(day => day > local)[6];
  if (!seventh) return null;
  // First instant after the seventh local business date, including DST transitions.
  const utc = Date.parse(seventh);
  let low = utc - 86_400_000;
  let high = utc + 172_800_000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (localDate(new Date(mid), calendar.timeZone) > seventh) high = mid;
    else low = mid;
  }
  return new Date(high);
}
