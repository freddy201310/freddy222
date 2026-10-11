import type { ManualCategory } from "@prisma/client";

export const MANUAL_SECTIONS: { category: ManualCategory; title: string; blurb: string; icon: string }[] = [
  { category: "GOAL", title: "Goals", blurb: "What you're growing toward", icon: "🌱" },
  { category: "VALUE", title: "Values", blurb: "What matters most to you", icon: "🧭" },
  { category: "MOTIVATOR", title: "Motivators", blurb: "What gets you moving", icon: "🔥" },
  { category: "STRESSOR", title: "Stressors", blurb: "What tends to weigh on you", icon: "🌧️" },
  { category: "HABIT", title: "Productive habits", blurb: "Rhythms that serve you", icon: "🔁" },
  { category: "HELPFUL_ACTIVITY", title: "Helpful activities", blurb: "Things that reliably help", icon: "🍃" },
  { category: "MOOD_BOOSTER", title: "Mood lifters", blurb: "What brightens your day", icon: "☀️" },
  { category: "FOCUS_BOOSTER", title: "Focus helpers", blurb: "What helps you concentrate", icon: "🎯" },
  { category: "SETBACK", title: "Setback patterns", blurb: "What tends to knock you off course", icon: "🪨" },
  { category: "SUCCESS", title: "Wins", blurb: "Moments you're proud of", icon: "🏔️" },
  { category: "INSIGHT", title: "Personal insights", blurb: "Things you've learned about yourself", icon: "💡" },
];

export const CATEGORY_LABEL = Object.fromEntries(MANUAL_SECTIONS.map((s) => [s.category, s.title])) as Record<
  ManualCategory,
  string
>;

export const MANUAL_CATEGORIES = MANUAL_SECTIONS.map((s) => s.category) as [ManualCategory, ...ManualCategory[]];
