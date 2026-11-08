"""Independent BS10 model: source21006/21934/settings5736/GetSubTab36842."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
TABLES=['A','D','E','F','H','J','K','R','S','T'];ALTERNATE=['H','J','K','R','S','T']

def model(c):
    units=c.get('Units','Metric');table=c.get('Table','D');lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';requested=c.get('MainSize',8)
    path=f'Flbs/Fla{table}.csv';cells,qty,h=b.bank(path,1,3,3,fraction_column=None);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;df=25.4 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';ok=a(3) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(12))*wf,2));bolts=b.string(b.rnd(b.val(a(13))*wf,2));cells[row].update({60:a(9)+' Holes',61:a(15)+'" Dia'})
        length=b.string(b.rnd(b.val(b.string(b.rnd(b.val(a(22))/df*100)/100)),2))
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' BS 10 Flange Table '+table,'Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolts+' '+ws,'BS 10 primary units are inch fractions','metric and inch conversions are rounded to two decimal places.','StudBolt Size : '+a(10)+'" UNC  (or M'+a(11)+')  x '+length+sign+' Long','BS 10:2009']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['BS 10 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('Table','Table '+table,[dict(value=t,text='Table '+t,enabled=True) for t in TABLES])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(21006)],showDropDownArrow=False))
    draw=b.commands('Flbs/Flbs1'+('a' if table in ALTERNATE else '')+'.dxf',{1:cells},row,units,frac,'Flbs1') if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=3,MinMainSize=3,TabbCount=1,TabbQty=1,SubTab='Flbs1a',ChkType='U_T_Z',DimFactor=df),savedValues=dict(MainSize=row,Table=table))

def generate():
    choices=[{}]
    for u in ['Metric','Imperial']:
        for table in TABLES:
            cells,qty,_=b.bank(f'Flbs/Fla{table}.csv',1,3,3,fraction_column=None)
            for row in sorted({3,8,min(qty,46),qty,100}|{r for r in range(3,qty+1) if cells[r][3] in ['','N/A']}):choices.append(dict(Units=u,Table=table,MainSize=row))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [3,8,100]]
    cases=[dict(id='Flbs1-'+str(i),sourceRefs=[b.ref(21006),b.ref(21934)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flbs1')],expected=model(c)) for i,c in enumerate(choices)]
    (b.APP/'tests/reference/flanges-gaskets/Flbs1.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route('Flbs1',['Flbs1','Flbs1_Headers','LoadSettingsFlbs','LoadDataBase1','DesigBtn2ForBSTable','GetSubTab','DropSubTab','WhiteBlock'])
    print('Flbs1',len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':generate()
