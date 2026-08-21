# D2C Evidence Manifest

> task_id: `TASK-001`
> requirement_id: `AR-001`
> node_id: `1:9770`
> text_node_id: `1:10202`
> figma_fileKey: `fNJJ7mEmEMYU5y0tcAZm3X`
> figma_url: `https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=1-9770&p=f&m=dev`
> archived_at: `2026-07-08`

## Archived Files

| file | source_temp_path | sha256 |
|---|---|---|
| `figma_1_9770_1783501270027.xml` | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/.d2c_temp/figma_1_9770_1783501270027.xml` | `2c8a4dd972bfd9a7cd5f12816c422a0eda8dbba4b072fce52180e9bc68c7a072` |
| `figma_1_9770_1783501270027.jpg` | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/.d2c_temp/figma_1_9770_1783501270027.jpg` | `e38cde0e4f58039d1c2fcc9ec82ccc10f41b07a9aff18caa3ec8598c23e7c19f` |

## Consumed Contract

- XML lines around `218-230` confirm the `活动参与资格` row with `全部用户` selected.
- XML node `1:10202` contains the prompt text:
  - grey span: `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖 `
  - blue underlined span: `查看【不激励】规则`
- XML places the helper instruction container below the audience eligibility radio group with left padding aligned to the form control area.
- Preview image confirms the prompt appears under `活动参与资格` in the all-user configuration state.

## Cleanup Status

- `source_temp_path` files are temporary D2C outputs and may be removed by `d2c_cleanup_temp`.
- This directory is the durable Code review evidence archive for TASK-001.
