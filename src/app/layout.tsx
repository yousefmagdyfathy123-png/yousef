import type { ReactNode } from 'react';
import { requireLegacyCulture } from '../server/legacy-culture';
export const metadata = { title: 'Alfadata', description: 'Alfadata engineering workspace' };
export default function RootLayout({ children }: { children: ReactNode }) {
  requireLegacyCulture(process.env);
  return <html lang="en"><body>{children}</body></html>;
}
