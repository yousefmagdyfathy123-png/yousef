"""Independent EN1092 flange recipes and PN-button/settings semantics."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
PN=['2.5','6','10','16','25','40','63','100','160','250','320','400'];HIGH=PN[8:]
SENSORS={1:9,2:15,3:23,4:22,5:22};LINES={1:20621,2:20683,3:20745,4:20804,5:20868}
HEADERS={1:22017,2:22067,3:22117,4:22167,5:22217};TITLES={1:'Plate Flange',2:'Blind Flange',3:'Weldneck Flange',4:'Slip-On Flange',5:'Threaded Flange'}
def selections(c,n):
    pn=c.get('DinClass','40');r=c.get('MainSize',8)
    if n in [4,5] and pn=='2.5':pn='6'
    if n!=3 and pn in HIGH:pn='100'
    if pn in HIGH and r in [6,8]:r+=1
    return pn,r

def model(c,route):
    n=int(route[-1]);units=c.get('Units','Metric');pn,requested=selections(c,n);lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';sensor=SENSORS[n]
    path=f'Fldi/Fldi_{pn}.csv';cells,qty,h=b.bank(path,1,sensor,4,fraction_column=None);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;df=25.4 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';ok=a(sensor) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(34+n))*wf,2));wt='N/A' if wt=='0' else wt;bolts=b.string(b.rnd(b.val(a(44+n))*wf,2))
        # Source headers mutate hole diameter before drawing; clamp reentry
        # performs this strict conversion twice, unlike all other dimensions.
        if units=='Imperial':
            for _ in range(2 if requested>qty else 1):cells[row][5]=b.string(b.rnd(float(a(5))/25.4,2))
        cells[row].update({60:a(6)+' Holes',61:a(5)+sign+' Dia'})
        bolt=b.string(b.rnd(b.val(b.string(b.rnd(b.val(a(39+n))/df*100)/100)),2))
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+TITLES[n]+' PN '+pn+' (Type '+{1:'01',2:'05',3:'11',4:'12',5:'13'}[n]+')','Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolts+' '+ws,'','','StudBolt Size : M'+a(7)+' x '+bolt+sign+' Long','EN 1092-1:2018']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['EN 1092-1 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=not(n==3 and pn in HIGH and i in [6,8])) for i in range(4,min(qty,47)+1)]
    disabled=[] if n==3 else HIGH+(['2.5'] if n in [4,5] else [])
    fields=[('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('DinClass','PN '+pn,[dict(value=t,text='PN '+t,enabled=t not in disabled) for t in PN])]
    controls=[]
    for field,text,opts in fields:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(LINES[n])],showDropDownArrow=False))
    draw=b.commands('Fldi/'+route+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=sensor,MinMainSize=4,TabbCount=n,TabbQty=5,SubTab=route+'a',ChkType='U_D_Z',DimFactor=df,DinClass=pn),savedValues=dict(MainSize=row,DinClass=pn))

def generate(route):
    n=int(route[-1]);choices=[{}]
    for u in ['Metric','Imperial']:
        for pn in PN:
            effective,_=selections(dict(DinClass=pn),n);cells,qty,_=b.bank(f'Fldi/Fldi_{effective}.csv',1,SENSORS[n],4,fraction_column=None)
            rows=sorted({4,8,qty,40}|{r for r in range(4,qty+1) if cells[r][SENSORS[n]] in ['','N/A']})
            zero=next((r for r in range(4,qty+1) if cells[r][SENSORS[n]] not in ['','N/A'] and b.val(cells[r][34+n])==0),None)
            if zero is not None:rows=sorted(set(rows)|{zero})
            if n==3 and pn in HIGH:rows=sorted(set(rows)|{6,7,8,9})
            for r in rows:choices.append(dict(Units=u,DinClass=pn,MainSize=r))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [4,8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(LINES[n]),b.ref(HEADERS[n]),b.ref(50299)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFldi','LoadDataBase1','DesigBtn2ForPN','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Fldi1']:generate(route)
