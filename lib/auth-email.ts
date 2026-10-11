type FetchLike = typeof fetch;

export function createOTPEmailSender({
  apiKey,
  fetchImpl = fetch,
}: {
  apiKey?: string;
  fetchImpl?: FetchLike;
}) {
  return async ({
    email,
    otp,
    type,
  }: {
    email: string;
    otp: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  }) => {
    if (!apiKey?.trim()) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    if (type === "change-email") {
      throw new Error("Email change OTP delivery is not configured.");
    }

    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Admitos <onboarding@resend.dev>",
        to: [email],
        subject: type === "sign-in" ? "Your AdmitOS sign-in code" : "Verify your AdmitOS email",
        text: type === "sign-in"
          ? `Your AdmitOS sign-in code is ${otp}. It expires in 5 minutes.`
          : `Your AdmitOS verification code is ${otp}. It expires in 5 minutes.`,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend email delivery failed with status ${response.status}`);
    }
  };
}
