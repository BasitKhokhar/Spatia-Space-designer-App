# HomePlanner

A production-oriented React Native (Expo) app for designing homes: draw 2D floor
plans, view them in interactive 3D, furnish from a catalog, and export
images / PDF / 3D models. Built from the HomePlanner design system (terracotta &
warm-bone, Sora + Manrope) with full light + dark support and all 26 screens.

> **Data is local-first.** Everything runs with no backend using MMKV persistence
> behind a swappable service layer (`src/services`). Point `API_BASE_URL` at a real
> API later without touching the screens.

## Requirements

- Node 20+ (tested on Node 22)
- A **custom Dev Client** — Skia, AdMob, MMKV, and expo-gl need native code, so
  **Expo Go will not work**. Use `expo run:android` / `expo run:ios` or an EAS
  development build.
- Android Studio / Xcode for local native builds.

## Setup

```bash
cd Frontend
npm install

# Reconcile every native package to the versions your installed Expo SDK expects.
# This is the source of truth for versions — run it after install.
npx expo install --fix

# (placeholder app icons/splash are generated already; regenerate if needed)
node scripts/genAssets.js

# Build + run a dev client
npx expo run:android      # or: npx expo run:ios
```

`.env` is optional — copy `.env.example` to `.env` to override AdMob IDs,
`API_BASE_URL`, and legal links. Google **test** AdMob IDs are used by default so
rewarded ads work in development.

## Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | Expo SDK 54 + Dev Client, New Architecture          |
| Navigation     | React Navigation 7 (native-stack + custom tab bar)  |
| State          | Zustand + `react-native-mmkv` persistence           |
| 2D editor      | `@shopify/react-native-skia` + Gesture Handler      |
| 3D view        | `three` + `@react-three/fiber` + `expo-gl`          |
| Animation      | Reanimated 4 (`react-native-worklets`)              |
| Sheets         | `@gorhom/bottom-sheet`                              |
| Ads / credits  | `react-native-google-mobile-ads` (rewarded + UMP)   |
| Export         | view-shot (PNG), expo-print (PDF), OBJ writer       |
| Fonts          | Sora + Manrope via `@expo-google-fonts`             |

## Project structure

```
src/
  navigation/   RootNavigator (auth gating + offline gate), TabBar, routes, linking
  screens/      all 26 screens grouped by flow
  components/   ui/ (design-system kit), icons/, graphics/, catalog/, sheets/, project/, feedback/
  three/        Room3D scene, camera rig, lighting presets
  theme/        color tokens, typography, spacing/radius/shadows, ThemeProvider
  store/        Zustand stores (auth, projects, credits, settings) + MMKV adapter
  services/     api/ (stub seam), ads/ (AdMob + consent), export/, auth/ (social stubs)
  domain/       floorplan model (shared by 2D editor, 3D view, OBJ export), units
  data/         catalog, templates, room types, FAQs
  hooks/ utils/ constants/
```

## The 26 screens

Splash · 4× Onboarding · Login · Sign Up · Forgot Password · OTP · Home (+ empty
state) · New Project (blank/template) · Room Type · Dimensions · 2D Floor Plan
Editor · 3D View · Catalog · Item Placement sheet · Export · Earn Credits ·
Paywall sheet · Profile · Settings · Help & Support · Delete Account · Offline.

## Google Play compliance (through 2026)

- **Account deletion**: in-app (`Delete Account`, type-to-confirm) — also expose a
  web deletion URL (`src/constants/links.js`).
- **Ads consent**: UMP/GDPR consent + iOS App Tracking Transparency run before ads
  (`src/services/ads/admob.js`, called from `App.jsx`).
- **Legal links**: Privacy Policy + Terms in Settings — replace the placeholder
  URLs in `src/constants/links.js`.
- **Rewarded ads**: labeled, capped at 5/day, using Google test units until you
  drop in real ad unit IDs (`src/constants/adUnits.js`, `app.config.js`).
- Set your real Android target SDK / signing via EAS before submitting.

## Verification checklist

1. `npx expo install --fix` and `npx expo-doctor` are clean.
2. Dev client boots to Splash → Onboarding.
3. Sign up (local) → Home empty state → create a project (template → room type →
   dimensions) → 2D editor draws the room and lets you drag furniture.
4. Add a sofa from Catalog → tap it in the editor → edit color/rotation/scale in
   the sheet.
5. Switch to 3D → orbit, pinch-zoom, toggle Golden Hour / Night, Walk Mode.
6. Export → watch a (test) rewarded ad to earn a credit → export PNG (saved to
   gallery) and PDF (shared).
7. Toggle Light/Dark/System in Settings — all screens re-theme.
8. Enable airplane mode → offline gate appears; disable → dismisses.
9. Delete Account type-to-confirm wipes local data and returns to auth.

## Replace before release

- `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` (1024×1024).
- Real AdMob app + ad-unit IDs.
- Hosted Privacy Policy / Terms / account-deletion URLs.
- `extra.eas.projectId` in `app.config.js`.
