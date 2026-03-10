# Partial RoPE Analysis

This repository contains the code accompanying the paper **“Fractional Rotation, Full Potential? Investigating Performance and Convergence of Partial RoPE.”**

## Data Preparation

Instructions for setting up the environment, downloading the datasets, preprocessing them, and tokenizing the data are available in the `Data_Prep/` directory.

## Reproducing Training

All training runs associated with this work can be viewed on Weights & Biases (W&B) [here]().

For training, we use this fork + branch of EleutherAI’s GPT-NeoX:
[ameyagodbole/hubble-gpt-neox/tree/hubble-skip-deepspeed-update](https://github.com/ameyagodbole/hubble-gpt-neox/tree/hubble-skip-deepspeed-update)

If you would like to continue pretraining from one of our checkpoints, please refer to the following guide for general instructions:
[allegro-lab/hubble/blob/main/docs/resume-training.md](https://github.com/allegro-lab/hubble/blob/main/docs/resume-training.md)

To reproduce our training environment, you can pull the same container we used:

```bash
docker pull ghcr.io/ameyagodbole/hubble-gpt-neox:2e3a600
```

Training configurations are available in the `Configs/` directory.
Some configuration fields contain placeholders that should be modified depending on the specific experiment you wish to run.

## Analyzing Evaluation Logs

All evaluation results referenced in the paper are released under `Eval_Outputs/`.

Each subdirectory follows the naming convention:

```
{MODEL}x{DATASET}x{SEQ_LENGTH}
```

Within each directory, subfolders correspond to different RoPE configurations evaluated for that model, dataset, and sequence length.

## Requesting Checkpoints

Due to the large size of the model checkpoints, we are currently unable to host all intermediate checkpoints in this repository.

We are working on uploading the final checkpoints to Hugging Face. In the meantime, the fastest way to request a specific checkpoint for analysis is to open an issue in this repository. Once requested, we will upload the corresponding model and share it as soon as possible.

Please note that not all models have HF-compatible classes and require using GPT-NeoX directly to run inference.

## Citation

If you find this repository or our results useful in your work, please consider citing our paper:

```
[COMING SOON]
```
