import { expect,test } from './ui-fixture';
test('results use the committed revision and copy failure permits manual selection',async({page,openWorkspace})=>{
  await openWorkspace();await expect(page.getByRole('table')).toContainText('19.9');
  const revision=await page.locator('[data-results-revision]').getAttribute('data-results-revision');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));
  await page.getByRole('button',{name:'Copy all results',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Copy was unavailable'})).toBeVisible();
  expect(await page.getByRole('table').evaluate(e=>getComputedStyle(e).userSelect)).toBe('text');
  const summary=page.locator('.results-panel summary');await summary.focus();await page.keyboard.press('Enter');await expect(page.getByRole('table')).toBeHidden();await expect(summary).toBeFocused();await page.keyboard.press('Enter');
  expect(await page.locator('[data-results-revision]').getAttribute('data-results-revision')).toBe(revision);
  await page.getByLabel('Units',{exact:true}).selectOption('Imperial');await expect(page.getByRole('table')).toContainText('lb');
  expect(await page.locator('[data-results-revision]').getAttribute('data-results-revision')).toBe(await page.locator('.legacy-workspace').getAttribute('data-revision'));
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Inch Fractions',{exact:true}).selectOption('Yes');await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('table')).toContainText('lb');
});
test('unavailable result message is semantic and clears the previous table',async({page,openWorkspace})=>{
  await openWorkspace();await page.getByLabel('ASME Class',{exact:true}).selectOption('150#');await page.getByLabel('Size',{exact:true}).selectOption('5');await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');
  await expect(page.getByRole('status').filter({hasText:'Not manufactured with the selected parameters'})).toBeVisible();await expect(page.getByRole('table')).toHaveCount(0);
});
for(const mode of ['stale','foreign'])test(`${mode} responses cannot replace committed Canvas or text`,async({page,openWorkspace})=>{
  await openWorkspace();await expect(page.getByRole('table')).toContainText('19.9');
  const initial=await page.locator('[data-results-revision]').getAttribute('data-results-revision');
  await page.route('**/action',async route=>{const response=await route.fetch();const dto=await response.json();if(mode==='stale')dto.revision=Number(initial);else dto.workspaceId='another-workspace';dto.view.textResults.rows[0].value='STALE';await route.fulfill({json:dto});});
  await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('table')).not.toContainText('STALE');
  expect(await page.locator('[data-results-revision]').getAttribute('data-results-revision')).toBe(initial);expect(await page.locator('.legacy-workspace').getAttribute('data-revision')).toBe(initial);
});

for(const width of [1440,390])test(`guide distance table and clipboard track authenticated results at ${width}px`,async({page,context,openWorkspace},info)=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.setViewportSize({width,height:844});await openWorkspace();
  await page.getByText('Menu',{exact:true}).click();await page.getByText('Pipe Flexibility',{exact:true}).click();
  await page.getByRole('button',{name:'Distance to First Guide',exact:true}).click();
  const table=page.getByRole('table'),row=table.getByRole('row').filter({hasText:'Required distance to first guide'});
  await expect(row).toBeVisible();await expect(row).toContainText('Output');
  await expect(table.getByRole('row').filter({hasText:'Ambient Temp:'})).toContainText('Input');
  async function checkCopy(unit:string){
    await expect(row.locator('td').nth(1)).toHaveText(unit);
    const value=await row.locator('td').first().innerText();
    expect(value).toMatch(/^\d+$/);
    await page.getByRole('button',{name:'Copy all results',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain('Required distance to first guide\t'+value+'\t'+unit);
    expect(await page.locator('[data-results-revision]').getAttribute('data-results-revision')).toBe(await page.locator('.legacy-workspace').getAttribute('data-revision'));
    return value;
  }
  const initial=await checkCopy('mm');
  await page.getByRole('button',{name:/^Length:/}).click();await page.getByRole('textbox',{name:'Value',exact:true}).fill('5000');
  await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await checkCopy('mm')).not.toBe(initial);
  await page.getByLabel('Units',{exact:true}).selectOption('Imperial');await checkCopy('in');
  await page.screenshot({path:info.outputPath(`guide-results-${width}.png`),fullPage:true});
  // The real unavailable flange selection must replace the prior calculator output.
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByLabel('Component',{exact:true})).toHaveValue('Flan1');
  await page.getByLabel('ASME Class',{exact:true}).selectOption('150#');await page.getByLabel('Size',{exact:true}).selectOption('5');await page.getByLabel('Face Type',{exact:true}).selectOption('RTJ');
  await expect(table).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy all results',exact:true})).toHaveCount(0);
  await expect(page.getByText('Required distance to first guide',{exact:true})).toHaveCount(0);
});
