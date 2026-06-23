# freddy222 — Dietitian assistant agent

An AI agent that drafts a patient's nutrition paperwork **by precedent**: for a
new patient it finds the most similar *past* patients, looks at the decisions
real dietitians made for them, and uses that to fill out the forms needed to get
the patient their food. It does **not** look anything up externally — it reasons
only from the local case history ("verify what other dietitians have done").

Powered by the Claude Messages API (`claude-opus-4-8`, adaptive thinking,
structured outputs).

> ⚠️ **Clinical-decision-support, not a clinician.** Output is a *draft* for a
> licensed dietitian to review and sign off on before anything is acted on. Use
> synthetic/sample data only — never real patient records (PHI) in this repo.

## What it produces for each patient

1. **Diet order** — diet type, texture, fluid consistency, energy/protein
   targets, fluid & sodium limits, restrictions, supplements.
2. **Restrictions & allergies sheet** — allergy alerts + foods to avoid.
3. **Nutrition care note (ADIME)** — Assessment / Diagnosis / Intervention /
   Monitoring & Evaluation.
4. **Meal plan** — a one-day menu satisfying the order.

Every section **cites the past case IDs it relied on** and gets routed to one of:

- `AUTO-DRAFT` — confident, low-risk, consistent precedent.
- `NEEDS DIETITIAN REVIEW` — uncertain, conflicting precedent, or safety-critical.
  The **allergies/restrictions sheet is always reviewed**, never auto-approved.

This is the "a bit of both" autonomy model: the routine, well-supported parts are
filled in automatically; the risky or ambiguous parts are flagged for a human.

## Setup & run

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...          # or copy .env.example to .env

# Draft forms for a patient (defaults to data/sample_patient.json)
python dietitian_agent.py data/sample_patient.json

# See only the matched precedent cases, no API call needed:
python dietitian_agent.py --dry-run
```

Drafts are printed and saved to `out/<patient-id>.json` and `out/<patient-id>.txt`.

## How it works

```
new patient ─► casebase.retrieve() ─► top-k similar past cases + their decisions
                                          │
                                          ▼
              build prompt ─► Claude (structured output) ─► filled forms (JSON)
                                          │
                                          ▼
              forms.section_status() routes each section ─► AUTO-DRAFT / REVIEW
                                          │
                                          ▼
                              render + save draft
```

- **`casebase.py`** — loads past patients, scores similarity (shared diagnoses,
  allergies, age, BMI, sex) and returns the closest cases with readable reasons.
- **`forms.py`** — the structured-output JSON schema for all four forms, the
  review-routing rule, and the human-readable renderer.
- **`dietitian_agent.py`** — orchestrates: retrieve → prompt → generate → route → save.
- **`data/sample_cases.json`** — 12 synthetic past patients with the decisions a
  dietitian made (diabetic-renal, dysphagia, celiac, CHF, pediatric allergy,
  malnutrition, dialysis, gestational diabetes, dementia, NAFLD, post-surgical…).
- **`data/sample_patient.json`** — an example new patient to draft for.

## Plugging in real data later

Drop your historical patients into `data/sample_cases.json` (same shape: patient
fields + a `decision` block). No code changes needed — the more (and more
representative) the past cases, the better the precedent. When you do, handle PHI
appropriately: de-identify, keep it out of source control, and keep a dietitian
in the loop on every draft.

---

`agent.py` + `tools.py` are a separate, general-purpose tool-using chat agent
kept from the initial scaffold; the dietitian agent above is the main project.
