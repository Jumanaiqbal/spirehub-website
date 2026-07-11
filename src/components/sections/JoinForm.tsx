import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { submitContactForm } from "../../services/contact";

interface JoinFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: string | null;
}

export default function JoinFormModal({
  isOpen,
  onClose,
  initialPlan,
}: JoinFormModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    interest: "",
    phone: "",
    comments: "",
  });


  
  useEffect(() => {
    if (isOpen && initialPlan) {
      setFormData((prev) => ({
        ...prev,
        comments: prev.comments || `Interested in: ${initialPlan} plan`,
      }));
    }
  }, [isOpen, initialPlan]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    const result = await submitContactForm(formData);

    setSubmitStatus({
      type: result.success ? "success" : "error",
      message: result.message,
    });

    if (result.success) {
      setTimeout(() => {
        setFormData({
          fullName: "",
          email: "",
          interest: "",
          phone: "",
          comments: "",
        });
        onClose();
      }, 2000);
    }

    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-spire-navy">
                  Enquire Now
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Tell us how we can help you grow.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 transition hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  What is your full name?
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                  placeholder="Fatima Mohamed"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  What is your email address?
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                  placeholder="fatima@example.com"
                />
              </div>

              {/* Interest */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  What are you primarily interested in?
                </label>
                <select
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                >
                  <option value="">Select an option...</option>
                  <option value="coworking">Coworking space</option>
                  <option value="offices">Private offices</option>
                  <option value="meeting-rooms">Meeting rooms</option>
                  <option value="events">Event space</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  What is your phone number?
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                  placeholder="+973 XXXX XXXX"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Any additional comments or specific requirements?
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 transition focus:border-spire-blue focus:outline-none focus:ring-1 focus:ring-spire-blue"
                  placeholder="Tell us more..."
                />
              </div>

              {/* Status Message */}
              {submitStatus.type && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    submitStatus.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {submitStatus.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-spire-navy px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Enquiry"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
