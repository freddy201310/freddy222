import type { Rules } from "./rules";
import { webDecision } from "./engine";

// Where each Haven web category comes from. Lists are public: The Block List Project
// (Unlicense) and the UT1 blacklists from Université Toulouse Capitole (CC BY-SA 4.0).
const BLP = (name: string) => `https://raw.githubusercontent.com/blocklistproject/Lists/master/alt-version/${name}-nl.txt`;
const UT1 = (name: string) => `https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists/${name}/domains`;

export const CATEGORY_SOURCES: { category: string; url: string; source: string; large?: boolean }[] = [
  // Adult content is blocked mainly by the family-safe DNS resolver below; this list (~950k domains) is optional.
  { category: "adult", url: BLP("porn"), source: "blocklistproject:porn", large: true },
  { category: "adult", url: UT1("mixed_adult"), source: "ut1:mixed_adult" },
  { category: "adult", url: UT1("lingerie"), source: "ut1:lingerie" },
  { category: "gambling", url: BLP("gambling"), source: "blocklistproject:gambling" },
  { category: "gambling", url: UT1("gambling"), source: "ut1:gambling" },
  { category: "drugs", url: BLP("drugs"), source: "blocklistproject:drugs" },
  { category: "drugs", url: BLP("vaping"), source: "blocklistproject:vaping" },
  { category: "violence", url: UT1("agressif"), source: "ut1:agressif" },
  { category: "hate", url: UT1("agressif"), source: "ut1:agressif" },
  { category: "weapons", url: UT1("dangerous_material"), source: "ut1:dangerous_material" },
  { category: "dating", url: UT1("dating"), source: "ut1:dating" },
  { category: "proxies", url: UT1("vpn"), source: "ut1:vpn" },
  { category: "proxies", url: UT1("redirector"), source: "ut1:redirector" },
  { category: "anonymous-chat", url: UT1("chat"), source: "ut1:chat" },
  { category: "social", url: UT1("social_networks"), source: "ut1:social_networks" },
  { category: "gaming", url: UT1("games"), source: "ut1:games" },
];

/**
 * DNS answers the phone's filter must rewrite to force SafeSearch and YouTube Restricted Mode.
 * These are the hostnames Google, Microsoft, and DuckDuckGo document for network-level enforcement.
 */
export function safeSearchRewrites(rules: Rules): Record<string, string> {
  const out: Record<string, string> = {};
  if (rules.web.safeSearch) {
    for (const h of ["www.google.com", "google.com"]) out[h] = "forcesafesearch.google.com";
    for (const h of ["www.bing.com", "bing.com"]) out[h] = "strict.bing.com";
    for (const h of ["duckduckgo.com", "www.duckduckgo.com"]) out[h] = "safe.duckduckgo.com";
  }
  if (rules.web.youtubeRestricted) {
    for (const h of ["www.youtube.com", "m.youtube.com", "youtubei.googleapis.com", "youtube.googleapis.com", "www.youtube-nocookie.com"]) {
      out[h] = "restrict.youtube.com";
    }
  }
  return out;
}

/** Family-safe upstream resolver (Cloudflare for Families: blocks malware and adult content). */
export const FAMILY_DNS = {
  ipv4: ["1.1.1.3", "1.0.0.3"],
  ipv6: ["2606:4700:4700::1113", "2606:4700:4700::1003"],
  doh: "https://family.cloudflare-dns.com/dns-query",
};

/** "a.b.example.com" → ["a.b.example.com", "b.example.com", "example.com"] */
export function parentDomains(host: string): string[] {
  const parts = normalizeHost(host).split(".").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

export function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/:?#].*$/, "").replace(/\.$/, "").replace(/^www\./, "");
}

/** Parse a block-list file: one domain per line, comments and hosts-file prefixes ignored. */
export function parseDomainList(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim().replace(/^(0\.0\.0\.0|127\.0\.0\.1)\s+/, "").toLowerCase();
    if (/^(?=.{1,253}$)([a-z0-9_-]+\.)+[a-z0-9-]{2,}$/.test(line)) out.add(line.replace(/^www\./, ""));
  }
  return [...out];
}

/** Decide a host given the categories found for it and its parent domains. */
export function checkHost(rules: Rules, host: string, categories: string[]) {
  return webDecision(rules, normalizeHost(host), categories);
}
