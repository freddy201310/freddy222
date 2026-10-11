import type { JournalMode } from "@prisma/client";

export const JOURNAL_MODES: { id: JournalMode; label: string; icon: string; desc: string; prompts: string[] }[] = [
  { id: "BRAIN_DUMP", label: "Brain dump", icon: "🌪️", desc: "Get everything out of your head. No structure needed.", prompts: ["What's taking up space in your mind right now?", "List everything you're juggling — big and small."] },
  { id: "GRATITUDE", label: "Gratitude", icon: "🌻", desc: "Notice what's good, even on hard days.", prompts: ["Three things you're grateful for today, and why.", "Who made your life a little better recently?", "What's a simple pleasure you enjoyed this week?"] },
  { id: "DAILY_REFLECTION", label: "Daily reflection", icon: "🌙", desc: "Look back on your day with curiosity.", prompts: ["What went well today? What would you do differently?", "When did you feel most like yourself today?", "What did today teach you?"] },
  { id: "GOAL_TRACKING", label: "Goal tracking", icon: "🎯", desc: "Check in on what you're working toward.", prompts: ["What progress did you make toward your goals this week?", "What's one obstacle in your way, and one way around it?", "What's your next small step?"] },
  { id: "PERSONAL_GROWTH", label: "Personal growth", icon: "🌳", desc: "Explore who you are and who you're becoming.", prompts: ["What's a belief about yourself you're ready to outgrow?", "What would you do if you weren't afraid?", "How have you grown in the last year?"] },
];

export const MODE_BY_ID = Object.fromEntries(JOURNAL_MODES.map((m) => [m.id, m])) as Record<JournalMode, (typeof JOURNAL_MODES)[number]>;
