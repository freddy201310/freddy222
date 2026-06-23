"""Tool definitions for the agent.

Each tool is a plain Python function decorated with ``@tool``. The decorator
records the JSON schema the model needs and registers the function so the agent
loop can dispatch to it by name. To add a capability, write a function and
decorate it — nothing else in the codebase needs to change.
"""

from __future__ import annotations

import ast
import operator
import pathlib
import subprocess
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    func: Callable[..., str]

    def spec(self) -> dict[str, Any]:
        """The shape the Messages API expects in the ``tools`` list."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


REGISTRY: dict[str, Tool] = {}


def tool(description: str, input_schema: dict[str, Any]) -> Callable[[Callable[..., str]], Tool]:
    """Register a function as a tool. The wrapped name becomes the tool name."""

    def decorator(func: Callable[..., str]) -> Tool:
        t = Tool(
            name=func.__name__,
            description=description,
            input_schema=input_schema,
            func=func,
        )
        REGISTRY[t.name] = t
        return t

    return decorator


def tool_specs() -> list[dict[str, Any]]:
    return [t.spec() for t in REGISTRY.values()]


def run_tool(name: str, arguments: dict[str, Any]) -> tuple[str, bool]:
    """Execute a tool by name. Returns (result_text, is_error)."""
    t = REGISTRY.get(name)
    if t is None:
        return f"No tool named {name!r}.", True
    try:
        return str(t.func(**arguments)), False
    except Exception as exc:  # surfaced to the model so it can recover
        return f"{type(exc).__name__}: {exc}", True


# --- The tools ---------------------------------------------------------------

# Restrict the calculator to a safe subset of arithmetic so we never hand
# arbitrary expressions to eval().
_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPS = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
        return _BIN_OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval_node(node.operand))
    raise ValueError("unsupported expression")


@tool(
    description="Evaluate a basic arithmetic expression (+, -, *, /, //, %, **). "
    "Use this for any calculation rather than doing math in your head.",
    input_schema={
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "e.g. '2 + 2 * 10' or '(45000 / 12) ** 0.5'",
            }
        },
        "required": ["expression"],
    },
)
def calculate(expression: str) -> str:
    return str(_eval_node(ast.parse(expression, mode="eval").body))


@tool(
    description="Read a UTF-8 text file from the local filesystem and return its contents.",
    input_schema={
        "type": "object",
        "properties": {"path": {"type": "string", "description": "Path to the file."}},
        "required": ["path"],
    },
)
def read_file(path: str) -> str:
    return pathlib.Path(path).read_text(encoding="utf-8")


@tool(
    description="Write text to a file on the local filesystem, creating parent "
    "directories as needed. Overwrites any existing file.",
    input_schema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Path to write to."},
            "content": {"type": "string", "description": "The text to write."},
        },
        "required": ["path", "content"],
    },
)
def write_file(path: str, content: str) -> str:
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"Wrote {len(content)} characters to {path}."


@tool(
    description="List the entries in a directory.",
    input_schema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Directory path. Defaults to '.'."}
        },
        "required": [],
    },
)
def list_dir(path: str = ".") -> str:
    entries = sorted(p.name + ("/" if p.is_dir() else "") for p in pathlib.Path(path).iterdir())
    return "\n".join(entries) if entries else "(empty)"


@tool(
    description="Run a read-only shell command and return its output. Intended for "
    "quick inspection (ls, cat, grep, git status). Refuses obviously destructive commands.",
    input_schema={
        "type": "object",
        "properties": {"command": {"type": "string", "description": "The command to run."}},
        "required": ["command"],
    },
)
def run_command(command: str) -> str:
    lowered = command.lower()
    if any(bad in lowered for bad in ("rm -rf", "mkfs", "shutdown", "reboot", ":(){", "dd if=")):
        raise ValueError("refusing to run a potentially destructive command")
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=30
    )
    out = (result.stdout or "") + (result.stderr or "")
    return out.strip() or f"(no output, exit code {result.returncode})"
