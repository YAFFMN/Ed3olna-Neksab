param([string]$Path,[string]$Pattern,[int]$Limit=200)
$lines = Get-Content -LiteralPath $Path
$rx = [regex]$Pattern
$out = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i]
  if ($rx.IsMatch($l)) {
    if ($l.Length -gt 260) { $l = $l.Substring(0, 260) + '...' }
    $out.Add("$($i+1): $l")
    if ($out.Count -ge $Limit) { break }
  }
}
$out
