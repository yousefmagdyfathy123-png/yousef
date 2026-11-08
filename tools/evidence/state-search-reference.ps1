param([string]$SourceRoot='../Database',[string]$OutFile='tests/reference/state/search.json')
$ErrorActionPreference='Stop'
if ($PSVersionTable.PSEdition -eq 'Core') {throw 'Use Windows PowerShell / .NET Framework4'}
Add-Type -AssemblyName Microsoft.VisualBasic
[Threading.Thread]::CurrentThread.CurrentCulture=[Globalization.CultureInfo]::GetCultureInfo('en-US')
$sourcePath=[IO.Path]::GetFullPath((Join-Path $SourceRoot 'Gensets/SearchFile.csv'))
$reader=[IO.StreamReader]::new($sourcePath)
$rows=New-Object System.Collections.Generic.List[object]
try {while ($reader.Peek() -ge 0) {$rows.Add($reader.ReadLine().Split([char]','))}} finally {$reader.Dispose()}
$cases=@()
foreach ($query in @('',' ','elbow','BLIND','B16.9','zzzzzz','?','#','*','[A-C]','[','z[','3000','steel',([string][char]0xdf),([string][char]0xfb01),([string][char]0x131))) {
  $hits=@();$errorName=$null
  try {
    foreach ($row in $rows) {
      $matched=$false
      foreach ($col in @(1,2,3,4)) {
        $found=[Microsoft.VisualBasic.CompilerServices.LikeOperator]::LikeString([Microsoft.VisualBasic.Strings]::UCase($row[$col]),('*'+[Microsoft.VisualBasic.Strings]::UCase($query)+'*'),[Microsoft.VisualBasic.CompareMethod]::Binary)
        $matched=$matched -or $found
      }
      if ($matched) {$hits += @{id=$row[0];text=$row[1]}}
    }
  } catch {$e=$_.Exception;while($e.InnerException){$e=$e.InnerException};$errorName=$e.GetType().Name}
  $cases+=@{query=$query;hits=$hits;error=$errorName}
}
$data=@{culture='en-US';runtime=[Environment]::Version.ToString();sourceHash=(Get-FileHash $sourcePath).Hash.ToLowerInvariant();helperHash=(Get-FileHash $PSCommandPath).Hash.ToLowerInvariant();cases=$cases}
$json=($data|ConvertTo-Json -Depth 10).Replace("`r`n","`n")+"`n"
[IO.File]::WriteAllText([IO.Path]::GetFullPath($OutFile),$json,[Text.UTF8Encoding]::new($false))
Write-Output "Generated $($cases.Count) independent search cases from $($rows.Count) source rows"
