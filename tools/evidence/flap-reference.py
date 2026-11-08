"""Independent Series B source model (handlers19882/19941; headers23079/23113)."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

def model(c,route):
    number=int(route[-1]);line=19882 if number==1 else 19941
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');fi=1 if face=='RF' else 2
    frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches');requested=c.get('MainSize',8)
    path=f'Flap/{"FlgAp_Imperial_" if units=="Imperial" else "FlgAp"}{cls[:-1]}.csv'
    cells,qty,h=b.bank(path,1,11+fi,3,fi,frac,10);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg'
    ok=a(11+fi) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.rnd(float(a(16 if number==1 else 17))*wf/5)*5,2));bolts=b.string(b.rnd(b.rnd(b.val(a(21))*wf/5)*5,2))
        cells[row][19]=a(7)+' Holes';cells[row][20]=a(9)+'" Dia'
        title='Series B '+('Weldneck' if number==1 else 'Blind')+' Flange'
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+title+' '+cls+' '+face,'Flange Wt = '+wt+' '+ws,'S/Bolts and Nuts = '+bolts+' '+ws,'','','StudBolt Size : '+a(8)+'" UNC  (or M'+a(18)+')  x '+a(10)+sign+' Long','ASME B16.47-2017']
        rows=[dict(id='flange-weight',label='Flange Wt = ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts = ',value=bolts,unit=ws)]
    else:headers=['ASME B16.47 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('ASMEClass',cls,[dict(value=t,text=t,enabled=t not in ['1500#','2500#']) for t in ['150#','300#','400#','600#','900#','1500#','2500#']])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(line)],showDropDownArrow=False))
    # GetSubTab does not select Flap's unused SubTab, even with inherited RTJ.
    draw=b.commands('Flap/'+route+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=11+fi,TabbCount=number,TabbQty=2,SubTab=route+'a',MinMainSize=3,ChkType='U_C_Z'),savedValues=dict(MainSize=row))

def generate(route):
    choices=[{}]
    for u in ['Metric','Imperial']:
        for cls in ['150#','300#','400#','600#','900#']:
            for f in ['RF','RTJ']:
                cells,qty,_=b.bank(f'Flap/{"FlgAp_Imperial_" if u=="Imperial" else "FlgAp"}{cls[:-1]}.csv',1,12 if f=='RF' else 13,3,fraction_column=10)
                for r in [*range(3,qty+1),40]:choices.append(dict(Units=u,ASMEClass=cls,Face=f,MainSize=r))
    choices += [dict(Units=u,Face=f,Fractionize='Yes',ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for l in ['Inches','Millimetres'] for r in [3,8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(19882 if route=='Flap1' else 19941),b.ref(23079 if route=='Flap1' else 23113)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    out=b.APP/f'tests/reference/flanges-gaskets/{route}.json';out.write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFlap','LoadDataBase1','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Flap1']:generate(route)
