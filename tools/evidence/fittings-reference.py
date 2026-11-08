"""Independent Task7 analyst model. Reads immutable source/data, never product TS.

The shared Task6 analyst supplies verified VB formatting, bank lexical semantics
and drawing records. Route equations, controls and mutations are modeled here.
"""
import importlib.util,json,re,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
SOURCE=b.SOURCE.read_text(encoding='utf-8-sig')
SCHEDULES=['5s','5','10s','10','20','30','40s','STD','40','60','80s','XS','80','100','120','140','160','XXS']
BW=['45Elbow','90Elbow','Return','90ShortRadiusElbow','ShortRadiusReturn','StraightTee','ReducingTee','Cap','Reducers','Reducers','StubEnd']
BW_MIN=[3,5,5,5,5,5,5,5,6,6,5];BW_SENSOR=[6,6,7,6,7,6,3,9,3,3,3]

def write_cases(route,cases):
    """Lossless fixture factoring: labels precede immutable geometry in paint order.

    Literal lines remain independently generated expected data. No product
    parser/renderer or numeric formatting is used to hydrate the JSON fixtures.
    """
    geometries={}
    for c in cases:
        draw=c['expected']['view']['drawing'];commands=draw['commands']
        first=next((i for i,x in enumerate(commands) if x['op']=='line'),len(commands))
        if first==len(commands):continue
        lines=commands[first:];assert all(x['op']=='line' for x in lines)
        def canonical(x):
            if isinstance(x,float) and x.is_integer():return int(x)
            if isinstance(x,list):return [canonical(v) for v in x]
            if isinstance(x,dict):return {k:canonical(v) for k,v in x.items()}
            return x
        key=b.sha(json.dumps(canonical(lines),separators=(',',':')).encode());geometries[key]=lines
        draw['commands']=commands[:first];draw['geometryRef']=key
    out=b.APP/'tests/reference/fittings-pipe-branches';out.mkdir(exist_ok=True,parents=True)
    (out/(route+'.json')).write_text(json.dumps(dict(geometries=geometries,cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')

def commands(template,banks,row,u,frac,route):
    result=b.commands(template,banks,row,u,frac,route)
    convert=route.startswith(('Wbol','Wbpi')) or (route.startswith('Ftsw') and 7<int(route[4:])<14)
    if u!='Imperial' or not convert:return result
    texts=iter(x for x in result if x['op']=='text')
    for rec in b.DRAWINGS_BY_PATH.get(('Database/'+template).lower(),[]):
        if rec['marker_index'] is None:continue
        cmd=next(texts)
        if rec['internal_color']!=1:continue
        raw=banks[1].get(row,{}).get(rec['marker_index'],'')
        if raw in ['N/A','SPA']:continue
        text=b.string(b.rnd(b.val(b.string(b.rnd(b.val(raw),2)))/25.4,2))
        if frac:text=b.fraction(text)
        cmd['text']=text+'"'
    return result

def method(name):
    m=re.search(r'public static void '+name+r'\(\).*?(?=\n\tpublic static |\Z)',SOURCE,re.S)
    assert m,name
    return m[0],b.ref(SOURCE.count('\n',0,m.start())+1)

def title(route):
    # Derive title strings from the pinned GetTitle method, not product title-data.
    text,_=method('GetTitle')
    family=route[:4]
    start=text.index('"'+family+'"');part=text[start:]
    end=part.find('\n\t\tif (',10)
    # Family block includes nested route tests; use braces to find its end.
    brace=part.index('{');depth=1;i=brace+1
    while depth:
        if part[i]=='{':depth+=1
        if part[i]=='}':depth-=1
        i+=1
    part=part[:i]
    props={}
    for key,expr in re.findall(r'(ActivitySpec|ActivityTitle|ActivitySpecLong) = (.*?);',part):
        props[key]=''.join(json.loads(x) if x.startswith('"') else props[x] for x in re.findall(r'"(?:[^"\\]|\\.)*"|ActivitySpec',expr))
    tabs=dict(re.findall(r'TabArray\[(\d+)\] = "([^";]+)";',part))
    idx=next(k for k,v in tabs.items() if v==route)
    m=re.search(r'TitleArray\['+idx+r'\] = ("(?:[^"\\]|\\.)*");',part)
    assert m,route
    return json.loads(m[1]),props

def model(route,c,_internal=False):
    if route.startswith(('Ftsc','Ftsw')):return forged_model(route,c,_internal)
    n=int(route[4:]);family=route[:4];u=c.get('Units','Metric');imp=u=='Imperial';lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes'
    sch=c.get('Sch','STD');sch=sch if route!='Ftbw11' or sch in ['5s','10s','40s'] else '10s'
    minimum=2 if family=='Pipe' else BW_MIN[n-1];sensor=4 if family=='Pipe' else BW_SENSOR[n-1]
    path=('Pipe/Pipe' if family=='Pipe' else 'Ftbw/'+BW[n-1])+('_Imperial_' if imp else '')+sch+'.csv'
    cells,qty,h=b.bank(path,1,sensor,minimum,fraction_column=None);banks={1:cells};counts=[qty];paths=[path];hashes=[h]
    if family=='Ftbw' and n in [8,10,11]:
        path2='Pipe/Pipe'+('_Imperial_' if imp else '')+sch+'.csv';banks[2],q,h=b.bank(path2,2,fraction_column=None);counts.append(q);paths.append(path2);hashes.append(h)
    requested=c.get('MainSize',16);row=min(requested,qty);small=c.get('SmallSize',14)
    if requested>qty:
        inner=model(route,{**c,'MainSize':qty},True);banks=inner['_banks'];cells=banks[1]
        if inner['smallSize'] is not None:small=inner['smallSize']
        c={**c,'LowerLimit':inner.get('_lower',0)}
    a=lambda col,bank=1,r=None:banks.get(bank,{}).get(row if r is None else r,{}).get(col,'')
    reducing=family=='Ftbw' and n in [7,9,10];lower=c.get('LowerLimit',0);upper=row-1
    if reducing:
        for col in range(4,39):
            if a(col)!='0' and a(col-1) in ['0','1' if imp else '25']:lower=col-2;break
        small=max(lower,min(upper,small))
    sign='"' if imp else '';ls='"' if lu=='Inches' else '';lc=1 if lu=='Inches' else 2;wf=2.20462 if imp else 1;ws=('lb/ft' if imp else 'kg/m') if family=='Pipe' else ('lb' if imp else 'kg')
    _,ref=method(route);ttl,props=title(route)
    def control(field,text,options,i):return dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[ref],showDropDownArrow=False)
    sizes=[dict(value=str(r),text=a(lc,r=r)+ls,enabled=True) for r in range(minimum,min(qty,minimum+43)+1)]
    controls=[control('MainSize',a(lc)+ls,sizes,0)]
    if reducing:controls.append(control('SmallSize',a(lc,r=small)+ls,[dict(value=str(r),text=a(lc,r=r)+ls,enabled=True) for r in range(lower,min(upper,lower+39)+1)],1))
    enabled=lambda s: family=='Pipe' or (s in ['5s','10s','40s'] if n==11 else s!='5')
    controls.append(control('Sch',sch,[dict(value=s,text=s,enabled=enabled(s)) for s in SCHEDULES],len(controls)))
    ok=a(sensor) not in ['','N/A'];rows=[];headers=['']*7
    if ok:
        # Source Clicker reentry returns to the outer header continuation.
        for _ in range(1):
            size=('DN' if lu=='Millimetres' else '')+a(lc)+ls+(' x '+a(lc,r=small)+ls if reducing else '')+('NPS' if lu=='Inches' else '')
            headers=[size+('  Sch-'+sch+' '+ttl if family=='Pipe' else ' '+ttl+'  Sch-'+sch),'','','','','',props['ActivitySpecLong']]
            if family=='Pipe':
                headers[1]='Weight =  '+a(7)+' '+ws;headers[2]='Weight full with water =  '+a(8)+' '+ws
                cells[row][5]=b.string(b.rnd(b.val(a(5)),4 if imp else 2))
            else:
                col=[6,6,7,6,7,6,small+41,9,small+41,small+41,12][n-1];raw=a(col)
                wt='N/A' if n==7 and raw=='N/A' else b.string(b.rnd(b.val(raw)*wf,2))
                headers[1]='Weight =  '+wt+' '+ws;rows=[dict(id='weight',label='Weight =  ',value=wt,unit=ws)]
                if n==7:cells[row][39]=a(small+2)
                if n==8:cells[row][4]=a(8) if a(7)!='N/A' and a(4,2)!='N/A' and b.val(a(7))<b.val(a(4,2)) else a(5)
                if n==9:cells[row].update({5:a(small+2),39:a(4,2),44:a(4,2,small)})
                if n==10:cells[row].update({39:a(small+2),5:b.string(b.rnd((b.val(a(3,2))-b.val(a(3,2,small)))/2,2))})
                if n==11:
                    headers[1]='Weight Long Pattern = '+wt+ws;headers[2]='Weight Short Pattern = '+b.string(b.rnd(b.val(a(11))*wf,2))+ws;rows=[]
    else:headers=[props['ActivityTitle'],'Not manufactured with the selected parameters','Try another size or Schedule','','','','']
    drawing=commands(f'{family}/{route}.dxf',banks,row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=drawing),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[bank,r,col,v] for bank,rr in banks.items() for r,cc in rr.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,smallSize=small if reducing else None,files=paths*(2 if requested>qty else 1),lineCounts=counts,sourceHashes=hashes,bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,**(dict(_banks=banks,_lower=lower) if _internal else {}))

def generate(route):
    if route.startswith(('Ftsc','Ftsw')):return generate_forged(route)
    choices=[]
    for u in ['Metric','Imperial']:
        for sch in (['STD','10','XXS'] if route!='Ftbw11' else ['5s','10s','40s']):
            probe=model(route,dict(Units=u,Sch=sch));minimum=2 if route=='Pipe1' else BW_MIN[int(route[4:])-1];qty=probe['lineCounts'][0]
            for row in range(minimum,min(qty,minimum+43)+1):choices.append(dict(Units=u,Sch=sch,MainSize=row))
        choices.extend(dict(Units=u,MainSize=r,Fractionize='Yes',ListUnits=l,SmallSize=z) for r in [minimum,16,100] for l in ['Inches','Millimetres'] for z in [0,100])
    # Exercise each distinct source filename, both independent unit tables,
    # boundaries, and every offered sensor-unavailable row in that table.
    for u in ['Metric','Imperial']:
        for sch in SCHEDULES:
            if route.startswith('Ftbw') and (sch=='5' or (route=='Ftbw11' and sch not in ['5s','10s','40s'])):continue
            minimum=2 if route=='Pipe1' else BW_MIN[int(route[4:])-1]
            prefix='Pipe/Pipe' if route=='Pipe1' else 'Ftbw/'+BW[int(route[4:])-1]
            cells,qty,_=b.bank(prefix+('_Imperial_' if u=='Imperial' else '')+sch+'.csv',1,4 if route=='Pipe1' else BW_SENSOR[int(route[4:])-1],minimum,fraction_column=None)
            sensor=4 if route=='Pipe1' else BW_SENSOR[int(route[4:])-1]
            for row in sorted({minimum,qty}|{r for r in range(minimum,min(qty,minimum+43)+1) if cells[r].get(sensor,'') in ['','N/A']}):choices.append(dict(Units=u,Sch=sch,MainSize=row))
    choices=list({json.dumps(c,sort_keys=True):c for c in choices}.values())
    cases=[dict(id=route+'-'+str(i),sourceRefs=[method(route)[1],method(route+'_Headers')[1]],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(route,c)) for i,c in enumerate(choices)]
    write_cases(route,cases)
    print(route,len(cases),'cases',sum(not c['expected']['available'] for c in cases),'unavailable')
RATINGS=['2000#','3000#','6000#','9000#']
def forged_profile(route):
    body,ref=method(route);head,hr=method(route+'_Headers')
    num=lambda key:int(re.search(key+r' = (\d+);',body)[1])
    prefix=re.search(r'DataBaseName1 = "([^"]+)"',body)[1]
    weight=re.search(r'Conversion.Val\(ActiveDba\[1, MainSize, (\d+)\]\), WeightFactor',head)
    return dict(minimum=num('MinMainSize'),sensor=num('Sensor1'),prefix=prefix,weight=int(weight[1]) if weight else None,disabled=[int(x) for x in re.findall(r'RatingEnabled\[(\d+)\] = false',body)],reducing='"Small Size"' in body,ref=ref,headerRef=hr)

def forged_model(route,c,_internal=False):
    p=forged_profile(route);family=route[:4];n=int(route[4:]);u=c.get('Units','Metric');imp=u=='Imperial';lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';rating=c.get('Rating','3000#')
    if family=='Ftsc':
        if n!=25 and rating=='9000#':rating='6000#'
        if n>=5 and n!=25 and rating=='2000#':rating='3000#'
        if n in [14,19,20,21,22]:rating='3000#'
    if route=='Ftsw10':rating='3000#'
    if family=='Ftsc':
        filename=p['prefix']+rating[:-1]+('_Inches' if imp else '_Millimetres') if n<=13 else ('Ftsc'+str(19 if n in [20,21,22] else n)+rating[:-3]+('_Inches' if imp else '_Millimetres') if n!=25 else 'Ftsc25'+('_Inches' if imp else '_Millimetres'))
    else:filename=p['prefix']+rating[:-1]+('_Inches' if imp else '_Millimetres') if n<=7 or n==14 else p['prefix']+rating[:-3]
    path=family+'/'+filename+'.csv';cells,qty,h=b.bank(path,1,p['sensor'],p['minimum'],fraction_column=None);requested=c.get('MainSize',11);row=min(requested,qty);small=c.get('SmallSize',10)
    if requested>qty:
        inner=forged_model(route,{**c,'MainSize':qty},True);cells=inner['_banks'][1]
        if inner['smallSize'] is not None:small=inner['smallSize']
        c={**c,'LowerLimit':inner.get('_lower',0)}
    a=lambda col,r=None:cells.get(row if r is None else r,{}).get(col,'');lower=c.get('LowerLimit',0);upper=row-1
    if p['reducing']:
        for col in range(4,39):
            if a(col)!='0' and a(col-1) in ['0','1' if imp else '25']:lower=col-2;break
        overrides={'Ftsc14':(16,17),'Ftsc15':(19,None),'Ftsc16':(6,7),'Ftsw8':(7,8),'Ftsw10':(5,6),'Ftsw11':(4,5),'Ftsw12':(35,36)}
        lo,hi=overrides[route];lower=int(b.rnd(b.val(a(lo))));upper=int(b.rnd(b.val(a(hi)))) if hi else upper
        small=max(lower,min(upper,small))
    sign='"' if imp else '';ls='"' if lu=='Inches' else '';lc=1 if lu=='Inches' else 2;wf=2.20462 if imp else 1;ws='lb' if imp else 'kg';ttl,props=title(route)
    def control(field,text,options,i):return dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[p['ref']],showDropDownArrow=False)
    sizes=[dict(value=str(r),text=a(lc,r)+ls,enabled=True) for r in range(p['minimum'],min(qty,p['minimum']+43)+1)];controls=[control('MainSize',a(lc)+ls,sizes,0)]
    if p['reducing']:controls.append(control('SmallSize',a(lc,small)+ls,[dict(value=str(r),text=a(lc,r)+ls,enabled=True) for r in range(lower,min(upper,lower+39)+1)],1))
    controls.append(control('Rating',rating,[dict(value=t,text=t,enabled=i+1 not in p['disabled']) for i,t in enumerate(RATINGS)],len(controls)))
    ok=a(p['sensor']) not in ['','N/A'];rows=[]
    if ok:
        for _ in range(1):
            other=a(lc,small)
            offsets={'Ftsc14':1,'Ftsc15':2,'Ftsw10':4,'Ftsw11':4,'Ftsw12':2}
            if route in offsets:
                other=a(small+offsets[route],2)
                conv={'0+1/8':'0.125','0+1/4':'0.25','0+3/8':'0.375','0+1/2':'0.5','0+3/4':'0.75','1+1/2':'1.5'}
                if family=='Ftsw':conv['2+1/2']='2.5'
                other=conv.get(other,other)
            size=('DN' if lu=='Millimetres' else '')+a(lc)+ls+(' x '+other+ls if p['reducing'] else '')+('NPS' if lu=='Inches' else '')
            headers=[size+' '+ttl+' '+rating,'','','','','',props['ActivitySpecLong'] if (family=='Ftsc' and (n<14 or n==25)) or (family=='Ftsw' and (n<8 or n==14)) else 'ASME Unadopted']
            if p['weight']:
                wt=b.string(b.rnd(b.val(a(p['weight']))*wf,2));headers[1]='Weight =  '+wt+' '+ws;rows=[dict(id='weight',label='Weight =  ',value=wt,unit=ws)]
            if route=='Ftsc14':cells[row][15]=a(small+1)
            if route=='Ftsc15':
                z=b.val(a(4))+b.val(a(12));cells[row].update({14:a(small+2,3),15:a(small+2),16:(' ' if z+b.val(a(small+2))>=0 else '')+b.string(z+b.val(a(small+2))),17:'Across Flats'})
            if route=='Ftsc17':cells[row][9]='Across Flats'
            if route=='Ftsc25':cells[row].update({7:'Thread Engagement',8:'Internal Thread',9:'External Thread'})
            for dest,src,r in {'Ftsw8':[(10,small+8,4),(11,small+8,5),(12,small+8,6)],'Ftsw10':[(7,small+4,row),(8,small+12,row),(9,small+20,row)],'Ftsw11':[(15,small+4,row),(16,small+14,row)],'Ftsw12':[(37,small+2,row),(38,small+12,row),(39,small+22,row)]}.get(route,[]):cells[row][dest]=a(src,r)
    else:headers=[props['ActivityTitle'],'Not manufactured with the selected parameters','Try another size or rating','','','','']
    # Ftsw8-13 store metric dimensions for both display unit choices.
    drawing=commands(f'{family}/{route}.dxf',{1:cells},row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=drawing),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,r,col,v] for r,cc in cells.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,smallSize=small if p['reducing'] else None,files=[path]*(2 if requested>qty else 1),lineCounts=[qty],sourceHashes=[h],bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,**(dict(_banks={1:cells},_lower=lower) if _internal else {}))

def generate_forged(route):
    p=forged_profile(route);choices=[]
    for u in ['Metric','Imperial']:
        for i,rating in enumerate(RATINGS,1):
            if i in p['disabled']:continue
            probe=forged_model(route,dict(Units=u,Rating=rating));qty=probe['lineCounts'][0]
            for row in range(p['minimum'],min(qty,p['minimum']+43)+1):choices.append(dict(Units=u,Rating=rating,MainSize=row))
        choices.extend(dict(Units=u,MainSize=r,Fractionize=f,ListUnits=l,SmallSize=z) for r in [p['minimum'],11,100] for l in ['Inches','Millimetres'] for f in ['No','Yes'] for z in ([0,100] if p['reducing'] else [10]))
    cases=[dict(id=route+'-'+str(i),sourceRefs=[p['ref'],p['headerRef']],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=forged_model(route,c)) for i,c in enumerate(choices)]
    write_cases(route,cases)
    print(route,len(cases),'cases',sum(not c['expected']['available'] for c in cases),'unavailable',flush=True)

if __name__=='__main__':
    for route in sys.argv[1:]:generate(route)
