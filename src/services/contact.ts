export interface ContactFormData {
  fullName: string;
  email: string;
  interest: string;
  phone: string;
  comments: string;
}

export async function submitContactForm(
  data: ContactFormData
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || "Failed to submit form",
      };
    }

    return {
      success: true,
      message: "Thank you! We'll be in touch soon.",
    };
  } catch (error) {
    console.error("Contact form submission error:", error);
    return {
      success: false,
      message:
        "An error occurred. Please try again or email tech@spire.bh directly.",
    };
  }
}
