param([Parameter(Mandatory=$true)][string]$SourceRoot)
# Runs only Framework library IO, never the original executable/assembly.
[System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::GetCultureInfo('en-US')
$catalogRoot = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
$files = [System.IO.Directory]::GetFiles($catalogRoot, '*.csv', [System.IO.SearchOption]::AllDirectories)
[Array]::Sort($files, [System.StringComparer]::Ordinal)
$results = @()
$hasher = [System.Security.Cryptography.SHA256]::Create()
try {
  foreach ($path in $files) {
    $rows = [System.Collections.Generic.List[string[]]]::new()
    $reader = [System.IO.StreamReader]::new($path)
    try { while ($reader.Peek() -gt -1) { $rows.Add($reader.ReadLine().Split([char]',')) } } finally { $reader.Dispose() }
    $stream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.BinaryWriter]::new($stream)
    try {
      $writer.Write([int]$rows.Count)
      foreach ($row in $rows) {
        $writer.Write([int]$row.Length)
        foreach ($cell in $row) { $bytes=[System.Text.Encoding]::UTF8.GetBytes($cell); $writer.Write([int]$bytes.Length); $writer.Write([byte[]]$bytes) }
      }
      $writer.Flush()
      $fingerprint = [System.BitConverter]::ToString($hasher.ComputeHash($stream.ToArray())).Replace('-','').ToLowerInvariant()
    } finally { $writer.Dispose(); $stream.Dispose() }
    $sourceHash = [System.BitConverter]::ToString($hasher.ComputeHash([System.IO.File]::ReadAllBytes($path))).Replace('-','').ToLowerInvariant()
    $results += [pscustomobject]@{ id=$path.Substring($catalogRoot.Length+1).Replace('\','/'); sourceHash=$sourceHash; rowCount=$rows.Count; lexicalFingerprint=$fingerprint }
  }
} finally { $hasher.Dispose() }
[pscustomobject]@{ runtime=[System.Runtime.InteropServices.RuntimeEnvironment]::GetSystemVersion(); coreLibrary=[object].Assembly.FullName; culture='en-US'; grammar='uint32le row count, then per row uint32le cell count, then per cell uint32le UTF8 byte length and raw UTF8 bytes'; tables=$results } | ConvertTo-Json -Depth 5
