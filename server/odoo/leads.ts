import type { OdooEnv } from "./client";
import { create } from "./client";

export interface OdooLeadPayload {
  fullName: string;
  email: string;
  phone: string;
  interest: string;
  comments?: string;
}

const INTEREST_LABELS: Record<string, string> = {
  coworking: "Coworking space",
  offices: "Private offices",
  "meeting-rooms": "Meeting rooms",
  events: "Event space",
  other: "Other",
};

export interface MentorApplicationPayload {
  fullName: string;
  email: string;
  phone?: string;
  title: string;
  bio: string;
  cvFileName: string;
  cvMimeType: string;
  /** Present only when Google Drive is not configured — CV attaches to the lead instead. */
  cvBase64?: string;
  cvDriveLink?: string;
}

export async function createMentorApplication(
  odoo: OdooEnv,
  payload: MentorApplicationPayload
): Promise<{ id: number }> {
  const description = [
    `Mentor application — ${payload.title}`,
    "",
    payload.bio,
    "",
    payload.cvDriveLink
      ? `CV (Google Drive): ${payload.cvDriveLink}`
      : `CV attached to this lead: ${payload.cvFileName}`,
    'Submitted via spire-hub website "Become a mentor" form.',
  ]
    .filter(Boolean)
    .join("\n");

  const leadId = await create(odoo, "crm.lead", {
    name: `Mentor application — ${payload.fullName} (${payload.title})`,
    contact_name: payload.fullName,
    email_from: payload.email,
    phone: payload.phone || false,
    description,
  });

  if (!payload.cvDriveLink && payload.cvBase64) {
    await create(odoo, "ir.attachment", {
      name: payload.cvFileName,
      res_model: "crm.lead",
      res_id: leadId,
      datas: payload.cvBase64,
      mimetype: payload.cvMimeType,
    });
  }

  return { id: leadId };
}

export async function createOdooLead(
  odoo: OdooEnv,
  payload: OdooLeadPayload
): Promise<{ id: number }> {
  const interestLabel = INTEREST_LABELS[payload.interest] ?? payload.interest;

  const description = [
    `Interested in: ${interestLabel}`,
    payload.comments ? `Comments: ${payload.comments}` : "",
    'Submitted via spire-hub website "Join Spire Hub" form.',
  ]
    .filter(Boolean)
    .join("\n");

  const leadId = await create(odoo, "crm.lead", {
    name: `Website inquiry — ${payload.fullName} (${interestLabel})`,
    contact_name: payload.fullName,
    email_from: payload.email,
    phone: payload.phone,
    description,
  });

  return { id: leadId };
}
