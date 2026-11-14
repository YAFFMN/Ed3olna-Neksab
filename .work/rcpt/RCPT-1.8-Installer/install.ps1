param([string]$Src)
$ErrorActionPreference='Stop'
$ver='33.4.11'
$dest=Join-Path $env:LOCALAPPDATA 'RCPT'
$tmp=Join-Path $env:TEMP "electron-$ver.zip"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
if(Test-Path $dest){Remove-Item $dest -Recurse -Force}
New-Item -ItemType Directory -Path $dest | Out-Null
Write-Host 'Downloading runtime...'
$ProgressPreference='SilentlyContinue'
Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-x64.zip" -OutFile $tmp
Write-Host 'Unpacking...'
Expand-Archive $tmp -DestinationPath $dest -Force
Remove-Item $tmp -Force
Rename-Item (Join-Path $dest 'electron.exe') 'RCPT.exe'
$res=Join-Path $dest 'resources'
Remove-Item (Join-Path $res 'default_app.asar') -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $Src 'app') (Join-Path $res 'app') -Recurse
Copy-Item (Join-Path $Src 'RCPT.ico') $dest
$w=New-Object -ComObject WScript.Shell
foreach($p in @([Environment]::GetFolderPath('Desktop'),(Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))){
  $s=$w.CreateShortcut((Join-Path $p 'RCPT.lnk'))
  $s.TargetPath=(Join-Path $dest 'RCPT.exe'); $s.WorkingDirectory=$dest
  $s.IconLocation=(Join-Path $dest 'RCPT.ico'); $s.Description='Radiation-Coupled Physiological Twin'; $s.Save()
}
Write-Host 'Done. RCPT is on your Desktop.'
Start-Process (Join-Path $dest 'RCPT.exe')
