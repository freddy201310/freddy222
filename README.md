# freddy222 — a tool-using AI agent

A small, transparent AI agent in Python, powered by the Claude Messages API
(`claude-opus-4-8` with adaptive thinking). The model decides when to call
tools; the agent runs them locally, feeds the results back, and loops until it
has an answer.

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...   # or copy .env.example to .env
python agent.py
```

Get an API key at https://console.anthropic.com/.

## Usage

```
you> what's (45000 / 12) rounded, and how many .py files are in this folder?
  → calculate({'expression': '45000 / 12'})
  → run_command({'command': 'ls *.py | wc -l'})

agent> 45000 / 12 is 3750. There are 2 Python files in this folder.

you> exit
```

## Built-in tools

| Tool | What it does |
|------|--------------|
| `calculate`    | Evaluates a safe arithmetic expression |
| `read_file`    | Reads a UTF-8 text file |
| `write_file`   | Writes text to a file (creates dirs, overwrites) |
| `list_dir`     | Lists a directory's entries |
| `run_command`  | Runs a read-only shell command (blocks obviously destructive ones) |

## Adding a tool

Tools live in `tools.py`. Write a function, decorate it with `@tool`, and it's
automatically available to the agent — no other changes needed:

```python
@tool(
    description="Return the current UTC time as an ISO 8601 string.",
    input_schema={"type": "object", "properties": {}, "required": []},
)
def now() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
```

## How it works

`agent.py` runs a manual agentic loop:

1. Send the conversation + tool definitions to the model.
2. If the response's `stop_reason` is `tool_use`, run each requested tool and
   send the results back as a `tool_result` message.
3. Repeat until the model returns a final text answer (capped at `MAX_STEPS`
   per turn to prevent runaway loops).

The full assistant response — including `tool_use` and `thinking` blocks — is
preserved in the message history so each follow-up request validates correctly.
