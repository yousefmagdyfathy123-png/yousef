"""Independent source/data analyst model. Never imports or calls product TS.
Task6 references are deliberately route-specific; source identity checked first.
"""
from pathlib import Path
import json, hashlib, math, re, struct
ROOT=Path(__file__).resolve().parents[3]; APP=ROOT/'alfadata'
SOURCE=ROOT/'audit/executable/Pipedata_Pro_14_1.Module1.cs'
SOURCE_HASH='ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_HASH
def sha(x): return hashlib.sha256(x).hexdigest()
def single(x):return struct.unpack('<f',struct.pack('<f',x))[0]
def val(x):
    m=re.match(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?',(x or '').replace(' ',''))
    return float(m[0]) if m else 0.
def rnd(x,d=0):return round(x*10**d)/10**d
def string(x):
    if x==0:return '0'
    return format(x,'.15g').replace('e+0','E+').replace('e-0','E-')
def fraction(text):
    n=val(text)
    def match(n,prefix,text):
        for i in range(1,32):
            if i/32-1/64<n<i/32+1/64:
                a=i;b=32
                while a%2==0:a//=2;b//=2
                text=f'{prefix}{a}/{b}'
        return text
    if n<1:
        text=match(n,'',text)
        if n>1-1/64:text='1'
    n=val(text)
    if n>1:
        whole=math.floor(n);rem=n-whole;p=' '+string(whole)
        if 0<rem<1/64:text=p
        text=match(rem,p+'+',text)
        if rem>1-1/64:text=' '+string(whole+1)
    return text
def bank(path,index,sensor=0,minimum=5,face_index=1,fractions=False,fraction_column='flan-default'):
    raw=(ROOT/'Database'/path).read_bytes()
    lines=raw.decode('utf-8-sig',errors='replace').splitlines()
    rows=[line.split(',') for line in lines];width=int(rows[0][0])
    cells={i+1:{j+1:row[j] for j in range(width)} for i,row in enumerate(rows)}
    qty=len(rows)
    if index==1:
        for i in range(qty,minimum+1,-1):
            if cells[i][sensor]=='N/A':cells[i][sensor]=''
            if cells[i][sensor]!='':qty=i;break
    for i in range(1,qty+1):
        for j in range(1,width+1):
            text=cells[i][j]
            if index==1 and text in [f'0+{n}/{d}' for n,d in [(1,16),(1,8),(3,16),(1,4),(5,16),(3,8),(7,16),(1,2),(9,16),(5,8),(11,16),(3,4),(13,16),(7,8),(15,16)]]:cells[i][j]=text[2:]
            if index==2:
                if text in ['0+1/8','0+1/4','0+3/8','0+1/2','0+3/4']:cells[i][j]=text[2:]
                if text=='2+1/2':cells[i][j]='2.5'
            if index in [3,4] and text in {'0+1/8':'.125','0+1/4':'.25','0+3/8':'.375','0+1/2':'0.5','0+3/4':'0.75','1+1/4':'1.25','1+1/2':'1.5','2+1/2':'2.5','3+1/2':'3.5'}:
                cells[i][j]={'0+1/8':'0.125','0+1/4':'0.25','0+3/8':'0.375','0+1/2':'0.5','0+3/4':'0.75','1+1/4':'1.25','1+1/2':'1.5','2+1/2':'2.5','3+1/2':'3.5'}[text]
        col=22+face_index if fraction_column=='flan-default' else fraction_column
        if index==1 and fractions and col is not None:cells[i][col]=fraction(cells[i][col])
    return cells,qty,sha(raw)
def commands(template,banks,row,units,fractions,route=None):
    # Audit records independently produced in October/November source recheck.
    records=DRAWINGS_BY_PATH.get(('Database/'+template).lower(),[])
    route=route or template.split('/')[0]+re.search(r'\d+',template.split('/')[-1])[0]
    out=[]
    def mask(x,y,w):out.append(dict(op='fillRect',x=x,y=y,width=w,height=30,color='#ffffff'))
    for r in records:
        color=r['internal_color'];m=r['marker_index']
        if m is None:continue
        x=single(r['coords_rounded'][0]);y=single(single(single(r['coords_rounded'][1])-single(single(r['coords_rounded'][1])*2))+single(1030))
        bank_id=2 if color==99 else 1;text=banks[bank_id].get(row,{}).get(m,'')
        align='center';font='bold 16pt Verdana'
        if color==6:
            text=text.strip(' \u3000');length=len(text)*18
            if route.startswith('Flan'):mask(single(x-10),single(y-10),single(length));align='left'
            else:mask(single(x-length*.65),single(y-10),single(length*1.3))
            if text.endswith('*'):text=(text[:-1]+'\u00b0').strip(' \u3000')
            delta=single(single(r['coords_rounded'][2])-x)
            if delta==100:align='right';font='bold 28pt Verdana'
        else:
            sign='"' if units=='Imperial' else ''
            if not(color==1 and text in ['N/A','SPA']):
                if color==99:text+=sign
                text=string(rnd(val(text),2))
                if color==1 and units=='Imperial' and route[:4] in ['Flco','Fldi','Flhb','Flbs']:text=string(rnd(val(text)/25.4,2))
                if fractions:text=fraction(text)
                text+=sign
            mask(single(x-80),single(y-10),160)
        t=dict(op='text',text=text,x=x,y=single(y-8),font=font,align=align,color='#062134')
        if align=='right':t['verticalAlign']='bottom'
        out.append(t)
    for r in records+[dict(internal_color=0,coords_rounded=[0,0,0,0])]:
        color=r['internal_color']
        if color in [1,6,99]:continue
        x,y,xx,yy=r['coords_rounded']
        flip=lambda n:single(single(single(n)-single(single(n)*2))+single(1030))
        out.append(dict(op='line',**{'from':dict(x=single(x),y=flip(y))},to=dict(x=single(xx),y=flip(yy)),color='#c0c0c0' if color==7 else '#000044',width=1))
    return out
DRAWINGS=json.loads((ROOT/'audit/recheck-2026-11-01/drawing-parser-accepted-lines.json').read_text())
DRAWINGS_BY_PATH={}
for record in DRAWINGS:DRAWINGS_BY_PATH.setdefault(record['path'].replace('\\','/').lower(),[]).append(record)
ref=lambda line:dict(path=SOURCE.relative_to(ROOT).as_posix(),hash=SOURCE_HASH,line=line)
def flan1(c):
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');sch=c.get('Sch','STD');fi=1 if face=='RF' else 2
    frac=c.get('Fractionize','No')=='Yes';list_units=c.get('ListUnits','Inches');row=c.get('MainSize',16);sign='"' if units=='Imperial' else '';ws='lb' if units=='Imperial' else 'kg';wf=2.20462 if units=='Imperial' else 1
    paths=[f'Flan/{"FLG_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv',f'Pipe/{"Pipe_Imperial_" if units=="Imperial" else "Pipe"}{sch}.csv',f'Flan/Flg{cls[:-1]}.csv',f'Pipe/Pipe{sch}.csv']
    banks={};qty={};hashes=[]
    for index,path in enumerate(paths,1):banks[index],qty[index],h=bank(path,index,11+fi if index==1 else 4,face_index=fi,fractions=frac);hashes.append(h)
    row=min(row,qty[1]); messages=[]
    if row>qty[2]:
        retry=flan1({**c,'MainSize':row,'Sch':'STD'});retry['view']['messages']=[f"Schedule '{sch}' is not manufactured at this size, reverting to Schedule 'STD'"];retry['sourceValues']=dict(Sch='STD',ScheduleIndex=8);retry['savedValues']=dict(Sch='STD',MainSize=row);return retry
    a=lambda b,col:banks[b].get(row,{}).get(col,'')
    available=all(a(b,col) not in ['','N/A'] for b,col in [(1,11+fi),(2,4)])
    title='Weldneck Flange'; headers=['']*7
    if available:
        n=lambda b,col:val(a(b,col))
        od=n(3,3);th=n(3,4);bore=n(4,6);hub=n(3,9)-th;hm=n(3,5);stub=n(3,6);hole=n(3,30);hole_qty=n(3,20)
        disk=(3.14*od**2/4*th-3.14*bore**2/4*th)/1e9*7850
        parallel=(3.14*stub**2/4*hub-3.14*bore**2/4*hub)/1e9*7850
        triangle=(3.14*hm**2/4*hub-3.14*stub**2/4*hub)/1e9*7850/2
        holes=(3.14*hole**2/4*th*hole_qty)/1e9*7850
        wt=string(rnd((val(string(disk))+parallel+triangle-holes)*wf,2));bolt=string(rnd(n(1,39+fi)*wf,2))
        banks[1][row][48]=a(1,20)+' Holes';banks[1][row][49]=a(1,25)+'" Dia'
        headers=[('DN' if list_units=='Millimetres' else '')+a(1,2 if list_units=='Millimetres' else 1)+('"NPS' if list_units=='Inches' else '')+' '+title+' '+cls+' '+face+' Sch-'+sch,'Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolt+' '+ws,'RTJ Ring No : '+a(1,15) if face=='RTJ' else '','RTJ Distance Between Flgs : '+a(1,16)+sign if face=='RTJ' else '', 'StudBolt Size : '+a(1,21)+'" UNC  (or M'+a(1,26)+')  x '+a(1,22+fi)+sign+' Long','ASME B16.5-2020']
    else:headers=['ASME B16.5 Flanges','Not manufactured with the selected parameters','Select another size, class, face type or Schedule','','','','']
    template='Flan/Flan1a.dxf' if face=='RTJ' else 'Flan/Flan1.dxf'
    draw=commands(template,banks,row,units,frac) if available else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    opts=[dict(value=str(i),text=banks[1][i][2 if list_units=='Millimetres' else 1]+('"' if list_units=='Inches' else ''),enabled=True) for i in range(5,min(qty[1],48)+1)]
    def control(field,source,text,options,x):return dict(id=field,sourceId=source,type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=x,y=56,width=80,height=33),sourceRefs=[ref(19174)],showDropDownArrow=False)
    shared=lambda arr:[dict(value=t,text=t,enabled=True) for t in arr]
    controls=[control('MainSize','Btn1',a(1,2 if list_units=='Millimetres' else 1)+('"' if list_units=='Inches' else ''),opts,350),control('ASMEClass','Btn2',cls,shared(['150#','300#','400#','600#','900#','1500#','2500#']),430),control('Face','Btn3',face,shared(['RF','RTJ']),510),control('Sch','Btn4',sch,shared(['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS']),590)]
    rows=[]
    if available:
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolt,unit=ws)]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[single(.6),0,0,single(.6),.5,105],commands=draw),messages=messages,visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if available else 'unavailable',rows=rows))
    tuples=[[b,i,j,value] for b,rr in banks.items() for i,cc in rr.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty[i] for i in range(1,5)],files=paths,bankFingerprint=sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=available,sourceHashes=hashes)
def effective_flan_class(route,cls):
    if route=='Flan2' and cls=='2500#':return '1500#'
    if route=='Flan5':
        if cls=='400#':return '600#'
        if cls in ['900#','2500#']:return '1500#'
    return cls
def flan6(c):
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');fi=1 if face=='RF' else 2
    sch=c.get('Sch','STD');sch=sch if sch in ['5s','10s','40s'] else '40s';frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches')
    paths=[f'Flan/{"FLG_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv',f'Pipe/{"Pipe_Imperial_" if units=="Imperial" else "Pipe"}{sch}.csv']
    cells,qty,h=bank(paths[0],1,12+fi,5,fi,frac);pipe,pqty,ph=bank(paths[1],2,4,5,fi,frac);banks={1:cells,2:pipe};row=min(c.get('MainSize',16),qty)
    a=lambda col:cells.get(row,{}).get(col,'');sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg'
    ok=a(12+fi) not in ['','N/A'];rows=[]
    if ok:
        wt=string(rnd(val(a(28))*wf,2));bolts=string(rnd(val(a(39+fi))*wf,2));cells[row][48]=a(20)+' Holes';cells[row][49]=a(25)+'" Dia'
        length=a(23).replace('+1/4','.25').replace('+1/2','.5').replace('+3/4','.75');length=string(rnd(float(length)+val(pipe.get(row,{}).get(4,''))*2,2))
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' Lapped Flange '+cls+'  Sch-'+sch,'Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolts+' '+ws,'','','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+length+sign+' Long','ASME B16.5-2020']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['ASME B16.5 Flanges','Not manufactured with the selected parameters','Try another size or class','','','','']
    sizes=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(5,min(qty,48)+1)]
    controls=[]
    for field,source,text,values,x in [('MainSize','Btn1',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),sizes,350),('ASMEClass','Btn2',cls,['150#','300#','400#','600#','900#','1500#','2500#'],430),('Sch','Btn3',sch,['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS'],510)]:
        options=values if field=='MainSize' else [dict(value=t,text=t,enabled=field!='Sch' or t in ['5s','10s','40s']) for t in values]
        controls.append(dict(id=field,sourceId=source,type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=x,y=56,width=80,height=33),sourceRefs=[ref(19608)],showDropDownArrow=False))
    draw=commands('Flan/Flan6.dxf',banks,row,units,frac) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[single(.6),0,0,single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[b,i,j,value] for b,rr in banks.items() for i,cc in rr.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty,pqty],files=paths,bankFingerprint=sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h,ph],sourceValues=dict(Sch=sch,Sensor1=12+fi,Sensor2=4,TabbCount=6,SubTab='Flan6'))
def flan7(c):
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#');fi=1 if face=='RF' else 2;frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches')
    paths=[f'Flan/{"FLG_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv',f'Pipe/{"Pipe_Imperial_" if units=="Imperial" else "Pipe"}STD.csv',f'Flan/Flg{cls[:-1]}.csv','Pipe/PipeSTD.csv']
    banks={};qty={};hashes=[]
    for b,path in enumerate(paths,1):banks[b],qty[b],h=bank(path,b,11+fi if b%2 else 4,5,fi,frac);hashes.append(h)
    requested=c.get('MainSize',16);row=min(requested,qty[1]);a=lambda b,col:banks[b].get(row,{}).get(col,'');ok=a(1,11+fi) not in ['','N/A']
    schedules=['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS']
    sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg';source_values=dict(Sch='STD',SubTab='Flan7a',TabbCount=7,ScheduleIndex=8 if requested>qty[1] else schedules.index(c.get('Sch','STD'))+1)
    if ok:
        banks[1][row][48]=a(1,20)+' Holes';banks[1][row][49]=a(1,25)+'" Dia'
        od=val(a(3,5));bore=val(a(4,6));th=val(a(3,4));hub=(305 if row>14 else 229)-th
        kg=(3.14*od**2/4*hub-3.14*bore**2/4*hub)/1e9*7850
        wt=float(c.get('Flange_wt','0'))
        # Source Clicker recursion returns to the outer handler, which continues
        # into headers again. Each String roundtrip is independently retained.
        for i in range(2 if requested>qty[1] else 1):wt=float(string(wt+kg))
        source_values.update(Flange_wt=string(wt),Hub_OD=od,Hub_ID=bore,Flg_Thk=th,Hub_Len=hub)
        banks[1][row][9]=str((12 if row>14 else 9) if units=='Imperial' else (305 if row>14 else 229))
        bolts=string(rnd(val(a(1,39+fi))*wf,2))
        headers=[('DN' if lu=='Millimetres' else '')+a(1,2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' Straight Hub Welding Flange '+cls+' '+face,'','S/Bolts and Nuts =  '+bolts+' '+ws,'RTJ Ring No : '+a(1,15) if face=='RTJ' else '','RTJ Distance Between Flgs : '+a(1,16)+sign if face=='RTJ' else '','StudBolt Size : '+a(1,21)+'" UNC  (or M'+a(1,26)+')  x '+a(1,22+fi)+sign+' Long','ASME B16.5-2020']
        rows=[dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['ASME B16.5 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','',''];rows=[]
    size=[dict(value=str(i),text=banks[1][i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(5,min(qty[1],48)+1)]
    controls=[]
    for field,source,text,values,x in [('MainSize','Btn1',a(1,2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),size,350),('ASMEClass','Btn2',cls,['150#','300#','400#','600#','900#','1500#','2500#'],430),('Face','Btn3',face,['RF','RTJ'],510)]:
        opts=values if field=='MainSize' else [dict(value=t,text=t,enabled=True) for t in values]
        controls.append(dict(id=field,sourceId=source,type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=x,y=56,width=80,height=33),sourceRefs=[ref(19684)],showDropDownArrow=False))
    draw=commands('Flan/Flan7a.dxf' if face=='RTJ' else 'Flan/Flan7.dxf',banks,row,units,frac) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[single(.6),0,0,single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[b,i,j,value] for b,rr in banks.items() for i,cc in rr.items() for j,value in cc.items()]
    return dict(view=view,mainSize=row,lineCounts=[qty[i] for i in range(1,5)],files=paths if requested<=qty[1] else paths+paths,bankFingerprint=sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=hashes if requested<=qty[1] else hashes+hashes,sourceValues=source_values,savedValues=dict(Sch='STD' if requested>qty[1] else c.get('Sch','STD'),MainSize=row))
def flan_table(c,recipe):
    units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#')
    cls=effective_flan_class(recipe['route'],cls)
    frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches');fi=1 if face=='RF' else 2
    path=f'Flan/{"FLG_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv'
    sensor=recipe['sensor'](fi);cells,qty,h=bank(path,1,sensor,5,fi,frac);banks={1:cells};row=min(c.get('MainSize',16),qty)
    a=lambda col:cells.get(row,{}).get(col,'');sign='"' if units=='Imperial' else '';wf=2.20462 if units=='Imperial' else 1;ws='lb' if units=='Imperial' else 'kg'
    ok=a(sensor) not in ['','N/A'];headers=['']*7;rows=[]
    if ok:
        cells[row][48]=a(20)+' Holes';cells[row][49]=a(25)+'" Dia';wt=string(rnd(val(a(recipe['weightColumn']))*wf,2));bolts=string(rnd(val(a(39+fi))*wf,2))
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"NPS' if lu=='Inches' else '')+' '+recipe['title']+' '+cls+' '+face,'Flange Wt =  '+wt+' '+ws,'S/Bolts and Nuts =  '+bolts+' '+ws,'RTJ Ring No : '+a(15) if face=='RTJ' else '','RTJ Distance Between Flgs : '+a(16)+sign if face=='RTJ' else '','StudBolt Size : '+a(21)+'" UNC  (or M'+a(26)+')  x '+a(22+fi)+sign+' Long','ASME B16.5-2020']
        rows=[dict(id='flange-weight',label='Flange Wt =  ',value=wt,unit=ws),dict(id='bolts-weight',label='S/Bolts and Nuts =  ',value=bolts,unit=ws)]
    else:headers=['ASME B16.5 Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    options=lambda values:[dict(value=t,text=t,enabled=t not in recipe['disabledClasses']) for t in values]
    size=[dict(value=str(i),text=cells[i][2 if lu=='Millimetres' else 1]+('"' if lu=='Inches' else ''),enabled=True) for i in range(5,min(qty,48)+1)]
    controls=[]
    for field,source,text,opts,x in [('MainSize','Btn1',a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else ''),size,350),('ASMEClass','Btn2',cls,options(['150#','300#','400#','600#','900#','1500#','2500#']),430),('Face','Btn3',face,options(['RF','RTJ']),510)]:
        controls.append(dict(id=field,sourceId=source,type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=x,y=56,width=80,height=33),sourceRefs=[ref(recipe['line'])],showDropDownArrow=False))
    draw=commands('Flan/'+recipe['route']+('a' if face=='RTJ' else '')+'.dxf',banks,row,units,frac) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[single(.6),0,0,single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,i,j,v] for i,cc in cells.items() for j,v in cc.items()]
    expected=dict(view=view,mainSize=row,lineCounts=[qty],files=[path],bankFingerprint=sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h])
    if recipe['route']=='Flan5':expected['sourceValues']=dict(DataBaseName3='Flg'+cls[:-1],Sensor1=17,TabbCount=5,SubTab='Flan5a')
    return expected
def pin_route(route,names):
    methods=json.loads((ROOT/'audit/executable/methods.json').read_text(encoding='utf-8'));text=SOURCE.read_text(encoding='utf-8-sig');anchors=[]
    for name in names:
        m=next(m for m in methods if m['type']=='Pipedata_Pro_14_1.Module1' and m['name']==name);match=re.search(r'public static void '+name+r'\(',text)
        anchors.append(dict(method=name,sourceRef={**ref(text.count('\n',0,match.start())+1),'rva':m['rva'],'token':f'0x{0x06000000|int(re.search(r"0x([0-9a-f]+)",m["token"])[1],16):08x}'},ilSha256=m['il_sha256']))
    fixture=APP/f'tests/reference/flanges-gaskets/{route}.json';cases=json.loads(fixture.read_text(encoding='utf-8'))['cases']
    evidence=dict(schemaVersion=1,routeId=route,methods=anchors,sourceEvidenceReuse='evidence/catalog-load-evidence.json; matching artifact/MVID, all1481 IL-body crosscheck',fixtures=dict(path=fixture.relative_to(APP).as_posix(),hash=sha(fixture.read_bytes()),cases=len(cases),unavailableCases=sum(not c['expected']['available'] for c in cases)),tests=['tests/legacy/flanges-gaskets.test.ts'],originalComparison='unverified-visual-nonblocking')
    out=APP/'evidence/flanges-gaskets';out.mkdir(exist_ok=True)
    (out/f'{route}.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
def offered_unavailable_choices(choices,recipe):
    result=list(choices);seen={json.dumps(c,sort_keys=True) for c in result}
    for units in ['Metric','Imperial']:
        for original_class in ['150#','300#','400#','600#','900#','1500#','2500#']:
            cls=effective_flan_class(recipe['route'],original_class)
            for face in ['RF','RTJ']:
                fi=1 if face=='RF' else 2;sensor=recipe['sensor'](fi)
                cells,qty,_=bank(f'Flan/{"FLG_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv',1,sensor,5,fi)
                for row in range(5,min(qty,48)+1):
                    if cells[row].get(sensor,'') not in ['','N/A']:continue
                    c=dict(Units=units,ASMEClass=original_class,Face=face,MainSize=row);key=json.dumps(c,sort_keys=True)
                    if key not in seen:result.append(c);seen.add(key)
    return result
def main():
    out=APP/'tests/reference/flanges-gaskets';out.mkdir(exist_ok=True,parents=True)
    choices=[{}]
    for units in ['Metric','Imperial']:
        for cls in ['150#','300#','400#','600#','900#','1500#','2500#']:
            for face in ['RF','RTJ']:
                for row in [5,16,40]:choices.append(dict(Units=units,ASMEClass=cls,Face=face,MainSize=row))
    choices += [dict(Units=u,Face=f,Fractionize='Yes',ListUnits=l,MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for l in ['Inches','Millimetres'] for r in [5,16]]
    choices += [dict(MainSize=40,Sch='160'),dict(MainSize=5,Sch='XXS')]
    flan1_choices=choices+[dict(Units=u,Face=f,Sch='XXS',MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for r in [25,40]]
    cases=[dict(id='Flan1-'+str(i),sourceRefs=[ref(19174),ref(39185)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan1')],expected=flan1(c)) for i,c in enumerate(flan1_choices)]
    (out/'Flan1.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    print('Flan1 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    flan2_recipe=dict(route='Flan2',title='Slip-on Flange',sensor=lambda fi:7,weightColumn=28,disabledClasses=['2500#'],line=19379)
    cases=[dict(id='Flan2-'+str(i),sourceRefs=[ref(19379),ref(39254)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan2')],expected=flan_table(c,flan2_recipe)) for i,c in enumerate(offered_unavailable_choices(choices[:-2],flan2_recipe))]
    (out/'Flan2.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    print('Flan2 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    pin_route('Flan2',['Flan2','Flan2_Headers','LoadDataBase1','GetSubTab','DropSubTab','LoadSettingsFlan','DesigBtn1ValuesForMainSize','DesigBtn2ForASMEClass','DesigBtn3ForFace'])
    flan3_recipe=dict(route='Flan3',title='Blind Flange',sensor=lambda fi:11+fi,weightColumn=29,disabledClasses=[],line=19436)
    cases=[dict(id='Flan3-'+str(i),sourceRefs=[ref(19436),ref(39310)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan3')],expected=flan_table(c,flan3_recipe)) for i,c in enumerate(choices[:-2])]
    (out/'Flan3.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    pin_route('Flan3',['Flan3','Flan3_Headers','LoadDataBase1','GetSubTab','DropSubTab'])
    print('Flan3 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    flan4_recipe=dict(route='Flan4',title='Threaded Flange',sensor=lambda fi:7,weightColumn=28,disabledClasses=[],line=19492)
    cases=[dict(id='Flan4-'+str(i),sourceRefs=[ref(19492),ref(39396)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan4')],expected=flan_table(c,flan4_recipe)) for i,c in enumerate(offered_unavailable_choices(choices[:-2],flan4_recipe))]
    (out/'Flan4.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    pin_route('Flan4',['Flan4','Flan4_Headers','LoadDataBase1','GetSubTab','DropSubTab'])
    print('Flan4 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    flan5_recipe=dict(route='Flan5',title='SocketWelded Flange',sensor=lambda fi:17,weightColumn=28,disabledClasses=['400#','900#','2500#'],line=19548)
    cases=[dict(id='Flan5-'+str(i),sourceRefs=[ref(19548),ref(39452)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan5')],expected=flan_table(c,flan5_recipe)) for i,c in enumerate(offered_unavailable_choices(choices[:-2],flan5_recipe))]
    (out/'Flan5.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    pin_route('Flan5',['Flan5','Flan5_Headers','LoadDataBase1','LoadSettingsFlan','GetSubTab','DropSubTab'])
    print('Flan5 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    flan6_recipe=dict(route='Flan6',sensor=lambda fi:12+fi)
    options=offered_unavailable_choices(choices[:-2],flan6_recipe)+[dict(Units=u,Face=f,Sch=s,MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for s in ['5s','10s','40s'] for r in [5,16,40]]
    cases=[dict(id='Flan6-'+str(i),sourceRefs=[ref(19608),ref(39508)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan6')],expected=flan6(c)) for i,c in enumerate(options)]
    (out/'Flan6.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    pin_route('Flan6',['Flan6','Flan6_Headers','LoadSettingsFlan','LoadDataBase1','LoadDataBase2','GetSubTab','DropSubTab','ErrorMessageSizeClass','WhiteBlock'])
    print('Flan6 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
    flan7_recipe=dict(route='Flan7',sensor=lambda fi:11+fi)
    options=offered_unavailable_choices(choices[:-2],flan7_recipe)
    options += [dict(Units=u,ASMEClass=cl,Face=f,MainSize=r) for u in ['Metric','Imperial'] for cl in ['150#','300#','400#','600#','900#','1500#','2500#'] for f in ['RF','RTJ'] for r in [14,15]]
    options += [dict(Units=u,Face=f,MainSize=r,Flange_wt=flan1(dict(Units=u))['view']['textResults']['rows'][0]['value']) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for r in [16,40]]
    options += [dict(Units=u,Face=f,Sch=s,MainSize=r) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for s in ['5s','160'] for r in [16,40]]
    cases=[dict(id='Flan7-'+str(i),sourceRefs=[ref(19684),ref(39570),ref(39185)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId='Flan7')],expected=flan7(c)) for i,c in enumerate(options)]
    (out/'Flan7.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    pin_route('Flan7',['Flan7','Flan7_Headers','LoadSettingsFlan','LoadDataBase1','LoadDataBase2','LoadDataBase3','LoadDataBase4','GetSubTab','DropSubTab','WhiteBlock'])
    print('Flan7 independent cases:',len(cases),'unavailable:',sum(not c['expected']['available'] for c in cases))
if __name__=='__main__':main()
