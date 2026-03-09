#! /bin/bash
#SBATCH --job-name=eval_test
#SBATCH --output=logs/eval_test-%j.out
#SBATCH --time=24:00:00
#SBATCH --gres=gpu:h200:1
#SBATCH --nodes=1
#SBATCH --cpus-per-task=12
#SBATCH --ntasks-per-node=1
#SBATCH --mem=250000                
#SBATCH --requeue

# --- Load necessary modules ---
module load python-waterboa
module load apptainer
module load gcc openmpi

# --- Set up directories and container image ---
export SINGULARITY_TMPDIR="/dais/fs/scratch/afkhan/Artifacts/TEMP" # [Replace with your desired temp directory]
# Apptainer prefers APPTAINER_TMPDIR (avoid warning noise) 
export APPTAINER_TMPDIR="$SINGULARITY_TMPDIR"

export CONTAINER_IMAGE=/dais/fs/scratch/afkhan/Artifacts/hubble-gpt-neox_2e3a600.sif # [Replace with your container image path]

# Only pull once (skip if already pulled)
if [ ! -f "$CONTAINER_IMAGE" ]; then
    echo "Container image not found. Pulling..."
    apptainer pull docker://ghcr.io/ameyagodbole/hubble-gpt-neox:2e3a600
fi


TRITON_CACHE_DIR="/dais/fs/scratch/afkhan/Artifacts/TRITON_TEMP" # [Replace with your desired Triton cache directory]

# --- Set WANDB API Key ---
export WANDB_API_KEY="" # [Set your WANDB API key here or ensure it's set in your environment]

# --- Execute the distributed training job using srun ---
srun -l apptainer exec --nv --bind /dais/fs/scratch/afkhan:/dais/fs/scratch/afkhan $CONTAINER_IMAGE \
  bash -c '
    set -ex # Exit on error and print commands

    # --- Environment setup inside the container ---
    # <<< MODIFIED: Create a unique cache directory for each job run >>>
    export TRITON_CACHE_DIR="/tmp/TRITON_TEMP_$SLURM_JOBID"
    # <<< ADDED: Ensure the unique cache directory exists >>>
    mkdir -p $TRITON_CACHE_DIR
    export OMP_NUM_THREADS=10

    # --- HF/Datasets caches: isolate per job to avoid corrupted cache reads ---
    export HF_HOME="/dais/fs/scratch/afkhan/CACHE/HF_HOME/"
    export HF_DATASETS_CACHE="$HF_HOME/datasets"
    export HF_HUB_CACHE="$HF_HOME/hub"
    export HF_MODULES_CACHE="$HF_HOME/modules"
    export TRANSFORMERS_CACHE="$HF_HOME/transformers"
    export HF_DATASETS_TRUST_REMOTE_CODE=1
    mkdir -p "$HF_DATASETS_CACHE" "$HF_HUB_CACHE" "$HF_MODULES_CACHE" "$TRANSFORMERS_CACHE"
    
    # <<< FIX: Map Slurm variables to standard distributed training variables >>>
    export RANK=$SLURM_PROCID
    export WORLD_SIZE=$SLURM_NTASKS
    # <<< END FIX >>>

    # --- Log environment for debugging ---
    echo "--------------------------------------------------"
    echo "Node ID: $SLURM_NODEID | Rank: $RANK | World Size: $WORLD_SIZE"
    echo "MASTER_ADDR: $MASTER_ADDR | MASTER_PORT: $MASTER_PORT"
    echo "WANDB API Key is set." # Avoid printing the key to logs
    echo "--------------------------------------------------"

    # --- FIX: install last datasets version with load_metric ---
    # pip install --no-cache-dir "datasets==2.21.0"
    pip install --no-cache-dir "datasets==2.14.6" # Fixes both unicode error and load_metric error
    # --- Install peft 0.10.0 to fix EncoderDecoderCache error - https://stackoverflow.com/a/79274305/13858953 ---
    pip install --no-cache-dir peft==0.10.0

    # Optional: Display installed packages
    pip freeze --all
    
    # --- Run the training script ---
    cd /dais/fs/scratch/afkhan/hubble-gpt-neox

    huggingface-cli login --token "" # [Set your Hugging Face API token here or ensure it's set in your environment]
    
    # Define tasks array
    TASKS=(
      lambada
      piqa
      hellaswag
      winogrande
      mathqa
      pubmedqa
      logiqa
      sciq
      wsc
      ai2_arc
    )

    BASE_SETUP="local_setup_fw.yml"
    BASE_CONFIG="src_config_fw.yml"
    BASE_PREFIX="eval_saves"
    BASE_WANDB="eval/Llama_1B"

    for TASK in "${TASKS[@]}"; do
      echo "=================================================="
      echo "Running evaluation for task: $TASK"
      echo "=================================================="

      python deepy.py eval_pp_0.py \
        $BASE_SETUP \
        $BASE_CONFIG \
        --wandb_run_name "${BASE_WANDB}_${TASK}" \
        --eval_results_prefix "${BASE_PREFIX}/${TASK}_" \
        --eval_tasks $TASK

      echo "Finished task: $TASK"
    done

    echo "All evaluation tasks completed successfully."
'