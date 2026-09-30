import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthOrigin } from "../lib/auth-origin.ts";

test("Codespaces base URL is derived from the exact workspace, app port, and forwarding domain", () => {
  const config = resolveAuthOrigin({
    CODESPACE_NAME: "admitos-codespace",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    NODE_ENV: "development",
  });

  assert.equal(config.baseURL, "https://admitos-codespace-3000.app.github.dev");
  assert.deepEqual(config.trustedOrigins, [
    "https://admitos-codespace-3000.app.github.dev",
    "http://localhost:3000",
  ]);
});

test("explicit BETTER_AUTH_URL is canonical while development trusts only its local app origin too", () => {
  const config = resolveAuthOrigin({
    BETTER_AUTH_URL: "https://admitos-preview.example.test/",
    CODESPACE_NAME: "other-codespace",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    NODE_ENV: "development",
  });

  assert.equal(config.baseURL, "https://admitos-preview.example.test");
  assert.deepEqual(config.trustedOrigins, [
    "https://admitos-preview.example.test",
    "http://localhost:3000",
  ]);
  assert.equal(config.trustedOrigins.includes("https://attacker.example.test"), false);
});

test("production requires an explicit or Codespaces-derived HTTPS origin and does not trust localhost", () => {
  assert.deepEqual(resolveAuthOrigin({ NODE_ENV: "production" }), {
    baseURL: null,
    trustedOrigins: [],
  });

  assert.deepEqual(resolveAuthOrigin({
    BETTER_AUTH_URL: "https://admitos.example.test",
    NODE_ENV: "production",
  }), {
    baseURL: "https://admitos.example.test",
    trustedOrigins: ["https://admitos.example.test"],
  });
});

test("invalid explicit origins and malformed Codespaces host inputs fail closed", () => {
  assert.deepEqual(resolveAuthOrigin({
    BETTER_AUTH_URL: "https://admitos.example.test/path",
    CODESPACE_NAME: "admitos-codespace",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    NODE_ENV: "development",
  }), { baseURL: null, trustedOrigins: [] });

  assert.deepEqual(resolveAuthOrigin({
    CODESPACE_NAME: "attacker.example.test",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    NODE_ENV: "production",
  }), { baseURL: null, trustedOrigins: [] });
});