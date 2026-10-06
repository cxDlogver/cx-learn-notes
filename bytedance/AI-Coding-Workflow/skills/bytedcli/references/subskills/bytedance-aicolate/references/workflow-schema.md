# Workflow Schema

## Core model

- `schema_json` is the workflow draft graph.
- Root keys used by the CLI:
  - `nodes`: node list
  - `edges`: execution dependencies
  - `versions`: optional schema markers / feature flags

Example node:

```json
{
  "id": "155172",
  "type": "3",
  "meta": { "position": { "x": 3400, "y": 315.4 } },
  "data": {
    "nodeMeta": { "title": "ShopEmailCheck" },
    "inputs": { "inputParameters": [], "llmParam": [] },
    "outputs": [],
    "version": "3"
  }
}
```

Example edge:

```json
{
  "sourceNodeID": "155172",
  "targetNodeID": "900001"
}
```

## Important node kinds

- `1`: Start
- `2`: End
- `3`: LLM
- `5`: Code
- `8`: Condition
- `9`: SubWorkflow
- `21`: Loop
- `28`: Batch
- `32`: Variable Merge
- `45`: HTTP request

## Data references

Node inputs usually reference prior outputs like this:

```json
{
  "type": "ref",
  "content": {
    "source": "block-output",
    "blockID": "155172",
    "name": "result"
  },
  "rawMeta": { "type": 1 }
}
```

Observed `rawMeta.type` mapping:

- `1`: string
- `2`: integer
- `3`: boolean
- `4`: float
- `6`: object
- `99`: list

## End node behavior

- End does not infer outputs from graph edges.
- End returns whatever is declared in `data.inputs.inputParameters`.
- Top-level End outputs may be scalar or object.
- Object outputs use `input.type = object`, `value.type = object_ref`, and nested `schema[]` field mappings.

## Mutation rules used by `bytedcli aicolate workflow apply`

- Preserve unknown node fields.
- Generate new node ids in the `100000-199999` range.
- Treat `edges` as execution ordering, not as the only data-flow source.
- When inserting a node before End, rewire predecessor edges so End executes after the new node.
- Update End mappings explicitly; a new node output does nothing until End references it or a downstream node consumes it.

## Supported ops

Low-level ops:

- `add_node`
- `remove_node`
- `connect`
- `disconnect`
- `set_node_title`
- `move_node`
- `set_input_literal`
- `set_input_ref`
- `set_output_schema`
- `replace_end_mapping`
- `append_end_field_from_node`

High-level helpers:

- `insert_llm_before_end`
- `clone_node_shape_from_existing`

## CLI usage

Preview first:

```bash
bytedcli aicolate workflow apply --id <wfId> --space <spaceId> --ops-file <opsFile.json> --dry-run
```

Save only after reviewing the diff:

```bash
bytedcli aicolate workflow apply --id <wfId> --space <spaceId> --ops-file <opsFile.json> --save
```

`ops-example.json` in this references folder is documentation-only. In real runs, pass a file path that exists in your current local filesystem.

When you intentionally want full-schema replacement instead of structured ops:

```bash
bytedcli aicolate workflow export --id <wfId> --space <spaceId> --schema > dag.json
bytedcli aicolate workflow apply --id <wfId> --space <spaceId> --schema-file dag.json --dry-run
```
