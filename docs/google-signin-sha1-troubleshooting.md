# Google Sign-In "DEVELOPER_ERROR" — SHA-1 Troubleshooting Playbook

Use this whenever Google Sign-In works on a local/dev build but fails with
`DEVELOPER_ERROR` (or silently fails) on a build downloaded from Play Console
(internal/closed/open testing or production).

## Root cause this playbook catches

Play Console's App integrity page can show a SHA-1 that is **not** the
certificate actually signing the APK real users download. This was seen on
two apps where the "App signing key" card's "Classical key" SHA-1 (under the
"Quantum-ready (beta)" section) did not match the real cert pulled off an
installed build.

**Important correction:** the "Install base %" shown next to a key is
**not** a reliable signal of whether that key is actually in use — a third,
already-published, working app was also observed showing 0% install base
with no "Previous app signing keys" section at all, and Google Sign-In
worked fine for it. So don't use "Install base %" or the presence/absence of
a "Previous app signing keys" section to diagnose anything — that metric
appears to be about Quantum-ready/PQC adoption in general, not about which
key is really signing your shipped app.

**The only reliable method is the direct ground-truth comparison below:**
pull the real installed APK, extract its actual signing certificate with
`apksigner`, and compare that value — not anything read off a Play Console
label — against what's registered in Firebase/Google Cloud Console.

---

## Step 0 — One-time setup (per laptop)

1. Install Android SDK Platform Tools (gives you `adb`) and Android SDK
   Build Tools (gives you `apksigner`) — both come bundled with Android
   Studio, or can be installed standalone via `sdkmanager`.
2. Enable Developer Options + USB debugging on the test phone:
   - Settings → About phone → tap "Build number" 7 times
   - Settings → Developer Options → enable "USB debugging"
3. Plug the phone into the laptop via USB and accept the "Allow USB
   debugging?" prompt on the phone screen.
4. Confirm the device is detected:

   ```powershell
   adb devices
   ```

   Sample output:
   ```
   List of devices attached
   R58R84D21HF     device
   ```

   If it shows `unauthorized` instead of `device`, check the phone screen
   for the debugging prompt and tap Allow.

Known tool locations on this laptop:
```
adb:        C:\Users\Qc\AppData\Local\Android\Sdk\platform-tools\adb.exe   (already on PATH)
apksigner:  C:\Users\Qc\AppData\Local\Android\Sdk\build-tools\36.0.0\apksigner.bat
keytool:    C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin\keytool.exe (already on PATH)
```

> Note: `keytool -printcert -jarfile` only reads the old v1 (JAR) signing
> scheme. Modern Android App Bundles are usually signed with v2/v3 only, so
> `keytool` will print `Not a signed jar file` — that's expected, not an
> error. Use `apksigner` instead (below).
>
> Also avoid `build-tools\37.0.0\apksigner` — it errors on the newer
> "v3.2 Hybrid PQC" signature block with
> `NoSuchAlgorithmException: ML-DSA KeyFactory not available`. Use
> `36.0.0` or `35.0.0` instead.

---

## Step 1 — Install the build you want to check

Install the actual build in question on the phone (e.g. the closed-testing
APK/AAB downloaded via the Play Console testing link, or the live production
app from the Play Store). Open it at least once so it's registered under its
package name.

---

## Step 2 — Find the installed APK's path on the device

```powershell
adb shell pm path <package.name>
```

Example:
```powershell
adb shell pm path com.spatia3dspacedesigner.app
```

Sample output:
```
package:/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesigner.app-agi_nRterAnAvv0xsdBd3g==/base.apk
package:/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesigner.app-agi_nRterAnAvv0xsdBd3g==/split_config.arm64_v8a.apk
package:/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesigner.app-agi_nRterAnAvv0xsdBd3g==/split_config.en.apk
package:/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesigner.app-agi_nRterAnAvv0xsdBd3g==/split_config.xhdpi.apk
```

Only the line ending in `base.apk` matters — that's the one carrying the
signing certificate.

---

## Step 3 — Pull the APK to the laptop

Copy the **exact** `base.apk` path from Step 2's output (it's unique per
install — don't reuse an old path from a previous app/session) and run:

```powershell
adb pull "<full-base.apk-path-from-step-2>" myapp.apk
```

Example:
```powershell
adb pull "/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesigner.app-agi_nRterAnAvv0xsdBd3g==/base.apk" myapp.apk
```

Sample output:
```
/data/app/~~kOE7ZB6YLUlQANdWm9aGCQ==/com.spatia3dspacedesi...le pulled, 0 skipped. 13.2 MB/s (68637714 bytes in 4.969s)
```

Use a different local filename per app (e.g. `spatia.apk`,
`dingdingdue.apk`) if you're checking more than one app so you don't
overwrite files.

---

## Step 4 — Print the real signing certificate

```powershell
& "C:\Users\Qc\AppData\Local\Android\Sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs myapp.apk
```

Sample output:
```
Signer #1 certificate DN: CN=Android, OU=Android, O=Google Inc., L=Mountain View, ST=California, C=US
Signer #1 certificate SHA-256 digest: f7c7e264d1a5caa11998fa4053c6ba7c2f2f23246262dbe8ac331b436374992b
Signer #1 certificate SHA-1 digest: 6cb0f5a87225b82532697916547d0ddc27913135
Signer #1 certificate MD5 digest: ac345e6c6df0809ae79bf171746a8bd8
Source Stamp Signer certificate DN: CN=Android, OU=Android, O=Google Inc., L=Mountain View, ST=California, C=US
...
WARNING: APK Signature Scheme v3 signer #1: Unknown additional attribute: ID 0xbf940529
WARNING: APK Signature Scheme v3 signer #1: Unknown additional attribute: ID 0x9f06b79c
```

Take the **`Signer #1 certificate SHA-1 digest`** line — that is the real,
ground-truth cert currently signing what real users install. Ignore the
"Source Stamp Signer" line (that's Google Play's own distribution stamp, not
your app's signing cert) and the two `WARNING` lines (harmless, related to
newer signature-scheme metadata attributes).

Format it with colons for easy comparison, e.g.
`6cb0f5a87225b82532697916547d0ddc27913135` becomes:
```
6C:B0:F5:A8:72:25:B8:25:32:69:79:16:54:7D:0D:DC:27:91:31:35
```

---

## Step 5 — Compare against what's registered

Check this exact value (case-insensitive, but compare digit-by-digit) in:

1. **Firebase Console → Project Settings → your Android app → SHA
   certificate fingerprints**
2. **Google Cloud Console → APIs & Services → Credentials** → the
   Android-type OAuth 2.0 client for this package name, in the same project
   as the Web client ID your app uses for `webClientId`.

If the value from Step 4 is missing from Firebase/GCP, that is the bug.

Do **not** try to cross-check or diagnose this using Play Console's App
integrity page (the "Classical key" / "Install base %" / "Previous app
signing keys" labels). That page has proven unreliable: on two apps its
"Classical key" SHA-1 didn't match the real installed cert, while on a
third, already-published, correctly-working app it showed 0% install base
with no previous-keys section at all — meaning that percentage is not a
signal of which key is actually signing your app. Treat the Step 4
`apksigner` output as the only source of truth, full stop.

---

## Step 6 — Fix

1. Firebase Console → Project Settings → the Android app → SHA certificate
   fingerprints → **Add fingerprint** → paste the Step 4 value.
2. Confirm it syncs into the matching Android OAuth client under Google
   Cloud Console → Credentials (usually automatic within a minute or two —
   refresh the page to check).
3. Wait ~2–5 minutes for propagation.
4. Retest sign-in on the **same already-installed build** — no rebuild or
   re-upload needed, since this check happens live against Google's servers
   each time, not against anything baked into the APK.

---

## Other things to double check if the SHA-1 already matches

- **OAuth consent screen publishing status** (Google Cloud Console → APIs &
  Services → OAuth consent screen). If it's still in "Testing" mode, only
  accounts explicitly added under "Test users" can sign in — everyone else
  is blocked, which can look identical to a config error.
- **Internal App Sharing vs testing tracks**: Play Console's standalone
  "Internal app sharing" feature (a separate link-sharing mechanism, not the
  Internal/Closed/Open testing *tracks*) signs APKs with a **different,
  dedicated certificate**. If you ever distribute via that feature, repeat
  this whole process against a build installed from that link — it needs
  its own SHA-1 registered separately.
- **Package name typos** in the Android OAuth client (case-sensitive, no
  trailing spaces) — must exactly match the app's `applicationId`.
- The signing cert (and therefore this whole check) is **the same for every
  real user** downloading through standard Play distribution — it's not
  per-device or per-account, so fixing it once via Firebase/GCP fixes it for
  all users on that release track.

---

## Known SHA-1 history (update this table each time you check)

| App / package | Real signing SHA-1 (from apksigner) | Date checked | Notes |
|---|---|---|---|
| com.spatia3dspacedesigner.app | `6C:B0:F5:A8:72:25:B8:25:32:69:79:16:54:7D:0D:DC:27:91:31:35` | 2026-09-05 | Fixed — was previously mis-registered with the 0%-install-base "Quantum-ready" Classical key SHA-1 |
| com.dingdingdue.app | `22:41:79:6F:15:0A:F6:E8:5B:88:FA:ED:EC:07:B0:85:00:11:30:BA` | 2026-09-05 | Same Quantum-ready-card trap; fix applied |
