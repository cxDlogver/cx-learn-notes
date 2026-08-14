---
name: frontend-interview-answer-mapper
description: "Map front-end interview questions, prompts, and keyword lists into a fixed answer-outline structure and append the result to F:\\CX_notes\\cxDlogver\\source\\_posts\\前端面试\\面试回答要点映射.md. Use when the user provides front-end knowledge points, asks to continue or append interview answer notes, mentions 面试回答要点映射.md, or wants output with one-line conclusion, 30-second answer, 1-minute expansion, high-frequency keywords, likely follow-up questions, and answer pitfalls."
---

# Frontend Interview Answer Mapper

## Target File

Always write to `F:\CX_notes\cxDlogver\source\_posts\前端面试\面试回答要点映射.md`.

- If the file exists, preserve its frontmatter, headings, and prior entries.
- If the file is missing, create it from `references/base-template.md`.
- Append only new entries unless the user explicitly asks to revise existing ones.

## Accepted Inputs

Accept any of these as source material:

- A direct front-end interview question
- A rough keyword list
- Fragmented bullets or partial notes
- A project scenario that needs to be turned into interview-ready answer points

Treat the user's input as front-end interview material by default. If the input is broad, choose the most likely interview question and state the concept clearly in the title.

## Append Workflow

1. Read the target file first.
2. Find the `## 内容沉淀区` section.
3. Inspect the most recent entry and continue its heading style.
4. If existing entries use numbered headings such as `### 01. ...`, continue numbering in the same format.
5. Convert the new input into exactly one appended block unless the user asks for batch insertion.
6. Keep the field order unchanged.

## Required Output Structure

Use this exact field order for every appended block:

- `### 题目：` or the file's current numbered variant
- `一句话结论：`
- `30秒回答：`
- `1分钟展开：`
- `高频关键词：`
- `易追问：`
- `回答雷区：`

If the target file already uses a more specific style such as `### 01. 标题`, follow the existing local style instead of the generic label.

## Compression Rules

- Put the conclusion first, then the reason, then scenarios and boundaries.
- Keep the 30-second answer concise and spoken, not textbook-heavy.
- Make the 1-minute expansion a short list of concrete points.
- Keep keywords dense and reusable for recall.
- Make follow-up questions realistic interview continuations.
- Make pitfalls about incorrect understanding, vague wording, or missing boundaries.

## Content Rules

- Bias toward front-end interview language, not generic documentation language.
- Preserve important technical terms such as API names, browser mechanisms, framework concepts, and project names.
- Prefer practical explanations over abstract theory when both are possible.
- When the source is only keywords, infer the likely interview framing from the keywords.
- Avoid long historical background unless it helps answer the question better.
- Do not rewrite unrelated earlier entries.

## Quality Bar

A good entry should let the user:

- review quickly before an interview,
- answer in 30 seconds or 1 minute,
- anticipate likely follow-up questions,
- avoid common answer mistakes.

## Reference File

- Use `references/base-template.md` only when the target file does not exist or needs to be recreated.