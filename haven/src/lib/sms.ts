import "server-only";

// Text messages through Twilio's REST API. Without credentials, messages go to the server log.

export const isE164 = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone);

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    console.log(`[sms] to=${to} ${body}`);
    return process.env.NODE_ENV !== "production";
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 600) }),
  });
  if (!res.ok) console.error(`[sms] Twilio error ${res.status}: ${await res.text()}`);
  return res.ok;
}
