"""A tool-using AI agent built on the Claude Messages API.

Run it:

    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...
    python agent.py

Then chat. The agent decides when to call the tools defined in ``tools.py``,
runs them locally, feeds the results back to the model, and keeps going until
it has an answer for you. Type 'exit' (or Ctrl-D) to quit.
"""

from __future__ import annotations

import os
import sys

import anthropic

import tools

MODEL = "claude-opus-4-8"
MAX_TOKENS = 8000
MAX_STEPS = 12  # safety cap on tool-call iterations per user turn

SYSTEM_PROMPT = (
    "You are a helpful, autonomous assistant with access to tools. "
    "Use the tools when they would give a more accurate or up-to-date answer "
    "than reasoning alone — for example, do arithmetic with the calculator and "
    "inspect files with the filesystem tools rather than guessing. "
    "When you have enough information to answer, answer directly and concisely."
)


def _text(blocks) -> str:
    """Join the text blocks of a response, ignoring thinking/tool_use blocks."""
    return "".join(b.text for b in blocks if b.type == "text").strip()


def run_turn(client: anthropic.Anthropic, messages: list[dict]) -> str:
    """Drive the agentic loop for one user turn. Mutates ``messages`` in place."""
    for _ in range(MAX_STEPS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            thinking={"type": "adaptive"},
            tools=tools.tool_specs(),
            messages=messages,
        )

        # Record the assistant turn verbatim — tool_use and thinking blocks must
        # be preserved for the follow-up request to validate.
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return _text(response.content)

        # Surface any narration the model wrote alongside its tool calls.
        narration = _text(response.content)
        if narration:
            print(f"\n  {narration}")

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            print(f"  → {block.name}({block.input})")
            result, is_error = tools.run_tool(block.name, block.input)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                    "is_error": is_error,
                }
            )
        messages.append({"role": "user", "content": tool_results})

    return "(Stopped: reached the maximum number of tool-call steps for this turn.)"


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first (see .env.example).")

    client = anthropic.Anthropic()
    messages: list[dict] = []

    print("Tool-using agent ready. Tools: " + ", ".join(tools.REGISTRY))
    print("Type 'exit' to quit.\n")

    while True:
        try:
            user_input = input("you> ").strip()
        except EOFError:
            print()
            break
        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            break

        messages.append({"role": "user", "content": user_input})
        answer = run_turn(client, messages)
        print(f"\nagent> {answer}\n")


if __name__ == "__main__":
    main()
