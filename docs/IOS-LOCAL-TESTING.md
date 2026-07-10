# Testing on iPhone via local Xcode build (no paid Apple Developer account)

Free Apple ID + Xcode "Personal Team" signing, straight to your physical
iPhone over USB. No EAS, no $99/yr Developer Program. Signature expires
after 7 days — replug and re-run step 6 weekly to keep testing.

## 1. Get the repo onto the Mac

Same repo, same branch (includes the `app.json` iOS permission-plugin fix
and the progress-screen redesign). `git pull` / clone as usual.

## 2. Install prerequisites

```sh
xcode-select --install
sudo gem install cocoapods
brew install watchman   # optional, recommended for React Native
```

Xcode itself: install from the Mac App Store if not already present.

## 3. Install deps and prebuild the iOS project

This repo uses Continuous Native Generation — there's no committed `ios/`
folder (same as `android/`), so it's generated fresh:

```sh
npm install
npx expo prebuild --clean --platform ios
```

## 4. Sign in with your free Apple ID in Xcode

Xcode → Settings → Accounts → add your Apple ID. No paid membership needed
for this — this is what enables the free "Personal Team" signing.

## 5. Connect the iPhone

Plug in via USB. On the phone, tap **Trust** when prompted to trust the Mac.

## 6. Build and run to the device

```sh
npx expo run:ios --device
```

Pick your iPhone from the device list when prompted. Xcode auto-selects
your free Personal Team for signing.

## 7. If the app refuses to launch on the phone

Settings → General → VPN & Device Management → trust the developer
certificate under your Apple ID.

## 8. Metro / JS bundle

Same dev-client model as Android testing:

```sh
npm start
```

Keep it running. The dev client finds it automatically over the same
Wi-Fi/USB connection — no `adb reverse` equivalent needed on iOS.

## Weekly renewal

Free-account signing certs expire after 7 days. When the app stops
launching after a week, just replug the iPhone and re-run:

```sh
npx expo run:ios --device
```
