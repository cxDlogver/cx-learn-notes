TRAINING_EXAMPLES = [
    {
        "instruction": "根据学生数据回答问题。",
        "input": "学生姓名: heyi, 学号: 123456, 成绩: 99。问题: heyi 的成绩是多少？",
        "output": "heyi 的成绩是 99。",
    },
    {
        "instruction": "根据学生数据回答问题。",
        "input": "学生姓名: liuyi, 学号: 123457, 成绩: 90。问题: liuyi 的学号是多少？",
        "output": "liuyi 的学号是 123457。",
    },
    {
        "instruction": "当上下文不足时，不要编造答案。",
        "input": "学生姓名: heyi, 学号: 123456, 成绩: 99。问题: zhangsan 的成绩是多少？",
        "output": "上下文中没有足够信息。",
    },
]

VALIDATION_CASES = [
    {
        "name": "heyi_score",
        "instruction": "根据学生数据回答问题。",
        "input": "学生姓名: heyi, 学号: 123456, 成绩: 99。问题: heyi 的成绩是多少？",
        "expected_substrings": ["heyi", "99"],
    },
    {
        "name": "liuyi_student_id",
        "instruction": "根据学生数据回答问题。",
        "input": "学生姓名: liuyi, 学号: 123457, 成绩: 90。问题: liuyi 的学号是多少？",
        "expected_substrings": ["liuyi", "123457"],
    },
    {
        "name": "unknown_student",
        "instruction": "当上下文不足时，不要编造答案。",
        "input": "学生姓名: heyi, 学号: 123456, 成绩: 99。问题: zhangsan 的成绩是多少？",
        "expected_substrings": ["上下文中没有足够信息"],
    },
]


def build_prompt(instruction, input_text):
    return f"### 指令\n{instruction}\n\n### 输入\n{input_text}\n\n### 回答\n"


def normalize_answer(text):
    answer = text.strip()
    for marker in ["###", "<|im_end|>", "<|endoftext|>"]:
        if marker in answer:
            answer = answer.split(marker, 1)[0].strip()
    return answer
