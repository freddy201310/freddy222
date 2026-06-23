"""Dietitian assistant agent.

For a new patient, this agent:
  1. retrieves the most similar PAST patients from the local case history,
  2. shows the decisions real dietitians made for those cases (no web lookups),
  3. uses that precedent to fill out four forms — diet order, restrictions/
     allergies sheet, ADIME note, and meal plan — so the patient can be fed,
  4. routes each section to AUTO-DRAFT or NEEDS DIETITIAN REVIEW.

It is a *draft generator*. A licensed dietitian reviews and signs off before
anything is acted on. Use synthetic data here — never real PHI in this repo.

    export ANTHROPIC_API_KEY=sk-ant-...
    python dietitian_agent.py data/sample_patient.json

Run with --dry-run (or no API key) to see only the retrieved precedent cases.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys

import casebase
import forms

MODEL = "claude-opus-4-8"
MAX_TOKENS = 8000

SYSTEM_PROMPT = (
    "You are a clinical dietetics assistant that drafts nutrition paperwork by "
    "reasoning from precedent. You are given a NEW patient and a set of similar "
    "PAST patients together with the decisions real dietitians made for them. "
    "Base your draft strictly on these past cases and the new patient's data — "
    "do NOT introduce outside facts or look anything up. When past cases agree, "
    "follow them confidently; when they conflict or none fit well, lower your "
    "confidence and set needs_review. Always cite the case IDs you relied on in "
    "each section. Safety first: reflect every allergy and contraindication. "
    "You produce drafts for a licensed dietitian to review, not final orders."
)


def _patient_block(p: casebase.Patient) -> str:
    return (
        f"id={p.id}, age={p.age}, sex={p.sex}, height={p.height_cm}cm, "
        f"weight={p.weight_kg}kg, BMI={p.bmi:.1f}\n"
        f"  diagnoses: {', '.join(p.diagnoses) or 'none'}\n"
        f"  allergies: {', '.join(p.allergies) or 'none'}\n"
        f"  notes: {p.notes}"
    )


def _case_block(m: casebase.Match) -> str:
    d = m.case.decision or {}
    return (
        f"CASE {m.case.id}  (similarity {m.score}; {'; '.join(m.reasons)})\n"
        f"  patient: age {m.case.age}, {m.case.sex}, BMI {m.case.bmi:.1f}, "
        f"dx: {', '.join(m.case.diagnoses) or 'none'}, "
        f"allergies: {', '.join(m.case.allergies) or 'none'}\n"
        f"  DIETITIAN DECISION: {json.dumps(d, indent=2)}"
    )


def build_prompt(new: casebase.Patient, matches: list[casebase.Match]) -> str:
    cases = "\n\n".join(_case_block(m) for m in matches)
    return (
        "NEW PATIENT\n"
        f"{_patient_block(new)}\n\n"
        "SIMILAR PAST PATIENTS AND WHAT DIETITIANS DID\n"
        f"{cases}\n\n"
        "Using only the above, fill out the diet order, restrictions/allergies "
        "sheet, ADIME note, and a one-day meal plan for the NEW patient. Cite the "
        "case IDs you relied on in every section and set confidence/needs_review "
        "honestly."
    )


def generate(new: casebase.Patient, matches: list[casebase.Match]) -> dict:
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"format": {"type": "json_schema", "schema": forms.OUTPUT_SCHEMA}},
        messages=[{"role": "user", "content": build_prompt(new, matches)}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def print_matches(new: casebase.Patient, matches: list[casebase.Match]) -> None:
    print(f"\nNew patient {new.id}: {', '.join(new.diagnoses) or 'no dx'} "
          f"| allergies: {', '.join(new.allergies) or 'none'}")
    print("\nClosest past cases (the precedent the draft is built on):")
    for m in matches:
        print(f"  {m.case.id}  score={m.score}  — {'; '.join(m.reasons)}")


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry_run = "--dry-run" in sys.argv
    patient_path = pathlib.Path(args[0]) if args else casebase.DATA_DIR / "sample_patient.json"

    cases = casebase.load_cases()
    new = casebase.load_patient(patient_path)
    matches = casebase.retrieve(new, cases, k=3)

    print_matches(new, matches)

    if dry_run or not os.environ.get("ANTHROPIC_API_KEY"):
        reason = "--dry-run" if dry_run else "no ANTHROPIC_API_KEY set"
        print(f"\n[{reason}] Showing retrieved precedent only; not drafting forms.")
        return

    result = generate(new, matches)

    rendered = forms.render(result, new.id)
    print("\n" + rendered)

    out_dir = pathlib.Path(__file__).parent / "out"
    out_dir.mkdir(exist_ok=True)
    (out_dir / f"{new.id}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    (out_dir / f"{new.id}.txt").write_text(rendered, encoding="utf-8")
    print(f"\nSaved to out/{new.id}.json and out/{new.id}.txt")


if __name__ == "__main__":
    main()
