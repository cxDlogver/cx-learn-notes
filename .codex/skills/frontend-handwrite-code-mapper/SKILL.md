---
name: frontend-handwrite-code-mapper
description: "Map front-end interview keywords into explanation, usage scenarios, handwritten code, and interview notes, then write the result to F:\\CX_notes\\cxDlogver\\source\\_posts\\前端面试\\前端面试手写代码篇.md. Use when the user gives front-end keywords such as 深拷贝, 防抖, 节流, promise, call/apply/bind, 数组扁平化, 柯里化, 事件总线, or asks for explanation plus handwritten code plus interview points in one note entry."
---

# Frontend Handwrite Code Mapper

## Target File

Always write to `F:\CX_notes\cxDlogver\source\_posts\前端面试\前端面试手写代码篇.md`.

- If the file does not exist, create it from `references/base-template.md`.
- If the file exists, preserve its frontmatter, headings, and earlier entries.
- Append only the new keyword blocks unless the user explicitly asks to revise an older section.

## Accepted Inputs

Accept any of these:

- One front-end keyword
- Multiple front-end keywords
- A rough prompt such as "写深拷贝手写代码"
- A mixed note that implies a standard handwritten-code interview topic

If the user provides multiple keywords in one turn, append one block per keyword.

## Required Output Structure

Use this field order for every entry:

- `### 关键词：...`
- `解释：`
- `使用场景：`
- `手写代码：`
- `面试要点：`

For `手写代码`, always provide a fenced `js` code block. Prefer interview-style code that is readable, hand-writable, and covers the main boundary conditions.

## Writing Rules

### 解释

- Explain what the concept is in plain interview language.
- Start from the core definition, not history.
- Mention the key distinction if the concept is easy to confuse with a related one.

### 使用场景

- Give 2 to 4 practical front-end scenarios.
- Prefer real business or browser/framework scenarios over abstract examples.

### 手写代码

- Prefer native JavaScript unless the keyword clearly belongs to another runtime.
- Keep the implementation interview-friendly.
- Balance correctness and readability; do not over-engineer.
- Mention important unsupported boundaries in surrounding notes when full support would make the code too large.
- If there are common variants, choose the one most often expected in interviews.

### 面试要点

Include short bullets covering:

- Core principle
- Common pitfalls
- Complexity or tradeoffs when relevant
- Follow-up directions the interviewer might ask about

## Append Workflow

1. Read the target file first.
2. If missing, create it from `references/base-template.md`.
3. Append new sections at the end of the content area.
4. Keep heading depth and spacing consistent with the destination file.
5. Do not rewrite unrelated content.

## Quality Bar

A good entry should let the user do all four things quickly:

- explain the keyword,
- know when to use it,
- handwrite a representative implementation,
- answer likely interview follow-ups.

## Reference File

- Use `references/base-template.md` when creating or recreating the destination note.