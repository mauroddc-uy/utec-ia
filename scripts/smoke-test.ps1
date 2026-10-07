param(
    [string] $BaseUrl = "http://127.0.0.1:8080",
    [string] $ExpectedVersion = "",
    [string] $ExpectedCommit = ""
)

$ErrorActionPreference = "Stop"

function Invoke-WithRetry {
    param(
        [scriptblock] $Action,
        [int] $Attempts = 20,
        [int] $DelaySeconds = 2
    )

    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            return & $Action
        }
        catch {
            if ($i -eq $Attempts) {
                throw
            }

            Start-Sleep -Seconds $DelaySeconds
        }
    }
}

$frontend = Invoke-WithRetry { Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing }
if ($frontend.Content -notmatch "UTECia") {
    throw "El frontend no contiene la interfaz esperada."
}

$health = Invoke-WithRetry { Invoke-RestMethod -Uri "$BaseUrl/health" }
if ($health.status -ne "ok") {
    throw "Health check no esta OK."
}

$version = Invoke-WithRetry { Invoke-RestMethod -Uri "$BaseUrl/version" }
if ($version.application -ne "UTEC_IA") {
    throw "Version endpoint no corresponde a UTEC_IA."
}

if ($ExpectedVersion -and $version.version -ne $ExpectedVersion) {
    throw "Version esperada $ExpectedVersion, obtenida $($version.version)."
}

if ($ExpectedCommit -and $version.commit -ne $ExpectedCommit) {
    throw "Commit esperado $ExpectedCommit, obtenido $($version.commit)."
}

$body = @{
    message = "cuantos creditos tengo"
    user_email = " estudiante@utec.edu.uy "
} | ConvertTo-Json

$chat = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/chat" `
    -ContentType "application/json" `
    -Body $body

if ($chat.response -notmatch "245 creditos aprobados") {
    throw "El chat no devolvio la respuesta academica esperada."
}

Write-Host "Smoke OK: $BaseUrl"
