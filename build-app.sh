#!/bin/bash
# Baut Metronom.app (natives Fenster mit der index.html) samt Icon.
# Nach Änderungen an index.html einfach erneut ausführen.
set -euo pipefail
cd "$(dirname "$0")"

# Gebaut wird in einem temporären Ordner: iCloud hängt im Dokumente-Ordner
# Metadaten an, die das Signieren verhindern.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
APP="$TMP/Metronom.app"
BUILD="$TMP/build"
mkdir -p "$BUILD" "$APP/Contents/MacOS" "$APP/Contents/Resources"

# Icon zeichnen und in .icns umwandeln
swiftc -swift-version 5 -O app/make_icon.swift -o "$BUILD/make_icon"
"$BUILD/make_icon" icon.png
# Icons für iPhone / Web-App
mkdir -p icons
"$BUILD/make_icon" "$BUILD/full.png" full
sips -z 180 180 "$BUILD/full.png" --out icons/apple-touch-icon.png >/dev/null
sips -z 192 192 "$BUILD/full.png" --out icons/icon-192.png >/dev/null
sips -z 512 512 "$BUILD/full.png" --out icons/icon-512.png >/dev/null
ICONSET="$BUILD/AppIcon.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s icon.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) icon.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

# App kompilieren
swiftc -swift-version 5 -O app/main.swift -o "$APP/Contents/MacOS/Metronom"
cp -R index.html icon.png manifest.webmanifest icons "$APP/Contents/Resources/"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Metronom</string>
  <key>CFBundleDisplayName</key><string>Metronom</string>
  <key>CFBundleIdentifier</key><string>local.papa.metronom</string>
  <key>CFBundleExecutable</key><string>Metronom</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

xattr -cr "$APP"
codesign --force --deep --sign - "$APP"
rm -rf Metronom.app
ditto "$APP" Metronom.app
# Lauffähige Kopie außerhalb von iCloud: dort würde die Signatur sonst wieder ungültig.
rm -rf "$HOME/Applications/Metronom.app"
mkdir -p "$HOME/Applications"
ditto "$APP" "$HOME/Applications/Metronom.app"
echo "Fertig: $HOME/Applications/Metronom.app"
