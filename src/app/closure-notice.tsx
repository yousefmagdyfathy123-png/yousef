import { getClosure } from '../server/account/closure';

export async function ClosureNotice({ closure }: { closure?: Awaited<ReturnType<typeof getClosure>> }) {
  const announcement = closure === undefined && process.env.DATABASE_URL ? await getClosure() : closure;
  return announcement ? <aside aria-label="Planned service closure">
    Alfadata plans to end service on <time dateTime={announcement.shutdown_at.toISOString()}>
      {announcement.shutdown_at.toISOString().slice(0, 10)} (UTC)
    </time>. New purchases are closed.
  </aside> : null;
}
