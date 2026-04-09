$base = "http://localhost:8081/api"
$headers = @{
  "Content-Type" = "application/json"
  "Origin" = "http://localhost:8081"
  "Referer" = "http://localhost:8081/register"
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Body
  )

  $raw = ""
  $status = 0
  try {
    $json = if ($Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
    $resp = if ($json) {
      Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $json -UseBasicParsing
    } else {
      Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing
    }
    $status = [int]$resp.StatusCode
    $raw = $resp.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $raw = $_.ErrorDetails.Message
    } elseif ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $reader.Close()
    }
  }

  $parsed = $null
  try {
    if ($raw) {
      $parsed = $raw | ConvertFrom-Json
    }
  } catch {
    $parsed = $null
  }

  return @{ status = $status; raw = $raw; parsed = $parsed }
}

$results = @()

$dup = Invoke-Api -Method "POST" -Url "$base/auth/register/start" -Body @{
  fullName = "QA Duplicate"
  email = "admin@newme.id"
  password = "Password123!"
}
$results += [pscustomobject]@{
  test = "duplicate_email_register_start"
  pass = ($dup.status -eq 409 -and $dup.parsed.error -eq "AUTH_EMAIL_ALREADY_REGISTERED" -and ($dup.parsed.detail -like "Email ini sudah terdaftar*"))
  status = $dup.status
  code = $dup.parsed.error
  detail = $dup.parsed.detail
}

$email = "qa.user.$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com"
$start = Invoke-Api -Method "POST" -Url "$base/auth/register/start" -Body @{
  fullName = "QA User"
  email = $email
  password = "Password123!"
}
$token = [string]$start.parsed.data.registrationToken
$results += [pscustomobject]@{
  test = "register_start_success"
  pass = ($start.status -eq 201 -and -not [string]::IsNullOrWhiteSpace($token))
  status = $start.status
  code = ""
  detail = if ($start.status -eq 201) { "registrationToken received" } else { [string]$start.parsed.detail }
}

if (-not [string]::IsNullOrWhiteSpace($token)) {
  $invalid = Invoke-Api -Method "POST" -Url "$base/auth/register/verify-otp" -Body @{
    registrationToken = $token
    otp = "000000"
  }
  $results += [pscustomobject]@{
    test = "verify_otp_invalid"
    pass = ($invalid.status -eq 401 -and $invalid.parsed.error -eq "REGISTRATION_OTP_INVALID")
    status = $invalid.status
    code = $invalid.parsed.error
    detail = $invalid.parsed.detail
  }

  $cooldown = Invoke-Api -Method "POST" -Url "$base/auth/register/resend-otp" -Body @{
    registrationToken = $token
  }
  $results += [pscustomobject]@{
    test = "resend_otp_cooldown"
    pass = ($cooldown.status -eq 403 -and $cooldown.parsed.error -eq "REGISTRATION_OTP_RESEND_COOLDOWN")
    status = $cooldown.status
    code = $cooldown.parsed.error
    detail = $cooldown.parsed.detail
  }
} else {
  $results += [pscustomobject]@{
    test = "verify_otp_invalid"
    pass = $false
    status = 0
    code = "SKIPPED"
    detail = "missing token"
  }
  $results += [pscustomobject]@{
    test = "resend_otp_cooldown"
    pass = $false
    status = 0
    code = "SKIPPED"
    detail = "missing token"
  }
}

$reset = Invoke-Api -Method "POST" -Url "$base/auth/reset-password" -Body @{
  token = "invalid-token"
  password = "Password123!"
}
$results += [pscustomobject]@{
  test = "reset_password_invalid_token"
  pass = ($reset.status -eq 401 -and $reset.parsed.error -eq "PASSWORD_RESET_TOKEN_INVALID")
  status = $reset.status
  code = $reset.parsed.error
  detail = $reset.parsed.detail
}

$login = Invoke-Api -Method "POST" -Url "$base/auth/login" -Body @{
  email = "admin@newme.id"
  password = "wrong-password-123"
}
$results += [pscustomobject]@{
  test = "login_invalid_credentials"
  pass = ($login.status -eq 401 -and $login.parsed.error -eq "AUTH_INVALID_CREDENTIALS")
  status = $login.status
  code = $login.parsed.error
  detail = $login.parsed.detail
}

$yEmail = "qa.yayasan.$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com"
$yayasan = Invoke-Api -Method "POST" -Url "$base/yayasan/register/start" -Body @{
  fullName = "QA Yayasan"
  email = $yEmail
  password = "Password123!"
}
$results += [pscustomobject]@{
  test = "yayasan_register_requires_referral"
  pass = ($yayasan.status -eq 400 -and $yayasan.parsed.error -eq "YAYASAN_INVALID_MITRA_REFERRAL")
  status = $yayasan.status
  code = $yayasan.parsed.error
  detail = $yayasan.parsed.detail
}

$results | Format-Table -AutoSize
$failCount = ($results | Where-Object { -not $_.pass }).Count
Write-Output ("TOTAL=" + $results.Count + ";FAILED=" + $failCount)
