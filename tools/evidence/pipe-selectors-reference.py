"""Independent Piwt/Fswa lexical selector and header model."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('fittings',Path(__file__).with_name('fittings-reference.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f);b=f.b
def model(route,c,_internal=False):
    piwt=route=='Piwt1';n=int(route[4:]);u=c.get('Units','Metric');imp=u=='Imperial';lu=c.get('ListUnits','Inches');lc=1 if lu=='Inches' else 2;ls='"' if lc==1 else '';sign='"' if imp else '';frac=c.get('Fractionize','No')=='Yes';minimum=4 if piwt else 3
    path='Piwt/Piwt1_CarbonSteel_'+('Imperial' if imp else 'Metric')+'.csv' if piwt else 'Fswa/Fswa'+('2' if n==3 else '1')+'_'+('USCust' if imp else 'Metric')+'.csv'
    cells,qty,h=b.bank(path,1,4 if piwt else 3,minimum,fraction_column=None);requested=c.get('MainSize',16);row=min(requested,qty);bore=c.get('PipeNominalBore','6') if piwt else c.get('PipeNominalBore2','2');wall=c.get('PipeWallThk','7.11');reduced=c.get('PipeReducedSize','1');sch=c.get('Sch','STD');paths=[path];wf=2.20462 if imp else 1;ws=('lb/ft' if imp else 'kg/m') if piwt else ('lb' if imp else 'kg')
    a=lambda col,r=None:cells.get(row if r is None else r,{}).get(col,'');put=lambda col,v:cells.setdefault(row,{}).__setitem__(col,v)
    if requested>qty:
        inner=model(route,{**c,'MainSize':qty},True);cells=inner['_banks'][1];paths+=inner['files'];wall=inner.get('_wall',wall);reduced=inner.get('_reduced',reduced)
    opts=[]
    if piwt or n<3:
        # These selector helpers reload bank1 after recursive header continuation.
        cells,qty,h=b.bank(path,1,4 if piwt else 3,minimum,fraction_column=None);paths.append(path)
        if piwt:
            opts=[(a(4,r),a(6,r),a(7,r)) for r in range(1,qty+1) if a(lc,r)==bore]
            if wall not in [v[0] for v in opts]:wall=opts[round(len(opts)/2)-1][0] if opts and round(len(opts)/2)>0 else ''
        else:
            opts=[a(lc+2,r) for r in range(1,qty+1) if a(lc,r)==bore]
            if reduced not in opts:reduced=opts[-1] if opts else ''
    _,ref=f.method(route);ttl,props=f.title(route)
    def ctl(field,text,options,i):return dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=options,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[ref],showDropDownArrow=False)
    if piwt or n<3:
        nominal=[a(lc,r) for r in range(minimum,qty+1) if a(lc,r)!=a(lc,r+1)][:44]
        controls=[ctl('PipeNominalBore' if piwt else 'PipeNominalBore2',bore+ls,[dict(value=v,text=v+ls,enabled=True) for v in nominal],0)]
        if piwt:
            controls.append(ctl('PipeWallThk',wall+sign,[dict(value=v,text=v+sign+' '+('Sch-'+x if x else '')+(', ' if x and y else '')+('Sch-'+y if y else ''),enabled=True) for v,x,y in opts[:40]],1))
        else:controls.append(ctl('PipeReducedSize',reduced+ls,[dict(value=v,text=v+ls,enabled=True) for v in opts[:19]],1))
    else:controls=[ctl('MainSize',a(lc)+ls,[dict(value=str(r),text=a(lc,r)+ls,enabled=True) for r in range(minimum,min(qty,minimum+43)+1)],0)]
    if not piwt:controls.append(ctl('Sch',sch,[dict(value=s,text=s,enabled=s in ['STD','XS','160','XXS']) for s in f.SCHEDULES],len(controls)))
    ok=True if route=='Fswa1' else a(4 if piwt else 3) not in ['','N/A'];rows=[]
    if ok:
        label5=''
        if piwt:
            for r in range(minimum,qty+1):
                if a(lc,r)==bore and a(4,r)==wall:
                    x,y=a(6,r),a(7,r);label5='Matching Schedule None'
                    if x and not y:label5='Corresponding Schedule: Sch-'+x
                    if y and not x:label5='Matching Schedule Sch-'+y
                    if x and y:label5='Matching Schedule Sch-'+x+' and Sch-'+y
                    total=a(9,r)
                    for col in range(1,6):put(col,a(col,r))
                    put(8,b.string(b.val(a(3,r))-b.val(a(4,r))*2));put(9,b.string(b.val(a(3,r))/2));put(10,total);break
            size=('DN' if lc==2 else '')+a(lc)+ls+('NPS' if lc==1 else '')
            headers=[size+' Pipe x '+a(4)+sign+' Wall Thickness','Weight =  '+b.string(b.rnd(b.val(a(5)),2))+' '+ws,'Weight full with water =  '+b.string(b.rnd(b.val(a(10)),2))+' '+ws,'',label5,'Material: Carbon Steel',props['ActivitySpecLong']]
        elif n<3:
            for r in range(minimum,qty+1):
                if a(lc,r)==bore and a(lc+2,r)==reduced:
                    offset={'40':0,'STD':0,'80':1,'XS':1,'160':2,'XXS':3}.get(sch,0)
                    for col in range(1,8):put(col,a(col,r))
                    put(8,a(8+offset,r));put(12,a(12+offset,r));put(16,a(16+offset,r));put(20,a(20,r))
                    for col,v in {21:'37.5*',22:'45*',23:'Max',24:'Plain End',25:'Threaded End',26:'Bevel End'}.items():put(col,v)
                    break
            part=lambda col:('DN' if lc==2 else '')+a(col)+ls+('NPS' if lc==1 else '')
            wt=b.string(b.rnd(b.val(a(16))*wf,2));wt='N/A' if wt=='0' else wt
            headers=[part(lc)+' x '+part(lc+2)+' '+ttl+' Sch-'+sch,'Weight =  '+wt+' '+ws,'','','','',props['ActivitySpecLong']]
        else:
            for col,v in {11:'37.5*',12:a(5)+sign+' ~ '+a(6)+sign,13:'Long Nipple',14:'Close Nipple',15:'Short Nipple',16:'Plain End',17:'Bevel End'}.items():put(col,v)
            col={'40':7,'STD':7,'80':8,'XS':8,'160':9,'XXS':10}.get(sch)
            if col:put(18,a(col))
            wt=b.string(b.rnd(b.val(a(18)),2));wt='N/A' if wt=='0' else wt
            headers=[('DN' if lc==2 else '')+a(lc)+ls+('NPS' if lc==1 else '')+' '+ttl+' Sch-'+sch,'Weight =  '+wt+' '+ws+('/ft' if imp else '/m'),'','','','',props['ActivitySpecLong']]
    else:headers=[props['ActivityTitle'],'Not manufactured with the selected parameters','Try another size or Schedule' if piwt else 'Try another size or rating','','','','']
    draw=f.commands(route[:4]+'/'+route+'.dxf',{1:cells},row,u,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=rows))
    tuples=[[1,r,col,v] for r,cc in cells.items() for col,v in sorted(cc.items())]
    return dict(view=view,mainSize=row,smallSize=None,files=paths,lineCounts=[qty],sourceHashes=[h],bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,**(dict(_banks={1:cells},_wall=wall,_reduced=reduced) if _internal else {}))
def generate(route):
    choices=[]
    if route=='Piwt1':
        for u in ['Metric','Imperial']:
            for lu in ['Inches','Millimetres']:
                for bore in (['0.125','0.25','6','80'] if lu=='Inches' else ['6','8','150','2000']):
                    for wall in ['7.11','INVALID']:
                        choices.append(dict(Units=u,ListUnits=lu,PipeNominalBore=bore,PipeWallThk=wall,Fractionize='Yes'))
        choices += [{},dict(MainSize=1000),dict(PipeNominalBore='6.0')]
    elif route=='Fswa3':
        for u in ['Metric','Imperial']:
            for sch in ['STD','XS','160','XXS']:
                probe=model(route,dict(Units=u,Sch=sch));qty=probe['lineCounts'][0]
                for row in sorted({3,16,qty,100}):
                    for lu in ['Inches','Millimetres']:choices.append(dict(Units=u,Sch=sch,MainSize=row,ListUnits=lu,Fractionize='Yes'))
    else:
        for u in ['Metric','Imperial']:
            for lu in ['Inches','Millimetres']:
                for bore in (['0.25','2','12'] if lu=='Inches' else ['8','50','300']):
                    for reduced in ['1','INVALID']:
                        for sch in ['STD','XS','160','XXS']:choices.append(dict(Units=u,ListUnits=lu,PipeNominalBore2=bore,PipeReducedSize=reduced,Sch=sch,Fractionize='Yes'))
        choices += [{},dict(MainSize=1000)]
    cases=[dict(id=route+'-'+str(i),sourceRefs=[f.method(route)[1],f.method(route+'_Headers')[1]],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(route,c)) for i,c in enumerate(choices)]
    f.write_cases(route,cases)
    print(route,len(cases),'cases',flush=True)
if __name__=='__main__':
    for route in sys.argv[1:]:generate(route)
