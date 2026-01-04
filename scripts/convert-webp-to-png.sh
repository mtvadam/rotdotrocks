#!/bin/bash

# Script to convert WebP files (with .png extension) to actual PNG format
# Required: dwebp (from webp package)

DIR="/Users/mtvadam/Desktop/CursorProjects/RotDotRocks/public/brainrot-images/brainrots"
cd "$DIR" || exit 1

converted=0
skipped=0

for f in *.png; do
    if [ ! -f "$f" ]; then
        continue
    fi

    # Check if file is WebP format
    if file "$f" | grep -q "Web/P"; then
        # Convert WebP to PNG
        dwebp "$f" -o "${f%.png}_temp.png" 2>/dev/null
        if [ $? -eq 0 ]; then
            mv "${f%.png}_temp.png" "$f"
            converted=$((converted + 1))
            echo "Converted: $f"
        else
            echo "Failed: $f"
        fi
    else
        skipped=$((skipped + 1))
    fi
done

echo ""
echo "Conversion complete!"
echo "Converted: $converted files"
echo "Skipped (already PNG): $skipped files"
