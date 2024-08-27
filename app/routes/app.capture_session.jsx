import { json } from "@remix-run/node";

import { sessionStorage } from "~/shopify.server";
import {
  createCaptureSession,
  getPaymentSession,
  getConfigurationByShopName,
} from "~/payments.repository.server";
import PaymentsAppsClient, { CAPTURE } from "~/payments-apps.graphql";
import UnzerClient from "~/utils/unzer-client.server";
import { createLogger, createPaymentLogger } from "~/utils/lib";
import { LogMessageType } from "@prisma/client";

const { log } = createLogger("Capture Session");
const { paymentLog } = createPaymentLogger("Capture Session");

/**
 * Saves and starts a capture session.
 */
export const action = async ({ request }) => {
  /** @type RequestBody */
  const requestBody = await request.json();

  try {
    log("Fetching Payment Session");
    const paymentSession = await getPaymentSession(requestBody.payment_id);

    if (!paymentSession.pid) {
      const errorMessage = "Payment Session does not have a paymentId";
      paymentLog({
        paymentId: paymentSession.id,
        message: errorMessage,
        payload: JSON.stringify(requestBody),
        type: LogMessageType.ERROR,
      });

      throw new Error(errorMessage);
    }

    log("Fetching Configuration");
    const config = await getConfigurationByShopName(paymentSession.shop);

    if (!config) {
      const errorMessage = "No Configuration associated to this Payment Session";
      paymentLog({
        paymentId: paymentSession.id,
        message: errorMessage,
        payload: JSON.stringify(requestBody),
        type: LogMessageType.ERROR,
      });

      throw new Error(errorMessage);
    }

    const unzerClient = new UnzerClient(config.unzerPrivateKey);
    const response = await unzerClient.chargeAuthorized(paymentSession.pid, {
      amount: requestBody.amount,
    });

    const captureSessionHash = createParams(requestBody);
    captureSessionHash.processingData = JSON.stringify({
      resources: response.resources,
      processing: response.processing,
    });

    log("Creating Capture Session");
    const captureSession = await createCaptureSession(captureSessionHash);

    if (!captureSession) {
      paymentLog({
        paymentId: paymentSession.id,
        message: "A CaptureSession couldn't be created.",
        payload: JSON.stringify(captureSession),
        type: LogMessageType.ERROR,
      });
      throw new Error("A CaptureSession couldn't be created.");
    }

    const session = (
      await sessionStorage.findSessionsByShop(paymentSession.shop)
    )[0];
    const client = new PaymentsAppsClient(
      session.shop,
      /** @type {string} */ (session.accessToken),
      CAPTURE
    );

    paymentLog({
      paymentId: paymentSession.id,
      message: "Resolving capture",
      payload: JSON.stringify(session),
    });

    await client.resolveSession(captureSessionHash);

    return json(captureSessionHash);
  } catch (error) {
    if (error instanceof Error) {
      log(error.message);
    }

    throw new Response("Capture could not be processed", {
      status: 500,
    });
  }
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
 * @property {string} id - The unique identifier for the capture attempt. Used as the idempotency key. Assume that requests with a given ID are identical to any previously-received requests with the same ID.
 * @property {string} gid - Identifies the capture when communicating with Shopify in GraphQL mutations, for example.
 * @property {string} payment_id - The ID of the authorized payment that is to be captured.
 * @property {string} amount - The amount to be captured. The value is always sent using a decimal point as a separator, regardless of locale.
 * @property {string} currency - The three-letter ISO 4217 currency code.
 * @property {string} test - Indicates whether the capture is in test or live mode. The test field is only sent if you select API version 2022-01 or higher in the payments app extension configuration in the Partner Dashboard. For more information, refer to Test a payments app.
 * @property {string} merchant_locale - The IETF BCP 47 language tag representing the language used by the merchant.
 * @property {string} proposed_at - A timestamp representing when the capture request was proposed.
 */
