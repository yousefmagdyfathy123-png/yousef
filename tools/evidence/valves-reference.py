"""Independent Task8 source/data model. Never imports or executes product code.

Reuses the accepted analyst's lexical/VB/drawing model; recipes are reviewed
against pinned Module1 methods. Expected geometry is literal, losslessly factored.
"""
import importlib.util,json,re,sys,itertools,functools
from pathlib import Path
spec=importlib.util.spec_from_file_location('f',Path(__file__).with_name('fittings-reference.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f);b=f.b
f.method=functools.cache(f.method)
f.title=functools.cache(f.title)
FAMILIES={'Vlfl':8,'Vlbw':4,'Vlsc':5,'Vlsw':5,'Srra':4,'Srrb':3,'Srrc':1,'Srrd':1,'Srre':1,'Blnu':4,'Nuts':2}
CLASSES=['150#','300#','400#','600#','900#','1500#','2500#']
OUT=b.APP/'tests/reference/valves-strainers-fasteners'

@functools.cache
def profile(route):
    body,ref=f.method(route)
    header=route+('Headers' if route[:4] in ['Vlfl','Vlbw'] else '_Headers')
    head,href=f.method(header)
    number=lambda k:int(re.search(k+r' = (\d+);',body)[1])
    names=re.findall(r'DataBaseName1 = (.*?);',body)
    cols=re.findall(r'ActiveDba\[1, MainSize, (\d+)\].{0,30}WeightFactor',head)
    return dict(id=route,line=ref['line'],header=header,minimum=number('MinMainSize'),qty=number('TabbQty'),
      folder=re.search(r'DataFolder1 = "([^"]+)"',body)[1],sensor=re.search(r'Sensor1 = (.*?);',body)[1],
      subtab=re.search(r'SubTab = "([^"]+)"',body)[1],names=names,
      weights=list(dict.fromkeys(map(int,cols))),disabled=[CLASSES[int(x)-1] for x in re.findall(r'ASMEClassEnabled\[(\d+)\] = false',body)],
      fields=['MainSize']+[{'ASME Class':'ASMEClass','Face Type':'Face','Valve Class':'ValveClass','Actuator':'Actuator'}[x] for x in re.findall(r'Btn[23].ToolTipText = "([^"]+)"',body)],
      chk=re.search(r'ChkType = "([^"]+)"',body)[1],error=re.search(r'(ErrorMessage\w+)\(\);',body)[1],
      label1=re.search(r'Label1.Text = (.*?);',head)[1],head=head)

def effective(route,c):
    c={'Units':'Metric','ListUnits':'Inches','ASMEClass':'150#' if route.startswith('Srr') else '300#','Face':'RF','ValveClass':'800#','MainSize':16,'Actuator':'Lever',**c}
    if route in ['Vlfl7','Vlfl8'] and c['ASMEClass'] in ['900#','1500#','2500#']:c['ASMEClass']='600#'
    if route=='Srra2' and c['ASMEClass']=='600#':c['ASMEClass']='300#'
    if route=='Srrb2' and c['ASMEClass']=='300#':c['ASMEClass']='150#'
    return c

def filename(p,c):
    names=p['names'];i=0 if c['Units']=='Imperial' else len(names)//2
    if p['id'].startswith('Nuts'):i=0
    if p['id'] in ['Blnu1','Blnu2'] and c['Face']=='RTJ':i+=1
    expr=names[i]
    expr=re.sub(r'Strings.Trim\(Conversion.Str\(ASMEClassIndex\)\)',json.dumps(str(CLASSES.index(c['ASMEClass'])+1)),expr)
    expr=re.sub(r'Strings.Mid\((ASMEClass|ValveClass), 1, Strings.Len\(\1\) - 1\)',lambda m:json.dumps(c[m[1]][:-1]),expr)
    assert re.fullmatch(r'"[^"]*"(?: \+ "[^"]*")*',expr),expr
    return p['folder']+'/'+''.join(re.findall(r'"([^"]*)"',expr))+'.csv'

def template(route,c,row):
    n=int(route[4:]);family=route[:4];face=c['Face'];cls=c['ASMEClass'];tab=route
    if family in ['Vlfl','Vlbw'] and n<=3:
        threshold=({'150#':19,'300#':15,'600#':15,'900#':14,'1500#':14,'2500#':13} if n<3 else {'150#':14,'300#':13,'600#':13,'900#':12,'1500#':11,'2500#':10}).get(cls,0)
        if family=='Vlfl':
            if face=='RTJ':tab=route+('a' if n==1 else 'b') if row<threshold else route+'c'
            elif row>=threshold:tab=route+('b' if n==1 else 'a')
        elif row>=threshold and (n==3 or face=='RF'):tab=route+'a'
    if family=='Vlfl' and n in [5,6] and face=='RTJ':tab=route+'a'
    if family=='Vlfl' and n in [7,8] and c['Actuator']=='Handwheel':tab=route+'a'
    if route in ['Blnu1','Blnu2'] and face=='RTJ':tab=route+'a'
    return tab[:4]+'/'+tab+'.dxf'

def model(route,initial):
    p=profile(route);c=effective(route,initial);u=c['Units'];imp=u=='Imperial';frac=c.get('Fractionize')=='Yes';lu=c['ListUnits'];lc=1 if lu=='Inches' else 2
    sign='"' if imp else '';ls='"' if lc==1 else '';wf=(2.2 if route.startswith('Nuts') else 2.20462) if imp else 1;ws='lb' if imp else 'kg'
    path=filename(p,c);sensor=2+(1 if c['Face']=='RF' else 2) if p['sensor']=='2 + FaceIndex' else int(p['sensor'])
    cells,qty,h=b.bank(path,1,sensor,p['minimum'],fraction_column=None);row=min(c['MainSize'],qty);a=lambda col,r=None:cells.get(row if r is None else r,{}).get(col,'')
    if route=='Srrb3':
        _,props=f.title('Srrb2');ttl=c['Title'] # GetTitle only enumerates two tabs.
    else:ttl,props=f.title(route)
    dn='' if lc==1 else 'DN';nps='NPS' if lc==1 else '';size=dn+a(lc)+ls+nps
    ref=b.ref(p['line'])
    controls=[]
    opts={'ASMEClass':CLASSES,'Face':['RF','RTJ'],'ValveClass':['800#','1500#'],'Actuator':['Lever','Handwheel']}
    for i,field in enumerate(p['fields']):
        if field=='MainSize':
            suffix='' if route=='Nuts1' else ls
            options=[dict(value=str(r),text=a(lc,r)+suffix,enabled=True) for r in range(p['minimum'],min(qty,p['minimum']+43)+1)];text=a(lc)+suffix
        else:options=[dict(value=x,text=x,enabled=x not in p['disabled'] if field=='ASMEClass' else True) for x in opts[field]];text=c[field]
        controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=350+80*i,y=56,width=80,height=33),sourceRefs=[ref],showDropDownArrow=False))
    ok=a(sensor) not in ['','N/A'];headers=['']*7;rows=[]
    if ok:
        expr=p['label1'];headers[0]=size+' '+ttl
        if route.startswith('Nuts'):headers[0]=a(lc)+('" ' if route=='Nuts2' else ' ')+ttl
        elif route=='Srra4':headers[0]=dn+a(1)+ls+nps+' '+ttl
        else:
            if '+ ASMEClass' in expr:headers[0]+=' '+c['ASMEClass']
            if '+ ValveClass' in expr:headers[0]+=' '+c['ValveClass']
            if '+ Face' in expr:headers[0]+=' '+c['Face']
        for k,col in enumerate(p['weights']):
            wt=b.string(b.rnd(b.val(a(col))*wf*(.01 if route.startswith('Nuts') else 1),2))
            if route in ['Vlfl3','Vlbw3'] and a(col)=='N/A':wt='N/A '
            label=('Valve Weight = ' if route.startswith('Vlfl') and route!='Vlfl3' else 'Paddle Blank Weight = ' if route in ['Blnu2','Blnu4'] and k==0 else 'Paddle Spacer Weight = ' if route in ['Blnu2','Blnu4'] else 'Weight Long Option = ' if k==1 else 'Weight = ')
            space=' ' if route in ['Srrc1','Srrd1'] else ''
            headers[k+1]=label+wt+space+ws;rows.append(dict(id='weight' if k==0 else 'weight-long' if route.startswith('Srr') else 'spacer-weight',label=label,value=wt,unit=ws))
        for label in [4,5,6,7]:
            matches=re.findall(r'Label'+str(label)+r'.Text = ("(?:[^"\\]|\\.)*");',p['head'])
            if matches:headers[label-1]=json.loads(matches[-1])
        if 'Label7.Text = ActivitySpecLong' in p['head']:headers[6]=props['ActivitySpecLong']
        if route=='Vlfl4':cells[row][13]=a(2+(1 if c['Face']=='RF' else 2))
        if route in ['Vlfl7','Vlfl8']:
            prefix='Stud Bolts: ' if route=='Vlfl7' else 'Bolts: '
            headers[5]=prefix+a(11)+'qty x '+a(17)+'  (or '+a(12)+'" UNC)'
            if route=='Vlfl7':headers[5]+='  x '+b.string(b.rnd(b.val(a(18)),2))+sign+' Long'
        if route.startswith('Blnu'):
            if route in ['Blnu1','Blnu2']:
                rf=c['Face']=='RF';prefix='StudBolt Size RF: ' if rf else 'StudBolt Size: '
                bolt=a(17)+'" UNC  (or M'+a(18)+')  x '
                headers[5]=prefix+bolt+a(24 if rf else 22)+sign+' Long'
                headers[4]='Studbolt Size FF: '+bolt+a(23)+sign+' Long' if rf else ''
                if route=='Blnu2':
                    # Clicker reentry clamps the row, runs inner headers, then
                    # returns to the outer header continuation without reload.
                    cells[row][10]=a(10)+(sign+' Indicator Hole')*(2 if c['MainSize']>qty else 1)
            else:headers[5]='StudBolt Size: '+a(16)+'" UNC  (or M'+a(17)+')  x '+a(20)+sign+' Long'
        if route=='Srra1':cells[row][10]=a(6)+'" NPT Drain'
        if route=='Srrd1':cells[row][14]=dn+a(lc,12)+ls+nps
    else:
        hint={'ErrorMessageSizeClassFaceType':'Try another size, class or face type','ErrorMessageSizeClass':'Try another size or class','ErrorMessageSizeValveClass':'Try another size or Valve Class'}.get(p['error'])
        if hint:headers=[props['ActivityTitle'],'Not manufactured with the selected parameters',hint,'','','','']
    drawing=b.commands(template(route,c,row),{1:cells},row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    if imp and route.startswith('Nuts') and ok:
        texts=iter(x for x in drawing if x['op']=='text')
        for rec in b.DRAWINGS_BY_PATH.get(('Database/'+template(route,c,row)).lower(),[]):
            if rec['marker_index'] is None:continue
            cmd=next(texts)
            if rec['internal_color']!=1:continue
            raw=a(rec['marker_index'])
            if raw in ['N/A','SPA']:continue
            txt=b.string(b.rnd(b.val(b.string(b.rnd(b.val(raw),2)))/25.4,2));cmd['text']=(b.fraction(txt) if frac else txt)+sign
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=drawing),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,r,col,v] for r,cc in cells.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,files=[path]*(2 if c['MainSize']>qty else 1),lineCounts=[qty],available=ok,template=template(route,c,row),sourceHashes=[h],bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()))

def generate(route):
    p=profile(route);choices=[]
    ratings=CLASSES if 'ASMEClass' in p['fields'] else ['150#' if route.startswith('Srr') else '300#']
    for u,cls,face,vc in itertools.product(['Metric','Imperial'],ratings,['RF','RTJ'] if 'Face' in p['fields'] or route.startswith('Vlfl') else ['RF'],['800#','1500#'] if 'ValveClass' in p['fields'] else ['800#']):
        c=effective(route,dict(Units=u,ASMEClass=cls,Face=face,ValveClass=vc))
        if route=='Srrb3':c['Title']='Weldneck Flange'
        if not (b.ROOT/'Database'/filename(p,c)).exists():continue
        sensor=2+(1 if face=='RF' else 2) if p['sensor']=='2 + FaceIndex' else int(p['sensor'])
        _,qty,_=b.bank(filename(p,c),1,sensor,p['minimum'],fraction_column=None)
        for row in range(p['minimum'],min(qty,p['minimum']+43)+1):choices.append({**c,'MainSize':row})
        for row,lu,frac,act in itertools.product([p['minimum'],qty,100],['Inches','Millimetres'],['No','Yes'],['Lever','Handwheel'] if 'Actuator' in p['fields'] else ['Lever']):choices.append({**c,'MainSize':row,'ListUnits':lu,'Fractionize':frac,'Actuator':act})
    if route in ['Vlbw1','Vlbw2']:
        # Hidden persisted Face affects GetSubTab although no Face button exists.
        for u,cls in itertools.product(['Metric','Imperial'],CLASSES):
            c=effective(route,dict(Units=u,ASMEClass=cls,Face='RTJ'))
            if not (b.ROOT/'Database'/filename(p,c)).exists():continue
            _,qty,_=b.bank(filename(p,c),1,int(p['sensor']),p['minimum'],fraction_column=None)
            threshold={'150#':19,'300#':15,'600#':15,'900#':14,'1500#':14,'2500#':13}.get(cls,p['minimum'])
            for row in sorted({p['minimum'],qty,100}|{r for r in [threshold-1,threshold] if p['minimum']<=r<=qty}):choices.append({**c,'MainSize':row})
            for lu,frac in itertools.product(['Inches','Millimetres'],['No','Yes']):choices.append({**c,'MainSize':qty,'ListUnits':lu,'Fractionize':frac})
    choices=list({json.dumps(c,sort_keys=True):c for c in choices}.values());cases=[]
    for i,c in enumerate(choices):cases.append(dict(id=route+'-'+str(i),sourceRefs=[b.ref(p['line']),f.method(p['header'])[1]],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(route,c)))
    # Same lossless literal-geometry factoring as the accepted Task7 references.
    geometries={}
    for c in cases:
        d=c['expected']['view']['drawing'];cmd=d['commands'];start=next((i for i,x in enumerate(cmd) if x['op']=='line'),len(cmd))
        if start==len(cmd):continue
        lines=cmd[start:];key=b.sha(json.dumps(lines,separators=(',',':')).encode());geometries[key]=lines;d['commands']=cmd[:start];d['geometryRef']=key
    OUT.mkdir(parents=True,exist_ok=True);(OUT/(route+'.json')).write_text(json.dumps(dict(geometries=geometries,cases=cases),separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(route,len(cases),sum(not c['expected']['available'] for c in cases),'unavailable')

if __name__=='__main__':
    for family,count in FAMILIES.items():
        for n in range(1,count+1):
            route=family+str(n)
            if len(sys.argv)==1 or route in sys.argv[1:]:generate(route)
