type AuthOriginEnvironment = {
  BETTER_AUTH_URL?: string;
  CODESPACE_NAME?: string;
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?: string;
  NODE_ENV?: string;
  PORT?: string;
};

export type AuthOriginConfig = {
  baseURL: string | null;
  trustedOrigins: string[];
};

function validPort(value: string | undefined): string | null {
  const port = value ?? "3000";
  if (!/^\d{1,5}$/.test(port)) return null;
  const number = Number(port);
  return number >= 1 && number <= 65535 ? String(number) : null;
}

function validHostname(value: string): boolean {
  const labels = value.split(".");
  return labels.length >= 2 && labels.every((label) =>
    label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

function normalizeExplicitOrigin(value: string, isDevelopment: boolean): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol === "https:") return url.origin;
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return isDevelopment && url.protocol === "http:" && localHosts.has(url.hostname)
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function resolveAuthOrigin(environment: AuthOriginEnvironment): AuthOriginConfig {
  const isDevelopment = environment.NODE_ENV !== "production";
  const port = validPort(environment.PORT);
  let baseURL: string | null = null;

  if (environment.BETTER_AUTH_URL?.trim()) {
    baseURL = normalizeExplicitOrigin(environment.BETTER_AUTH_URL.trim(), isDevelopment);
    if (!baseURL) return { baseURL: null, trustedOrigins: [] };
  } else if (
    environment.CODESPACE_NAME &&
    /^[a-z0-9-]+$/i.test(environment.CODESPACE_NAME) &&
    environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN &&
    validHostname(environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) &&
    port
  ) {
    const host = `${environment.CODESPACE_NAME}-${port}.${environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    if (validHostname(host)) baseURL = `https://${host}`;
  } else if (isDevelopment && port) {
    baseURL = `http://localhost:${port}`;
  }

  if (!baseURL) return { baseURL: null, trustedOrigins: [] };
  const trustedOrigins = [baseURL];
  if (isDevelopment && port) trustedOrigins.push(`http://localhost:${port}`);

  return { baseURL, trustedOrigins: [...new Set(trustedOrigins)] };
}