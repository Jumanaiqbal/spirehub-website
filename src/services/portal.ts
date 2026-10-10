import { fetchWithTimeout } from "./fetchWithTimeout";

const TOKEN_KEY = "spirehub_portal_token";

export interface PortalCustomer {
  partnerId?: number;
  name: string;
  email: string;
  phone?: string;
}

export interface PortalInvoice {
  id: number;
  name: string;
  date: string | null;
  dueDate: string | null;
  amountTotal: number;
  amountDue: number;
  paymentState: string;
  downloadUrl: string;
}

export interface PortalSubscription {
  id: number;
  name: string;
  plan: string | null;
  status: string;
  nextInvoiceDate: string | null;
  recurringTotal: number;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function logout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function login(
  username: string,
  password: string
): Promise<PortalCustomer> {
  const res = await fetchWithTimeout(
    "/api/portal/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    20_000
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not sign in.");
  try {
    localStorage.setItem(TOKEN_KEY, data.token);
  } catch {
    /* ignore */
  }
  return data.customer as PortalCustomer;
}

async function authFetch(path: string): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetchWithTimeout(
    path,
    { headers: { Authorization: `Bearer ${token}` } },
    20_000
  );
  const data = await res.json();
  if (res.status === 401) {
    logout();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data;
}

export interface MemberBookingPayload {
  roomId: number;
  date: string;
  time: string;
  durationMinutes: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  layout?: string;
}

/** Free meeting-room booking for a logged-in member (server-enforced). */
export async function bookAsMember(
  payload: MemberBookingPayload
): Promise<{ id: number; name: string }> {
  const token = getToken();
  if (!token) throw new Error("Please sign in again.");
  const res = await fetchWithTimeout(
    "/api/portal/book",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    30_000
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not complete your booking.");
  return data.booking;
}

async function authPost(path: string, payload: unknown): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error("Please sign in again.");
  const res = await fetchWithTimeout(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
    30_000
  );
  const data = await res.json();
  if (res.status === 401) {
    logout();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data;
}

export interface InvoiceCheckout {
  checkoutId: string;
  amount: number;
  baseUrl: string;
  merchantTransactionId: string;
  invoiceIds: number[];
  invoiceNames: string[];
}

export async function startInvoicePayment(invoiceIds: number[]): Promise<InvoiceCheckout> {
  return (await authPost("/api/portal/invoices/pay", { invoiceIds })) as InvoiceCheckout;
}

export async function verifyInvoicePayment(
  invoiceIds: number[],
  resourcePath: string
): Promise<{ success: boolean; message?: string }> {
  return (await authPost("/api/portal/invoices/pay/verify", {
    invoiceIds,
    resourcePath,
  })) as { success: boolean; message?: string };
}

export async function getMe(): Promise<PortalCustomer | null> {
  const data = (await authFetch("/api/portal/me")) as { customer: PortalCustomer | null };
  return data.customer;
}

export async function getInvoices(): Promise<PortalInvoice[]> {
  const data = (await authFetch("/api/portal/invoices")) as { invoices: PortalInvoice[] };
  return data.invoices;
}

export async function getSubscriptions(): Promise<PortalSubscription[]> {
  const data = (await authFetch("/api/portal/subscription")) as {
    subscriptions: PortalSubscription[];
  };
  return data.subscriptions;
}
