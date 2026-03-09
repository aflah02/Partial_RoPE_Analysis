# Dataset Preparation Guide

## Env for Download -

- `python -m venv dataset_rope_pct_env`
- `source /dataset_rope_pct_env/bin/activate`
- `pip install huggingface_hub[hf_transfer]`
    - (For downloading quickly - Source - https://huggingface.co/datasets/HuggingFaceFW/fineweb#using-huggingface_hub)
- `pip install hf_transfer`
    - (For some reason had to install separately as I got this error otherwise - ValueError: Fast download using 'hf_transfer' is enabled (HF_HUB_ENABLE_HF_TRANSFER=1) but 'hf_transfer' package is not available in your environment. Try `pip install hf_transfer`.)
- `pip install datatrove[io]`
- `pip install datatrove[processing]`

## Env for Tokenization - 

- `python -m venv neox_rope_pct_env`
- `source neox_rope_pct_env/bin/activate`
- `pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu121`
- `cd gpt-neox`
- `pip install -r requirements/requirements.txt`
- `pip install -r requirements/requirements-wandb.txt` ## Probably not needed but keeping for consistency with my process
- `pip install -r requirements/requirements-flashattention.txt` ## Probably not needed but keeping for consistency with my process

## Download

### FineWeb 100B 

- cd PATH_WHERE_ARTIFACTS_WILL_BE_KEPT
- mkdir RoPE_Pct
- cd RoPE_Pct
- mkdir Datasets
- cd Partial_RoPE_Analysis/Data_Prep 
- source dataset_rope_pct_env/bin/activate # [Activate Env from wherever it is located]
- python download_fineweb_100B_via_datatrove.py

### FineWeb Edu 100B 

Assuming folders were created as above

- source dataset_rope_pct_env/bin/activate # [Activate Env from wherever it is located]
- python download_fineweb_edu_100B_via_datatrove.py

## Process JSONLs to create Merged JSONL - 

- source dataset_rope_pct_env/bin/activate # [Activate Env from wherever it is located]
- bash extract.sh (Change args at top depending on dataset)
- bash merge.sh (Change args at top depending on dataset)

## Tokenizing - 

- source neox_rope_pct_env/bin/activate # [Activate Env from wherever it is located]
- bash tokenize.sh FineWeb/FineWeb_Edu (Change args depending on dataset) 