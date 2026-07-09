import os

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

from student_qa import build_prompt, normalize_answer


BASE_MODEL = os.getenv("BASE_MODEL", "./models/Qwen2.5-0.5B-Instruct")
ADAPTER_DIR = os.getenv("PEFT_ADAPTER_DIR", "./outputs/student-rag-lora")


def main():
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR, trust_remote_code=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        device_map="auto",
        dtype="auto",
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    model.eval()

    input_text = os.getenv(
        "PEFT_INPUT",
        "学生姓名: heyi, 学号: 123456, 成绩: 100。问题: heyi 的成绩是多少？",
    )
    instruction = os.getenv("PEFT_INSTRUCTION", "根据学生数据回答问题。")
    inputs = tokenizer(
        build_prompt(instruction, input_text),
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=int(os.getenv("MAX_NEW_TOKENS", "64")),
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    answer_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
    print(normalize_answer(tokenizer.decode(answer_tokens, skip_special_tokens=True)))


if __name__ == "__main__":
    main()
