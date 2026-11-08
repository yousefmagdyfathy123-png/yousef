"""Independent ring gasket model from handlers21657..21933 and CalcCylWeight."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
LINES=[21657,21708,21759];HEADERS=[21815,21852,21888];TITLES=['Type R Ring Gasket','Type RX Ring Gasket','Type BX Ring Gasket']

def model(c,n):
    route=f'Grtj{n}';u=c.get('Units','Metric');lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';requested=c.get('MainSize',16);minimum=4 if n==3 else 3;sensor=2 if n==3 else 3
    path=f'Grtj/{route}'+('_Imperial' if u=='Imperial' else '')+'.csv';cells,qty,h=b.bank(path,1,sensor,minimum,fraction_column=None);row=min(requested,qty);a=lambda col:cells.get(row,{}).get(col,'');sign='"' if u=='Imperial' else '';wf=2.20462 if u=='Imperial' else 1;ws='lb' if u=='Imperial' else 'kg';banks={1:cells};counts=[qty];files=[path];hashes=[h]
    if n==3:
        bank2,qty2,h2=b.bank('Grtj/Grtj3.csv',2,2,minimum,fraction_column=None);banks[2]=bank2;counts.append(qty2);files.append('Grtj/Grtj3.csv');hashes.append(h2)
    controls=[dict(id='MainSize',sourceId='Btn1',type='select',text=a(2 if lu=='Millimetres' else 1),options=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1],enabled=True) for i in range(minimum,min(qty,minimum+43)+1)],enabled=True,checked=False,visible=True,layout=dict(x=350,y=56,width=80,height=33),sourceRefs=[b.ref(LINES[n-1])],showDropDownArrow=False)]
    ok=a(sensor) not in ['','N/A'];rows=[];globals=dict(Sensor1=sensor,MinMainSize=minimum,TabbCount=n,TabbQty=3,SubTab=route+'a',ChkType='U_Z',ListUnitsSign='"' if lu=='Inches' else '')
    if ok:
        for _ in range(2 if requested>qty else 1):
            if n==3:
                dia=b.single(b.val(bank2[row][3]));length=b.single(b.val(bank2[row][5]));cyl=b.single(3.14*dia**2/4*length*7.8/1e6)
                dia=b.single(b.val(bank2[row][4]));hole=b.single(3.14*dia**2/4*length*7.8/1e6);weight=b.single(cyl-hole);weightt=b.string(b.rnd(b.single(weight*100))/100)
                # VB Str(Double) omits zero before the decimal point.
                if weightt.startswith('0.'):weightt=weightt[1:]
                if weightt.startswith('-0.'):weightt='-'+weightt[2:]
                wt=b.string(b.rnd(b.val(weightt)*wf,2));globals.update(dia=dia,Length=length,Cyl1Wt=cyl,Hole1Wt=hole,Weight=weight,Weightt=weightt,A=a(9),Sensor2=2)
                cells[row].update({12:a(9)+sign+' Rad',13:'23*',14:a(8)+sign+' Dia hole'})
            else:
                wt=b.string(b.rnd(b.val(a(9 if n==1 else 10))*wf,2))
                if n==1:cells[row].update({8:a(8)+sign+' Rad',10:'Rad',11:'23*',12:'Octagonal Type',13:'Oval Type'})
                else:cells[row].update({9:a(9)+sign+' Rad',12:'23*',13:'ID',14:'OD'})
        headers=[TITLES[n-1]+' '+a(1),'Weight =  '+wt+' '+ws,'','','','','ASME B16.20-2016'];rows=[dict(id='weight',label='Weight =  ',value=wt,unit=ws)]
    else:headers=['ASME B16.20 Gaskets','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    draw=b.commands(f'Grtj/{route}.dxf',banks,row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[bank,i,j,value] for bank,ccs in banks.items() for i,cc in ccs.items() for j,value in sorted(cc.items())]
    return dict(view=view,mainSize=row,lineCounts=counts,files=files*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=hashes,sourceValues=globals,savedValues=dict(MainSize=row,Length=c.get('Length',0)))

def generate(n):
    choices=[{}];minimum=4 if n==3 else 3
    for u in ['Metric','Imperial']:
        cells,qty,_=b.bank(f'Grtj/Grtj{n}'+('_Imperial' if u=='Imperial' else '')+'.csv',1,2 if n==3 else 3,minimum,fraction_column=None)
        for row in sorted({minimum,16,min(qty,minimum+43),qty,100}|set(range(minimum,min(qty,minimum+43)+1))):choices.append(dict(Units=u,MainSize=row))
    choices += [dict(Units=u,Fractionize=f,ListUnits=l,MainSize=r,Length=123) for u in ['Metric','Imperial'] for f in ['No','Yes'] for l in ['Inches','Millimetres'] for r in [minimum,16,100]]
    route=f'Grtj{n}';cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(LINES[n-1]),b.ref(HEADERS[n-1])],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,n)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsGrtj','LoadDataBase1','DesigBtn1ValuesForMainSize','GetSubTab','WhiteBlock']+(['LoadDataBase2','CalcCylWeight'] if n==3 else []))
    p=b.APP/f'evidence/flanges-gaskets/{route}.json';e=json.loads(p.read_text());e['tests']=['tests/legacy/gaskets.test.ts'];p.write_text(json.dumps(e,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(route,len(cases),'cases',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':generate(int(sys.argv[1]))
