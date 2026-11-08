import { OperationForm } from './operations';
import { getClosure } from '../../server/account/closure';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdministrationDenied, requireAdmin } from '../../server/admin/service';
import { Suspension } from './suspension';

export default async function AdminPage() {
  const request = new Request('http://localhost/admin', { headers: await headers() });
  const actor = await requireAdmin(request).catch(error => {
    if (error instanceof AdministrationDenied) notFound();
    throw error;
  });
  const { db } = await import('../../server/db/pool');
  const [users, trials, orders, events, reviews, deletions, closure, delivery] = await Promise.all([
    db.query<{ id: string; email: string; suspended: boolean }>(`
      SELECT u.id,u.email,coalesce(a.suspended,false) AS suspended FROM "user" u
      LEFT JOIN account_access a ON a.user_id=u.id ORDER BY u."createdAt" DESC,u.id LIMIT 50
    `),
    db.query<{ user_id: string; trial_status: string; trial_ends_at: Date | null }>(`
      SELECT user_id,trial_status,trial_ends_at FROM account_access
      WHERE trial_status IS NOT NULL ORDER BY trial_ends_at DESC NULLS LAST,user_id LIMIT 50
    `),
    db.query<{ id: string; status: string; environment: string }>(
      'SELECT id,status,environment FROM orders ORDER BY created_at DESC,id LIMIT 50',
    ),
    db.query<{ id: string; provider: string; environment: string; order_id: string; kind: string; received_at: Date }>(
      'SELECT id,provider,environment,order_id,kind,received_at FROM provider_events ORDER BY received_at DESC,id LIMIT 50',
    ),
    db.query<{ order_id: string; reason: string }>(`
      SELECT order_id,reason FROM payment_review_cases WHERE resolved_at IS NULL
      ORDER BY first_seen_at,order_id LIMIT 50
    `),
    db.query<{ id: string; user_id: string; due_at: Date; reviewed_at: Date | null; overdue: boolean }>(`
      SELECT id,user_id,due_at,reviewed_at,due_at<=now() AS overdue
      FROM deletion_requests WHERE completed_at IS NULL ORDER BY due_at,id LIMIT 50
    `),
    getClosure(db),
    db.query<{ status: string; count: string }>(`
      SELECT CASE WHEN sent_at IS NOT NULL THEN 'Accepted by mail server'
        WHEN failed_at IS NOT NULL THEN 'Delivery unconfirmed after retries' ELSE 'Queued or retrying' END AS status,
        count(*) FROM account_notice_outbox WHERE kind='closure' GROUP BY 1
    `),
  ]);
  return <main><h1>Alfadata administration</h1>
    <h2>Users</h2>
    <ul>{users.rows.map(user => <li key={user.id}>{user.email} · {user.id} · {user.suspended ? 'Suspended' : 'Active'}{' '}
      {user.id !== actor.userId && <Suspension userId={user.id} suspended={user.suspended} />}
    </li>)}</ul>
    <h2>Trials</h2>
    <ul>{trials.rows.map(trial => <li key={trial.user_id}>{trial.user_id} · {trial.trial_status} · {trial.trial_ends_at?.toISOString()}</li>)}</ul>
    <h2>Orders</h2>
    <ul>{orders.rows.map(order => <li key={order.id}>{order.id} · {order.environment} · {order.status}</li>)}</ul>
    <h2>Payment events</h2>
    <ul>{events.rows.map(event => <li key={JSON.stringify([event.provider, event.environment, event.id])}>{event.order_id} · {event.kind} · {event.received_at.toISOString()}</li>)}</ul>
    <h2>Payment review cases</h2>
    <ul>{reviews.rows.map(item => <li key={JSON.stringify([item.order_id, item.reason])}>{item.order_id} · {item.reason}</li>)}</ul>
    <h2>Account deletion requests</h2>
    <ul>{deletions.rows.map(item => <li key={item.id}>
      {item.user_id} · Due {item.due_at.toISOString()} · {item.overdue ? 'Overdue' : 'Pending'}
      {item.reviewed_at ? ' · Reviewed' : <OperationForm requestId={item.id} />}
    </li>)}</ul>
    <h2>Planned service closure</h2>
    {closure ? <><p>Announced shutdown date {closure.shutdown_at.toISOString()}</p>
      <ul>{delivery.rows.map(item => <li key={item.status}>{item.status} · {item.count}</li>)}</ul></>
      : process.env.CLOSURE_OPERATIONS_APPROVED === 'yes' ? <OperationForm />
        : <p>Closure announcement requires approved handling of previously opened checkouts.</p>}
  </main>;
}
