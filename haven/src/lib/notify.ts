import "server-only";
import type { Alert } from "@prisma/client";
import { db } from "./db";
import { appUrl, sendEmail } from "./email";
import { sendSms } from "./sms";

import { wantsAlert } from "./severity";

/**
 * Tell every parent in the family about an alert, by email and/or text, according to each
 * parent's settings. Time requests always notify, since a child is waiting on an answer.
 */
export async function notifyParents(alert: Alert) {
  const members = await db.familyMember.findMany({ where: { familyId: alert.familyId }, include: { parent: true } });
  const isRequest = alert.kind === "time_request";
  const link = isRequest ? `${appUrl()}/requests` : `${appUrl()}/alerts`;
  const subject = alert.kind === "sos" ? "URGENT: your child pressed “I need help”" : isRequest ? "Request for more screen time" : alert.severity === "CRITICAL" ? "Haven: action needed" : "Haven alert";

  const sends: Promise<boolean>[] = [];
  for (const { parent } of members) {
    if (!isRequest && !wantsAlert(parent.notifyLevel, alert.severity)) continue;
    if (parent.notifyEmail) {
      sends.push(sendEmail({ to: parent.email, subject, text: `${alert.message}\n\nOpen Haven: ${link}\n\nYou can change which alerts you get in Settings.` }));
    }
    // Texts are reserved for things that can't wait.
    if (parent.notifySms && parent.phone && (alert.severity === "CRITICAL" || alert.kind === "sos")) {
      sends.push(sendSms(parent.phone, `Haven: ${alert.message} ${link}`));
    }
  }
  const results = await Promise.allSettled(sends);
  if (results.some((r) => r.status === "fulfilled" && r.value)) {
    await db.alert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
  }
}
