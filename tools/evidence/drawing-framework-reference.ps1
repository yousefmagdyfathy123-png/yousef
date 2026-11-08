$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -eq 'Core'){throw 'Use Windows PowerShell / Framework4'}
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Add-Type -AssemblyName Microsoft.VisualBasic
$culture=[Globalization.CultureInfo]::GetCultureInfo('en-US')
[Threading.Thread]::CurrentThread.CurrentCulture=$culture
$cases=@()
foreach($value in @('21.123456','167.77216','100','-0','-21.123456','0.000012345678')){
  $temperature=[single]::Parse($value,$culture)
  $points=@();$temps=@()
  for($i=0;$i -lt 2;$i++){
    $temps+=([double]$temperature)
    $text=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToString($temperature)
    $x=[single]($temperature+[single]400)
    $points+=([double]$x)
    $temperature=[Microsoft.VisualBasic.CompilerServices.Conversions]::ToSingle($text)
  }
  $cases+=@{raw=$value;initial=$temps[0];text=$text;crosshairX=$points;restored=[double]$temperature}
}
$trimCases=@()
foreach($code in @(32,12288,9,160,65279)){
  $raw=([string][char]$code)+'A'+([string][char]$code)
  $trimCases+=@{code=$code;raw=$raw;expected=[Microsoft.VisualBasic.Strings]::Trim($raw)}
}
$fixture=@{sourceRefs=@(@{path='audit/executable/Pipedata_Pro_14_1.Module1.cs';hash='ae2389a910a610523c4e012acf3e65be4f7458c7ca9fdbb0d83d5e2c63d13c6a';line=41105;endLine=41132});culture='en-US';runtime=[Environment]::Version.ToString();helperHash=(Get-FileHash $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();cases=$cases;trimCases=$trimCases}
$json=$fixture|ConvertTo-Json -Depth 20
[IO.File]::WriteAllText((Join-Path $root 'tests/reference/drawing/temperature.json'),($json -replace "`r`n","`n")+"`n",(New-Object Text.UTF8Encoding($false)))
Write-Output ('Independent Framework Single restoration cases: '+$cases.Count)
