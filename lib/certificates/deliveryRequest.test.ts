import assert from "node:assert/strict";
import test from "node:test";
import { parseCertificateEmailDeliveryRequest } from "@/lib/certificates/deliveryRequest";

const idempotencyKey = "c542927d-5530-4d67-a64d-31214bc74222";

test("accepts the exact certificate email delivery body", () => {
  assert.deepEqual(
    parseCertificateEmailDeliveryRequest({ folio: "ZV-261234567", email: true, idempotencyKey }),
    { folio: "ZV-261234567", email: true, idempotencyKey },
  );
});

test("rejects extra channels and malformed requests", () => {
  assert.equal(
    parseCertificateEmailDeliveryRequest({
      folio: "ZV-261234567",
      email: true,
      whatsapp: false,
      idempotencyKey,
    }),
    null,
  );
  assert.equal(
    parseCertificateEmailDeliveryRequest({ folio: "ZV-261234567", email: false, idempotencyKey }),
    null,
  );
  assert.equal(
    parseCertificateEmailDeliveryRequest({ folio: "not-a-folio", email: true, idempotencyKey }),
    null,
  );
  assert.equal(
    parseCertificateEmailDeliveryRequest({ folio: "ZV-261234567", email: true, idempotencyKey: "bad" }),
    null,
  );
  assert.equal(
    parseCertificateEmailDeliveryRequest({
      folio: "ZV-261234567",
      email: true,
      idempotencyKey: idempotencyKey.toUpperCase(),
    }),
    null,
  );
});
