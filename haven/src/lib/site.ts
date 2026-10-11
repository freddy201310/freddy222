import { appUrl } from "./email";

// Business details shown in the legal pages. Set these in the environment before launch.
export const site = () => ({
  company: process.env.COMPANY_NAME ?? "Haven",
  contactEmail: process.env.CONTACT_EMAIL ?? `privacy@${new URL(appUrl()).hostname}`,
  mailingAddress: process.env.COMPANY_ADDRESS ?? "",
  effectiveDate: process.env.LEGAL_EFFECTIVE_DATE ?? "October 11, 2026",
});
