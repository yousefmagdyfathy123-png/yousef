"""Record Task9 only after final logs prove all required verification passed."""
import collections,datetime,hashlib,json,re,subprocess
from pathlib import Path
app=Path(__file__).resolve().parents[2]
def read(path):return json.loads((app/path).read_text(encoding='utf-8'))
def write(path,value):(app/path).write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8',newline='\n')
def sha(path):return hashlib.sha256((app/path).read_bytes()).hexdigest()
def tests(path,count):
    log=(app/path).read_text(encoding='utf-8-sig');assert not re.search(r'Test Files[^\n]*failed',log),path
    assert re.search(r'Tests\s+'+str(count)+r' passed',log),path
    return float(re.search(r'Duration\s+(\d+(?:\.\d+)?)s',log)[1])
recipe_files=sorted((app/'tests/reference/calculators').glob('*.json'))
recipe_files=[p for p in recipe_files if p.stem!='framework']
cases=[c for p in recipe_files for c in json.loads(p.read_text(encoding='utf-8'))['cases']]
assert len(cases)==6998 and len({c['id'] for c in cases})==len(cases)
seconds=tests('.task9-final-recipes.log',len(cases));core_seconds=tests('.task9-final-core.log',2175)
browser=(app/'.task9-final-browser.log').read_text(encoding='utf-8-sig');assert re.search(r'4 passed',browser)
build=(app/'.task9-final-build.log').read_text(encoding='utf-8-sig');assert 'Compiled successfully' in build and 'Static' in build and not re.search(r'error TS|Failed to',build)
typecheck=(app/'.task9-final-typecheck.log').read_text(encoding='utf-8-sig');assert 'Types generated successfully' in typecheck and not re.search(r'error TS|Failed to',typecheck)
provenance=subprocess.check_output(['python','tools/evidence/task9-provenance.py','--accept'],cwd=app,text=True)
source=json.loads(provenance)
# Regenerating Task4 source identities moved an unchanged shared card. Retain
# original ledger ordering so the diff consists of Task9's accepted behavior.
original=json.loads(subprocess.check_output(['git','show','HEAD:evidence/parity-ledger.json'],cwd=app,text=True))
rank={c['id']:i for i,c in enumerate(original)};ledger=read('evidence/parity-ledger.json');ledger.sort(key=lambda c:rank.get(c['id'],len(rank)));write('evidence/parity-ledger.json',ledger)
framework=read('tests/reference/calculators/framework.json');now=datetime.datetime.now(datetime.timezone.utc).isoformat()
acceptance=dict(schemaVersion=1,task=9,status='passed',acceptedAt=now,review='Primary agent self-review; no subagents per user instruction',routes=[p.stem for p in recipe_files],dispatchCoverage=dict(implemented=167,total=167,remaining=0,workspaceAssembly='Task10 remains open'),referenceCases=len(cases),unavailableCases=sum(not c['expected']['available'] for c in cases),frameworkCases=len(framework['cases']),frameworkCategories=dict(collections.Counter(c['kind'] for c in framework['cases'])),registryProbe=framework['registryProbe'],sourcePreservation=source,sourceIdentity=dict(exeSha256='55a55522875ad7131d1367a08667ae653416c9be2decbd3bd5c54a9b8c04d03c',mvid='948a0d3b-1670-4555-9843-5e7ed73785db',moduleSha256=framework['sourceSha256']),verification=[dict(command='npm test -- tests/legacy/calculator-recipes.test.ts',tests=len(cases),seconds=seconds,result='passed'),dict(command='npm test -- tests/legacy/calculators.test.ts tests/legacy/task9-acceptance.test.ts tests/legacy/catalog.test.ts tests/legacy/culture.test.ts tests/legacy/drawing.test.ts tests/legacy/vb.test.ts tests/legacy/state.test.ts tests/legacy/state-codec.test.ts tests/legacy/reference.test.ts tests/workspace tests/evidence',tests=2175,seconds=core_seconds,result='passed'),dict(command='npm run test:e2e -- tests/e2e/flan1-checkpoint.spec.ts',tests=4,result='passed',scope='Retained real Chrome journeys; calculator workspace wiring remains Task10'),dict(command='npm run build',result='passed'),dict(command='npm run typecheck',result='passed'),dict(command='python tools/evidence/task9-provenance.py --accept',result='passed')],fixtures=[dict(path=p.relative_to(app).as_posix(),sha256=sha(p.relative_to(app))) for p in recipe_files+[app/'tests/reference/calculators/framework.json']],classification='Pwal1/Ptem1 constructed menus retain no-dispatch; dead helpers not activated',priorReferenceCorrection='Task4 configure helper omitted G7 registry conversion between visits/final reload; fresh isolated platform probe confirmed source string storage; regenerated eight independent .NET cases',openTask9FunctionalGaps=[],originalComparison='unverified-visual-nonblocking',measuredEngineeringEffort=None,toolCost='unknown',limitations=['Task10 assembly and later workspace/identity/delivery acceptance remain open','Calculator branch coverage is not whole-product or original-image acceptance'])
write('evidence/task9-acceptance.json',acceptance)
samples=read('evidence/estimates/samples.json')
sample=dict(id='task9-calculators',**{'class':'calculator, linked input and state-dependent numeric continuation'},acceptedAt=now,evidence='evidence/task9-acceptance.json',measurementUnit='observed automated verification seconds; focused engineering person-hours unknown',evidenceInvestigation=None,fixturesTests=None,implementation=None,reviewCorrection=None,elapsed=None,externalWaits='No external dependency wait measured',observedVerification=dict(recipeTestsSeconds=seconds,coreTestsSeconds=core_seconds),limitation='No phase/person-hour timers or billing records; overlapping regression checks are not additive effort')
samples['acceptedSamples']=[s for s in samples['acceptedSamples'] if s['id']!=sample['id']]+[sample];write('evidence/estimates/samples.json',samples)
history=read('evidence/estimates/history.json')
history.append(dict(id='task9-calculators',timestamp=now,priorRange=dict(engineering=[350,700,1400],unit='focused engineering person-hours',confidence='low initial assumption'),actualEffort=None,remainingRange=None,verifiedScope=dict(implementedDispatchRoutes=167,totalDispatchRoutes=167,remainingDispatchRoutes=0,calculatorRoutes=10),remainingWork='Task10 assembly/menu/content, remaining Task11 workspace scope, Task12 acceptance; identity/commerce and delivery plans unchanged',reason='Calculator sample and all route exports accepted; automated durations do not measure engineering person-hours. Remaining range cannot be calibrated from unavailable phase timers, so the initial range is retained as historical context only.',ceiling='Not supplied',cost='Unknown'))
write('evidence/estimates/history.json',history)
for path in ['docs/task9-progress.md','docs/TASK9-ACCEPTANCE.md']:
    p=app/path;text=p.read_text(encoding='utf-8');text=text.replace('Status: final verification in progress.','Status: COMPLETE. All Task9 functional checks passed.').replace('Status: awaiting the final recipe verification run.','Status: PASSED.6,998 recipe tests,2,175 calculator/core/evidence tests, four\nretained Chrome journeys, production build and typecheck passed.')
    p.write_text(text,encoding='utf-8',newline='\n')
estimates=app/'docs/ESTIMATES.md';estimates.write_text(estimates.read_text(encoding='utf-8')+'\nTask9 checkpoint (2026-11-02): the ten calculator exports complete167/167 dispatch\nimplementations. Task10 assembly and the remaining workspace/acceptance scope\nremain open, followed by the identity and delivery plans. The calculator sample\nis accepted in evidence/task9-acceptance.json. Focused engineering person-hours\nand monetary usage remain unknown; automated test durations are not additive\neffort. The initial ranges remain historical low-confidence assumptions; no\nnew calibrated remaining-hours forecast is claimed.\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(accepted=True,recipeTests=len(cases),coreTests=2175,browserTests=4,recipeSeconds=seconds,coreSeconds=core_seconds,source=source)))
