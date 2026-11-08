"""Independent nonmetallic gasket analyst model; no product TS imports."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
CLASSES=['150#','300#','400#','600#','900#','1500#','2500#']
LINES=[21062,21118,21176];HEADERS=[21234,21273,21312]
TITLES=['Nonmetallic Flat Gasket for ASME B16.5 Flanges','Nonmetallic Flat Gasket for ASME B16.47 Series A Flanges','Nonmetallic Flat Gasket for ASME B16.47 Series B Flanges']

def model(c,n):
    route='Gflt'+str(n);u=c.get('Units','Metric');cl=c.get('ASMEClass','300#');idx=CLASSES.index(cl)+1;face=c.get('Face','RF');lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';requested=c.get('MainSize',16)
    path=f'Gflt/{route}'+('_Imperial' if u=='Imperial' else '')+'.csv';cells,qty,h=b.bank(path,1,6+idx,3,fraction_column=None);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'');sign='"' if u=='Imperial' else '';wf=2.20462 if u=='Imperial' else 1;ws='lb' if u=='Imperial' else 'kg'
    # Controls precede headers; nested Clicker mutates bank before outer continuation.
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    disabled=['1500#','2500#']+(['900#'] if n>1 else [])
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('ASMEClass',cl,[dict(value=t,text=t,enabled=t not in disabled) for t in CLASSES])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(LINES[n-1])],showDropDownArrow=False))
    ok=a(6+idx) not in ['','N/A'];rows=[]
    if ok:
        for _ in range(2 if requested>qty else 1):
            wt=b.string(b.rnd(b.val(a(13+idx))*wf,2));dim=b.string(b.rnd(b.val(a(6+idx)),2));dim=b.fraction(dim) if frac else dim
            cells[row].update({12:dim+sign,3:'Client specified',5:'',6:'Self centering'})
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+TITLES[n-1]+' '+cl+' '+face,'Weight =  '+wt+' '+ws,'','','','','ASME B16.21-2016'];rows=[dict(id='weight',label='Weight =  ',value=wt,unit=ws)]
    else:headers=['ASME B16.21 Gaskets','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    draw=b.commands(f'Gflt/{route}.dxf',{1:cells},row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=6+idx,MinMainSize=3,TabbCount=n,TabbQty=3,SubTab=route+'a',ChkType='U_C_Z'),savedValues=dict(MainSize=row,ASMEClass=cl,Face=face))

def generate(n):
    choices=[{}]
    for u in ['Metric','Imperial']:
        for cl in CLASSES:
            cells,qty,_=b.bank(f'Gflt/Gflt{n}'+('_Imperial' if u=='Imperial' else '')+'.csv',1,6+CLASSES.index(cl)+1,3,fraction_column=None)
            for row in sorted({3,16,min(qty,46),qty,100}|{r for r in range(3,min(qty,46)+1) if cells[r].get(6+CLASSES.index(cl)+1,'') in ['','N/A']}):choices.append(dict(Units=u,ASMEClass=cl,MainSize=row))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,Face=face,MainSize=r,ASMEClass=cl) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for face in ['RF','RTJ'] for r in [3,16,100] for cl in ['300#','1500#']]
    route=f'Gflt{n}';cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(LINES[n-1]),b.ref(HEADERS[n-1])],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,n)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsGflt','LoadDataBase1','DesigBtn1ValuesForMainSize','DesigBtn2ForASMEClass','FormatDim','FractionizeIfNeccessary','GetSubTab','WhiteBlock'])
    p=b.APP/f'evidence/flanges-gaskets/{route}.json';e=json.loads(p.read_text());e['tests']=['tests/legacy/gaskets.test.ts'];p.write_text(json.dumps(e,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(route,len(cases),'cases',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':generate(int(sys.argv[1]))
