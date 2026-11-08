import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { CoverageIndex, RouteEvidence, SourceRef } from './types';
const artifactHash = '55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c';
const mvid = '948a0d3b-1670-4555-9843-5e7ed73785db';
type Source = { text: string; ref: SourceRef };
type Method = { name: string; text: string; offset: number };
function methods(source: Source): Method[] {
  const starts = [...source.text.matchAll(/^\t(?:public|private|internal|protected) (?:static )?[\w.<>\[\],]+ (\w+)\([^\n]*\)/gm)];
  return starts.map((m, i) => ({ name: m[1], offset: m.index!, text: source.text.slice(m.index, starts[i + 1]?.index ?? source.text.length) }));
}
function method(source: Source, name: string): Method {
  const found = methods(source).find(m => m.name === name);
  if (!found) throw new Error(`Missing source method: ${name}`);
  return found;
}
function at(source: Source, offset: number, length = 0): SourceRef {
  const line = source.text.slice(0, offset).split('\n').length;
  return { ...source.ref, line, endLine: line + source.text.slice(offset, offset + length).split('\n').length - 1 };
}
function uniqueRoutes(routes: RouteEvidence[]): RouteEvidence[] {
  const result = new Map<string, RouteEvidence>();
  for (const route of routes) {
    const existing = result.get(route.id);
    if (existing) existing.sourceRefs.push(...route.sourceRefs);
    else result.set(route.id, { ...route, sourceRefs: [...route.sourceRefs] });
  }
  return [...result.values()];
}
export function discoverCoverage(sourceRoot: string): CoverageIndex {
  const root = resolve(sourceRoot);
  const load = (path: string): Source => {
    const bytes = readFileSync(resolve(root, path));
    return { text: bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'), ref: { path, hash: createHash('sha256').update(bytes).digest('hex') } };
  };
  const artifactPath = 'Pipedata-Pro 14.1.exe';
  const binaryHash = createHash('sha256').update(readFileSync(resolve(root, artifactPath))).digest('hex');
  if (binaryHash !== artifactHash) throw new Error('Original artifact SHA256 differs from the approved evidence identity');
  const module = load('audit/executable/Pipedata_Pro_14_1.Module1.cs');
  const form = load('audit/executable/Pipedata_Pro_14_1.frmPipedata.cs');
  const searchFile = load('Database/Gensets/SearchFile.csv');
  const clicker = method(module, 'Clicker');
  const title = method(module, 'GetTitle');
  const dispatch = [...clicker.text.matchAll(/CompareString\(ActiveTab, "([^"]+)", TextCompare: false\) == 0/g)].map(m => ({ id: m[1], sourceRefs: [at(module, clicker.offset + m.index!, m[0].length)] }));
  if (dispatch.length !== new Set(dispatch.map(r => r.id)).size) throw new Error('Duplicate dispatch cases need investigation');
  const titles = uniqueRoutes([...title.text.matchAll(/TabArray\[\d+\] = "([^"]+)"/g)].map(m => ({ id: m[1], sourceRefs: [at(module, title.offset + m.index!, m[0].length)] })));
  const search = searchFile.text.trimEnd().split('\n').map((line, i) => ({ id: line.split(',')[0], row: i + 1, sourceRefs: [{ ...searchFile.ref, line: i + 1 }] }));
  const searchSet = new Set(search.map(r => r.id));
  const dispatchSet = new Set(dispatch.map(r => r.id));
  const menuEdges = [...form.text.matchAll(/this\.(\w+)\.(?:DropDownItems|Items)\.AddRange\(new System\.Windows\.Forms\.ToolStripItem\[\d+\]\s*\{([^}]+)\}/g)].map(m => ({ parent: m[1], children: [...m[2].matchAll(/this\.(\w+)/g)].map(c => c[1]), sourceRefs: [at(form, m.index!, m[0].length)] }));
  const menuPath = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) throw new Error('Cycle in constructed menus');
    seen.add(id);
    const parent = menuEdges.find(edge => edge.children.includes(id));
    return parent ? [...menuPath(parent.parent, seen), id] : [id];
  };
  const sourceMethods = methods(form);
  const exclusions: CoverageIndex['exclusions'] = [];
  const excludedHandlers = new Set(['ToolStripComboBox6_SelectedIndexChanged', 'ToolStripComboBox6_Click', 'ToolStripComboBox6_SelectedIndexChanged1', 'ToolStripComboBox6_Click_1', 'MenuStrip1_DoubleClick', 'mnuCheckForUpdates_Click']);
  for (const name of excludedHandlers) {
    const entry = method(form, name);
    exclusions.push({ id: name.startsWith('ToolStripComboBox6_') ? 'ToolStripComboBox6' : name, reason: name === 'mnuCheckForUpdates_Click' ? 'Hidden original vendor updater; outside the approved engineering workspace scope.' : 'Developer controls revealed only under LocalPathActive by MenuStrip1 double-click; not normal engineering navigation.', sourceRefs: [at(form, entry.offset, entry.text.length), at(form, method(form, 'MenuStrip1_DoubleClick').offset, method(form, 'MenuStrip1_DoubleClick').text.length)] });
  }
  const events: CoverageIndex['events'] = [];
  const constructor = /\tpublic frmPipedata\(\)\s*\{([^}]+)\}/.exec(form.text);
  if (!constructor) throw new Error('Missing form constructor');
  for (const wiring of constructor[1].matchAll(/(\w+) \+= (\w+);/g)) {
    const handler = method(form, wiring[2]);
    events.push({ controlId: '$form', event: wiring[1], handler: wiring[2], menuPath: ['$form'], routeIds: [], conditions: ['Form lifecycle event; preserve source guards and prior state.'], sourceRefs: [at(form, constructor.index, constructor[0].length), at(form, handler.offset, handler.text.length)] });
  }
  const properties = [...form.text.matchAll(/^\tinternal virtual [\w.]+ (\w+)\n/gm)];
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const block = form.text.slice(prop.index, properties[i + 1]?.index ?? form.text.indexOf('\n\tpublic frmPipedata', prop.index));
    for (const wiring of block.matchAll(/_(\w+)\.(\w+) \+= (\w+);/g)) {
      const variable = wiring[3];
      const target = new RegExp(`\\b${variable} = (\\w+);`).exec(block)?.[1];
      if (!target || excludedHandlers.has(target)) continue;
      const handler = sourceMethods.find(m => m.name === target);
      if (!handler) throw new Error(`Wired handler not found: ${target}`);
      const refs = [at(form, prop.index! + wiring.index!, wiring[0].length), at(form, handler.offset, handler.text.length)];
      const routeIds: string[] = [];
      for (const assign of handler.text.matchAll(/Module1\.Active(Tab|SubSector) = "([^"]+)"/g)) {
        if (assign[1] === 'Tab') routeIds.push(assign[2]);
        else {
          const family = titles.filter(r => r.id.slice(0, 4) === assign[2]);
          // The source's registry fallback is exactly family + "1", even if
          // GetTitle has no TabArray assignment for that family (e.g. Wbpi).
          routeIds.push(`${assign[2]}1`, ...family.map(r => r.id));
          refs.push(...family.flatMap(r => r.sourceRefs), at(module, method(module, 'LoadActiveSubSector').offset, method(module, 'LoadActiveSubSector').text.length));
        }
      }
      events.push({ controlId: wiring[1], event: wiring[2], handler: target, menuPath: menuPath(wiring[1]), routeIds: [...new Set(routeIds)], conditions: [handler.text.includes('if (') ? 'Conditional handler; preserve source guards and visibility transitions.' : 'Unconditional wired event.', 'Static reachability only; runtime verification pending.'], sourceRefs: refs });
    }
  }
  const uiRoutes = uniqueRoutes(events.flatMap(e => e.routeIds.map(id => ({ id, sourceRefs: e.sourceRefs }))));
  const dialogEntries: RouteEvidence[] = [];
  // Dialogs called from the engineering module and normal workspace handlers.
  // Account/licensing startup belongs to the explicitly separate identity phase.
  const excludedForms = new Set(['frmChecker', 'frmRegister', 'frmNetLicPath', 'frmStartup', 'frmSplash']);
  const dialogSources = [module, ...sourceMethods.filter(m => !excludedHandlers.has(m.name)).map(m => ({ text: m.text, ref: form.ref, offset: m.offset }))];
  for (const source of dialogSources) {
    const offset = 'offset' in source ? source.offset as number : 0;
    const origin = offset ? form : module;
    for (const match of source.text.matchAll(/(?:MyProject\.Forms\.(frm\w+)\.(?:Show|ShowDialog)\(|new (frm\w+)\()/g)) {
      const name = match[1] ?? match[2];
      const ref = at(origin, offset + match.index!, match[0].length);
      if (excludedForms.has(name)) exclusions.push({ id: name, reason: name === 'frmChecker' ? 'Developer checker; invoked by the developer command selector.' : 'Original startup/licensing flow replaced by the approved identity plan; no legacy licensing port.', sourceRefs: [ref] });
      else dialogEntries.push({ id: `dialog:${name}`, sourceRefs: [ref] });
    }
  }
  const recipes = dispatch.map(r => {
    const body = method(module, r.id);
    return { routeId: r.id, conditionalBranches: [...body.text.matchAll(/\b(?:if|else if|switch)\s*\(/g)].length, sourceRefs: [at(module, body.offset, body.text.length)] };
  });
  return {
    schemaVersion: 1, artifact: { path: artifactPath, hash: binaryHash, mvid }, sources: [module.ref, form.ref, searchFile.ref],
    dispatch, titles, search, searchOnly: [...searchSet].filter(id => !dispatchSet.has(id)).sort(), dispatchNotInSearch: [...dispatchSet].filter(id => !searchSet.has(id)).sort(),
    uiRoutes, menuEdges, events, dialogs: uniqueRoutes(dialogEntries), exclusions, recipes,
    gaps: ['Lexical C# projection and static event wiring are not runtime proof.', 'All functional behavior, branch fixtures and engineering outputs remain pending.', 'Search-only routes require preservation of evidenced behavior; no invented dispatch/data.', 'Recipe branch counts cover direct route bodies, not transitive helper branches.', 'Title entries, default-hidden engineering controls and dispatch sets differ; preserve source guards and investigate route-specific UI transitions in task4.', 'Original-image comparison is unverified-visual-nonblocking only; functional checks remain mandatory.'],
  };
}
