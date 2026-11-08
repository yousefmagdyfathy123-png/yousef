param([string]$OutFile='tests/reference/calculators/framework.json')
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -eq 'Core'){throw 'Use Windows PowerShell / .NET Framework4'}
Add-Type -AssemblyName Microsoft.VisualBasic
$culture=[Globalization.CultureInfo]::GetCultureInfo('en-US')
[Threading.Thread]::CurrentThread.CurrentCulture=$culture
# Compile isolated, source-bound arithmetic only. No vendor assembly, static
# initializer, form, registry, file-writing or application startup is loaded.
$sourcePath=Join-Path (Get-Location) '../audit/executable/Pipedata_Pro_14_1.Module1.cs'
$source=[IO.File]::ReadAllText($sourcePath)
if((Get-FileHash $sourcePath).Hash.ToLowerInvariant() -ne 'ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a'){throw 'Source identity changed'}
$names=@('FormatDim','Gpas1_CalcSpacing','Gpas2_CalcSpacing','Gpas3_CalcSpacing','Gpas4_CalcSpacing','Calc_Leg','Calc_LoopLeg','Calc_Safe_Span','CalcInsulWt','ClacWeightPerMtr_ForSafeSpan','ClacWeightPerMtrAndWtr_ForSafeSpan','CalcMomentOfInertia_ForSafeSpan','PsizCalculate')
$fields=[regex]::Matches($source,'public static (string|object|float|double|int|bool)(\[[,]*\])? (\w+)(?: = ([^;]+))?;') | ForEach-Object {
  $type=$_.Groups[1].Value+$_.Groups[2].Value;$name=$_.Groups[3].Value
  if($_.Groups[2].Success){$init=$_.Groups[4].Value;if($init -match '^new (string|object|float|double|int|bool)\[[\d, ]+\]$'){"public static $type $name = $init;"}else{"public static $type $name;"}}
  else{"public static $type $name;"}
}
$methods=foreach($name in $names){
  $m=[regex]::Match($source,'(?s)public static void '+$name+'\(\).*?(?=\r?\n\tpublic static |\z)')
  if(!$m.Success){throw "Missing $name"}
  $body=$m.Value
  if($body -match 'MyProject|StreamReader|Interaction\.'){throw "Unsafe isolated method $name"}
  $body
}
$dialogPath=Join-Path (Get-Location) '../audit/executable/Pipedata_Pro_14_1.frmDataInput_Fxly.cs'
$dialog=[regex]::Match([IO.File]::ReadAllText($dialogPath),'(?s)private void Button4_Click\(object sender, EventArgs e\)(.*)\r?\n\}').Value
$dialog=$dialog.Substring(0,$dialog.LastIndexOf('}'))
$dialog=$dialog.Replace('private void Button4_Click(object sender, EventArgs e)','public static void DialogOK(string raw)').Replace('Module1.','').Replace('TextBox1.Text','raw').Replace('Interaction.MsgBox','Message')
if($dialog -match 'MyProject|StreamReader|Interaction\.') {throw 'Unsafe dialog helper'}
$code="using System; using System.Runtime.CompilerServices; using Microsoft.VisualBasic; using Microsoft.VisualBasic.CompilerServices; public static class CalcProbe {"+($fields -join "`n")+($methods -join "`n")+$dialog+'public static bool Saved; public static bool Closed; public static System.Collections.Generic.List<string> Messages = new System.Collections.Generic.List<string>(); public static void Message(string text){Messages.Add(text);} public static void SaveSettings(){Saved=true;} public static void Clicker(){} public static void Close(){Closed=true;} public static void ErrorCatch(){throw new InvalidOperationException("Isolated arithmetic failure");}}'
Add-Type -TypeDefinition $code -ReferencedAssemblies ([Microsoft.VisualBasic.Conversion].Assembly.Location) -WarningAction SilentlyContinue
$cases=New-Object System.Collections.Generic.List[object]
function Snapshot($keys){$result=[ordered]@{};foreach($key in $keys){$v=[CalcProbe].GetField($key).GetValue($null);if($v -is [double] -or $v -is [single]){$v=[double]$v;if([double]::IsNaN($v)){$v='NaN'}elseif([double]::IsPositiveInfinity($v)){$v='Infinity'}elseif([double]::IsNegativeInfinity($v)){$v='-Infinity'}};$result[$key]=$v};return $result}
function Capture($id,$kind,$caseArguments,$keys){$cases.Add([ordered]@{id=$id;kind=$kind;args=$caseArguments;expected=(Snapshot $keys)})}
foreach($units in @('Metric','Imperial')){foreach($n in 1..4){foreach($diameters in @(@(42.2,33.4,114,152),@(219.1,60.3,343,310),@(0,0,0,0))){
  [CalcProbe]::Units=$units;[CalcProbe]::MainSize=8;[CalcProbe]::SmallSize=7
  [CalcProbe]::ActiveDba[1,8,3]=[string]$diameters[0];[CalcProbe]::ActiveDba[1,7,3]=[string]$diameters[1]
  [CalcProbe]::ActiveDba[2,8,3]=[string]$diameters[2];[CalcProbe]::ActiveDba[3,7,3]=[string]$diameters[3]
  [CalcProbe]::InsThkIndex=2;[CalcProbe]::InsThk2Index=3
  [CalcProbe]::InsThkForCalc[2]=25;[CalcProbe]::InsThkForCalc[3]=$(if($units -eq 'Metric'){40}else{32})
  [CalcProbe].GetMethod("Gpas${n}_CalcSpacing").Invoke($null,@())|Out-Null
  Capture "spacing-$($cases.Count)" spacing @{route="Gpas$n";units=$units;diameters=$diameters} @('Ans3')
}}}
foreach($loop in @($false,$true)){foreach($units in @('Metric','Imperial')){foreach($sign in @('C','F')){foreach($mat in @('Carbon Steel','Stainless Steel')){foreach($temp in @(-80,-0.1,20,100,400,700)){foreach($length in @(0,10,500,12345.67)){
  [CalcProbe]::Units=$units;[CalcProbe]::TempSign=$sign;[CalcProbe]::Material=$mat;[CalcProbe]::AmbTemp=20;[CalcProbe]::DesTemp=$temp;[CalcProbe]::Length=$length;[CalcProbe]::ActiveDba[1,8,3]='60.3'
  if($loop){[CalcProbe]::Calc_LoopLeg()}else{[CalcProbe]::Calc_Leg()}
  Capture "flex-$($cases.Count)" flexibility @{route=$(if($loop){'Fxly2'}else{'Fxly1'});Units=$units;TempSign=$sign;Material=$mat;AmbTemp=20;DesTemp=$temp;Length=$length;od='60.3'} @('Ans1','Ans2','CalcDestemp','CalcAmbTemp','CalcLength')
}}}}}}
foreach($od in @(0,64.99999,65,65.00001,219.1)){foreach($wall in @(0,3.91)){foreach($units in @('Metric','Imperial')){foreach($mat in @('Carbon Steel','Stainless Steel')){foreach($full in @('Full','Empty')){
  [CalcProbe]::Units=$units;[CalcProbe]::Material=$mat;[CalcProbe]::FullorEmpty=$full;[CalcProbe]::DimFactor=$(if($units -eq 'Metric'){1}else{25.4});[CalcProbe]::InsThkIndex=2;[CalcProbe]::InsThkMenuItem[2]=$(if($units -eq 'Metric'){'25'}else{'1'})
  [CalcProbe]::ActiveDba[1,8,3]=[string]$od;[CalcProbe]::ActiveDba[1,8,4]=[string]$wall
  [CalcProbe]::Calc_Safe_Span()
  Capture "span-$($cases.Count)" span @{Units=$units;Material=$mat;FullorEmpty=$full;od=[string]$od;wall=[string]$wall} @('Ans3','Ans1','Ans2','DefMax','LimitedBy','Insul_Wt_Mtr','ID','Kg_Per_Mtr','Total_Wt_Mtr')
}}}}}
foreach($units in @('Metric','Imperial')){foreach($mat in @('Carbon Steel','Stainless Steel')){foreach($flow in @(-100,0,1,1000)){
  [CalcProbe]::Units=$units;[CalcProbe]::Fluid='Water';[CalcProbe]::Material=$mat;[CalcProbe]::Flowrate=$flow;[CalcProbe]::PsizCalculate()
  Capture "size-$($cases.Count)" size @{Units=$units;Material=$mat;Flowrate=$flow} @('PsizVelocity','PsizDia')
}}}
foreach($units in @('Metric','Imperial')){foreach($degrees in @('Celsius','Fahrenheit')){foreach($field in @('Ambient Temperature','Design Temperature','DistanceToAnchor','DistanceBetweenAnchors')){foreach($raw in @('','abc','-0.1','-101','-100','-81','-80','20','400','401','700','701','10','499','500','999','1000','4000','8000','8001','100000','100001','200000','200001','1,000','1e40','1e309','NaN',([string][char]0x221e),('-'+[char]0x221e),'1,5','1.2x')){
  [CalcProbe]::Units=$units;[CalcProbe]::DegUnits=$degrees;[CalcProbe]::ActiveData=$field;[CalcProbe]::AmbTemp=86;[CalcProbe]::DesTemp=176;[CalcProbe]::Length=2000;[CalcProbe]::Saved=$false;[CalcProbe]::Closed=$false;[CalcProbe]::Messages.Clear()
  [CalcProbe]::DialogOK($raw)
  $values=Snapshot @('AmbTemp','DesTemp','Length');$values['ok']=[CalcProbe]::Saved;$values['messages']=@([CalcProbe]::Messages.ToArray())
  $cases.Add(@{id="input-$($cases.Count)";kind='input';args=@{Units=$units;DegUnits=$degrees;field=$field;raw=$raw};expected=$values})
}}}}
foreach($value in @(1234.56789,12345.67,0.000001,1e9,16777217,[double]::NaN,[double]::PositiveInfinity)){
  $single=[single]$value;$text=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToString($single)
  $back=[double][single][Microsoft.VisualBasic.Conversion]::Val($text)
  $cases.Add(@{id="single-$($cases.Count)";kind='single-string';args=@{value=$(if([double]::IsNaN($value)){'NaN'}elseif([double]::IsInfinity($value)){'Infinity'}else{$value})};expected=@{text=$text;reloaded=$back}})
}
# Verify the platform registry representation using only a fresh isolated key.
# Never read/write the vendor's key or execute/load its assembly.
$probePath='Software\AlfadataTask9-'+[Guid]::NewGuid().ToString('N')
if($probePath -notmatch '^Software\\AlfadataTask9-[0-9a-f]{32}$'){throw 'Unsafe probe path'}
$probeKey=$null
try{
  $probeKey=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($probePath)
  $probeKey.SetValue('Single',[single]1234.56789)
  $registryProbe=@{kind=$probeKey.GetValueKind('Single').ToString();text=$probeKey.GetValue('Single');isolatedFreshKey=$true;vendorRegistryTouched=$false}
}finally{if($probeKey){$probeKey.Close()};[Microsoft.Win32.Registry]::CurrentUser.DeleteSubKey($probePath)}
$registryProbe['deleted']=$true
$data=[ordered]@{scope='Isolated source arithmetic/dialog with side-effect recorders; fresh platform registry probe deleted afterward; vendor binary and registry never loaded/touched';runtime=[Environment]::Version.ToString();vbAssembly=[Microsoft.VisualBasic.Conversion].Assembly.FullName;culture='en-US';registryProbe=$registryProbe;sourceSha256=(Get-FileHash $sourcePath).Hash.ToLowerInvariant();dialogSha256=(Get-FileHash $dialogPath).Hash.ToLowerInvariant();helperSha256=(Get-FileHash $PSCommandPath).Hash.ToLowerInvariant();methods=$names;cases=$cases.ToArray()}
[IO.Directory]::CreateDirectory((Split-Path ([IO.Path]::GetFullPath($OutFile))))|Out-Null
[IO.File]::WriteAllText([IO.Path]::GetFullPath($OutFile),(($data|ConvertTo-Json -Depth 14).Replace("`r`n","`n")+"`n"),[Text.UTF8Encoding]::new($false))
Write-Output "Generated $($cases.Count) isolated Framework cases"
