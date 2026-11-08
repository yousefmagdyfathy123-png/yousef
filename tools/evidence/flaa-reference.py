"""Flaa analyst model: original CSV/source and accepted independent DXF records only."""
import importlib.util, json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

def model(c,route):
    number=int(route[-1]);line=19754 if number==1 else 19818
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');fi=1 if face=='RF' else 2
    frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches');requested=c.get('MainSize',8)
    path=f'Flaa/{"Fla_Imperial_" if units=="Imperial" else "Fla"}{cls[:-1]}.csv'
    cells,qty,h=b.bank(path,1,11+fi,3,fi,frac);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg'
    ok=a(11+fi) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.rnd(float(a(27 if number==1 else 29))*wf/5)*5,2));bolts=b.string(b.rnd(b.rnd(b.val(a(39+fi))*wf/5)*5,2))
        cells[row][42]=a(20)+' Holes';cells[row][43]=a(25)+'" Dia'
        title='Series A '+('Weldneck' if number==1 else 'Blind')+' Flange'
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+title+' '+cls+' '+face,'Flange Wt = '+wt+' '+ws,'S/Bolts and Nuts = '+bolts+' '+ws,'RTJ Ring No : '+a(15) if face=='RTJ' else '','RTJ Distance Between Flgs : '+a(16)+sign if face=='RTJ' else '','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+sign+' Long','ASME B16.47-2017']
        rows=[dict(id='flange-weight',label='Flange Wt = ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts = ',value=bolts,unit=ws)]
    else:headers=['ASME B16.47 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('ASMEClass',cls,[dict(value=t,text=t,enabled=t not in ['1500#','2500#']) for t in ['150#','300#','400#','600#','900#','1500#','2500#']]),('Face',face,[dict(value=t,text=t,enabled=not(t=='RTJ' and cls=='150#')) for t in ['RF','RTJ']])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(line)],showDropDownArrow=False))
    draw=b.commands('Flaa/'+route+('a' if face=='RTJ' else '')+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=11+fi,TabbCount=number,TabbQty=2,SubTab=route+'a',MinMainSize=3,ChkType='U_F_C_Z'),savedValues=dict(MainSize=row))

def generate(route):
    choices=[{}]
    for u in ['Metric','Imperial']:
        for cls in ['150#','300#','400#','600#','900#']:
            for f in ['RF','RTJ']:
                cells,qty,_=b.bank(f'Flaa/{"Fla_Imperial_" if u=="Imperial" else "Fla"}{cls[:-1]}.csv',1,12 if f=='RF' else 13,3)
                # Complete offered row matrix plus explicit incoming oversize clamp.
                for r in [*range(3,qty+1),40]:choices.append(dict(Units=u,ASMEClass=cls,Face=f,MainSize=r))
    choices += [dict(Units=u,Face=f,Fractionize='Yes',ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for l in ['Inches','Millimetres'] for r in [3,8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(19754 if route=='Flaa1' else 19818),b.ref(22977 if route=='Flaa1' else 23029)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    out=b.APP/f'tests/reference/flanges-gaskets/{route}.json';out.write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFlaa','LoadDataBase1','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Flaa1']:generate(route)
