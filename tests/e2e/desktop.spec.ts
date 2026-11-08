import { expect, test } from './ui-fixture';
test('all-route navigation, settings cancellation, search and public identity',async({page,openWorkspace},testInfo)=>{
  if (!testInfo.project.use.hasTouch) await page.setViewportSize({width:1024,height:768});
  await openWorkspace();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan1');
  for(const name of ['Component','Size','ASME Class','Face Type','Schedule']) {
    const control=page.getByLabel(name,{exact:true});
    expect(await control.evaluate(el=>(el as HTMLSelectElement).labels?.[0].textContent)).toBe(name);
  }
  await page.getByLabel('Component',{exact:true}).selectOption('Flan2');await expect(page.locator('[data-header="1"]')).toContainText('Slip-on');
  await page.getByRole('button',{name:'Last component',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan7');
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan2');
  await page.getByRole('button',{name:'Forward',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan7');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('General Units',{exact:true}).selectOption('Imperial');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByLabel('Units',{exact:true})).toHaveValue('Metric');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Find',exact:true}).click();await page.getByRole('textbox',{name:'Find',exact:true}).fill('flange');
  await page.getByRole('dialog').getByRole('button',{name:'Find',exact:true}).click();await expect(page.getByRole('list',{name:'Search results'}).getByRole('button').first()).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Results do not replace professional engineering review.');
  await expect(page.getByRole('dialog')).not.toContainText('Pipedata');
  await page.screenshot({path:testInfo.outputPath('about.png')});
  await page.keyboard.press('Escape');
});

test('source menus open calculator and parameter documents without private markup',async({page,openWorkspace},testInfo)=>{
  if (!testInfo.project.use.hasTouch) await page.setViewportSize({width:1024,height:768});
  await openWorkspace();await page.getByText('Menu',{exact:true}).click();await page.getByText('Pipe Flexibility',{exact:true}).click();
  await page.getByRole('button',{name:'Distance to First Guide',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Fxly1');await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:/^Ambient Temperature:/}).click();await expect(page.getByRole('dialog')).toContainText('Ambient Temperature');
  await page.getByRole('textbox',{name:'Value',exact:true}).fill('80');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:/^Length:/}).click();await page.getByRole('textbox',{name:'Value',exact:true}).fill('1');await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('between 500 and 100000 mm');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByText('Menu',{exact:true}).click();await page.getByText('Safe Spans',{exact:true}).click();await page.getByRole('button',{name:'Rack Spans',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Span1');await page.getByRole('button',{name:'Rack Span parameters',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Rack Span Parameters');await expect(page.getByRole('dialog').locator('iframe,script,img,a')).toHaveCount(0);
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByText('Menu',{exact:true}).click();await page.getByRole('button',{name:'Welded Branches',exact:true}).click();
  await page.getByLabel('Component',{exact:true}).selectOption('Wbol10');await expect(page.getByLabel('ASME Class',{exact:true}).locator('option[value="400#"]')).toBeDisabled();
});

test('wide component navigation wraps above the drawing while keeping source selections',async({page,openWorkspace},testInfo)=>{
  await openWorkspace();await page.getByText('Menu',{exact:true}).click();await page.getByText('Gaskets',{exact:true}).click();
  await page.getByRole('button',{name:'Nonmetallic Flat Gaskets',exact:true}).click();await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Gflt1');
  await expect(page.locator('.engineering-toolbar').getByLabel('Component',{exact:true})).toHaveValue('Gflt1');
  await expect(page.getByLabel('Pan engineering layout').getByLabel('Size',{exact:true})).toHaveCount(0);
  const size=page.getByLabel('Size',{exact:true}),value=await size.locator('option').nth(1).getAttribute('value');await size.selectOption(value!);await expect(size).toHaveValue(value!);
  await page.screenshot({path:testInfo.outputPath('task11-wide.png'),fullPage:true});
});

for (const width of [1440, 390]) {
  test(`search explains initial, empty and successful results with reachable actions at ${width}px`, async ({page, openWorkspace, baseURL}) => {
    await page.setViewportSize({width, height:844});
    await openWorkspace();
    const opener = page.getByRole('button', {name:'Find', exact:true});
    await opener.click();
    const dialog = page.getByRole('dialog');
    const query = dialog.getByRole('textbox', {name:'Find', exact:true});
    const submit = dialog.getByRole('button', {name:'Find', exact:true});
    await expect(dialog.getByRole('status')).toHaveText('Enter a component name or standard.');
    await query.fill('zzzz-no-component-zzzz'); await submit.click();
    await expect(dialog.getByRole('status')).toHaveText('No results found. Try a component name or standard.');
    const endpoint = new URL(baseURL!).protocol === 'http:' ? '**/action' : '**/api/workspaces/*/search';
    await page.route(endpoint, route => route.fulfill({status:503, contentType:'application/json', body:'{}'}));
    await query.fill('BLIND'); await submit.click();
    await expect(dialog.getByRole('status')).toHaveText('Search could not be completed. Please try again.');
    await expect(dialog.getByRole('list').getByRole('button')).toHaveCount(0);
    await page.unroute(endpoint);
    await submit.click();
    await expect(dialog.getByRole('status')).toHaveText('Search results ready.');
    const blind = dialog.getByRole('list').getByRole('button').filter({has:page.locator('.search-result-title', {hasText:/^Blind Flange$/})});
    await expect(blind).toHaveCount(2);
    await expect(blind.nth(0)).toHaveAccessibleName('Blind Flange Flanges \u00b7 ASME B16.5-2020');
    await expect(blind.nth(1)).toHaveAccessibleName('Blind Flange Flanges \u00b7 EN 1092-1:2018');
    await query.fill(''); await submit.click();
    await expect(dialog.getByRole('status')).toHaveText('Search results ready.');
    expect(await dialog.getByRole('list').getByRole('button').count()).toBeGreaterThan(50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const cancel = dialog.getByRole('button', {name:'Cancel', exact:true});
    await expect(cancel).toBeInViewport();
    await page.screenshot({path:`.local/task4-search-${width}.png`});
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
    await opener.click(); await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Enter a component name or standard.');
    await expect(page.getByRole('list', {name:'Search results'}).getByRole('button')).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
}
