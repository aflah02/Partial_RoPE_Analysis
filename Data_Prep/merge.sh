#!/bin/bash

set -euo pipefail  # Improved error handling: exit on error, undefined vars, pipe failures

# --- Config ---
input_dir="Datasets/FineWeb_100B.jsonl"            # Folder with .jsonl files
output_file="Datasets/FineWeb_100B_Merged.jsonl"   # Final merged file
log_file="FineWeb_100B_Merged.log"                                                    # Log of included files
tmp_dir="./merge_chunks_FineWeb_100B_Merged"                                          # Temporary dir for parallel chunks
chunk_size=5                                                                          # Files per chunk
max_jobs=$(nproc)                                                                     # Parallel jobs

# --- Config ---
# input_dir="Datasets/FineWeb_Edu_100B.jsonl"            # Folder with .jsonl files
# output_file="Datasets/FineWeb_Edu_100B_Merged.jsonl"   # Final merged file
# log_file="FineWeb_Edu_100B_Merged.log"                                                    # Log of included files
# tmp_dir="./merge_chunks_FineWeb_Edu_100B_Merged"                                          # Temporary dir for parallel chunks
# chunk_size=5                                                                              # Files per chunk
# max_jobs=$(nproc)                                                                         # Parallel jobs

# --- Functions ---
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
    if [[ -d "$tmp_dir" ]]; then
        log_with_timestamp "Cleaning up temporary files..."
        rm -rf "$tmp_dir"
    fi
}

# Set up cleanup on exit
trap cleanup EXIT

# Validate dependencies
command -v parallel >/dev/null 2>&1 || { echo "Error: GNU parallel is required but not installed."; exit 1; }
command -v pv >/dev/null 2>&1 || { echo "Error: pv (pipe viewer) is required but not installed."; exit 1; }

# --- Setup ---
log_with_timestamp "Starting merge process..."
log_with_timestamp "Input directory: $input_dir"
log_with_timestamp "Output file: $output_file"

# Validate input directory
if [[ ! -d "$input_dir" ]]; then
    echo "Error: Input directory '$input_dir' not found!"
    exit 1
fi

# Create output directory if needed
output_dir=$(dirname "$output_file")
mkdir -p "$output_dir"

# Convert tmp_dir to absolute path if it's relative
if [[ "$tmp_dir" != /* ]]; then
    tmp_dir="$(pwd)/$tmp_dir"
fi

# Create temporary directory
mkdir -p "$tmp_dir"

# --- Collect .jsonl files ---
files=("$input_dir"/*.jsonl)
total=${#files[@]}

# Check if glob found actual files (not literal *.jsonl)
if [[ $total -eq 1 && "${files[0]}" == "$input_dir/*.jsonl" ]]; then
    echo "Error: No .jsonl files found in $input_dir"
    exit 1
fi

log_with_timestamp "Found $total files to merge."
log_with_timestamp "Logging merged files to $log_file"

# Initialize log file with header
{
    echo "# Merge log started at $(date)"
    echo "# Input directory: $input_dir"
    echo "# Output file: $output_file"
    echo "# Total files: $total"
    echo "# Files processed:"
} > "$log_file"

# --- Estimate total size for progress ---
log_with_timestamp "Calculating total size..."
total_size=$(du -cb "${files[@]}" 2>/dev/null | grep total | awk '{print $1}')
total_size_gb=$(echo "scale=2; $total_size / 1024^3" | bc -l 2>/dev/null || echo "unknown")

log_with_timestamp "Total size: $total_size bytes (~${total_size_gb} GB)"

# --- Split file list for parallel processing ---
log_with_timestamp "Splitting files into chunks of $chunk_size..."
# Convert full paths to just filenames for processing, but keep full paths for the split
printf "%s\n" "${files[@]}" | split -l "$chunk_size" - "$tmp_dir/file_chunk_"

chunk_count=$(find "$tmp_dir" -name 'file_chunk_*' | wc -l)
log_with_timestamp "Created $chunk_count chunks for parallel processing with $max_jobs jobs"

# --- Parallel merge each chunk with pv ---
log_with_timestamp "Starting parallel merge..."
start_time=$(date +%s)

find "$tmp_dir" -name 'file_chunk_*' | parallel --bar --jobs "$max_jobs" '
    chunk_file={}
    chunk_id=$(basename "$chunk_file" | cut -d"_" -f3)
    out_chunk="'"$tmp_dir"'/merged_chunk_$chunk_id.jsonl"
    
    # Process each file in the chunk
    while IFS= read -r filepath; do
        if [[ -f "$filepath" ]]; then
            filename=$(basename "$filepath")
            echo "$(date "+%Y-%m-%d %H:%M:%S") $filename" >> "'"$log_file"'"
            cat "$filepath" >> "$out_chunk" 2>/dev/null || {
                echo "Warning: Failed to process $filepath" >&2
                continue
            }
        else
            echo "Warning: File $filepath not found" >&2
        fi
    done < "$chunk_file"
'

end_time=$(date +%s)
duration=$((end_time - start_time))
log_with_timestamp "Parallel processing completed in ${duration} seconds"

# --- Concatenate all merged chunks ---
log_with_timestamp "Starting final concatenation..."

# Verify all chunks exist
chunk_files=("$tmp_dir"/merged_chunk_*.jsonl)
if [[ ${#chunk_files[@]} -eq 0 || ! -f "${chunk_files[0]}" ]]; then
    echo "Error: No merged chunk files found!"
    exit 1
fi

# Sort chunks by number to ensure correct order
chunk_files=($(printf "%s\n" "${chunk_files[@]}" | sort -V))

# Concatenate with progress
{
    for chunk in "${chunk_files[@]}"; do
        if [[ -f "$chunk" ]]; then
            cat "$chunk"
        else
            echo "Warning: Chunk file $chunk not found" >&2
        fi
    done
} > "$output_file"

# Verify output file was created and has content
if [[ ! -f "$output_file" ]]; then
    echo "Error: Output file was not created!"
    exit 1
fi

output_size=$(stat -c%s "$output_file" 2>/dev/null || echo "0")
output_lines=$(wc -l < "$output_file" 2>/dev/null || echo "0")

log_with_timestamp "Successfully merged $total files into $output_file"
log_with_timestamp "Output file size: $output_size bytes"
log_with_timestamp "Output file lines: $output_lines"

# Add summary to log file
{
    echo "# Merge completed at $(date)"
    echo "# Output file: $output_file"
    echo "# Output size: $output_size bytes"
    echo "# Output lines: $output_lines"
} >> "$log_file"

log_with_timestamp "Process completed successfully!"