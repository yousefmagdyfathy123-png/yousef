import { ClosureNotice } from './closure-notice';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  return <main><ClosureNotice /><h1>Alfadata</h1><p>Engineering workspace foundation.</p>
    <p><Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">create an account</Link>.</p>
    <p><Link href="/pricing">Pricing and support</Link></p>
  </main>;
}
