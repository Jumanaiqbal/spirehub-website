import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../components/ui/Seo";
import {
  getInvoices,
  getMe,
  getSubscriptions,
  isLoggedIn,
  logout,
  type PortalCustomer,
  type PortalInvoice,
  type PortalSubscription,
} from "../services/portal";

const bd = (n: number) => `BD ${n.toFixed(3)}`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const PAYMENT_LABEL: Record<string, string> = {
  paid: "Paid",
  not_paid: "Due",
  partial: "Partly paid",
  in_payment: "Processing",
  reversed: "Reversed",
};

const SUB_LABEL: Record<string, string> = {
  "1_draft": "Draft",
  "2_renewal": "Renewal",
  "3_progress": "Active",
  "4_paused": "Paused",
  "5_renewed": "Renewed",
  "6_churn": "Ended",
  "7_upsell": "Upsell",
};

export default function Portal() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<PortalSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const unpaid = invoices.filter((i) => i.amountDue > 0);
  const selectedTotal = invoices
    .filter((i) => selected.has(i.id))
    .reduce((s, i) => s + i.amountDue, 0);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/portal/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const [me, inv, subs] = await Promise.all([
          getMe(),
          getInvoices(),
          getSubscriptions(),
        ]);
        setCustomer(me);
        setInvoices(inv);
        setSubscriptions(subs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not load your account.";
        setError(msg);
        if (msg.includes("sign in")) navigate("/portal/login", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/portal/login", { replace: true });
  };

  return (
    <>
      <Seo
        title="My Account | Spire Hub"
        description="Your Spire Hub account — invoices, membership, and room booking."
        path="/portal"
        noindex
      />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-spire-blue">
              My account
            </p>
            <h1 className="mt-1 text-2xl font-bold text-spire-navy">
              Welcome{customer?.name ? `, ${customer.name}` : ""}
            </h1>
            {customer && (
              <p className="mt-1 text-sm text-spire-gray">
                {[customer.email, customer.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-spire-gray transition hover:text-spire-navy"
          >
            Sign out
          </button>
        </div>

        {/* Member perk banner */}
        <div className="mt-6 rounded-xl bg-spire-light p-4 text-sm text-spire-navy">
          <span className="font-semibold">Member perk:</span> meeting rooms are{" "}
          <span className="font-semibold">free</span> for you, and the workshop room is{" "}
          <span className="font-semibold">50% off</span>.
        </div>

        {loading && <p className="mt-10 text-spire-gray">Loading your account…</p>}
        {error && !loading && <p className="mt-10 text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {/* Subscription */}
            <h2 className="mt-10 text-lg font-bold text-spire-navy">Membership</h2>
            {subscriptions.length === 0 ? (
              <p className="mt-2 text-sm text-spire-gray">No active membership on file.</p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {subscriptions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-spire-navy">{s.plan ?? "Membership"}</p>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {SUB_LABEL[s.status] ?? s.status}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      {customer?.name && (
                        <div className="flex justify-between">
                          <dt className="text-spire-gray">Account holder</dt>
                          <dd className="font-medium text-spire-navy">{customer.name}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-spire-gray">Next invoice</dt>
                        <dd className="font-medium text-spire-navy">{fmtDate(s.nextInvoiceDate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-spire-gray">Recurring</dt>
                        <dd className="font-medium text-spire-navy">{bd(s.recurringTotal)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}

            {/* Invoices */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-spire-navy">Invoices</h2>
              {selected.size > 0 && (
                <a
                  href={`/portal/pay?invoices=${[...selected].join(",")}`}
                  className="rounded-lg bg-spire-navy px-4 py-2 text-sm font-semibold text-white hover:bg-spire-navy-dark"
                >
                  Pay {selected.size} selected — {bd(selectedTotal)}
                </a>
              )}
            </div>
            {invoices.length === 0 ? (
              <p className="mt-2 text-sm text-spire-gray">You have no invoices yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-spire-light text-xs uppercase tracking-wide text-spire-gray">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all unpaid"
                          checked={unpaid.length > 0 && selected.size === unpaid.length}
                          onChange={(e) =>
                            setSelected(e.target.checked ? new Set(unpaid.map((i) => i.id)) : new Set())
                          }
                        />
                      </th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          {inv.amountDue > 0 && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${inv.name}`}
                              checked={selected.has(inv.id)}
                              onChange={() => toggle(inv.id)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-spire-navy">{inv.name}</td>
                        <td className="px-4 py-3 text-spire-gray">{fmtDate(inv.date)}</td>
                        <td className="px-4 py-3 text-spire-gray">{fmtDate(inv.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-medium text-spire-navy">
                          {bd(inv.amountTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              inv.paymentState === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {PAYMENT_LABEL[inv.paymentState] ?? inv.paymentState}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {inv.amountDue > 0 && (
                              <a
                                href={`/portal/pay?invoices=${inv.id}`}
                                className="rounded-lg bg-spire-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-spire-navy-dark"
                              >
                                Pay now
                              </a>
                            )}
                            <a
                              href={inv.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-spire-blue hover:text-spire-navy"
                            >
                              View
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-10">
              <a
                href="/meeting-rooms"
                className="inline-flex rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-spire-navy-dark"
              >
                Book a room
              </a>
            </div>
          </>
        )}
      </section>
    </>
  );
}
