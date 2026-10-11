import { NextResponse } from "next/server";
import { deviceFromRequest, deviceRateLimit } from "@/lib/device";
import { ageOf, parseRules } from "@/lib/rules";
import { FAMILY_DNS, safeSearchRewrites } from "@/lib/webfilter";

// Everything the phone's DNS filter needs that doesn't require a per-domain lookup.
// Re-fetch when the heartbeat's policyVersion changes; supports If-None-Match.
export async function GET(req: Request) {
  const device = await deviceFromRequest(req);
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await deviceRateLimit(req, "blocklist", 30, 600, device.id);
  if (limited) return limited;
  const version = device.child.policy?.version ?? 0;
  const etag = `"${device.childId}-${version}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { etag } });

  const rules = parseRules(device.child.policy?.rules, ageOf(device.child.birthYear));
  return NextResponse.json(
    {
      policyVersion: version,
      allowDomains: rules.web.allowDomains,
      blockDomains: rules.web.blockDomains,
      allowListOnly: rules.web.allowListOnly,
      blockCategories: rules.web.blockCategories,
      rewrites: safeSearchRewrites(rules),
      upstreamDns: rules.web.blockCategories.includes("adult") ? FAMILY_DNS : null,
      blockPrivateDnsAndVpn: rules.web.blockPrivateDnsAndVpn,
      filterInAppBrowsers: rules.web.filterInAppBrowsers,
      // Encrypted-DNS endpoints the filter must refuse so apps can't route around it.
      blockDohHosts: ["dns.google", "cloudflare-dns.com", "mozilla.cloudflare-dns.com", "dns.quad9.net", "doh.opendns.com", "dns.nextdns.io", "dns.adguard-dns.com"],
    },
    { headers: { etag, "cache-control": "private, no-cache" } },
  );
}
