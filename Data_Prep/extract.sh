#!/bin/bash

folder="/scratch/sws0/user/afkhan/RoPE_Pct/Datasets/FineWeb_100B.jsonl"
# folder="/scratch/sws0/user/afkhan/RoPE_Pct/Datasets/FineWeb_Edu_100B.jsonl"

# Change to the correct directory
cd "$folder" || { echo "Folder not found: $folder"; exit 1; }

# Get list of files
files=(*.jsonl.gz)
total=${#files[@]}

echo "Found $total files to extract:"
for file in "${files[@]}"; do
    echo "$file"
done

read -p "Do you want to extract these files in parallel? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
    echo "Extraction cancelled."
    exit 0
fi

echo "Starting parallel extraction of $total files..."

# Use GNU parallel for fast decompression
printf "%s\n" "${files[@]}" | parallel --bar -j "$(nproc)" 'gunzip -k {}'

echo -e "\nAll files extracted."