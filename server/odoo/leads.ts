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
  linkedinUrl: string;
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
    `LinkedIn: ${payload.linkedinUrl}`,
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
