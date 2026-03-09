from datatrove.executor import LocalPipelineExecutor
from datatrove.pipeline.readers import ParquetReader
from datatrove.pipeline.filters import LambdaFilter
from datatrove.pipeline.writers import JsonlWriter

pipeline_exec = LocalPipelineExecutor(
    pipeline=[
        # replace "data/CC-MAIN-2024-10" with "sample/100BT" to use the 100BT sample
        ParquetReader("hf://datasets/HuggingFaceFW/fineweb/sample/100BT"),
        JsonlWriter("Datasets/FineWeb_100B.jsonl"),
    ],
    logging_dir="logs_fineweb_100B",
    tasks=20,
    workers=10,
)

if __name__ == "__main__":
    pipeline_exec.run()
    print("Pipeline execution completed.")