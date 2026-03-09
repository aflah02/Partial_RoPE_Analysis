#! /bin/bash

source ENV_PATH/bin/activate

# echo python env and path
echo "Python version: $(python --version)"
echo "Python executable: $(which python)"
echo "Current working directory: $(pwd)"

NEOX_DIR="gpt-neox"

if [ -z "$1" ]; then
    echo "Usage: $0 <dataset_name>"
    echo "Example: $0 FineWeb"
    exit 1
fi

DATASET=$1

if [ "$DATASET" == "FineWeb" ]; then
    echo "Tokenizing FineWeb dataset..."

    log_file="tokenize_fineweb.log"

    python $NEOX_DIR/tools/datasets/preprocess_data.py \
                    --input Datasets/FineWeb_100B_Merged.jsonl \
                    --output-prefix Datasets/FineWeb_100B_Merged \
                    --vocab pythia_tokenizer.json \
                    --dataset-impl mmap \
                    --tokenizer-type HFTokenizer \
                    --append-eod \
                    --workers 8 2>&1 | tee ${log_file}

    echo "Tokenization completed. Log file: ${log_file}"

elif [ "$DATASET" == "FineWeb_Edu" ]; then
    echo "Tokenizing FineWeb_Edu dataset..."
    log_file="tokenize_fineweb_edu.log"

    python $NEOX_DIR/tools/datasets/preprocess_data.py \
                    --input Datasets/FineWeb_Edu_100B_Merged.jsonl \
                    --output-prefix Datasets/FineWeb_Edu_100B_Merged \
                    --vocab pythia_tokenizer.json \
                    --dataset-impl mmap \
                    --tokenizer-type HFTokenizer \
                    --append-eod \
                    --workers 8 2>&1 | tee ${log_file}

    echo "Tokenization completed. Log file: ${log_file}"

else
    echo "Unknown dataset: $DATASET"
    exit 1

fi

