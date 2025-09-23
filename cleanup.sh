#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
SRC="$ROOT/hackathon"   # where your zips are now
BTC="$ROOT/btc"
ETH="$ROOT/eth"

mkdir -p "$BTC" "$ETH"

# helper: unzip with either unzip or PowerShell Expand-Archive
unzip_into() {
  local zipfile="$1" dest="$2"
  if command -v unzip >/dev/null 2>&1; then
    unzip -o "$zipfile" -d "$dest" >/dev/null
  else
    pwsh -NoProfile -Command "Expand-Archive -Force '$zipfile' '$dest'" 2>$NULL
  fi
}

shopt -s nullglob

echo "== Extracting BTC zips =="
for z in "$SRC"/btc-*.zip; do
  echo "  -> $(basename "$z")"
  unzip_into "$z" "$BTC"
done

echo "== Extracting ETH zips =="
for z in "$SRC"/eth-*.zip; do
  echo "  -> $(basename "$z")"
  unzip_into "$z" "$ETH"
done

echo "== Moving any loose CSVs from hackathon into btc/eth =="
for f in "$SRC"/btc-*.*; do [ -e "$f" ] && mv -v "$f" "$BTC"/ || true; done
for f in "$SRC"/eth-*.*; do [ -e "$f" ] && mv -v "$f" "$ETH"/ || true; done

echo "== Extracting nested .csv.zip =="
for z in "$BTC"/*.csv.zip "$ETH"/*.csv.zip; do
  [ -e "$z" ] || continue
  echo "  -> $(basename "$z")"
  unzip_into "$z" "$(dirname "$z")"
  rm -f "$z"
done

echo "== Extracting .csv.gz if present =="
for gz in "$BTC"/*.csv.gz "$ETH"/*.csv.gz; do
  [ -e "$gz" ] || continue
  echo "  -> $(basename "$gz")"
  if command -v gunzip >/dev/null 2>&1; then
    gunzip -f "$gz"
  else
    # PowerShell fallback
    base="${gz%.gz}"
    pwsh -NoProfile -Command "Get-Content -Raw '$gz' | Set-Content -NoNewline '$base'"
    rm -f "$gz"
  fi
done

echo "== Normalize filenames (lowercase, spaces->underscores) =="
normalize_dir() {
  find "$1" -type f -name "*.csv" | while read -r p; do
    base="$(basename "$p")"
    low="$(echo "$base" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' )"
    if [ "$base" != "$low" ]; then mv -f "$p" "$(dirname "$p")/$low"; fi
  done
}
normalize_dir "$BTC"
normalize_dir "$ETH"

echo "== Done =="
echo "BTC files: $(find "$BTC" -type f -name '*.csv' | wc -l)"
echo "ETH files: $(find "$ETH" -type f -name '*.csv' | wc -l)"
