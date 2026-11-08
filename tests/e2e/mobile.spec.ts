import { expect, test } from './ui-fixture';
test('narrow layout scrolls, zooms and remains operable without reordering controls',async({page,openWorkspace},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await openWorkspace();await expect(page.getByLabel('Size',{exact:true})).toHaveValue('16');
  for(const name of ['Component','Size','ASME Class','Face Type','Schedule'])await expect(page.locator('.engineering-control-label').filter({hasText:new RegExp('^'+name+'$')})).toBeVisible();
  const before=await page.locator('.legacy-selector').evaluateAll(els=>els.map(e=>({id:e.getAttribute('aria-label'),left:(e as HTMLElement).style.left})));
  if(testInfo.project.use.hasTouch)await page.getByRole('button',{name:'Zoom in',exact:true}).tap();else await page.getByRole('button',{name:'Zoom in',exact:true}).click();await expect(page.getByLabel('Zoom',{exact:true})).toHaveText('125%');
  const scroll=page.getByLabel('Pan engineering layout',{exact:true});await scroll.focus();await page.keyboard.press('ArrowRight');
  expect(await scroll.evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollLeft>0)).toBe(true);
  await page.getByLabel('ASME Class',{exact:true}).selectOption('600#');await expect(page.locator('[data-header="1"]')).toContainText('600#');
  expect(await page.locator('.legacy-selector').evaluateAll(els=>els.map(e=>({id:e.getAttribute('aria-label'),left:(e as HTMLElement).style.left})))).toEqual(before);
  await page.screenshot({path:testInfo.outputPath('task11-phone.png'),fullPage:true});
  await page.setViewportSize({width:844,height:390});await expect(page.getByLabel('ASME Class',{exact:true})).toHaveValue('600#');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await scroll.focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => scroll.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('task21-landscape.png')});
});

test('two touch pointers zoom and release cleanly; pan preserves the selectors', async ({
  page, browserName, openWorkspace,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace();
  const size = page.getByLabel('Size', { exact: true });
  const asmeClass = page.getByLabel('ASME Class', { exact: true });
  const canvas = page.getByLabel('Engineering drawing');
  const zoom = page.getByLabel('Zoom', { exact: true });
  const scroll = page.getByLabel('Pan engineering layout', { exact: true });
  await expect(size).toHaveValue('16');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const x = Math.round(Math.max(box.x, 0) + 55);
  const y = Math.round(Math.max(box.y, 0) + 120);
  await expect.poll(() => page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y) instanceof HTMLCanvasElement, { x, y })).toBe(true);
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
        touchPoints: [{ id: 11, x, y }, { id: 12, x: x + 100, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: [{ id: 11, x, y }, { id: 12, x: x + 150, y }] });
      await expect(zoom).toHaveText('150%');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await cdp.detach();
    }
  } else {
    // These engines expose trusted taps, but Playwright cannot issue a two-finger gesture.
    await canvas.evaluate((element, { x, y }) => {
      const viewport = element.closest('.workspace-scroll')!;
      const native = viewport.setPointerCapture;
      viewport.setPointerCapture = () => {};
      const pointer = (type: string, pointerId: number, clientX: number) => {
        element.dispatchEvent(new PointerEvent(type, {
          bubbles: true, pointerType: 'touch', pointerId, clientX, clientY: y,
        }));
      };
      try {
        pointer('pointerdown', 11, x);
        pointer('pointerdown', 12, x + 100);
        pointer('pointermove', 12, x + 150);
        pointer('pointercancel', 12, x + 150);
        pointer('pointerup', 11, x);
      } finally {
        viewport.setPointerCapture = native;
      }
    }, { x, y });
    await expect(zoom).toHaveText('150%');
  }

  await expect(size).toHaveValue('16');
  await expect(asmeClass).toHaveValue('300#');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(zoom).toHaveText('100%');
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await scroll.scrollIntoViewIfNeeded();
  await scroll.evaluate(element => { element.scrollLeft = 0; });
  const dragBox = (await scroll.boundingBox())!;
  const dragY = dragBox.y + Math.min(120,dragBox.height/2);
  await page.mouse.move(dragBox.x+dragBox.width-45, dragY);
  await page.mouse.down();
  await page.mouse.move(dragBox.x+45, dragY, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
  await expect(size).toHaveValue('16');
  await expect(asmeClass).toHaveValue('300#');
  await asmeClass.selectOption('900#');
  await expect(page.locator('[data-header="1"]')).toContainText('900#');
});
