import os
import sys
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

from student_qa import VALIDATION_CASES, build_prompt, normalize_answer


BASE_MODEL = os.getenv("BASE_MODEL", "./models/Qwen2.5-0.5B-Instruct")
ADAPTER_DIR = os.getenv("PEFT_ADAPTER_DIR", "./outputs/student-rag-lora")


def generate_answer(model, tokenizer, case):
    prompt = build_prompt(case["instruction"], case["input"])
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=int(os.getenv("MAX_NEW_TOKENS", "64")),
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    answer_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
    return normalize_answer(tokenizer.decode(answer_tokens, skip_special_tokens=True))


def main():
    if not Path(ADAPTER_DIR).exists():
        raise SystemExit(f"Adapter 目录不存在，请先训练 LoRA: {ADAPTER_DIR}")

    tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR, trust_remote_code=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        device_map="auto",
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    model.eval()

    failures = []
    for case in VALIDATION_CASES:
        answer = generate_answer(model, tokenizer, case)
        print(f"[{case['name']}] {answer}")
        if not all(expected in answer for expected in case["expected_substrings"]):
            failures.append((case["name"], answer, case["expected_substrings"]))

    if failures:
        print("\n验证失败：", file=sys.stderr)
        for name, answer, expected in failures:
            print(
                f"- {name}: 输出={answer!r}, 期望包含={expected}",
                file=sys.stderr,
            )
        raise SystemExit(1)

    print("\n验证通过：所有 PEFT 输出都包含预期答案。")


if __name__ == "__main__":
    main()
