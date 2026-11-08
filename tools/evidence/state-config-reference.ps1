param([string]$OutFile='tests/reference/state/configure.json')
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -eq 'Core'){throw 'Use Windows PowerShell / Framework4'}
[Threading.Thread]::CurrentThread.CurrentCulture=[Globalization.CultureInfo]::GetCultureInfo('en-US')
Add-Type -AssemblyName Microsoft.VisualBasic
$cases=@()
# The two wired Fxly visits use the same registry family. Retain both conversions.
foreach($direction in @('Celsius','Fahrenheit')){
  foreach($raw in @(20,86,100,176)){
    $value=[single]$raw
    for($i=0;$i -lt 2;$i++){
      # Each wired visit loads a Single stored as a registry string (G7).
      # Task9's isolated fresh-key probe independently confirms the platform kind.
      $value=[single][Microsoft.VisualBasic.Conversion]::Val([Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([single]$value))
      if($direction -eq 'Fahrenheit'){$value=[single]([double]$value*1.8+32.0)}
      else{$value=[single]([double]([single]($value-[single]32))/1.8)}
    }
    $value=[single][Microsoft.VisualBasic.Conversion]::Val([Microsoft.VisualBasic.CompilerServices.Conversions]::ToString([single]$value))
    $cases+=@{target=$direction;input=$raw;expected=[double]$value}
  }
}
$data=@{culture='en-US';runtime=[Environment]::Version.ToString();helperHash=(Get-FileHash $PSCommandPath).Hash.ToLowerInvariant();scope='Isolated Framework Single/G7 registry-value operations, independently transcribed wired Button4_Click shared-family traversal and final reload; Task9 platform probe verifies string storage';cases=$cases}
$json=($data|ConvertTo-Json -Depth 6).Replace("`r`n","`n")+"`n"
[IO.File]::WriteAllText([IO.Path]::GetFullPath($OutFile),$json,[Text.UTF8Encoding]::new($false))
Write-Output 'Generated8 independent shared-family temperature cases'
