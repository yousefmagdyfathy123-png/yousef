"""Independent API6B model using original source20193/20251/22464/22512."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
RATINGS={'Metric':['13.8 MPa','20.7 MPa','34.5 MPa','69.0 MPa','103.5 MPa','138.0 MPa'],'Imperial':['2000 PSI','3000 PSI','5000 PSI','10000 PSI','15000 PSI','20000 PSI']}

def model(c,route):
    n=int(route[-1]);units=c.get('Units','Metric');rating=c.get('APIRatingIndex',1);lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';requested=c.get('MainSize',8);sensor=21 if n==1 else 3
    path=f'Fl6b/Fl6b{rating}{"_Imperial" if units=="Imperial" else ""}.csv';cells,qty,h=b.bank(path,1,sensor,3,fractions=frac,fraction_column=34);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'')
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';ok=a(sensor) not in ['','N/A'];rows=[]
    if ok:
        wt=b.string(b.rnd(b.val(a(38 if n==1 else 39))*wf,2));bolts=b.string(b.rnd(b.val(a(41))*wf,2))
        cells[row][26]='23*'
        for _ in range(2 if requested>qty else 1):
            for col in [30,31,42,43]:cells[row][col]=a(col)+sign
        cells[row].update({35:a(12)+' Holes',36:a(14)+sign+' Dia',37:a(24)+sign+' Max' if n==1 else 'Client Specify'})
        title='API Type 6B '+('Weldneck' if n==1 else 'Threaded')+' Flange'
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+title+' '+RATINGS[units][rating-1],'Flange Wt =  '+wt+' '+ws,'Studbolts and Nuts Wt =  '+bolts+' '+ws,'RTJ Ring No : '+a(17),'RTJ Distance Between Flgs : '+a(27)+sign+" (Ring type 'R'), or "+a(28)+sign+" (Ring type 'RX')",'StudBolt Size : '+a(13)+'" UNC x '+a(34)+sign+' Long','API 6A-2004']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='Studbolts and Nuts Wt =  ',value=bolts,unit=ws)]
    else:headers=['API 6A Type 6B Flanges','Not manufactured with the selected parameters','Try another size or rating','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(3,min(qty,46)+1)]
    controls=[]
    for field,text,opts in [('MainSize',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes),('APIRatingIndex',RATINGS[units][rating-1],[dict(value=str(i+1),text=t,enabled=i<3) for i,t in enumerate(RATINGS[units])])]:
        i=len(controls);controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(20193 if n==1 else 20251)],showDropDownArrow=False))
    draw=b.commands('Fl6b/'+route+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=dict(Sensor1=sensor,MinMainSize=3,TabbCount=n,TabbQty=2,SubTab=route+'a',ChkType='U_A_Z'),savedValues=dict(MainSize=row))

def generate(route):
    n=int(route[-1]);choices=[{}]
    for u in ['Metric','Imperial']:
        for rating in [1,2,3]:
            sensor=21 if n==1 else 3;cells,qty,_=b.bank(f'Fl6b/Fl6b{rating}{"_Imperial" if u=="Imperial" else ""}.csv',1,sensor,3,fraction_column=34)
            for row in sorted({3,8,qty,40}|{r for r in range(3,qty+1) if cells[r][sensor] in ['','N/A']}):choices.append(dict(Units=u,APIRatingIndex=rating,MainSize=row))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [3,8,40]]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(20193 if n==1 else 20251),b.ref(22464 if n==1 else 22512)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFl6b','LoadDataBase1','DesigBtn1ForAPISize','DesigBtn2ForAPIRating','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Fl6b1']:generate(route)
