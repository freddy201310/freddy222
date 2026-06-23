"""Case base: load past patients and find the ones most similar to a new patient.

This is the "verify what other dietitians have done" step. For a new patient we
retrieve the closest prior cases from the local history (no external lookups) and
hand them — together with the decisions real dietitians made — to the agent as
precedent. The similarity is deliberately simple and transparent so a clinician
can see *why* a case was matched.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass, field
from typing import Any

DATA_DIR = pathlib.Path(__file__).parent / "data"


@dataclass
class Patient:
    id: str
    age: int
    sex: str
    height_cm: float
    weight_kg: float
    diagnoses: list[str] = field(default_factory=list)
    allergies: list[str] = field(default_factory=list)
    notes: str = ""
    decision: dict[str, Any] | None = None  # present on past cases, absent on new patients

    @property
    def bmi(self) -> float:
        m = self.height_cm / 100
        return self.weight_kg / (m * m) if m else 0.0

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Patient":
        return cls(
            id=d["id"],
            age=d["age"],
            sex=d["sex"],
            height_cm=d["height_cm"],
            weight_kg=d["weight_kg"],
            diagnoses=d.get("diagnoses", []),
            allergies=d.get("allergies", []),
            notes=d.get("notes", ""),
            decision=d.get("decision"),
        )


def _norm(items: list[str]) -> set[str]:
    return {s.strip().lower() for s in items}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)


def load_cases(path: pathlib.Path | None = None) -> list[Patient]:
    path = path or (DATA_DIR / "sample_cases.json")
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [Patient.from_dict(d) for d in raw]


def load_patient(path: pathlib.Path) -> Patient:
    return Patient.from_dict(json.loads(path.read_text(encoding="utf-8")))


@dataclass
class Match:
    case: Patient
    score: float
    reasons: list[str]


def similarity(new: Patient, case: Patient) -> Match:
    """Weighted similarity in [0, 1] with human-readable reasons."""
    reasons: list[str] = []

    dx_new, dx_case = _norm(new.diagnoses), _norm(case.diagnoses)
    dx = _jaccard(dx_new, dx_case)
    shared_dx = dx_new & dx_case
    if shared_dx:
        reasons.append("shared diagnoses: " + ", ".join(sorted(shared_dx)))

    al = _jaccard(_norm(new.allergies), _norm(case.allergies))
    shared_al = _norm(new.allergies) & _norm(case.allergies)
    if shared_al:
        reasons.append("shared allergies: " + ", ".join(sorted(shared_al)))

    age = max(0.0, 1 - abs(new.age - case.age) / 60)
    bmi = max(0.0, 1 - abs(new.bmi - case.bmi) / 20)
    sex = 1.0 if new.sex.lower() == case.sex.lower() else 0.0

    score = 0.55 * dx + 0.10 * al + 0.15 * age + 0.12 * bmi + 0.08 * sex
    reasons.append(f"age {case.age} vs {new.age}, BMI {case.bmi:.1f} vs {new.bmi:.1f}")
    return Match(case=case, score=round(score, 3), reasons=reasons)


def retrieve(new: Patient, cases: list[Patient], k: int = 3) -> list[Match]:
    matches = [similarity(new, c) for c in cases]
    matches.sort(key=lambda m: m.score, reverse=True)
    return matches[:k]
