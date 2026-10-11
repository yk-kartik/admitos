const DEFAULT_MAX_BODY_BYTES = 128 * 1024;

export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<
  | { status: "valid"; value: unknown }
  | { status: "invalid" }
  | { status: "too-large" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) {
    return { status: "too-large" };
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return { status: "invalid" };
  }
  if (new TextEncoder().encode(body).byteLength > maxBytes) return { status: "too-large" };

  try {
    return { status: "valid", value: JSON.parse(body) };
  } catch {
    return { status: "invalid" };
  }
}
