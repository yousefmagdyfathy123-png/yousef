import { configuredDeletionCalendar } from '../../../server/account/calendar';

export const dynamic = 'force-dynamic';

export default function DeletionPolicyPage() {
  const calendar = configuredDeletionCalendar();
  return <main><h1>Account deletion and business-day calendar</h1>
    {calendar ? <>
      <div style={{ whiteSpace: 'pre-wrap' }}>{calendar.policyText}</div>
      <p>The deadline is the end of the seventh listed business day after the submission date in {calendar.timeZone}.</p>
      <ul>{calendar.businessDates.map(date => <li key={date}>{date}</li>)}</ul>
    </> : <p>The account deletion calendar is currently unavailable.</p>}
  </main>;
}
