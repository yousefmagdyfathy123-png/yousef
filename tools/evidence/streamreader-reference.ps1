param([Parameter(Mandatory=$true)][string]$SourceRoot)
# Reference library only: does not load or execute the vendor assembly.
$observations = @()
foreach ($name in @('Ftsw5_Socketwelded_Coupling_9000_Inches.csv','Ftsw6_Socketwelded_Half_Coupling_9000_Inches.csv','Ftsw7_Socketwelded_Cap_9000_Inches.csv')) {
  $reader = [System.IO.StreamReader]::new((Join-Path $SourceRoot ('Ftsw\' + $name)))
  try {
    $lines = @(); while ($reader.Peek() -gt -1) { $lines += ,$reader.ReadLine() }
    $cell = $lines[12].Split(',')[11]
    $observations += [pscustomobject]@{ path=('Ftsw/' + $name); line=13; column=12; codepoints=@($cell.ToCharArray() | ForEach-Object { [int]$_ }); encoding=$reader.CurrentEncoding.WebName; totalLines=$lines.Count }
  } finally { $reader.Dispose() }
}
[pscustomobject]@{ runtime=[System.Runtime.InteropServices.RuntimeEnvironment]::GetSystemVersion(); coreLibrary=[object].Assembly.FullName; observations=$observations } | ConvertTo-Json -Depth 6
