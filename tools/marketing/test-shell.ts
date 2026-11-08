import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runTestProcess } from '../db/test-database';

// Task 1's shell is delivered independently of Task 2's homepage content.
// Exercise real Next.js server/client rendering, then restore the page exactly.
const pagePath = 'src/app/page.tsx';
const original = readFileSync(pagePath);
const fixture = `import { PublicHeader } from './marketing/PublicHeader';
import { PublicFooter } from './marketing/PublicFooter';
export default function ShellAcceptancePage() {
  return <div className="marketing-site">
    <PublicHeader />
    <main id="main-content" tabIndex={-1} className="public-wrap">
      <h1>Alfadata public shell</h1>
      <section id="features" tabIndex={-1}><h2>Features</h2><p>Navigation acceptance fixture.</p></section>
      <section id="example" tabIndex={-1}><h2>Example</h2><p>Navigation acceptance fixture.</p></section>
    </main>
    <PublicFooter />
  </div>;
}
`;
if (original.toString('utf8') === fixture) {
  throw new Error('A prior shell fixture is still installed. Restore .local/homepage-task1-original-page.tsx before running again.');
}
mkdirSync('.local', { recursive: true });
writeFileSync('.local/homepage-task1-original-page.tsx', original);
writeFileSync(pagePath, fixture);
try {
  process.exitCode = await runTestProcess([
    '--import', 'tsx', 'tools/auth/test-browser.ts', 'homepage.spec.ts',
  ], { ...process.env, LEGACY_CULTURE: 'en-US' });
} finally {
  if (readFileSync(pagePath, 'utf8') !== fixture) {
    throw new Error('Homepage changed during shell acceptance; original retained in .local/homepage-task1-original-page.tsx. Restore manually after reviewing edits.');
  }
  writeFileSync(pagePath, original);
}
