#!/bin/bash

set -euo pipefail

# Change to the project root directory
cd "$(dirname "$0")/.."

# Determine source icon file (prefer SVG, fallback to PNG)
if [ -f "build/icon.svg" ]; then
  ICON_SOURCE="build/icon.svg"
  echo "Generating icons from build/icon.svg..."
elif [ -f "build/icon.png" ]; then
  ICON_SOURCE="build/icon.png"
  echo "Generating icons from build/icon.png..."
else
  echo "Error: No icon source found!"
  echo "Please add either build/icon.svg or build/icon.png"
  exit 1
fi

## macOS
echo "Generating macOS icons..."
rm -rf build/icon.iconset
mkdir -p build/icon.iconset
for i in 16 32 64 128 256 512 1024; do
  # Calculate 10% border (padding)
  border=$((i * 10 / 100))
  size=$((i - 2 * border))
  half=$((i / 2))
  if [[ $i -ne 1024 ]]; then
    magick -background none "$ICON_SOURCE" -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" "build/icon.iconset/icon_${i}x${i}.png"
  fi
  if [[ $i -ne 16 ]]; then
    magick -background none "$ICON_SOURCE" -density 400 -resize "${size}x${size}" -bordercolor transparent -border "${border}" "build/icon.iconset/icon_${half}x${half}@2x.png"
  fi
done
iconutil --convert icns -o build/icon.icns build/icon.iconset
rm -rf build/icon.iconset
echo "✅ Generated build/icon.icns"

## Windows
echo "Generating Windows icon..."
magick -background none "$ICON_SOURCE" -density 400 -define icon:auto-resize=256,16,20,24,32,40,48,60,64,72,80,96 build/icon.ico
echo "✅ Generated build/icon.ico"

## Linux
echo "Generating Linux icon..."
if [ "$ICON_SOURCE" != "build/icon.png" ]; then
  magick -background none "$ICON_SOURCE" -density 400 -resize "512x512" build/icon.png
  echo "✅ Generated build/icon.png"
else
  echo "✅ Using existing build/icon.png"
fi

echo ""
echo "All icons generated successfully!"
echo "Next step: npm run build:mac"