"""Independent Task9 recipes from retained source, tables and audited drawing records.

No product imports or execution. Numerical semantics are separately cross-checked
against isolated .NET4 source arithmetic and the wired dialog handler.
"""
import importlib.util,itertools,json,math,functools
from pathlib import Path
spec=importlib.util.spec_from_file_location('f',Path(__file__).with_name('fittings-reference.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f);b=f.b
f.method=functools.cache(f.method);f.title=functools.cache(f.title)
OUT=b.APP/'tests/reference/calculators';ROUTES=['Gpas1','Gpas2','Gpas3','Gpas4','Comp1','Span1','Span2','Fxly1','Fxly2','Psiz1']
CLASSES=['150#','300#','400#','600#','900#','1500#','2500#']
LINES=dict(Gpas1=49160,Gpas2=49194,Gpas3=49230,Gpas4=49289,Comp1=53400,Span1=53498,Span2=53539,Fxly1=53821,Fxly2=53862,Psiz1=54827)
def s(x):
    if math.isnan(x):return 'NaN'
    if math.isinf(x):return '-∞' if x<0 else '∞'
    return b.string(x)
def roundn(x,d=0):return b.rnd(x,d) if math.isfinite(x) else x
def vbstr(x):return ('' if x<0 else ' ')+s(x)
def model(route,c):
    u=c['Units'];imp=u=='Imperial';lu=c['ListUnits'];lc=1 if lu=='Inches' else 2;ls='"' if lc==1 else '';sign='"' if imp else '';frac=c['Fractionize']=='Yes';n=int(route[4:]);family=route[:4]
    minimum=6 if family=='Comp' else (5 if family=='Gpas' and n>=3 else 4 if family=='Gpas' else 3)
    sensor=3+(1 if c['Face']=='RF' else 2) if family=='Comp' else 3 if family=='Gpas' else 4
    p1=('Flom/'+('FLG_Imperial_' if imp else 'Flg')+c['ASMEClass'][:-1]+'.csv') if family=='Comp' else 'Pipe/Pipe'+('STD' if family in ['Gpas','Psiz'] else c['Sch'])+'.csv'
    banks={};counts=[];paths=[];hashes=[]
    def load(p,index,sen=3):
        bank,q,h=b.bank(p,index,sen,minimum,fraction_column=None);banks[index]=bank;counts.append(q);paths.append(p);hashes.append(h);return q
    count=load(p1,1,sensor)
    if family=='Gpas' and n>=3:
        load('Flom/Flg'+c['ASMEClass'][:-1]+'.csv',2);load('Flom/Flg'+c['ASMEClass2'][:-1]+'.csv',3)
    if family=='Comp':
        load('Flom/90Elbow'+('_Imperial_' if imp else '')+'STD.csv',2);load('Ftbw/ReducingTee'+('_Imperial_' if imp else '')+'STD.csv',3)
    requested=c['MainSize'];row=requested if family=='Gpas' else min(count,requested)
    if family=='Gpas' and n>=3:row=min(row,counts[1])
    small=c['SmallSize'];lower=minimum if family=='Gpas' else c.get('LowerLimit',0);upper=row if family=='Gpas' else row-1
    a=lambda col,bank=1,r=None:banks.get(bank,{}).get(row if r is None else r,{}).get(col,'')
    num=lambda col,bank=1,r=None:b.val(a(col,bank,r))
    put=lambda col,x:banks[1].setdefault(row,{}).__setitem__(col,x)
    if family in ['Gpas','Comp']:
        for col in range(4,39):
            if a(col,3 if family=='Comp' else 1)!='0' and a(col-1,3 if family=='Comp' else 1) in ['0','1' if imp else '25']:lower=col-2;break
        if family=='Gpas' and n>=3:small=min(small,counts[2])
        small=max(lower,min(upper,small))
    ttl,props=f.title(route)
    ins=['0','1','1.5','2','2.5','3','4','6','8'] if imp else ['0','25','40','50','65','75','100','150','200']
    inscalc=[0,25,32,51,64,76,102,152,203] if imp else [0,25,40,50,65,75,100,150,200]
    fields=(['MainSize','SmallSize'] if n==1 else ['MainSize','InsThkIndex','SmallSize','InsThk2Index'] if n==2 else ['MainSize','ASMEClass','SmallSize','ASMEClass2'] if n==3 else ['MainSize','ASMEClass','InsThkIndex','SmallSize','ASMEClass2','InsThk2Index']) if family=='Gpas' else ['MainSize','SmallSize','ASMEClass','Face'] if family=='Comp' else ['MainSize','Sch','Material','FullorEmpty','InsThkIndex'] if family=='Span' else ['MainSize','Material','AmbTemp','DesTemp','Length'] if family=='Fxly' else ['Fluid','Material','Flowrate']
    controls=[];x=350
    opts=lambda words:[dict(value=t,text=t,enabled=True) for t in words]
    for i,field in enumerate(fields):
        value={'MainSize':row,'SmallSize':small}.get(field,c.get(field,''));text=str(value);options=[];kind='select';width=150 if field=='Material' else 110 if field=='Fluid' else 80
        if field in ['MainSize','SmallSize']:
            text=a(lc,r=value)+ls;lo,hi,limit=(minimum,count,44) if field=='MainSize' else (lower,upper,40)
            options=[dict(value=str(r),text=a(lc,r=r)+ls,enabled=True) for r in range(lo,min(hi,lo+limit-1)+1)]
        elif field.startswith('InsThk'):text=ins[value-1]+sign;options=[dict(value=str(j+1),text=t+sign,enabled=True) for j,t in enumerate(ins)]
        elif field in ['AmbTemp','DesTemp']:text=s(roundn(value))+'°'+c['TempSign'];kind='input'
        elif field=='Length':text=s(roundn(value,2))+sign;kind='input'
        elif field=='Flowrate':text=s(roundn(value*(1 if imp else .0689475728)))+(' gpm' if imp else ' l/s');kind='button'
        else:options=opts(dict(Material=['Carbon Steel','Stainless Steel'],FullorEmpty=['Full','Empty'],Fluid=['Water','Medium Oil'],ASMEClass=CLASSES,ASMEClass2=CLASSES,Sch=f.SCHEDULES,Face=['RF','RTJ'])[field])
        controls.append(dict(id=field,sourceId='Btn'+str(i+1),type=kind,text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=x,y=56,width=width,height=33),sourceRefs=[b.ref(LINES[route])],showDropDownArrow=False));x+=width
    ok=a(sensor) not in ['','N/A']
    if family=='Gpas' and n>=3:ok=ok and a(3,2) not in ['','N/A'] and a(3,3,small) not in ['','N/A']
    headers=['']*7;rows=[];visibility={f'Label{i}':True for i in range(1,8)}
    size=lambda r:('DN' if lc==2 else '')+a(lc,r=r)+ls+('NPS' if lc==1 else '')
    template=family+'/'+route+'.dxf'
    if ok:
        if family=='Gpas':
            insulated=n%2==0;flanged=n>=3;i1=inscalc[c['InsThkIndex']-1] if insulated else 0;i2=inscalc[c['InsThk2Index']-1] if insulated else 0;gap=25.4 if imp else 25
            if flanged:
                ans1=s(num(3,2)/2+i1+gap+num(3,1,small)/2+i2);ans2=s(num(3,3,small)/2+i2+gap+num(3)/2+i1);answer=max(ans1,ans2)
            else:answer=s(roundn(num(3)/2+i1+gap+num(3,1,small)/2+i2,2))
            if not imp:answer=s(roundn(b.val(answer)))
            headers=['Pipe Spacing for : '+('DN' if lc==2 else '')+a(lc)+ls+' x '+a(lc,r=small)+ls+('NPS' if lc==1 else '')+(' Flanged pipes with Insulation' if n==4 else ' Pipes with Insulation' if n==2 else ' Pipes'),'Gap = '+('1"' if imp else '25'),'','','','','B16.5/B16.47 Series A' if flanged else 'ASME B36.10M/19M']
            put(20,size(row)+(('  x  ' if n==4 else ' ')+c['ASMEClass'] if flanged else ''));put(21,size(small)+(('  x  ' if n==4 else ' ')+c['ASMEClass2'] if flanged else ''))
            if insulated:put(30,ins[c['InsThkIndex']-1]+sign+' Thick Insulation');put(31,ins[c['InsThk2Index']-1]+sign+' Thick Insulation')
            if n<3:put(22,'Pipe 1');put(23,'Pipe 2 ' if n==1 else 'Pipe 2');put(24 if n==1 else 26,answer)
            else:
                put(24,'Pipe 1');put(25,'Pipe 2')
                if n==4:
                    for col in [22,23,26,27]:put(col,'_')
                put(28 if n==4 else 26,answer)
            rows=[dict(id='gap',label='Gap',value='1' if imp else '25',unit=sign)]
        elif family=='Comp':
            fi=1 if c['Face']=='RF' else 2
            headers=[('DN' if lc==2 else '')+a(lc)+ls+' x '+a(lc,r=small)+ls+('NPS' if lc==1 else '')+' '+c['ASMEClass']+' '+c['Face']+' '+ttl,'','','','','',props['ActivitySpecLong']]
            for target,col,bank in [(10,4,3),(11,5,2),(12,7,2),(13,3+fi,1),(14,small+2,3)]:put(target,a(col,bank))
            for col,value in [(15,num(3+fi)+num(5,2)),(16,num(4,3)+num(3+fi)),(17,num(5,2)+num(4,3)),(18,num(13)+num(12)),(19,num(12)*2)]:put(col,vbstr(value))
            put(20,vbstr(roundn(math.sin(.7853985000000001)*num(19),2)));put(21,a(3+fi,r=small));put(22,vbstr(num(14)+num(21)))
        elif family=='Fxly':
            dt=b.single(b.single(c['DesTemp']-32)/1.8) if c['TempSign']=='F' else b.single(c['DesTemp']);at=b.single(b.single(c['AmbTemp']-32)/1.8) if c['TempSign']=='F' else b.single(c['AmbTemp']);length=b.single(c['Length']*(25.4 if imp else 1));delta=b.single(dt-at);ss=c['Material']=='Stainless Steel'
            k=(.7 if ss else .65) if n==2 else (1.4 if ss else 1.25);exp=1.4 if ss else 1
            ans1=k*math.sqrt(num(3)/25.4*abs(delta)*length);ans2=abs(.012*delta*b.single(length/1000)/(2 if n==2 else 1)*exp)
            if imp:ans1/=25.4;ans2/=25.4
            headers=[size(row)+' '+ttl+' '+c['Material'],'Ambient Temp: '+s(c['AmbTemp'])+'°'+c['TempSign'],'Design Temp: '+s(c['DesTemp'])+'°'+c['TempSign'],'','','Calculates required '+('loop size' if n==2 else 'distance to first guide'),props['ActivitySpecLong']]
            put(14,s(c['Length']));put(16,s(math.floor(float(s(ans1)))));put(17,s(ans2) if n==2 else s(roundn(float(s(ans2)),2)));put(15 if n==2 else 18,'Anchor');put(19,'First Guide');put(20,'Dim A')
            if c['DesTemp']<c['AmbTemp']:template=family+'/'+route+'a.dxf'
            rows=[dict(id='ambient',label='Ambient Temp:',value=s(c['AmbTemp']),unit='°'+c['TempSign']),dict(id='design',label='Design Temp:',value=s(c['DesTemp']),unit='°'+c['TempSign'])]
        elif family=='Span':
            ss=c['Material']=='Stainless Steel';young=195121 if ss else 203395;stress=24 if ss else 22;density=8000 if ss else 7850;od=num(3);inside=b.single(od-2*num(4));od1=b.single(od);od2=b.single(od+b.val(ins[c['InsThkIndex']-1])*2*(25.4 if imp else 1));area=b.single(3.1416*od2**2/4-3.1416*od1**2/4);volume=b.single(area*1000);inswt=b.single(volume*b.single(1.45e-7))
            kg=roundn((3.1415927*od**2/4-3.1415927*inside**2/4)*1000*density/1e9*100)/100;water=3.1415927*inside**2/4/1000*1.024;total=kg+inswt+(water if c['FullorEmpty']=='Full' else 0);inertia=.0491*(od**4-inside**4)
            ans1=math.sqrt(stress/10*10*inertia/(total/1000*(od/2)));ans2=(b.single((13 if od>65 else 8)*1920*b.single(young*.1019716212978))*inertia/(19*total/1000))**.25;ans=roundn(float(s(min(ans1,ans2))));limited='Deflection' if ans2<ans1 else 'Stress'
            headers=[size(row)+'  Sch-'+c['Sch']+' '+ttl,'This span in limited by '+limited if n==1 else '','','','','These spans can be used for vertical guide spacing.' if n==1 else '',props['ActivitySpecLong'] if n==1 else ''];visibility['LinkLabel1']=True
            if n==1:put(16,vbstr(ans))
            else:
                step=10 if imp else 100
                if imp:ans=float(s(ans/25.4))
                for i,factor in enumerate([.85,.85,.75,.64,.9,.7,.4]):put(7+i,vbstr(math.floor((ans*factor+step)/step)*step)+(sign+' Max' if i==6 else ''))
                lexical=a(1);fraction={'1/4':.25,'3/8':.375,'1/2':.5,'3/4':.75,'1+1/4':1.25,'1+1/2':1.5,'2+1/2':2.5,'3+1/2':3.5};end=math.floor(fraction.get(lexical,b.val(lexical))*6) if imp else math.floor((num(2)*5+100)/100)*100;put(14,vbstr(end)+sign+' Max')
        else:
            velocity=32.5/63**(1/3)*(1-1/2000)*(1-(.045 if c['Material']=='Stainless Steel' else .046)/2.5);flow=c['Flowrate']*.13368055556/60;diam=math.sqrt(flow*4/(velocity*3.14))*12 if flow>=0 else math.nan
            vel=s(roundn(b.val(s(velocity*(1 if imp else .3048))),2));diam=s(roundn(b.val(s(diam*(1 if imp else 25.4))),2));vs='ft/sec' if imp else 'mtrs/sec'
            headers=['Pipe Size Ready Reckoner','Optimum Velocity '+vel+' '+vs,'','','','',props['ActivitySpecLong']];put(10,diam+sign);put(11,'Minimum Inside Diameter');rows=[dict(id='velocity',label='Optimum Velocity',value=vel,unit=vs),dict(id='diameter',label='Minimum Inside Diameter',value=diam,unit=sign)]
    else:headers=[props['ActivityTitle'],'Not manufactured with the selected parameters','Try another size or class' if family in ['Gpas','Comp'] else 'Try another size or Schedule','','','','']
    draw=drawing(template,banks,row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility=visibility,textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[bank,r,col,v] for bank,rr in banks.items() for r,cc in rr.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,smallSize=small,files=paths*(2 if family!='Gpas' and requested>count else 1),lineCounts=counts,sourceHashes=hashes,available=ok,bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()))
def drawing(template,banks,row,units,frac,route):
    out=b.commands(template,banks,row,units,frac,route);records=b.DRAWINGS_BY_PATH.get(('Database/'+template).lower(),[])
    texts=iter(x for x in out if x['op']=='text');extra=[]
    for rec in records:
        if rec['marker_index'] is None:continue
        cmd=next(texts)
        if rec['internal_color']!=1:continue
        raw=banks[1].get(row,{}).get(rec['marker_index'],'')
        if raw not in ['SPA','N/A']:
            text=s(roundn(b.val(raw),2))
            if units=='Imperial' and route.startswith('Gpas'):text=s(roundn(b.val(text)/25.4,2))
            if units=='Imperial' and route=='Span1':text=s(roundn(b.val(text)/25.4))
            if frac:text=b.fraction(text)
            cmd['text']=text+('"' if units=='Imperial' else '')
        if route=='Span1' or route.startswith('Fxly'):extra.append((id(cmd),dict(op='fillRect',x=b.single(cmd['x']-60),y=b.single(cmd['y']-2),width=120,height=30,color='#ffffff')))
    patches=dict(extra);result=[]
    for cmd in out:
        if id(cmd) in patches:result.append(patches[id(cmd)])
        result.append(cmd)
    return result
def generate(route):
    family=route[:4];n=int(route[4:]);base=dict(Units='Metric',ListUnits='Inches',Fractionize='No',MainSize=18 if family in ['Fxly','Psiz'] else 16,SmallSize=6,ASMEClass='150#',ASMEClass2='150#',Face='RF',Sch='STD',InsThkIndex=2,InsThk2Index=2,Material='Carbon Steel',FullorEmpty='Full',AmbTemp=86,DesTemp=176,Length=2000,TempSign='C',Fluid='Water',Flowrate=1000)
    choices=[base];minimum=6 if family=='Comp' else 5 if family=='Gpas' and n>=3 else 4 if family=='Gpas' else 3
    for u,lu,frac in itertools.product(['Metric','Imperial'],['Inches','Millimetres'],['No','Yes']):
        for row in [minimum,8,16,25]:choices.append({**base,'Units':u,'ListUnits':lu,'Fractionize':frac,'MainSize':row})
    if family in ['Span','Fxly']:
        for sch in f.SCHEDULES:
            for row in [minimum,16,25]:choices.append({**base,'Sch':sch,'MainSize':row})
        for u,mat,ins in itertools.product(['Metric','Imperial'],['Carbon Steel','Stainless Steel'],range(1,10)):
            choices.append({**base,'Units':u,'Material':mat,'InsThkIndex':ins,'FullorEmpty':'Empty'})
    if family=='Fxly':
        for u,ts,temp,length in itertools.product(['Metric','Imperial'],['C','F'],[-80,20,86,176,400],[10,5000]):choices.append({**base,'Units':u,'TempSign':ts,'DesTemp':temp,'Length':length})
    if family=='Gpas':
        for a,d in itertools.product(range(minimum,18),[minimum,7,12]):choices.append({**base,'MainSize':a,'SmallSize':d})
        for cls,cls2,u in itertools.product(CLASSES,CLASSES if n>=3 else ['150#'],['Metric','Imperial']):choices.append({**base,'ASMEClass':cls,'ASMEClass2':cls2,'Units':u})
        for u,i,j in itertools.product(['Metric','Imperial'],range(1,10),range(1,10)):choices.append({**base,'Units':u,'InsThkIndex':i,'InsThk2Index':j})
    if family=='Comp':
        for u,cls,face,small in itertools.product(['Metric','Imperial'],CLASSES,['RF','RTJ'],[4,8,15]):choices.append({**base,'Units':u,'ASMEClass':cls,'Face':face,'SmallSize':small})
    if family=='Psiz':
        for u,mat,flow in itertools.product(['Metric','Imperial'],['Carbon Steel','Stainless Steel'],[-100,0,1,1000,9999]):choices.append({**base,'Units':u,'Material':mat,'Flowrate':flow})
    # Every offered primary table row, in each distinct file/sensor branch.
    # Secondary-class cross-products above are separate from row coverage.
    for u,cls,face,sch in itertools.product(['Metric','Imperial'],CLASSES if family=='Comp' or family=='Gpas' and n>=3 else ['150#'],['RF','RTJ'] if family=='Comp' else ['RF'],f.SCHEDULES if family in ['Span','Fxly'] else ['STD']):
        profile={**base,'Units':u,'ASMEClass':cls,'ASMEClass2':cls,'Face':face,'Sch':sch}
        path=('Flom/'+('FLG_Imperial_' if u=='Imperial' else 'Flg')+cls[:-1]+'.csv') if family=='Comp' else 'Pipe/Pipe'+sch+'.csv'
        _,qty,_=b.bank(path,1,3+(1 if face=='RF' else 2) if family=='Comp' else 3 if family=='Gpas' else 4,minimum,fraction_column=None)
        if family=='Gpas' and n>=3:qty=min(qty,len((b.ROOT/'Database/Flom'/('Flg'+cls[:-1]+'.csv')).read_text().splitlines()))
        for row in range(minimum,min(qty,minimum+43)+1):choices.append({**profile,'MainSize':row})
    choices=list({json.dumps(c,sort_keys=True):c for c in choices}.values());cases=[];geometries={}
    for i,c in enumerate(choices):
        expected=model(route,c);d=expected['view']['drawing'];cmd=d['commands'];start=next((j for j,x in enumerate(cmd) if x['op']=='line'),len(cmd))
        if start<len(cmd):
            lines=cmd[start:];key=b.sha(json.dumps(lines,separators=(',',':')).encode());geometries[key]=lines;d['commands']=cmd[:start];d['geometryRef']=key
        cases.append(dict(id=route+'-'+str(i),culture='en-US',sourceRefs=[b.ref(LINES[route]),f.method(route+'_Headers')[1]],initial=c,actions=[dict(type='select-route',routeId=route)],expected=expected))
    OUT.mkdir(parents=True,exist_ok=True);(OUT/(route+'.json')).write_text(json.dumps(dict(geometries=geometries,cases=cases),separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf-8',newline='\n');print(route,len(cases),sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    for route in ROUTES:generate(route)
