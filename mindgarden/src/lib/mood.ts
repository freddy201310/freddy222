export const METRICS = [
  { key: "mood", label: "Mood", low: "Low", high: "Bright", faces: ["😞", "😕", "😐", "🙂", "😄"] },
  { key: "energy", label: "Energy", low: "Drained", high: "Energized", faces: ["🪫", "😴", "🙂", "⚡", "🚀"] },
  { key: "stress", label: "Stress", low: "Relaxed", high: "Very stressed", faces: ["😌", "🙂", "😐", "😬", "😣"] },
  { key: "focus", label: "Focus", low: "Scattered", high: "Sharp", faces: ["🌫️", "🌥️", "⛅", "🌤️", "☀️"] },
  { key: "sleep", label: "Sleep quality", low: "Rough", high: "Restful", faces: ["😵", "🥱", "😐", "😊", "😴"] },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];
