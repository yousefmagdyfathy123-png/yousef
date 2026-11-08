param([string]$OutFile = 'tests/reference/vb.json')
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core') { throw 'Run using Windows PowerShell / .NET Framework 4' }
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -ReferencedAssemblies ([Microsoft.VisualBasic.Conversion].Assembly.Location) -TypeDefinition @'
public static class FrameworkNullReference {
  public static double NullDouble() { return Microsoft.VisualBasic.CompilerServices.Conversions.ToDouble((string)null); }
}
'@
$culture = [Globalization.CultureInfo]::GetCultureInfo('en-US')
[Threading.Thread]::CurrentThread.CurrentCulture = $culture
[Threading.Thread]::CurrentThread.CurrentUICulture = $culture
$cases = New-Object System.Collections.Generic.List[object]
function Probe($op, $values, [scriptblock]$run) {
  try { $v = & $run; if ($v -is [double] -and ([double]::IsNaN($v) -or [double]::IsInfinity($v))) {$v=$v.ToString([Globalization.CultureInfo]::InvariantCulture)}; $result = @{ value = $v } } catch { $e=$_.Exception; while ($e.InnerException) {$e=$e.InnerException}; $result = @{ error=$e.GetType().Name } }
  $cases.Add([ordered]@{op=$op;args=@($values);expected=$result})
}
foreach ($s in @($null,'','N/A','SPA','0+1/2',' 1 2.5x','1,234.5','1.25','-0.1','1e2','1D2','&HFFFF','&O77','50%','50.5%','NaN','Infinity','1e','1e+','&H8000','&HFFFFFFFF','&H10000',('1' + [char]9 + '2'),
  '&H10000%','&HFFFF%','&HFFFF&','&HFFFFFFFF&','&HFFFFFFFF%','&HFFFFFFFFFFFFFFFF','&H0000FFFF','&H8000000000000000','&H10000000000000000','&HFFFF!','&HFFFF#','&H-1','&O177777','&O200000','&O77777777777',
  '1-','1+','(1)','$1','($1)','-$1','$-1','1$','1-$','1$-','1 -','( 1 )','( $1 )','1,','1,,2','1,.2',',1','1,2,3','1e3-','+NaN','-NaN',([string][char]0x221e),('+'+[char]0x221e),('-'+[char]0x221e),'50.0%','1.2&','1.5!','1e999','&H','&O9')) {
  Probe 'val' @($s) { [Microsoft.VisualBasic.Conversion]::Val([string]$s) }
  Probe 'double' @($s) { if ($null -eq $s) {[FrameworkNullReference]::NullDouble()} else {[Microsoft.VisualBasic.CompilerServices.Conversions]::ToDouble([string]$s)} }
}
foreach ($n in @(-0.1,0,1.5,-1.5,16777217,0.065)) {
  Probe 'int' @($n) { [Microsoft.VisualBasic.Conversion]::Int([double]$n) }
  Probe 'single' @($n) { [double][single]$n }
}
foreach ($n in @(0.065,0.075,1.005,2.675,2.5,3.5,-2.5,-3.5,1.2345678901234567,1e-5,1e-4,1e15,1e14,-0.0)) {
  foreach ($d in @(0,2,15)) { Probe 'round' @($n,$d) { [Math]::Round([double]$n,[int]$d) } }
  Probe 'string' @($n) { [Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([double]$n) }
}
foreach ($pair in @(@('101.1','99.2'),@('A','a'),@($null,''),@('a','B'),@([string][char]0xe4,'z'),@('a-b','ab'),@('ab-c','a-bc'),@('a-b',"a'b"),@('a--b','a-b'),@('a-bc','abc-'),@('a.b','ab'),@([string][char]0xdf,'ss'),@([string][char]0xe6,'ae'),@([string][char]0xff21,'A'))) {
  foreach ($text in @($false,$true)) { Probe 'compare' @($pair[0],$pair[1],$text) { [Microsoft.VisualBasic.CompilerServices.Operators]::CompareString($pair[0],$pair[1],$text) } }
}
foreach ($pair in @(@('abc','a*'),@('abc','a?c'),@('a1','a#'),@(('a'+[char]0x661),'a#'),@('b','[a-c]'),@('B','[a-c]'),@('z','[!a-c]'),@('','[]'),@('x','[]x'),@('[','[[]'),@(']','[]]'),@('-','[-a]'),@('a','[a-]'),@('a','[z-a]'),@('x','['),@('x','[!]'),@("a`nb",'a*b'),@($null,$null),@('A','a'),@('x','*['),@('abc','z['),@('','['),@('','[z-a]'),@('abc','z[z-a]'),@('!','[!]'),@('','*['),@('','?['),@('a','*b['),@('abc','*d[z-a]'))) {
  Probe 'like' @($pair[0],$pair[1]) { [Microsoft.VisualBasic.CompilerServices.LikeOperator]::LikeString($pair[0],$pair[1],[Microsoft.VisualBasic.CompareMethod]::Binary) }
}
# Independent source-transcribed dimension model: specific DoDrawing bank1/color1
# and bank2/color99 branches; not a call into the TypeScript implementation.
function Dimension($route,$bank,$raw,$units,$fractions,$sign) {
  $t=[string]$raw
  if ($bank -eq 1 -and ($t -ceq 'SPA' -or $t -ceq 'N/A')) {return $t}
  if ($bank -eq 2) {$t += $sign}
  $t=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([Math]::Round([Microsoft.VisualBasic.Conversion]::Val($t),2))
  if ($bank -eq 1 -and $units -eq 'Imperial') {
    $prefix=$route.Substring(0,[Math]::Min(4,$route.Length))
    if (@('Gpas','Nuts','Wbpi','Wbol','Flbs','Flhb','Fldi','Flco') -ccontains $prefix -or ($route.StartsWith('Ftsw') -and $route -cne 'Ftsw14' -and [Microsoft.VisualBasic.Conversion]::Val($route.Substring(4)) -gt 7)) {
      $t=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([Math]::Round([Microsoft.VisualBasic.Conversion]::Val($t)/25.4,2))
    }
    if ($route.StartsWith('Span1')) {$t=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([Math]::Round([Microsoft.VisualBasic.Conversion]::Val($t)/25.4,0))}
  }
  if ($fractions) {
    $v=[Microsoft.VisualBasic.Conversion]::Val($t)
    if ($v -lt 1) {
      for ($i=1;$i -le 31;$i++) {if ($v -gt ($i/32.0-1/64.0) -and $v -lt ($i/32.0+1/64.0)) {$a=$i;$b=32;while ($a%2 -eq 0) {$a/=2;$b/=2};$t="$a/$b"}}
      if ($v -gt (1-1/64.0)) {$t='1'}
    }
    $v=[Microsoft.VisualBasic.Conversion]::Val($t)
    if ($v -gt 1) {
      $whole=[Microsoft.VisualBasic.Conversion]::Int($v);$rem=$v-$whole;$prefix=[Microsoft.VisualBasic.Conversion]::Str($whole)
      if ($rem -gt 0 -and $rem -lt 1/64.0) {$t=$prefix}
      for ($i=1;$i -le 31;$i++) {if ($rem -gt ($i/32.0-1/64.0) -and $rem -lt ($i/32.0+1/64.0)) {$a=$i;$b=32;while ($a%2 -eq 0) {$a/=2;$b/=2};$t=$prefix+"+$a/$b"}}
      if ($rem -gt (1-1/64.0)) {$t=[Microsoft.VisualBasic.Conversion]::Str($whole+1)}
    }
  }
  return $t+$sign
}
foreach ($r in @('Pipe1','Gpas3','Span1','Span2','Ftsw8','Ftsw14','Nuts1')) {
  foreach ($bank in @(1,2)) {foreach ($raw in @($null,'','N/A','SPA','0.065','1.5','2','1.99','-0.1','25.405')) {foreach ($f in @($false,$true)) {
    Probe 'dimension' @($r,$bank,$raw,'Imperial',$f,'"') { Dimension $r $bank $raw 'Imperial' $f '"' }
  }}}
}
$hash=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
$data=[ordered]@{scope='Isolated platform helper; vendor assembly never loaded';runtime=[Environment]::Version.ToString();coreLibrary=[object].Assembly.FullName;vbAssembly=[Microsoft.VisualBasic.Conversion].Assembly.FullName;culture='en-US';sortVersion=$culture.CompareInfo.Version.FullVersion;helperSha256=$hash;cases=$cases.ToArray()}
$json=($data|ConvertTo-Json -Depth 12).Replace("`r`n","`n")+"`n"
[IO.File]::WriteAllText([IO.Path]::GetFullPath($OutFile),$json,[Text.UTF8Encoding]::new($false))
Write-Output "Generated $($cases.Count) Framework reference cases: $OutFile"
