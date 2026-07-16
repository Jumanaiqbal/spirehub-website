import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useState } from "react";
import { fetchWithTimeout } from "../../services/fetchWithTimeout";

interface MentorApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MentorApplyModal({ isOpen, onClose }: MentorApplyModalProps) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    title: "",
    bio: "",
    linkedinUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setForm({ fullName: "", email: "", phone: "", title: "", bio: "", linkedinUrl: "" });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithTimeout(
        "/api/mentors/apply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        30_000
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-spire-navy">
                  {success ? "Application received!" : "Become a mentor"}
                </h2>
                {!success && (
                  <p className="mt-1 text-sm text-gray-600">
                    Share your expertise with Bahrain&apos;s next founders.
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 transition hover:text-gray-600"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {success ? (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Thanks, {form.fullName.split(" ")[0]}! The Spire team will review
                  your profile and get back to you.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 w-full rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-spire-navy-dark"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full name *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="Your name"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                      placeholder="+973 XXXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title / role *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="e.g. Founder of Acme, CFO, Marketing Lead"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Short description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="Your background and what you'd love to mentor founders on..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    LinkedIn profile URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={form.linkedinUrl}
                    onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-spire-navy px-6 py-3 font-semibold text-white transition hover:bg-spire-navy-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit application"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
