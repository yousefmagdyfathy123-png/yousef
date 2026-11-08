"""Independent reducing flange model from source22560/22651 and37072."""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('base',Path(__file__).with_name('flanges-reference.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

def threshold(row,prior=0):
    for lo,hi,value in [(7,9,4),(10,10,6),(11,12,7),(13,15,8),(16,16,10),(17,17,11),(18,20,12),(21,25,13)]:
        if lo<=row<=hi:return value
    return prior

def model(c,route):
    n=int(route[-1]);line=22560 if n==1 else 22651;units=c.get('Units','Metric');face=c.get('Face','RF');cls=c.get('ASMEClass','300#')
    frac=c.get('Fractionize','No')=='Yes';lu=c.get('ListUnits','Inches');requested=c.get('MainSize',8);incoming=c.get('SmallSize',4)
    path=f'Flan/{"Flg_Imperial_" if units=="Imperial" else "Flg"}{cls[:-1]}.csv'
    cells,qty,h=b.bank(path,1,3,5,fraction_column=None);row=min(requested,qty);small=max(4,min(incoming,row-1));limit=threshold(row,c.get('FlreSmallSize',0));a=lambda col,r=row:cells.get(r,{}).get(col,'')
    sign='"' if units=='Imperial' else '';ok=a(3) not in ['','N/A']
    if ok:
        cells[row].update({48:a(20)+' Holes',49:a(25)+'" Dia',60:b.string(b.val(a(6,small).strip())),61:b.string(b.val(a(5,small).strip())),62:'Threaded reducing flange',63:'Tapped blind flange' if n==1 else 'Drilled blind flange',64:b.string(b.val(a(4).strip())),30:'2 x 0.5in NPT',31:'PCD',32:'Holes',33:'Dia',34:'23*'})
        title=('Threaded Reducing' if n==1 else 'Slip-On Reducing')+' Flange'
        headers=[('DN' if lu=='Millimetres' else '')+a(2 if lu=='Millimetres' else 1)+('"' if lu=='Inches' else '')+' x '+a(2 if lu=='Millimetres' else 1,small)+('"NPS' if lu=='Inches' else '')+' '+title+' '+cls+' '+face,'','','','','','ASME B16.5-2020']
    else:headers=['ASME B16.5 Reducing Flanges','Not manufactured with the selected parameters','Try another size, class or face type','','','','']
    sizeopts=lambda lo,hi:[dict(value=str(i),text=a(2 if lu=='Millimetres' else 1,i)+('"' if lu=='Inches' else ''),enabled=True) for i in range(lo,hi+1)]
    fields=[('MainSize',row,sizeopts(5,min(qty,48))),('SmallSize',small,sizeopts(4,row-1)),('ASMEClass',None,[dict(value=t,text=t,enabled=True) for t in ['150#','300#','400#','600#','900#','1500#','2500#']])]
    controls=[]
    for field,r,opts in fields:
        i=len(controls);text=cls if field=='ASMEClass' else a(2 if lu=='Millimetres' else 1,r)+('"' if lu=='Inches' else '')
        controls.append(dict(id=field,sourceId='Btn'+str(i+1),type='select',text=text,options=opts,enabled=True,checked=False,visible=True,layout=dict(x=350+i*80,y=56,width=80,height=33),sourceRefs=[b.ref(line)],showDropDownArrow=False))
    drawing=route
    if n==1 and cls=='150#':drawing=route+('c' if small<=limit else 'b')
    elif small<=limit:drawing=route+'a'
    draw=b.commands('Flre/'+drawing+'.dxf',{1:cells},row,units,frac,route) if ok else [dict(op='fillRect',x=-200,y=-200,width=3201,height=2070,color='#ffffff')]
    view=dict(headers=headers,controls=controls,drawing=dict(width=1067,height=690,transform=[b.single(.6),0,0,b.single(.6),.5,105],commands=draw),messages=[],visibility={f'Label{i}':True for i in range(1,8)},textResults=dict(status='available' if ok else 'unavailable',rows=[]))
    tuples=[[1,i,j,value] for i,cc in cells.items() for j,value in sorted(cc.items())]
    values=dict(Sensor1=3,TabbCount=n,TabbQty=2,SubTab=route+'a',MinMainSize=5,SmallSize=small,FlreSmallSize=limit,LowerLimit=4,HigherLimit=row-1)
    if n==1:values.update(ChkType='U_C_Z_M',SubSubTab=route+'b',SubSubSubTab=route+'c')
    return dict(view=view,mainSize=row,lineCounts=[qty],files=[path]*(2 if requested>qty else 1),bankFingerprint=b.sha(json.dumps(tuples,separators=(',',':'),ensure_ascii=False).encode()),available=ok,sourceHashes=[h],sourceValues=values,savedValues=dict(MainSize=row,SmallSize=incoming))

def generate(route):
    choices=[{}]
    for u in ['Metric','Imperial']:
        for cls in ['150#','300#','400#','600#','900#','1500#','2500#']:
            cells,qty,_=b.bank(f'Flan/{"Flg_Imperial_" if u=="Imperial" else "Flg"}{cls[:-1]}.csv',1,3,5,fraction_column=None)
            rows=sorted({5,8,qty,40}|{r for r in range(5,qty+1) if cells[r][3] in ['','N/A']})
            if cls in ['150#','300#']:rows=sorted(set(rows)|{6,7,9,10,11,12,13,15,16,17,18,20,21,25})
            for r in rows:
                limit=threshold(r)
                for s in sorted({4,max(4,limit),max(4,limit+1),100}):choices.append(dict(Units=u,ASMEClass=cls,MainSize=r,SmallSize=s))
    choices += [dict(Units=u,Face=f,Fractionize='Yes',ListUnits=l,MainSize=16,SmallSize=s) for u in ['Metric','Imperial'] for f in ['RF','RTJ'] for l in ['Inches','Millimetres'] for s in [4,11]]
    # Explicit inherited threshold cases at source rows5/6 where no assignment runs.
    choices += [dict(MainSize=r,SmallSize=4,FlreSmallSize=t) for r in [5,6] for t in [0,13]]
    n=int(route[-1]);cases=[dict(id=route+'-'+str(i),sourceRefs=[b.ref(22560 if n==1 else 22651),b.ref(22738 if n==1 else 22783),b.ref(37072)],culture='en-US',initial=c,actions=[dict(type='select-route',routeId=route)],expected=model(c,route)) for i,c in enumerate(choices)]
    (b.APP/f'tests/reference/flanges-gaskets/{route}.json').write_text(json.dumps(dict(cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
    b.pin_route(route,[route,route+'_Headers','LoadSettingsFlre','LoadDataBase1','DesigBtn2ForSmallSize','GetSubTab','DropSubTab','WhiteBlock'])
    print(route,len(cases),'cases,',sum(not c['expected']['available'] for c in cases),'unavailable')
if __name__=='__main__':
    import sys
    for route in sys.argv[1:] or ['Flre1']:generate(route)
