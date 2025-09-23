#!/bin/bash

# --- Configuration ---
# ❗️ IMPORTANT: Change this to the exact name of your main zip file.
MAIN_ZIP_FILE="hackathon.zip"
# The directory where the zip file is and where output folders will be created.
DATA_DIR="./data"

# --- Safety Check ---
if [ ! -f "${DATA_DIR}/${MAIN_ZIP_FILE}" ]; then
    echo "Error: Main zip file not found at ${DATA_DIR}/${MAIN_ZIP_FILE}"
    exit 1
fi

# --- Preparation ---
echo "Preparing directories inside '${DATA_DIR}'..."
cd "$DATA_DIR" || exit
mkdir -p tmp_nested_zips
mkdir -p eth
mkdir -p btc

# --- Main Logic ---
echo "Unzipping main file to a temporary location..."
unzip -q "$MAIN_ZIP_FILE" -d tmp_nested_zips

echo "Processing nested zip files..."
for nested_zip in tmp_nested_zips/*.zip; do
    filename=$(basename "$nested_zip")
    
    if [[ "$filename" == eth* ]]; then
        echo "  -> Unzipping $filename to eth/ folder..."
        unzip -q -o "$nested_zip" -d eth/
    elif [[ "$filename" == btc* ]]; then
        echo "  -> Unzipping $filename to btc/ folder..."
        unzip -q -o "$nested_zip" -d btc/
    else
        echo "  -> Skipping $filename (doesn't start with eth or btc)"
    fi
done

# --- Cleanup ---
echo "Cleaning up temporary files..."
rm -r tmp_nested_zips

echo "✅ Done. Your data is now organized in the 'eth' and 'btc' folders."