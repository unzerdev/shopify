import { LogMessageType } from "@prisma/client";
import { json } from "@remix-run/node";

import {
  createRefundSession,
  createUnzerCancel,
  getConfigurationByShopName,
  getPaymentSession,
} from "~/payments.repository.server";
import { createLogger, createPaymentLogger } from "~/utils/lib";
import UnzerClient from "~/utils/unzer-client.server";

const { log } = createLogger("Refund Session");
const { paymentLog } = createPaymentLogger("Refund Session");

/**
 * Saves and starts a refund session.
 */
export const action = async ({ request }) => {
  /** @type RequestBody */
  const requestBody = await request.json();

  const refundSessionHash = createParams(requestBody);
  const refundSession = await createRefundSession(refundSessionHash);

  const paymentSession = await getPaymentSession(refundSession.paymentId);

  if (!refundSession)
    throw new Response("A RefundSession couldn't be created.", { status: 500 });

  paymentLog({
    paymentId: paymentSession.id,
    message: "Refund Created",
    payload: JSON.stringify(refundSession),
  });

  const config = await getConfigurationByShopName(paymentSession.shop);

  if (config === null) {
    log("Configuration not found");
    paymentLog({
      paymentId: paymentSession.id,
      message: "Configuration not found",
      payload: JSON.stringify(paymentSession),
      type: LogMessageType.ERROR,
    });
    throw new Response("Configuration not found", { status: 500 });
  }

  paymentLog({
    paymentId: paymentSession.id,
    message: "Requesting Charge Cancel",
    type: LogMessageType.DEBUG,
  });

  const unzerClient = new UnzerClient(config.unzerPrivateKey);

  const charge = paymentSession.charges[0];

  const cancel = await unzerClient.cancel(
    paymentSession.pid,
    charge.chargeId,
    {
      amount: refundSessionHash.amount,
    }
  );

  await createUnzerCancel({
    cancelId: cancel.id,
    chargeId: charge.chargeId,
    paymentId: paymentSession.id,
    refundId: refundSession.id,
    amount: refundSession.amount,
    currency: refundSession.currency,
  });

  paymentLog({
    paymentId: paymentSession.id,
    message: "Cancel Charge Requested",
    payload: JSON.stringify(cancel),
    type: LogMessageType.DEBUG,
  });

  return json(refundSessionHash);
};

/**
 * @param {RequestBody} requestBody
 */
const createParams = ({
  id,
  gid,
  amount,
  currency,
  payment_id,
  proposed_at,
}) => ({
  id,
  gid,
  amount,
  currency,
  paymentId: payment_id,
  proposedAt: proposed_at,
});

/**
 * @typedef RequestBody
 * @property {string} id - The unique identifier for the refund attempt. Used as the idempotency key. It can be assumed that requests with a given ID are identical to any previously-received requests with the same ID.
 * @property {string} gid - Identifies the refund when communicating with Shopify (in GraphQL mutations, for example).
 * @property {string} payment_id - The ID of the original payment that is to be refunded. For captured payments, this ID corresponds to the original authorization ID rather than the capture ID.
 * @property {string} amount - The amount to be refunded. The amount is always sent using a decimal point as a separator, regardless of locale.
 * @property {string} currency - Three-letter ISO 4217 currency code.
 * @property {string} test - Indicates whether the refund is in test or live mode. The test field is only sent if you select API version 2022-01 or higher in the payments app extension configuration in the Partner Dashboard. For more information, refer to Test a payments app.
 * @property {string} merchant_locale - The IETF BCP 47 language tag representing the language used by the merchant.
 * @property {string} proposed_at - A timestamp (ISO-8601) representing when the refund request was proposed.
 */
