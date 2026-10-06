# Coral permission workflow

Use this when applying, answering, submitting, withdrawing, or debugging Coral Hive permissions.

## Apply

```bash
bytedcli --json coral permission apply --region sg --db-name example_db --table-name example_table \
  --column sample_col --auth-object demo-user --permission read --ttl 365 \
  --reason "Need read access for analysis." > /tmp/coral-permission-draft.json
```

- Omit `--column` for table-level permission.
- Repeat `--column` or comma-separate values for column-level permission.
- Use `--auth-type psm` only when granting to a service identity.
- Use `--cluster <cluster>` only as an advanced Coral group override; CN permission apply defaults to Coral group `default`.
- For Dorado `NoPrivilegeException` logs, apply for every `User ... does not have privileges` subject in the exception. Use `--auth-type person` for human users and `--auth-type psm` for project/service identities.
- If Coral returns `CORAL_PERMISSION_RESOURCE_CLOSED`, stop: no draft or application was created for that resource. Report the table URL/resource details from the error instead of continuing to `permission create`.

## If result is `status: draft`

1. Read the draft JSON from `/tmp`.
2. Ask the user only the visible questions from the draft/API output.
3. Fill one question at a time:

```bash
bytedcli --json coral permission answer --draft-file /tmp/coral-permission-draft.json \
  --question-id <question_id> --answer <user_answer> > /tmp/coral-permission-answered.json
```

4. Chain subsequent answers from the latest answered draft file.
5. Submit only after all required visible questions are answered:

```bash
bytedcli --json coral permission create --region sg --draft-file /tmp/coral-permission-answered.json
```

## Questionnaire rules

- Resource questions come from `relation[*].resource_questions_answers`.
- Cross-region questions come from `crossRegionQuestions` in the draft. They use option ids/names from Coral and are submitted as `cross_region_questions_answers[*].selections` by the CLI.
- Legal questions come from `trigger_legal_rule.customized_question.question_items`.
- Legal answers need both display `answers` and API-derived `answer_ids`.
- Conditional legal questions use `show_condition`; compare prior `answer_ids`, not display text.
- Ask hidden conditional branches only if they become visible after prior answers.
- Do not hardcode question ids or option ids from old examples.

For cross-region multi-select questions, repeat `--answer` with the selected option ids or exact option names from the draft:

```bash
bytedcli --json coral permission answer --draft-file /tmp/coral-permission-draft.json \
  --question-id 1 --answer 4 --answer 1 --answer 2 > /tmp/coral-permission-answered-q1.json
```

For options that require an explanation, pass both the selected option and the free-text explanation:

```bash
bytedcli --json coral permission answer --draft-file /tmp/coral-permission-answered-q1.json \
  --question-id 2 --answer 5 --answer "Need access for approved dashboard validation." \
  > /tmp/coral-permission-answered-q2.json
```

## Create result handling

- `submitted`: new ticket confirmed; expect `groupId` and/or `applicationUrl`.
- `existing`: Coral returned `existed_application_id`; report it as an existing blocking ticket.
- `unknown`: Coral returned no new id/URL and no existing id; do not claim ticket creation.

Withdraw only when the user asked for it, or when cleaning up an explicitly authorized test ticket:

```bash
bytedcli --json coral permission withdraw --region sg --id <application_id> --description "Withdraw test application"
```

## Cross-region/legal gotcha

Do not hand-edit `cross_region_questions_answers`. Use `permission answer`; it maps selected Coral options to the Triton-compatible `selections` payload. If an option label contains commas, prefer the numeric option id from the draft to avoid shell/CLI splitting ambiguity.
