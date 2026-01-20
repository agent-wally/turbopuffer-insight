#!/bin/bash

# Script to generate properly sized macOS icons from a source PNG
# Adds 12% padding around the icon to match macOS design guidelines
# Usage: ./scripts/generate-icons.sh path/to/source-icon.png [padding-percentage]

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <source-png-file> [padding-percentage]"
  echo "Example: $0 icon-source.png 12"
  echo ""
  echo "Default padding is 12% (recommended for macOS icons)"
  exit 1
fi

SOURCE_PNG="$1"
PADDING="${2:-12}"  # Default 12% padding

if [ ! -f "$SOURCE_PNG" ]; then
  echo "Error: File '$SOURCE_PNG' not found"
  exit 1
fi

echo "Generating icons from $SOURCE_PNG with ${PADDING}% padding..."

# Create temporary iconset directory
ICONSET_DIR="build/icon.iconset"
TEMP_DIR="/tmp/icon-gen-$$"
rm -rf "$ICONSET_DIR" "$TEMP_DIR"
mkdir -p "$ICONSET_DIR" "$TEMP_DIR"

# Function to create icon with padding
create_icon_with_padding() {
  local size=$1
  local output=$2
  local canvas_size=$size
  local icon_size=$(echo "$size * (100 - $PADDING) / 100" | bc)
  local offset=$(echo "($size - $icon_size) / 2" | bc)

  # Create a transparent canvas
  sips -z $canvas_size $canvas_size "$SOURCE_PNG" --out "$TEMP_DIR/temp.png" > /dev/null 2>&1

  # Resize the icon to smaller size (with padding)
  sips -z $icon_size $icon_size "$SOURCE_PNG" --out "$TEMP_DIR/resized.png" > /dev/null 2>&1

  # Use sips to pad (create canvas and overlay)
  # Since sips doesn't support compositing, we'll use a simpler approach:
  # Just resize to a smaller percentage of the target size
  local padded_size=$(echo "$size * (100 - $PADDING) / 100" | bc)
  sips -z $padded_size $padded_size "$SOURCE_PNG" --out "$TEMP_DIR/small.png" > /dev/null 2>&1
  sips -p $size $size "$TEMP_DIR/small.png" --out "$output" > /dev/null 2>&1
}

# Generate all required sizes with padding
echo "Generating 16x16..."
create_icon_with_padding 16 "$ICONSET_DIR/icon_16x16.png"
echo "Generating 32x32 (@2x for 16x16)..."
create_icon_with_padding 32 "$ICONSET_DIR/icon_16x16@2x.png"
echo "Generating 32x32..."
create_icon_with_padding 32 "$ICONSET_DIR/icon_32x32.png"
echo "Generating 64x64 (@2x for 32x32)..."
create_icon_with_padding 64 "$ICONSET_DIR/icon_32x32@2x.png"
echo "Generating 128x128..."
create_icon_with_padding 128 "$ICONSET_DIR/icon_128x128.png"
echo "Generating 256x256 (@2x for 128x128)..."
create_icon_with_padding 256 "$ICONSET_DIR/icon_128x128@2x.png"
echo "Generating 256x256..."
create_icon_with_padding 256 "$ICONSET_DIR/icon_256x256.png"
echo "Generating 512x512 (@2x for 256x256)..."
create_icon_with_padding 512 "$ICONSET_DIR/icon_256x256@2x.png"
echo "Generating 512x512..."
create_icon_with_padding 512 "$ICONSET_DIR/icon_512x512.png"
echo "Generating 1024x1024 (@2x for 512x512)..."
create_icon_with_padding 1024 "$ICONSET_DIR/icon_512x512@2x.png"

# Convert to icns
echo "Converting to .icns..."
iconutil -c icns "$ICONSET_DIR" -o build/icon.icns

# Clean up
rm -rf "$ICONSET_DIR" "$TEMP_DIR"

echo "✅ Successfully generated build/icon.icns with ${PADDING}% padding"
echo ""
echo "Next steps:"
echo "1. Rebuild your app: npm run build:mac"
echo "2. Check the icon in Finder"
echo ""
echo "If the icon is still too big/small, adjust padding:"
echo "  Too big: ./scripts/generate-icons.sh $SOURCE_PNG 15"
echo "  Too small: ./scripts/generate-icons.sh $SOURCE_PNG 8"

