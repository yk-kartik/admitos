import assert from "node:assert/strict";
import test from "node:test";
import { createOTPEmailSender } from "../lib/auth-email.ts";

function response(ok) {
  return { ok };
}

test("OTP sender delivers both sign-in and email-verification codes through Resend", async () => {
  const requests = [];
  const send = createOTPEmailSender({
    apiKey: "test-key",
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return response(true);
    },
  });

  await send({ email: "student@example.edu", otp: "123456", type: "sign-in" });
  await send({ email: "student@example.edu", otp: "654321", type: "email-verification" });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].init.headers.Authorization, "Bearer test-key");
  assert.match(requests[0].init.body, /sign-in code/);
  assert.match(requests[1].init.body, /verification code/);
});

test("OTP sender fails clearly when Resend is not configured or rejects delivery", async () => {
  await assert.rejects(
    createOTPEmailSender({ apiKey: "" })({ email: "student@example.edu", otp: "123456", type: "sign-in" }),
    /RESEND_API_KEY is not configured/,
  );
  await assert.rejects(
    createOTPEmailSender({ apiKey: "test-key", fetchImpl: async () => response(false) })({
      email: "student@example.edu",
      otp: "123456",
      type: "sign-in",
    }),
    /Resend email delivery failed/,
  );
});
