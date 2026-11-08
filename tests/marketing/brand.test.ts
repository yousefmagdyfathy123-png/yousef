import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { PublicHeader } from '../../src/app/marketing/PublicHeader';
import { PublicFooter } from '../../src/app/marketing/PublicFooter';

test('public shell renders the supplied company identity and real contact destinations', () => {
  const header = renderToStaticMarkup(createElement(PublicHeader));
  const footer = renderToStaticMarkup(createElement(PublicFooter));
  expect(header).toContain('Alfadata');
  expect(header).toContain('src="/brand/alfa-compact.png"');
  expect(header).toContain('href="/sign-up"');
  expect(header).toContain('href="/sign-in"');
  expect(footer).toContain('Alfadata by ALFA CORE');
  expect(footer).toContain('href="https://www.alfa-sa.net/"');
  expect(footer).toContain('href="mailto:tech.supp@alfa-sa.net"');
  expect(footer).toContain('src="/brand/alfa-full.png"');
  expect(footer).toContain('href="/policies/purchase"');
});
