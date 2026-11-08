$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -eq 'Core'){throw 'Use Windows PowerShell / Framework4'}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form=New-Object Windows.Forms.Form
$form.Width=1067;$form.Height=690
$strip=New-Object Windows.Forms.StatusStrip
$strip.AutoSize=$false;$strip.Dock=[Windows.Forms.DockStyle]::None
$strip.Location=New-Object Drawing.Point(0,55)
$strip.Size=New-Object Drawing.Size(1067,34)
$strip.SizingGrip=$false;$strip.GripMargin=New-Object Windows.Forms.Padding(-10)
$widths=@(33,32,220,32,32,80,80,80,80)
$names=@('First','Back','Tab','Forward','Last','Btn1','Btn2','Btn3','Btn4')
$items=@()
for($i=0;$i -lt $widths.Count;$i++){
  $item=New-Object Windows.Forms.ToolStripDropDownButton
  $item.Name=$names[$i];$item.AutoSize=$false
  $item.Size=New-Object Drawing.Size($widths[$i],33)
  $item.Margin=New-Object Windows.Forms.Padding(0,1,0,0)
  $item.Overflow=[Windows.Forms.ToolStripItemOverflow]::Never
  [void]$strip.Items.Add($item);$items+=$item
}
[void]$form.Controls.Add($strip)
$form.CreateControl();$strip.CreateControl();$strip.PerformLayout()
$controls=@()
foreach($item in $items){$controls+=@{id=$item.Name;x=$item.Bounds.X;y=($item.Bounds.Y+55);width=$item.Bounds.Width;height=$item.Bounds.Height}}
$data=@{culture='en-US';runtime=[Environment]::Version.ToString();helperHash=(Get-FileHash $PSCommandPath).Hash.ToLowerInvariant();scope='Isolated WinForms source toolbar sizes/order/margins; no original assembly loaded';client=@{width=$form.ClientSize.Width;height=$form.ClientSize.Height};controls=$controls}
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$json=($data|ConvertTo-Json -Depth 8).Replace("`r`n","`n")+"`n"
[IO.File]::WriteAllText((Join-Path $root 'tests/reference/flanges-gaskets/layout.json'),$json,[Text.UTF8Encoding]::new($false))
$form.Dispose()
$controls|ConvertTo-Json -Compress
