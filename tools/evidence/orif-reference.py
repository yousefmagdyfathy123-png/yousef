"""Independent ASME B16.36 model; original source/data only, no product imports."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
LINES={1:20000,2:20066,3:20133};HEADERS={1:22828,2:22887,3:22932}

def model(c,route):
    n=int(route[-1]);line=LINES[n];units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');fi=1 if face=='RF' else 2
    if n in [2,3]:
        cls='300#'
        if face=='RTJ':face='RF';fi=1
    frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches');requested=c.get('MainSize',8)
    path=f'Orif/{"Orif_Imperial_" if units=="Imperial" else "Orif"}{cls[:-1]}.csv'
    cells,qty,h=b.bank(path,1,3,3,fi,frac);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg'
    ok=a(3) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(27))*wf,2));bolts=b.string(b.rnd(b.val(a(39+fi))*wf,2))
        cells[row].update({30:'1/2" NPT (TYP)',31:'PCD',34:'23*'})
        if n==1:
            # Clicker returns to the outer handler: in-place labels append twice.
            for _ in range(2 if requested>qty else 1):cells[row][20]=a(20)+' Holes';cells[row][25]=a(25)+'" Dia'
        else:cells[row].update({32:'Holes',33:'Dia',35:a(20)+' Holes',36:a(25)+'" Dia'})
        title={1:'Weldneck',2:'Slip-on',3:'Threaded'}[n]+' Orifice Flange'
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+title+' '+cls+' '+face,'Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolts+' '+ws,'RTJ Ring No : '+a(15) if n==1 and face=='RTJ' else '','RTJ Distance Between Flgs : '+b.string(b.val(a(16))*2)+sign+', plus orifice plate thickness' if n==1 and face=='RTJ' else '','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+sign+' Long, plus orifice plate thickness','ASME B16.36-2020']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['ASME B16.36 Orifice Flanges','Not manufactured with the selected parameters','Try another size or class','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    disabled=['150#','400#'] if n==1 else ['150#','400#','600#','900#','1500#','2500#']
    fields=[('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('ASMEClass',cls,[dict(value=t,text=t,enabled=t not in disabled) for t in ['150#','300#','400#','600#','900#','1500#','2500#']])]
    if n==1:fields.append(('Face',face,[dict(value=t,text=t,enabled=True) for t in ['RF','RTJ']]))
    controls=[]
    for field,text,opts in fields:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=not(field=='Face' and cls=='300#'),layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(line)],showDropDownArrow=False))
    subtab=route if n==1 and cls=='300#' else route+'a'
    drawing=subtab if face=='RTJ' else route
    draw=b.commands('Orif/'+drawing+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    values=dict(Sensor1=3,TabbCount=n,TabbQty=3,SubTab=subtab,MinMainSize=3)
    saved=dict(MainSize=row)
    if n in [2,3]:values.update(Face=face,FaceIndex=fi,ASMEClass=cls);saved.update(Face=face,ASMEClass=cls)
    if n!=3:values['ChkType']='U_F_C_Z' if n==1 else 'U_C_Z'
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=values,savedValues=saved)

def generate(route):
    n=int(route[-1]);choices=[{}]
    for u in ['Metric','Imperial']:
        # LoadSettingsOrif4533 corrects both face and class for Orif2/3.
        for cls in (['300#','600#','900#','1500#','2500#'] if n==1 else ['150#','300#','400#','600#','900#','1500#','2500#']):
            for f in ['RF','RTJ']:
                table_class=cls if n==1 else '300#'
                cells,qty,_=b.bank(f'Orif/{"Orif_Imperial_" if u=="Imperial" else "Orif"}{table_class[:-1]}.csv',1,3,3)
                for r in sorted({3,8,qty,40}|{i for i in range(3,qty+1) if cells[i][3] in ['','N/A']}):choices.append(dict(Units=u,ASMEClass=cls,Face=f,MainSize=r))
    choices += [dict(Units=u,Face=f,Fractionize='Yes',ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in (['RF','RTJ'] if n==1 else ['RF']) for l in ['Inches','Millimetres'] for r in [3,8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(LINES[n]),b.ref(HEADERS[n])],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsOrif','LoadDataBase1','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Orif1']:generate(route)
