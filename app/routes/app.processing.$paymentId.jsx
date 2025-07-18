import { redirect } from "@remix-run/node";

import PaymentsAppsClient, { PAYMENT } from "~/payments-apps.graphql";
import {
  getPaymentSession,
  getConfigurationByShopName,
  updatePaymentSessionStatus,
  updatePaymentSessionPidAndPublicKey,
} from "~/payments.repository.server";
import { sessionStorage } from "~/shopify.server";
import UnzerClient, { PayPageAction } from "~/utils/unzer-client.server";
import {
  PaymentKind,
  PaymentSessionStatus,
  createLogger,
  createPaymentLogger,
} from "~/utils/lib";
import { LogMessageType } from "@prisma/client";

const { log } = createLogger("Processing");
const { paymentLog } = createPaymentLogger("Processing");

const excludePaymentTypes = (
  process.env.UNZER_EXCLUDE_PAYMENT_TYPES || ""
).split(",");

/**
 * Loads the payment session.
 */
export const loader = async ({ request, params: { paymentId } }) => {
  const url = new URL(request.url);

  let paymentSession;
  try {
    log("Fetching Payment Session");
    paymentSession = await getPaymentSession(paymentId);
  } catch (error) {
    log("Payment Session not found");
    throw new Response("Payment Session not found", { status: 404 });
  }

  log("Fetching Configuration");
  paymentLog({
    paymentId: paymentId,
    message: "Fetching Configuration",
    payload: JSON.stringify(paymentSession),
    type: LogMessageType.DEBUG,
  });

  const config = await getConfigurationByShopName(paymentSession.shop);
  if (config === null || !config.unzerPrivateKey || !config.unzerPublicKey) {
    log("Configuration not found");
    paymentLog({
      paymentId: paymentId,
      message: "Configuration not found",
      payload: JSON.stringify(paymentSession),
      type: LogMessageType.ERROR,
    });
    throw new Response("Configuration not found", { status: 500 });
  }

  const unzerClient = new UnzerClient(config.unzerPrivateKey);

  if (paymentSession.pid) {
    log("Processing data found, resuming");
    paymentLog({
      paymentId: paymentId,
      message: "Processing data found, resuming",
      payload: JSON.stringify(paymentSession),
      type: LogMessageType.DEBUG,
    });

    // Check payment status
    const paymentStatus = await unzerClient.getPayment(paymentSession.pid);
    const paymentTransactionStatus =
      checkTransactionStatusFromPayment(paymentStatus);

    if (
      paymentTransactionStatus !== "COMPLETED" &&
      paymentTransactionStatus !== "SUCCESS" &&
      paymentTransactionStatus !== "PENDING"
    ) {
      log("Canceling Payment Session");
      paymentLog({
        paymentId: paymentId,
        message: "Canceling Payment Session",
        payload: JSON.stringify(paymentSession),
        type: LogMessageType.DEBUG,
      });

      await updatePaymentSessionStatus(
        paymentId,
        PaymentSessionStatus.CANCELED
      );

      /**
       * When there's a transaction in progress, we need
       * to reject the payment to provide the correct
       * status to the customer
       */
      if (paymentStatus.transactions.length > 0) {
        const session = (
          await sessionStorage.findSessionsByShop(paymentSession.shop)
        )[0];

        if (session.accessToken === undefined) {
          log(`No Access Token found for this Store: ${session.shop}`);
          return new Response("Server error", { status: 500 });
        }

        const client = new PaymentsAppsClient(
          session.shop,
          session.accessToken,
          PAYMENT
        );

        log("Rejecting Payment Session");

        try {
          const response = await client.rejectSession({
            id: paymentSession.id,
            gid: paymentSession.gid,
          });

          return redirect(
            response.paymentSession.nextAction.context.redirectUrl
          );
        } catch (error) {
          log("Error Rejecting Payment Session");
        }
      }

      /**
       * Rejecting a payment is final. You can't call other actions on a payment after it has been rejected.
       * The payments app should retry a failed user attempt and complete the payment before calling paymentSessionReject.
       * For example, if any of the following conditions are met, then you don't need to reject the payment:
       * - The user doesn't interact with your payments app
       * - The user cancels the payment
       * - The user needs to retry the payment because of specific errors, such as the user entering the wrong CVV
       *
       * @see https://shopify.dev/docs/apps/build/payments/offsite/use-the-dashboard#reject-a-payment
       */
      return redirect(paymentSession.cancelUrl);
    }

    const session = (
      await sessionStorage.findSessionsByShop(paymentSession.shop)
    )[0];

    if (session.accessToken === undefined) {
      log(`No Access Token found for this Store: ${session.shop}`);
      return new Response("Server error", { status: 500 });
    }

    const client = new PaymentsAppsClient(
      session.shop,
      session.accessToken,
      PAYMENT
    );

    log("Resolving Payment Session");
    const response = await client.resolveSession({
      id: paymentSession.id,
      gid: paymentSession.gid,
    });

    return redirect(response.paymentSession.nextAction.context.redirectUrl);
  }

  try {
    await unzerClient.createCustomer(
      createCustomerHash(JSON.parse(paymentSession.customer))
    );

    await unzerClient.createMetadata("2024-07");

    const action =
      paymentSession.kind === PaymentKind.SALE
        ? PayPageAction.CHARGE
        : PayPageAction.AUTHORIZE;
    const { locale, paymentPageSettings } = (() => {
      if (config.paymentPageSettings === null)
        return { locale: "en-GB", paymentPageSettings: {} };

      const { locale, ...paymentPageSettings } = config.paymentPageSettings;
      return { locale, paymentPageSettings };
    })();

    config.paymentPageSettings !== null ? config.paymentPageSettings : {};
    const paymentPage = await unzerClient.createPayPage(action, {
      amount: paymentSession.amount.toNumber(),
      currency: paymentSession.currency,
      returnUrl: `${url.origin}/app/processing/${paymentId}`,
      excludeTypes: [...excludePaymentTypes, ...config.excludedPaymentTypes],
      ...paymentPageSettings,
    });

    paymentLog({
      paymentId: paymentId,
      message: "Payment Page created",
      payload: JSON.stringify(paymentPage),
      type: LogMessageType.DEBUG,
    });

    log("Updating Payment Session PID Data");
    paymentLog({
      paymentId: paymentId,
      message: "Updating Payment Session PID Data",
      payload: JSON.stringify(paymentPage.resources.paymentId),
      type: LogMessageType.DEBUG,
    });

    await updatePaymentSessionPidAndPublicKey(
      paymentId,
      paymentPage.resources.paymentId,
      config.unzerPublicKey
    );

    log("Redirecting to Payment Page");
    paymentLog({
      paymentId: paymentId,
      message: "Redirecting to Payment Page",
      payload: JSON.stringify(paymentPage),
    });

    const searchParams = new URLSearchParams();
    if (locale) {
      searchParams.append("locale", locale);
    }

    return redirect(`${paymentPage.redirectUrl}?${searchParams.toString()}`);
  } catch (e) {
    let message = "Error processing payment";

    if (e instanceof Error) {
      message = e.message;
    } else if (e instanceof Response) {
      message = e.statusText;
    }

    paymentLog({
      paymentId: paymentId,
      message: message,
      payload: JSON.stringify(e),
      type: LogMessageType.ERROR,
    });

    throw new Response("Server error", { status: 500 });
  }
};

/**
 * Maps Shopify Customer object into Unzer customer payload data
 *
 * @returns {import('~/utils/unzer-client.server').CustomerData}
 */
function createCustomerHash({
  email,
  locale,
  billing_address,
  shipping_address,
}) {
  return {
    lastname: billing_address.family_name,
    firstname: billing_address.given_name,
    customerId: email,
    email,
    ...(billing_address.phone ? { phone: billing_address.phone } : {}),
    language: locale.split("-")[0],
    billingAddress: {
      name: `${billing_address.given_name} ${billing_address.family_name}`,
      street: billing_address.line1,
      ...(billing_address.state ? { state: billing_address.state } : {}),
      zip: billing_address.postal_code,
      city: billing_address.city,
      country: billing_address.country_code,
    },
    shippingAddress: {
      name: `${shipping_address.given_name} ${shipping_address.family_name}`,
      street: shipping_address.line1,
      ...(shipping_address.state ? { state: shipping_address.state } : {}),
      zip: shipping_address.postal_code,
      city: shipping_address.city,
      country: shipping_address.country_code,
    },
  };
}

/**
 * Resolves a partial Payment Status from the latest Payment Status
 * @param {import('~/utils/unzer-client.server').PaymentData} paymentStatus 
 * @returns {"CREATED" | "CANCELED" | "SUCCESS" | "PENDING" | "COMPLETED"}
 */
function checkTransactionStatusFromPayment(paymentStatus) {
  switch (paymentStatus.state.name) {
    case "create":
      return "CREATED";
    case "canceled":
      return "CANCELED";
    case "pending":
      const transaction = paymentStatus.transactions[0];
      if (transaction.status === "success") {
        return "SUCCESS";
      }
      return "PENDING";
    default:
      return "COMPLETED";
  }
}
