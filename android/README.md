# Android Trusted Web Activity

The Android package ID is `com.rubavutoday.app` and its web origin is `https://www.rubavutoday.com/`. A signed APK is not included in this repository. Do not publish the APK download link until a release-signed APK has been built and uploaded.

## Build a release APK on Windows

Install a supported JDK, Android SDK, and Bubblewrap CLI. Confirm that `java`, `keytool`, and the Android SDK tools are available in PowerShell, then run:

```powershell
Set-Location C:\Rubavutoday\Rubavu-Today
npm install --global @bubblewrap/cli
bubblewrap doctor
keytool -genkeypair -v -keystore .\android\rubavu-today-release.keystore -alias rubavu-today -keyalg RSA -keysize 2048 -validity 10000
Set-Location .\android
bubblewrap init --manifest https://www.rubavutoday.com/manifest.json
```

During initialization, use package ID `com.rubavutoday.app`, host `www.rubavutoday.com`, start URL `/`, launcher name `Rubavu Today`, and the release keystore and alias above. Keep the keystore and its passwords private and backed up; never commit them. Apply the branding and signing settings in `twa-manifest.template.json` to the generated `twa-manifest.json`, then build:

```powershell
bubblewrap build
```

Bubblewrap requires Android SDK build tools and may prompt for keystore passwords. The release APK is normally generated at `android\app\build\outputs\apk\release\app-release-signed.apk`.

## Verify and host the APK

Read the SHA-256 fingerprint from the same release keystore used to sign the APK:

```powershell
Set-Location C:\Rubavutoday\Rubavu-Today
keytool -list -v -keystore .\android\rubavu-today-release.keystore -alias rubavu-today
```

Replace `REPLACE_WITH_RELEASE_KEY_SHA256_FINGERPRINT` in `assetlinks.json.template` with the exact SHA-256 fingerprint printed by `keytool`. Publish the resulting JSON at `https://www.rubavutoday.com/.well-known/assetlinks.json`, with the correct JSON content type. Do not publish the template placeholder. The file must remain available without redirects and name the same package ID and release certificate used to sign the APK.

Create the deployable association file from the template after replacing the fingerprint:

```powershell
Set-Location C:\Rubavutoday\Rubavu-Today
$fingerprint = Read-Host "Paste the SHA-256 fingerprint from keytool"
if ($fingerprint -notmatch '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$') { throw "Invalid SHA-256 fingerprint" }
$assetLinks = (Get-Content .\android\assetlinks.json.template -Raw).Replace("REPLACE_WITH_RELEASE_KEY_SHA256_FINGERPRINT", $fingerprint)
New-Item -ItemType Directory -Force .\public\.well-known | Out-Null
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "public\.well-known\assetlinks.json"), $assetLinks, $utf8)
```

Copy the signed APK into the React public directory and enable the HTTPS download link only after that file is ready to ship:

```powershell
New-Item -ItemType Directory -Force .\public\apk | Out-Null
Copy-Item .\android\app\build\outputs\apk\release\app-release-signed.apk .\public\apk\rubavu-today.apk
$env:REACT_APP_ANDROID_APK_URL = "https://www.rubavutoday.com/apk/rubavu-today.apk"
npm run build
```

Deploy the generated `build` directory only after the APK is included and the public HTTPS URL returns that APK rather than the SPA fallback. Configure `REACT_APP_ANDROID_APK_URL` in the production build environment to the same HTTPS URL. Validate the APK download and `/.well-known/assetlinks.json` over HTTPS after the authorized deployment.
