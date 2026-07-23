export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getMercadoPagoBackUrls(publicId: string) {
  const base = getAppBaseUrl();
  const paymentQuery = `payment=${encodeURIComponent(publicId)}`;

  return {
    success: `${base}/pagos/retorno/success?${paymentQuery}`,
    failure: `${base}/pagos/retorno/failure?${paymentQuery}`,
    pending: `${base}/pagos/retorno/pending?${paymentQuery}`,
  };
}

export function getMercadoPagoWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/payments/webhook/mercadopago`;
}
