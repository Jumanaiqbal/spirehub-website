import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../components/ui/Seo";
import { isLoggedIn, login } from "../services/portal";

export default function PortalLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate("/portal", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate("/portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue";

  return (
    <>
      <Seo
        title="Customer Login | Spire Hub"
        description="Sign in to your Spire Hub account to view invoices, your membership, and book rooms."
        path="/portal/login"
        noindex
      />
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
        <h1 className="text-2xl font-bold text-spire-navy">Customer sign in</h1>
        <p className="mt-2 text-sm text-spire-gray">
          Access your invoices, membership, and member room booking.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-spire-gray">Email</label>
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-spire-gray">Password</label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-spire-navy-dark disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-spire-gray">
          Trouble signing in? Contact us at{" "}
          <a className="text-spire-blue" href="mailto:hub@spire.bh">
            hub@spire.bh
          </a>
          .
        </p>
      </section>
    </>
  );
}
