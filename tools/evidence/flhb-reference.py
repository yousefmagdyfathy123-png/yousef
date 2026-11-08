"""Independent hub/clamp connector model; source20932/21979/settings5564."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
SCHEDULES=['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS'];OFFERED=['STD','40','60','80','120','160','XXS']

def model(c):
    units=c.get('Units','Metric');sch=c.get('Sch','STD');lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';requested=c.get('MainSize',8)
    path=f'Flhb/Flhb1{sch}.csv';cells,qty,h=b.bank(path,1,3,4,fraction_column=None);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';ok=a(3) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(11))*wf,2));cells[row].update({30:'Seal Ring',31:'Butt Welded Hub',32:'37.5*',33:'Blind Hub',34:'Nozzle'})
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' Hub and Clamp Pipe Connector  Sch-'+sch,'Connection Weight =  '+wt+' '+ws,'','','',a(10)+' Studbolts Supplied with Connector','']
        rows=[dict(id='connection-weight',label='Connection Weight =  ',value=wt,unit=ws)]
    else:headers=['ASME Unadopted','Not manufactured with the selected parameters','Try another size or Schedule','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(4,min(qty,47)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('Sch',sch,[dict(value=t,text=t,enabled=t in OFFERED) for t in SCHEDULES])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(20932)],showDropDownArrow=False))
    draw=b.commands('Flhb/Flhb1.dxf',{1:cells},row,units,frac,'Flhb1') if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=3,MinMainSize=4,TabbCount=1,TabbQty=1,SubTab='Flhb1a',ChkType='U_S_Z'),savedValues=dict(MainSize=row,Sch=sch))

def generate():
    choices=[{}]
    for u in ['Metric','Imperial']:
        for sch in OFFERED:
            cells,qty,_=b.bank(f'Flhb/Flhb1{sch}.csv',1,3,4,fraction_column=None)
            for row in sorted({4,8,qty,40}|{r for r in range(4,qty+1) if cells[r][3] in ['','N/A']}):choices.append(dict(Units=u,Sch=sch,MainSize=row))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [4,8,40]]
    cases=[dict(id='Flhb1-'+str(i),sourceRefs=[b.ref(20932),b.ref(21979)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flhb1')],expected=model(c)) for i,c in enumerate(choices)]
    (b.APP/'tests/reference/flanges-gaskets/Flhb1.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route('Flhb1',['Flhb1','Flhb1_Headers','LoadSettingsFlhb','LoadDataBase1','GetSubTab','DropSubTab','WhiteBlock'])
    print('Flhb1',len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':generate()
