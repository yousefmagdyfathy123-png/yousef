"""Independent compact flange model: source20425–20620/22267–22371."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
LINES={1:20425,2:20486,3:20560};HEADERS={1:22267,2:22302,3:22337}

def model(c,route):
    n=int(route[-1]);units=c.get('Units','Metric');cls=c.get('ASMEClass','300#');lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes'
    minimum=5 if n==2 and cls not in ['1500#','2500#'] else 4;sensor=11 if n==2 else 2;requested=c.get('MainSize',8)
    path=f'Flco/FlcFlg{cls[:-1]}.csv';cells,qty,h=b.bank(path,1,sensor,minimum,fraction_column=None);row=min(requested,qty)
    if n==2:row=max(row,minimum)
    a=lambda col:cells.get(row,{}).get(col,'');ok=a(sensor) not in ['','N/A'];df=25.4 if units=='Imperial' else 1;wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';sign='"' if units=='Imperial' else '';rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(5 if n==3 else 4))*wf,2))
        bolt=b.string(b.rnd(b.val(b.string(b.rnd(b.val(a(15))/df*100)/100)),2))
        title={1:'Compact Flange',2:'Compact Swivel Flange',3:'Compact Blind Flange'}[n]
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+title+' '+cls,'Flange Wt =  '+wt+' '+ws,'Weight is for a pair of flanges with bolting and joints.','','','StudBolts :  Qty '+a(13)+' - '+a(14)+'" UNC  (or M'+a(17)+')  x '+bolt+sign+' Long','DESTEC']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws)]
    else:headers=['ASME Compact Flanges','Not manufactured with the selected parameters','Try another size or rating','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(minimum,min(qty,minimum+43)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('ASMEClass',cls,[dict(value=t,text=t,enabled=t not in ['150#','400#']) for t in ['150#','300#','400#','600#','900#','1500#','2500#']])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(LINES[n])],showDropDownArrow=False))
    draw=b.commands('Flco/'+route+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if row!=requested else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=sensor,MinMainSize=minimum,TabbCount=n,TabbQty=3,SubTab=route+'a',DimFactor=df,ChkType='U_C_Z'),savedValues=dict(MainSize=row))

def generate(route):
    n=int(route[-1]);choices=[{}]
    for u in ['Metric','Imperial']:
        for cls in ['300#','600#','900#','1500#','2500#']:
            minimum=5 if n==2 and cls not in ['1500#','2500#'] else 4;sensor=11 if n==2 else 2
            cells,qty,_=b.bank(f'Flco/FlcFlg{cls[:-1]}.csv',1,sensor,minimum,fraction_column=None)
            rows=sorted({minimum,8,qty,40}|{r for r in range(minimum,qty+1) if cells[r][sensor] in ['','N/A']})
            if n==2:rows=sorted(set(rows)|{3,4,5})
            for r in rows:choices.append(dict(Units=u,ASMEClass=cls,MainSize=r))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(LINES[n]),b.ref(HEADERS[n])],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFlco','LoadDataBase1','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Flco1']:generate(route)
