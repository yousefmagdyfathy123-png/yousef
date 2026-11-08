"""Task7 welded-branch references; independent equations, immutable source tables."""
import importlib.util,json,re,sys,math
from pathlib import Path
spec=importlib.util.spec_from_file_location('fittings',Path(__file__).with_name('fittings-reference.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f);b=f.b
CLASSES=['150#','300#','400#','600#','900#','1500#','2500#']
def profile(route):
    body,ref=f.method(route);header,hr=f.method(route+'_Headers')
    get=lambda key:int(re.search(key+r' = (\d+);',body)[1])
    fields=['MainSize','SmallSize']+[{'ASME Class':'ASMEClass','Schedule':'Sch','Rating':'Rating'}[v] for k,v in re.findall(r'Btn([3-4]).ToolTipText = "([^"]+)";',body)]
    disabled={}
    for name,values in [('Schedule',f.SCHEDULES),('Rating',f.RATINGS),('ASMEClass',CLASSES)]:
        key={'Schedule':'Sch'}.get(name,name);disabled[key]=[values[int(i)-1] for i in re.findall(name+r'Enabled\[(\d+)\] = false',body)]
    return dict(minimum=get('MinMainSize'),lower=get('LowerLimit'),fields=fields,disabled=disabled,ref=ref,headerRef=hr,elbow='LoadDataBase3' in body,prefix=re.search(r'DataBaseName2 = "([^"]+)"',body)[1],weight=int(re.search(r'Conversion.Val\(ActiveDba\[2, SmallSize, (\d+)\]\), WeightFactor',header)[1]) if 'ASMEClassIndex' not in header else None,smallBank=2 if '" x " + ActiveDba[2' in header else 1)

def model(route,c,_internal=False):
    p=profile(route);n=int(route[4:]);family=route[:4];u=c.get('Units','Metric');imp=u=='Imperial';lu=c.get('ListUnits','Inches');frac=c.get('Fractionize','No')=='Yes';sch=c.get('Sch','STD');rating=c.get('Rating','3000#');cls=c.get('ASMEClass','300#')
    if family=='Wbol':name=p['prefix']+(sch if n==1 else cls[:-1] if n>=10 else rating[:-1])
    else:name=p['prefix']+(sch if n<=3 else rating[:-1] if n<=9 else '')
    paths=['Pipe/PipeSTD.csv',family+'/'+name+'.csv']+(['Ftbw/90ElbowSTD.csv'] if p['elbow'] else []);banks={};counts=[];hashes=[]
    for i,path in enumerate(paths,1):banks[i],qty,h=b.bank(path,i,3,p['minimum'],fraction_column=None);counts.append(qty);hashes.append(h)
    requested=c.get('MainSize',16);row=min(requested,counts[0]);requestedSmall=c.get('SmallSize',6);small=requestedSmall;files=list(paths)
    if requested>counts[0]:
        inner=model(route,{**c,'MainSize':row},True);banks=inner['_banks'];small=inner['smallSize'];files+=inner['files']
    if route=='Wbol8' and small>counts[1]:
        small=counts[1];inner=model(route,{**c,'MainSize':row,'SmallSize':small},True);banks=inner['_banks'];small=inner['smallSize'];files+=inner['files']
    upper=min(row,counts[1]);small=max(p['lower'],min(upper,small));a=lambda bank,col,r=None:banks[bank].get(row if r is None else r,{}).get(col,'');num=lambda bank,col,r=None:b.val(a(bank,col,r));put=lambda col,value:banks[1].setdefault(row,{}).__setitem__(col,value)
    lc=1 if lu=='Inches' else 2;ls='"' if lu=='Inches' else '';wf=2.20462 if imp else 1;ws='lb' if imp else 'kg';ttl,props=f.title(route)
    controls=[]
    for field in p['fields']:
        i=len(controls)
        if field=='MainSize':text=a(1,lc)+ls;opts=[dict(value=str(r),text=a(1,lc,r)+ls,enabled=True) for r in range(p['minimum'],min(counts[0],p['minimum']+43)+1)]
        elif field=='SmallSize':text=a(2,lc,small)+ls;opts=[dict(value=str(r),text=a(2,lc,r)+ls,enabled=True) for r in range(p['lower'],min(upper,p['lower']+39)+1)]
        else:
            text={'Sch':sch,'Rating':rating,'ASMEClass':cls}[field];opts=[dict(value=t,text=t,enabled=t not in p['disabled'][field]) for t in {'Sch':f.SCHEDULES,'Rating':f.RATINGS,'ASMEClass':CLASSES}[field]]
        controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[p['ref']],showDropDownArrow=False))
    ok=a(1,3) not in ['','N/A'];rows=[]
    if ok:
        size=('DN' if lu=='Millimetres' else '')+a(1,lc)+ls+' x '+a(p['smallBank'],lc,small)+ls+('NPS' if lu=='Inches' else '')
        if family=='Wbol':suffix=' Sch-'+sch if n==1 else ' '+cls+(' Sch-'+sch if n<13 else '') if n>=10 else ' '+rating
        else:suffix=' Sch - '+sch if n<=3 else ' '+rating if n<=9 else ' '+cls
        radius=num(1,3)/2;elbow=num(3,5) if 3 in banks else 0
        curve=math.sqrt((elbow+radius)**2-elbow**2)
        column=p['weight']
        cc={1:3,2:5,4:7,5:9,6:11,7:13}.get(CLASSES.index(cls)+1,max(0,upper-p['lower']+1)+1)
        if family=='Wbpi' and n>=10:column=cc+1
        wt=b.string(b.rnd(num(2,column,small)*wf,2));headers=[size+' '+ttl+suffix,'Weight = '+wt+ws,'','','','',props['ActivitySpecLong']];rows=[dict(id='weight',label='Weight = ',value=wt,unit=ws)]
        st=lambda x:(' ' if x>=0 else '')+b.string(x)
        if family=='Wbol':
            if n==1:put(10,st(radius+num(2,3,small)));put(11,a(2,4,small));put(12,a(2,5,small))
            if n==2:put(10,b.string(b.rnd(num(2,3,small)+curve)));put(9,b.string(num(2,3,small)+curve))
            if n in [3,6,9]:put(10,b.string(b.rnd(math.sqrt(radius**2*2)+num(2,3,small))));put(20,'45*')
            if n in [4,7]:put(7,st(radius+num(2,3,small)));put(10,a(2,4,small));put(11,a(2,5,small))
            if n in [5,8]:put(9,b.string(b.rnd(num(2,3,small)+curve)))
            if n>=10:
                si=f.SCHEDULES.index(sch)+1;offset=0 if (4<=si<=9 if n==10 else 4<=si<=13) else 1 if 12<=si<=13 and n==10 else 2 if si>=17 and n==10 else 1 if si>=17 else max(0,upper-p['lower']+1)+1
                col=3 if n==13 else 3+offset;dim='N/A'
                if a(2,col,small)!='N/A':
                    base=curve-elbow if n==11 else math.sqrt(radius**2*2) if n==12 else radius
                    dim=b.string(b.rnd(base+num(2,col,small)))
                put(10,dim)
                if n==12:put(20,'45*')
        else:
            if n in [1,4,7]:put(9,st(radius+num(2,3,small)));put(10,a(2,4,small))
            if n in [2,5,8]:put(10,b.string(num(2,3,small)+curve))
            if n in [3,6,9]:put(10,b.string(math.sqrt(radius**2*2)+num(2,3,small)))
            if n==10:put(10,st(radius+num(2,cc,small)))
            if n==11:put(10,b.string(num(2,cc,small)+curve-elbow))
            if n==12:put(10,st(math.sqrt(radius**2*2)+num(2,cc,small)))
    else:
        kind='Try another size, class or face type' if family=='Wbol' else 'Try another size or Schedule' if n<=3 else 'Try another size or rating' if n<=8 else 'Try another size or class'
        headers=[props['ActivityTitle'],'Not manufactured with the selected parameters',kind,'','','','']
    draw=f.commands(f'{family}/{route}.dxf',banks,row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[bank,r,col,v] for bank,rr in banks.items() for r,cc in rr.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,smallSize=small,files=files,lineCounts=counts,sourceHashes=hashes,bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,**(dict(_banks=banks) if _internal else {}))

def generate(route):
    p=profile(route);choices=[];n=int(route[4:]);family=route[:4]
    for u in ['Metric','Imperial']:
        variants=[{}]
        if 'ASMEClass' in p['fields']:variants=[dict(ASMEClass=c) for c in CLASSES if c!='400#' or family=='Wbpi']
        if 'Rating' in p['fields']:variants=[dict(Rating=c) for c in ['3000#','6000#']]
        schedules=[s for s in f.SCHEDULES if s not in p['disabled'].get('Sch',[])] if 'Sch' in p['fields'] else ['STD']
        for v in variants:
            for sch in schedules:
                probe=model(route,dict(Units=u,Sch=sch,**v));qty=probe['lineCounts'][0]
                for row in sorted({p['minimum'],16,qty,100}):
                    for small in [p['lower'],100]:choices.append(dict(Units=u,Sch=sch,MainSize=row,SmallSize=small,**v))
        choices.extend(dict(Units=u,ListUnits=l,Fractionize='Yes',MainSize=16,SmallSize=z) for l in ['Inches','Millimetres'] for z in [p['lower'],100])
    cases=[dict(id=route+'-'+str(i),sourceRefs=[p['ref'],p['headerRef']],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(route,c)) for i,c in enumerate(choices)]
    f.write_cases(route,cases)
    print(route,len(cases),'cases',sum(not c['expected']['available'] for c in cases),'unavailable',flush=True)
if __name__=='__main__':
    for route in sys.argv[1:]:generate(route)
