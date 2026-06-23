"""The forms the agent fills out, as a structured-output JSON schema plus
human-readable rendering and the review-routing rule ("a bit of both").

Four deliverables per patient:
  - diet_order         : the core order that gets the patient their food
  - restrictions_sheet : allergies + foods to avoid (always clinician-reviewed)
  - adime_note         : Assessment / Diagnosis / Intervention / Monitoring note
  - meal_plan          : a concrete day of meals satisfying the order
"""

from __future__ import annotations

from typing import Any

# Fields every clinical section carries so the agent must show its work and we
# can route the section to auto-draft vs. dietitian review.
_REVIEW_FIELDS: dict[str, Any] = {
    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    "rationale": {"type": "string", "description": "Why these values, grounded in the cited cases."},
    "cited_cases": {
        "type": "array",
        "items": {"type": "string"},
        "description": "IDs of the past cases this section was based on, e.g. ['C001','C008'].",
    },
    "needs_review": {"type": "boolean", "description": "True if a dietitian must check this before use."},
}


def _section(props: dict[str, Any]) -> dict[str, Any]:
    all_props = {**props, **_REVIEW_FIELDS}
    return {
        "type": "object",
        "additionalProperties": False,
        "required": list(all_props.keys()),
        "properties": all_props,
    }


_S = {"type": "string"}
_LIST = {"type": "array", "items": {"type": "string"}}

OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["diet_order", "restrictions_sheet", "adime_note", "meal_plan", "overall"],
    "properties": {
        "diet_order": _section({
            "diet_type": _S,
            "texture": _S,
            "fluid_consistency": _S,
            "energy_kcal": _S,
            "protein_target": _S,
            "fluid_restriction": _S,
            "sodium_limit": _S,
            "other_restrictions": _LIST,
            "supplements": _LIST,
        }),
        "restrictions_sheet": _section({
            "allergy_alerts": _LIST,
            "avoid_foods": _LIST,
        }),
        "adime_note": _section({
            "assessment": _S,
            "diagnosis": _S,
            "intervention": _S,
            "monitoring_evaluation": _S,
        }),
        "meal_plan": _section({
            "breakfast": _LIST,
            "lunch": _LIST,
            "dinner": _LIST,
            "snacks": _LIST,
            "notes": _S,
        }),
        "overall": {
            "type": "object",
            "additionalProperties": False,
            "required": ["summary", "key_flags"],
            "properties": {"summary": _S, "key_flags": _LIST},
        },
    },
}


def section_status(name: str, section: dict[str, Any]) -> str:
    """Routing rule. Safety-critical or low-confidence sections always go to a
    human; confident, low-risk sections are auto-drafted."""
    if name == "restrictions_sheet":
        return "NEEDS DIETITIAN REVIEW"  # allergies are never auto-approved
    if section.get("needs_review"):
        return "NEEDS DIETITIAN REVIEW"
    if section.get("confidence") == "low":
        return "NEEDS DIETITIAN REVIEW"
    return "AUTO-DRAFT"


# --- Rendering ---------------------------------------------------------------

def _bullets(items: list[str], empty: str = "(none)") -> str:
    return "\n".join(f"    - {i}" for i in items) if items else f"    {empty}"


def _meta(section: dict[str, Any], status: str) -> str:
    return (
        f"  [{status}]  confidence={section.get('confidence', '?')}  "
        f"based on cases: {', '.join(section.get('cited_cases', [])) or 'n/a'}\n"
        f"  rationale: {section.get('rationale', '')}"
    )


def render(result: dict[str, Any], patient_id: str) -> str:
    do = result["diet_order"]
    rs = result["restrictions_sheet"]
    ad = result["adime_note"]
    mp = result["meal_plan"]
    ov = result["overall"]

    lines: list[str] = []
    lines.append("=" * 70)
    lines.append(f"DIETITIAN DRAFT  —  patient {patient_id}")
    lines.append("=" * 70)
    lines.append(f"\nSUMMARY: {ov['summary']}")
    if ov["key_flags"]:
        lines.append("KEY FLAGS:")
        lines.append(_bullets(ov["key_flags"]))

    lines.append("\n" + "-" * 70)
    lines.append("1) DIET ORDER")
    lines.append("-" * 70)
    lines.append(f"  Diet type        : {do['diet_type']}")
    lines.append(f"  Texture          : {do['texture']}")
    lines.append(f"  Fluid consistency: {do['fluid_consistency']}")
    lines.append(f"  Energy           : {do['energy_kcal']}")
    lines.append(f"  Protein          : {do['protein_target']}")
    lines.append(f"  Fluid restriction: {do['fluid_restriction']}")
    lines.append(f"  Sodium limit     : {do['sodium_limit']}")
    lines.append("  Other restrictions:")
    lines.append(_bullets(do["other_restrictions"]))
    lines.append("  Supplements:")
    lines.append(_bullets(do["supplements"]))
    lines.append(_meta(do, section_status("diet_order", do)))

    lines.append("\n" + "-" * 70)
    lines.append("2) RESTRICTIONS & ALLERGIES SHEET")
    lines.append("-" * 70)
    lines.append("  Allergy alerts:")
    lines.append(_bullets(rs["allergy_alerts"]))
    lines.append("  Avoid foods:")
    lines.append(_bullets(rs["avoid_foods"]))
    lines.append(_meta(rs, section_status("restrictions_sheet", rs)))

    lines.append("\n" + "-" * 70)
    lines.append("3) NUTRITION CARE NOTE (ADIME)")
    lines.append("-" * 70)
    lines.append(f"  Assessment           : {ad['assessment']}")
    lines.append(f"  Diagnosis            : {ad['diagnosis']}")
    lines.append(f"  Intervention         : {ad['intervention']}")
    lines.append(f"  Monitoring/Evaluation: {ad['monitoring_evaluation']}")
    lines.append(_meta(ad, section_status("adime_note", ad)))

    lines.append("\n" + "-" * 70)
    lines.append("4) MEAL PLAN")
    lines.append("-" * 70)
    lines.append("  Breakfast:")
    lines.append(_bullets(mp["breakfast"]))
    lines.append("  Lunch:")
    lines.append(_bullets(mp["lunch"]))
    lines.append("  Dinner:")
    lines.append(_bullets(mp["dinner"]))
    lines.append("  Snacks:")
    lines.append(_bullets(mp["snacks"]))
    if mp["notes"]:
        lines.append(f"  Notes: {mp['notes']}")
    lines.append(_meta(mp, section_status("meal_plan", mp)))

    lines.append("\n" + "=" * 70)
    lines.append("Draft generated from past-case precedent. A licensed dietitian")
    lines.append("must review and sign off before any order is acted on.")
    lines.append("=" * 70)
    return "\n".join(lines)
