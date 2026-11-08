import { expect,test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResultsPanel,resultsText } from '../../src/workspace/ResultsPanel';
test('copy text preserves displayed strings, order and units, without numeric reformatting',()=>{
  const results={status:'available' as const,rows:[{id:'a',label:'Length',value:'1 1/2',unit:'in'},{id:'b',label:'Weight',value:'N/A',unit:'lb'}]};
  expect(resultsText(results)).toBe('Result\tValue\tUnit\nLength\t1 1/2\tin\nWeight\tN/A\tlb');
  const html=renderToStaticMarkup(createElement(ResultsPanel,{results,revision:5,messages:[]}));
  expect(html).toContain('<table');expect(html).toContain('scope="col"');expect(html).toContain('scope="row"');expect(html).toContain('1 1/2');
});
test('unavailable and missing semantic results do not invent results from drawing text',()=>{
  expect(resultsText({status:'unavailable',rows:[]})).toBe('No results available for the selected parameters.');
  const html=renderToStaticMarkup(createElement(ResultsPanel,{results:undefined,revision:1,messages:['Not manufactured with the selected parameters']}));
  expect(html).toContain('Not manufactured');expect(html).not.toContain('<td');
});

test('semantic roles distinguish inputs and calculated output while keeping copy columns',()=>{
  const results={status:'available' as const,rows:[
    {id:'ambient',label:'Ambient Temp:',value:'20',unit:'°C',kind:'input' as const},
    {id:'guide-distance',label:'Required distance to first guide',value:'1639',unit:'mm',kind:'output' as const},
  ]};
  const html=renderToStaticMarkup(createElement(ResultsPanel,{results,revision:7,messages:[]}));
  expect(html).toContain('>Input</td>');expect(html).toContain('>Output</td>');
  expect(html).toContain('>Type</th>');expect(html).toContain('Required distance to first guide');
  expect(resultsText(results)).toBe('Result\tValue\tUnit\nAmbient Temp:\t20\t°C\nRequired distance to first guide\t1639\tmm');
});
