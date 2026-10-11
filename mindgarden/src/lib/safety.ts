// A lightweight check so a support message always appears for clearly urgent language,
// independent of whether the AI is available. It is deliberately simple and errs on the side of showing it.
const URGENT = [
  /\bkill (myself|me)\b/i,
  /\bsuicid/i,
  /\bend (my|it all|my life)\b/i,
  /\bwant(ed)? to die\b/i,
  /\bself[- ]?harm/i,
  /\bhurt (myself|someone)\b/i,
  /\bno reason to live\b/i,
  /\bcan'?t (go on|stay safe)\b/i,
];

export function needsSupport(text: string): boolean {
  return URGENT.some((r) => r.test(text));
}

export const SUPPORT_MESSAGE =
  "It sounds like you might be carrying something really heavy right now. MindGarden isn't a crisis service, and you deserve real support from a person. If you might be in danger, please contact local emergency services. In the US you can call or text 988 any time; elsewhere, findahelpline.com lists free, confidential lines near you.";
