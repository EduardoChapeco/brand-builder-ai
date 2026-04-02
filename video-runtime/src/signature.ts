import crypto from "node:crypto";

export const computeSignature = (secret: string, timestamp: string, path: string, body: string) =>
  crypto.createHmac("sha256", secret).update(`${timestamp}.${path}.${body}`).digest("hex");

export const verifySignature = (params: {
  secret: string;
  timestamp?: string;
  signature?: string;
  path: string;
  body: string;
}) => {
  if (!params.timestamp || !params.signature) return false;
  const expected = computeSignature(params.secret, params.timestamp, params.path, params.body);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
};
