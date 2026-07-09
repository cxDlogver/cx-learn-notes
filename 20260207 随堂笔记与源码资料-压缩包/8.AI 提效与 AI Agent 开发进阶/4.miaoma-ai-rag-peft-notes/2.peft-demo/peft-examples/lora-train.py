import os

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)

from student_qa import TRAINING_EXAMPLES, build_prompt


BASE_MODEL = os.getenv("BASE_MODEL", "./models/Qwen2.5-0.5B-Instruct")
OUTPUT_DIR = os.getenv("PEFT_OUTPUT_DIR", "./outputs/student-rag-lora")
USE_QLORA = os.getenv("USE_QLORA", "false").lower() == "true"
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "512"))
TRAIN_REPEAT = int(os.getenv("TRAIN_REPEAT", "16"))
TRAIN_EPOCHS = float(os.getenv("TRAIN_EPOCHS", "8"))
LEARNING_RATE = float(os.getenv("LEARNING_RATE", "5e-4"))
GRADIENT_ACCUMULATION_STEPS = int(os.getenv("GRADIENT_ACCUMULATION_STEPS", "2"))


def build_dataset():
    return Dataset.from_list(TRAINING_EXAMPLES * TRAIN_REPEAT)


def build_collator(tokenizer):
    def collate(features):
        max_length = max(len(feature["input_ids"]) for feature in features)
        input_ids = []
        attention_mask = []
        labels = []

        for feature in features:
            pad_length = max_length - len(feature["input_ids"])
            input_ids.append(feature["input_ids"] + [tokenizer.pad_token_id] * pad_length)
            attention_mask.append(feature["attention_mask"] + [0] * pad_length)
            labels.append(feature["labels"] + [-100] * pad_length)

        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }

    return collate


def main():
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = None
    if USE_QLORA:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=quantization_config,
        device_map="auto",
        dtype="auto",
        trust_remote_code=True,
    )
    model.config.use_cache = False

    if USE_QLORA:
        model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    dataset = build_dataset()

    def tokenize(example):
        prompt = build_prompt(example["instruction"], example["input"])
        answer = f"{example['output']}{tokenizer.eos_token}"
        prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
        answer_ids = tokenizer(answer, add_special_tokens=False)["input_ids"]
        input_ids = (prompt_ids + answer_ids)[:MAX_LENGTH]
        labels = ([-100] * len(prompt_ids) + answer_ids)[:MAX_LENGTH]

        return {
            "input_ids": input_ids,
            "attention_mask": [1] * len(input_ids),
            "labels": labels,
        }

    tokenized_dataset = dataset.map(
        tokenize,
        remove_columns=dataset.column_names,
        desc="Tokenizing student QA examples",
    )

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        num_train_epochs=TRAIN_EPOCHS,
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=build_collator(tokenizer),
    )

    trainer.train()
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print(f"LoRA adapter saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
