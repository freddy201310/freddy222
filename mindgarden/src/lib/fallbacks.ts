// Built-in content used when no AI key is configured (or an AI call fails).
// It still draws on the user's own Life Manual so the experience stays personal.
import type { UserContext } from "./memory";

export const THOUGHTS: { text: string; source?: string }[] = [
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", source: "James Clear, Atomic Habits" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", source: "Often attributed to Viktor Frankl" },
  { text: "Motivation often follows action, not the other way around. Start small and let momentum find you." },
  { text: "Becoming is better than being.", source: "Carol Dweck, Mindset" },
  { text: "Tiny changes, compounded daily, quietly reshape a life." },
  { text: "Rest is not a reward for finishing; it's part of how good work gets done." },
  { text: "Self-compassion isn't letting yourself off the hook — research suggests it makes people more likely to try again.", source: "Kristin Neff's research on self-compassion" },
  { text: "Attention is the rarest and purest form of generosity — including attention to yourself.", source: "Simone Weil" },
  { text: "A garden grows one season at a time. So do people." },
  { text: "The best way out is always through.", source: "Robert Frost" },
  { text: "Small wins create a sense of progress, and progress is one of the strongest everyday motivators.", source: "Teresa Amabile, The Progress Principle" },
  { text: "You can't calm the storm, so stop trying. What you can do is calm yourself. The storm will pass." },
];

export const QUESTIONS = [
  "What's one thing that went better than expected recently?",
  "If today had a theme, what would you want it to be?",
  "What would make tomorrow 1% easier for future you?",
  "Who or what gave you energy this week?",
  "What are you holding onto that you could set down, even for an hour?",
  "What's a small promise you could keep to yourself today?",
  "When did you last feel fully absorbed in something? What were you doing?",
];

export const CHALLENGES = [
  "Take a 10-minute walk without your phone and notice three things you've never noticed before.",
  "Write down three things you're grateful for — one of them about yourself.",
  "Send a kind message to someone you haven't talked to in a while.",
  "Do the smallest possible version of a habit you want (one push-up, one paragraph, one minute).",
  "Tidy one small surface — a desk, a shelf, a corner — and enjoy how it feels.",
  "Drink a full glass of water and take five slow breaths before your next task.",
  "Spend 10 minutes on something purely for fun.",
];

export const ENCOURAGEMENTS = [
  "Showing up for yourself, even in small ways, is how real change takes root.",
  "You don't need a perfect day to have a good one. One kind step counts.",
  "You're allowed to grow at your own pace. Slow growth is still growth.",
  "Whatever today brings, you've already handled hard days before — and you're still here, still growing.",
];

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

export function seedFrom(str: string) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

export function fallbackDaily(ctx: UserContext, day: string) {
  const seed = seedFrom(ctx.user.id + day);
  const thought = pick(THOUGHTS, seed);
  const goal = ctx.manual.find((m) => m.category === "GOAL");
  const win = ctx.manual.find((m) => m.category === "SUCCESS");
  const interest = ctx.user.interests.length ? pick(ctx.user.interests, seed >> 3) : null;
  return {
    thought: thought.text,
    thoughtSource: thought.source ?? null,
    question: goal ? `What's one small step you could take today toward: "${goal.content}"?` : pick(QUESTIONS, seed >> 1),
    encouragement: win
      ? `Remember when you ${win.content.replace(/^you /i, "")}? That same person is here today.`
      : pick(ENCOURAGEMENTS, seed >> 2),
    challenge: interest
      ? `Spend 10 intentional minutes on ${interest} today — just because it's yours.`
      : pick(CHALLENGES, seed >> 4),
  };
}

export function fallbackCompanionReply(ctx: UserContext, message: string): string {
  const name = ctx.user.name.split(" ")[0];
  const helpful = ctx.manual.find((m) => m.category === "HELPFUL_ACTIVITY" || m.category === "MOOD_BOOSTER");
  const goal = ctx.manual.find((m) => m.category === "GOAL");
  const short = message.length > 140 ? message.slice(0, 140).trimEnd() + "…" : message;
  const parts = [
    `Thank you for sharing that, ${name}. I'm hearing: "${short}" — and it makes sense that it's on your mind.`,
  ];
  if (helpful) parts.push(`Your Life Manual says "${helpful.content}" tends to help you. Might a little of that help right now?`);
  else if (goal) parts.push(`I wonder how this connects to your goal: "${goal.content}".`);
  parts.push("What feels like the most important part of this for you right now?");
  parts.push("_(MindGarden is running in offline mode, so my replies are simpler than usual. Add an AI key to unlock full conversations.)_");
  return parts.join("\n\n");
}

export function fallbackFutureMe(ctx: UserContext): string {
  const fs = ctx.futureSelf;
  if (!fs || !(fs.whoBecome || fs.goals)) {
    return "I'm still a little blurry from here — tell me who you want to become in your Future Me profile, and I'll be able to speak more clearly.";
  }
  const parts = [`Hey. It's you, ${fs.horizon} from now.`];
  if (fs.whoBecome) parts.push(`I want you to know: becoming "${fs.whoBecome}" didn't happen in one big leap. It happened in ordinary days, exactly like this one.`);
  if (fs.habits) parts.push(`The habits you're hoping for — ${fs.habits} — started small. Smaller than you'd think.`);
  if (fs.goals) parts.push(`Keep "${fs.goals}" close, but be gentle with yourself on the way there.`);
  parts.push("Today, just do one small thing that I'd thank you for.");
  return parts.join("\n\n");
}

export type ResetStep = {
  kind: "breathing" | "journal" | "movement" | "reflection" | "puzzle" | "favorite" | "next-step";
  title: string;
  instruction: string;
  minutes: number;
};

export function fallbackReset(ctx: UserContext, feeling: string): { opening: string; steps: ResetStep[] } {
  const fav = ctx.manual.find((m) => m.category === "HELPFUL_ACTIVITY" || m.category === "MOOD_BOOSTER");
  const steps: ResetStep[] = [
    { kind: "breathing", title: "Box breathing", instruction: "Breathe in for 4, hold for 4, out for 4, hold for 4. Four rounds. Let your shoulders drop on each exhale.", minutes: 2 },
    { kind: "puzzle", title: "5-4-3-2-1", instruction: "Notice 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, and 1 you can taste.", minutes: 2 },
  ];
  if (fav) steps.push({ kind: "favorite", title: "Something that helps you", instruction: `Your Life Manual says "${fav.content}" helps you. Could you give yourself a few minutes of that?`, minutes: 5 });
  else steps.push({ kind: "movement", title: "Quick walk", instruction: "Step outside or walk around your space for five minutes. No destination needed.", minutes: 5 });
  steps.push({ kind: "next-step", title: "One tiny next step", instruction: "Write down the very smallest action you could take next — something that takes under two minutes — and do just that.", minutes: 3 });
  return { opening: feeling ? "That sounds like a lot. Let's take this one small step at a time." : "Let's slow things down together.", steps };
}
