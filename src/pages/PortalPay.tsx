import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../components/ui/Seo";
import {
  isLoggedIn,
  startInvoicePayment,
  verifyInvoicePayment,
  type InvoiceCheckout,
} from "../services/portal";

type Phase = "loading" | "widget" | "verifying" | "done" | "error";

export default function PortalPay() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [checkout, setCheckout] = useState<InvoiceCheckout | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const started = useRef(false);

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const invoiceIds = (params?.get("invoices") ?? params?.get("invoice") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const resourcePath = params?.get("resourcePath") ?? "";
  const idsKey = invoiceIds.join(",");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!isLoggedIn()) {
      navigate("/portal/login", { replace: true });
      return;
    }
    if (!invoiceIds.length) {
      setPhase("error");
      setMessage("No invoices specified.");
      return;
    }

    // Returning from AFS with a result → verify + register the payment.
    if (resourcePath) {
      setPhase("verifying");
      verifyInvoicePayment(invoiceIds, resourcePath)
        .then((r) => {
          setSuccess(r.success);
          setMessage(
            r.success
              ? "Your invoice has been paid. Thank you!"
              : r.message ?? "Payment could not be confirmed."
          );
          setPhase("done");
        })
        .catch((e) => {
          setSuccess(false);
          setMessage(e instanceof Error ? e.message : "Could not verify payment.");
          setPhase("done");
        });
      return;
    }

    // Fresh visit → start an AFS checkout for the selected invoice(s).
    startInvoicePayment(invoiceIds)
      .then((c) => {
        setCheckout(c);
        setPhase("widget");
      })
      .catch((e) => {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "Could not start payment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, resourcePath, navigate]);

  // Load the AFS Copy&Pay widget once we have a checkout session.
  useEffect(() => {
    if (phase !== "widget" || !checkout) return;
    (window as unknown as Record<string, unknown>).wpwlOptions = {
      style: "card",
      brandDetection: true,
      locale: "en",
    };
    const src = `${checkout.baseUrl}/v1/paymentWidgets.js?checkoutId=${checkout.checkoutId}`;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    document.body.appendChild(script);
  }, [phase, checkout]);

  const shopperResultUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portal/pay?invoices=${idsKey}&afsResult=1`
      : "";

  return (
    <>
      <Seo title="Pay Invoice | Spire Hub" description="Pay your Spire Hub invoice." path="/portal/pay" noindex />
      <section className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold text-spire-navy">Pay invoice</h1>

        {phase === "loading" && <p className="mt-6 text-spire-gray">Preparing payment…</p>}
        {phase === "verifying" && <p className="mt-6 text-spire-gray">Confirming your payment…</p>}

        {phase === "error" && (
          <div className="mt-6">
            <p className="text-red-600">{message}</p>
            <a href="/portal" className="mt-4 inline-block text-sm font-medium text-spire-blue">
              ← Back to my account
            </a>
          </div>
        )}

        {phase === "widget" && checkout && (
          <div className="mt-6">
            <div className="mb-5 flex items-center justify-between rounded-xl bg-spire-light px-4 py-3">
              <span className="text-sm font-semibold text-spire-navy">
                {checkout.invoiceNames.length > 1
                  ? `${checkout.invoiceNames.length} invoices`
                  : checkout.invoiceNames[0]}
              </span>
              <span className="text-lg font-bold text-spire-navy">BD {checkout.amount.toFixed(3)}</span>
            </div>
            <form action={shopperResultUrl} className="paymentWidgets" data-brands="VISA MASTER" />
            <a href="/portal" className="mt-4 inline-block text-sm font-medium text-spire-gray hover:text-spire-navy">
              ← Cancel
            </a>
          </div>
        )}

        {phase === "done" && (
          <div className="mt-6 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                success ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <span className={`text-2xl ${success ? "text-green-600" : "text-amber-600"}`}>
                {success ? "✓" : "!"}
              </span>
            </div>
            <p className="mt-4 text-spire-navy">{message}</p>
            <a
              href="/portal"
              className="mt-6 inline-block rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to my account
            </a>
          </div>
        )}
      </section>
    </>
  );
}
