import {
  createUnzerAuthorize,
  createUnzerCharge,
  getConfigurationByShopName,
  getUnzerCancel,
  updateUnzerCancel,
  updatePaymentSessionStatus,
  getPaymentSessionByPidAndPublicKey,
} from "~/payments.repository.server";
import { createLogger, createPaymentLogger, PaymentSessionStatus } from "./lib";
import PaymentsAppsClient, {
  PAYMENT,
  REFUND,
  VOID,
} from "~/payments-apps.graphql";
import { sessionStorage } from "~/shopify.server";
import { LogMessageType, UnzerCancelStatus } from "@prisma/client";
import UnzerClient from "./unzer-client.server";

const { paymentLog } = createPaymentLogger("Unzer Webhook");
const { log } = createLogger("Unzer Webhook");

/**
 * Unzer Webhook Delegate Class
 * @see https://docs.unzer.com/reference/supported-webhook-events/
 */
export default class UnzerWebhookClient {
  /**
   *
   * @param {String} event
   */
  constructor(event) {
    this.event = event;

    this.webhookDelegate = {};
    this.webhookDelegate[UnzerWebhookEvent.TYPES] = this.handleTypes;
    this.webhookDelegate[UnzerWebhookEvent.AUTHORIZE] = this.handleAuthorize;
    this.webhookDelegate[UnzerWebhookEvent.AUTHORIZE_SUCCEEDED] =
      this.handleAuthorizeSucceeded;
    this.webhookDelegate[UnzerWebhookEvent.AUTHORIZE_PENDING] =
      this.handleAuthorizePending;
    this.webhookDelegate[UnzerWebhookEvent.AUTHORIZE_FAILED] =
      this.handleAuthorizeFailed;
    this.webhookDelegate[UnzerWebhookEvent.AUTHORIZE_CANCELED] =
      this.handleAuthorizeCanceled;
    this.webhookDelegate[UnzerWebhookEvent.CHARGE] = this.handleCharge;
    this.webhookDelegate[UnzerWebhookEvent.CHARGE_SUCCEDED] =
      this.handleChargeSucceeded;
    this.webhookDelegate[UnzerWebhookEvent.CHARGE_FAILED] =
      this.handleChargeFailed;
    this.webhookDelegate[UnzerWebhookEvent.CHARGE_PENDING] =
      this.handleChargePending;
    this.webhookDelegate[UnzerWebhookEvent.CHARGE_CHANCELED] =
      this.handleChargeCanceled;
    this.webhookDelegate[UnzerWebhookEvent.CHARGEBACK] = this.handleChargeback;
    this.webhookDelegate[UnzerWebhookEvent.CUSTOMER] = this.handleCustomer;
    this.webhookDelegate[UnzerWebhookEvent.CUSTOMER_CREATED] =
      this.handleCustomerCreated;
    this.webhookDelegate[UnzerWebhookEvent.CUSTOMER_DELETED] =
      this.handleCustomerDeleted;
    this.webhookDelegate[UnzerWebhookEvent.CUSTOMER_UPDATED] =
      this.handleCustomerUpdated;
    this.webhookDelegate[UnzerWebhookEvent.BASKET_CREATED] =
      this.handleBasketCreated;
    this.webhookDelegate[UnzerWebhookEvent.BASKET_USED] = this.handleBasketUsed;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT] = this.handlePayment;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_PENDING] =
      this.handlePaymentPending;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_COMPLETED] =
      this.handlePaymentCompleted;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_CANCELED] =
      this.handlePaymentCanceled;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_PARTLY] =
      this.handlePaymentPartly;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_REVIEW] =
      this.handlePaymentReview;
    this.webhookDelegate[UnzerWebhookEvent.PAYMENT_CHARGEBACK] =
      this.handlePaymentChargeback;
    this.webhookDelegate[UnzerWebhookEvent.SHIPMENT] = this.handleShipment;
    this.webhookDelegate[UnzerWebhookEvent.PAYOUT] = this.handlePayout;
    this.webhookDelegate[UnzerWebhookEvent.PAYOUT_SUCCEEDED] =
      this.handlePayoutSucceeded;
    this.webhookDelegate[UnzerWebhookEvent.PAYOUT_FAILED] =
      this.handlePayoutFailed;
  }

  /**
   *
   * @param {Payload} payload
   */
  handle = async (payload) => {
    log(`Handling Unzer Webhook: ${this.event}`);
    await this.webhookDelegate[this.event](payload);
    await this.#updateStatus(payload);
  };

  /**
   *
   * @param {Object} payload
   */
  handleTypes = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleAuthorize = async (payload) => {};

  /**
   *
   * @param {Payload} payload
   */
  handleAuthorizeSucceeded = async (payload) => {
    const { paymentSession, config } = await this.#getConfigurationFromPayload(
      payload
    );

    const authorizeResponse = await this.#callUnzerApi(config.unzerPrivateKey, {
      url: payload.retrieveUrl,
    });
    const authorizeData = await authorizeResponse.json();

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Authorize",
      payload: JSON.stringify(authorizeData),
    });

    createUnzerAuthorize(paymentSession.id, authorizeData);
  };

  /**
   *
   * @param {Object} payload
   */
  handleAuthorizePending = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleAuthorizeFailed = async (payload) => {};

  /**
   *
   * @param {Payload} payload
   */
  handleAuthorizeCanceled = async (payload) => {
    const { paymentSession, config } = await this.#getConfigurationFromPayload(
      payload
    );

    const cancelResponse = await this.#callUnzerApi(config.unzerPrivateKey, {
      url: payload.retrieveUrl,
    });
    const cancelData = await cancelResponse.json();

    if (!paymentSession) {
      log("No payment Session found!");
      return;
    }

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Authorize Canceled",
      payload: JSON.stringify(cancelData),
    });
  };

  /**
   *
   * @param {Object} payload
   */
  handleCharge = async (payload) => {};

  /**
   *
   * @param {Payload} payload
   */
  handleChargeSucceeded = async (payload) => {
    const { paymentSession, config } = await this.#getConfigurationFromPayload(
      payload
    );

    const chargeResponse = await this.#callUnzerApi(config.unzerPrivateKey, {
      url: payload.retrieveUrl,
    });

    const chargeData = await chargeResponse.json();

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Payment Charge",
      payload: JSON.stringify(chargeData),
    });

    createUnzerCharge(paymentSession.id, chargeData);
  };

  /**
   *
   * @param {Object} payload
   */
  handleChargeFailed = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleChargePending = async (payload) => {};

  /**
   *
   * @param {Payload} payload
   */
  handleChargeCanceled = async (payload) => {
    const { paymentSession, config } = await this.#getConfigurationFromPayload(
      payload
    );

    const cancelResponse = await this.#callUnzerApi(config.unzerPrivateKey, {
      url: payload.retrieveUrl,
    });
    const cancelData = await cancelResponse.json();

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Charge Cancel",
      payload: JSON.stringify(cancelData),
    });

    if (!paymentSession) {
      log("No payment Session found!");
      return;
    }

    const unzerCancel = await getUnzerCancel(payload.paymentId, cancelData.id);

    if (!unzerCancel) {
      paymentLog({
        paymentId: paymentSession.id,
        message: "Unzer Cancel not found!",
        payload: JSON.stringify(unzerCancel),
        type: LogMessageType.ERROR,
      });
      return;
    }

    if (!unzerCancel.refund && !unzerCancel.void) {
      paymentLog({
        paymentId: paymentSession.id,
        message: "No refund or void found on Unzer Cancel",
        payload: JSON.stringify(unzerCancel),
        type: LogMessageType.ERROR,
      });
      return;
    }

    const session = (
      await sessionStorage.findSessionsByShop(paymentSession.shop)
    )[0];

    const client = new PaymentsAppsClient(
      session.shop,
      session.accessToken,
      unzerCancel.refund ? REFUND : VOID
    );

    if (unzerCancel.refund)
      await client.resolveSession({
        id: unzerCancel.refund.id,
        gid: unzerCancel.refund.gid,
      });

    if (unzerCancel.void)
      await client.resolveSession({
        id: unzerCancel.void.id,
        gid: unzerCancel.void.gid,
      });

    await updateUnzerCancel(unzerCancel.id, {
      status: UnzerCancelStatus.RESOLVED,
      isSuccess: cancelData.isSuccess,
      isPending: cancelData.isPending,
      isResumed: cancelData.isResumed,
      isError: cancelData.isError,
      card3ds: cancelData.card3ds,
      redirectUrl: cancelData.redirectUrl,
      message: JSON.stringify(cancelData.message),
      amount: cancelData.amount,
      currency: cancelData.currency,
      date: new Date(cancelData.date),
      resources: JSON.stringify(cancelData.resources),
      invoiceId: cancelData.invoiceId,
      paymentReference: cancelData.paymentReference,
      processing: JSON.stringify(cancelData.processing),
    });

    paymentLog({
      paymentId: paymentSession.id,
      message: "Payment Cancel Resolved",
      payload: JSON.stringify(unzerCancel),
    });
  };

  /**
   *
   * @param {Object} payload
   */
  handleChargeback = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleCustomer = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleCustomerCreated = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleCustomerDeleted = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleCustomerUpdated = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleBasketCreated = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleBasketUsed = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePayment = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePaymentPending = async (payload) => {
    const { paymentSession } = await this.#getConfigurationFromPayload(payload);

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Payment Pending",
      payload: JSON.stringify(payload),
    });
  };

  /**
   *
   * @param {Object} payload
   */
  handlePaymentCompleted = async (payload) => {
    const { paymentSession } = await this.#getConfigurationFromPayload(payload);

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Payment Complete",
      payload: JSON.stringify(payload),
    });
  };
  /**
   *
   * @param {Object} payload
   */
  handlePaymentCanceled = async (payload) => {
    const { paymentSession, config } = await this.#getConfigurationFromPayload(
      payload
    );

    const paymentCancelResponse = await this.#callUnzerApi(
      config.unzerPrivateKey,
      {
        url: payload.retrieveUrl,
      }
    );
    const paymentCancelData = await paymentCancelResponse.json();

    if (!paymentSession) {
      log("No payment Session found!");
      return;
    }

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Payment Cancel",
      payload: JSON.stringify(paymentCancelData),
    });

    if (!paymentSession.void) {
      paymentLog({
        paymentId: paymentSession.id,
        message: "No Void found on payment session",
        payload: JSON.stringify(paymentCancelData),
        type: LogMessageType.ERROR,
      });
      return;
    }

    const voidSession = (
      await sessionStorage.findSessionsByShop(paymentSession.shop)
    )[0];

    const voidClient = new PaymentsAppsClient(
      voidSession.shop,
      voidSession.accessToken,
      VOID
    );

    await voidClient.resolveSession({
      id: paymentSession.void.id,
      gid: paymentSession.void.gid,
    });

    paymentLog({
      paymentId: paymentSession.id,
      message: "Void resolved",
      payload: JSON.stringify(paymentCancelData),
    });
  };

  /**
   *
   * @param {Payload} payload
   */
  handlePaymentPartly = async (payload) => {
    const { paymentSession } = await this.#getConfigurationFromPayload(payload);

    paymentLog({
      paymentId: paymentSession.id,
      message: "Received Payment Partly",
      payload: JSON.stringify(payload),
    });
  };

  /**
   *
   * @param {Object} payload
   */
  handlePaymentReview = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePaymentChargeback = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handleShipment = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePayout = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePayoutSucceeded = async (payload) => {};

  /**
   *
   * @param {Object} payload
   */
  handlePayoutFailed = async (payload) => {};

  /**
   * Gets a particular Payment's store configuration from the payload
   *
   * @param {Payload} payload
   */
  #getConfigurationFromPayload = async (payload) => {
    const paymentSession = await getPaymentSessionByPidAndPublicKey(
      payload.paymentId,
      payload.publicKey
    );
    const config = await getConfigurationByShopName(paymentSession.shop);

    if (!config) {
      log("Configuration for the store was not found");
      throw new Error("Configuration for the store was not found");
    }

    return {
      paymentSession,
      config,
    };
  };

  /**
   * Updates the Payment Session status
   *
   * @param {Payload} payload
   */
  #updateStatus = async (payload) => {
    log("Updating Payment Session status");

    const status = await (async () => {
      switch (this.event) {
        case UnzerWebhookEvent.AUTHORIZE_PENDING:
          return PaymentSessionStatus.AUTHORIZATION_PENDING;
        case UnzerWebhookEvent.PAYMENT_PENDING:
          return PaymentSessionStatus.PAYMENT_PENDING;
        case UnzerWebhookEvent.AUTHORIZE_SUCCEEDED:
          return PaymentSessionStatus.AUTHORIZED;
        case UnzerWebhookEvent.PAYMENT_PARTLY:
          return PaymentSessionStatus.PARTIALLY_PAID;
        case UnzerWebhookEvent.PAYMENT_COMPLETED:
          return PaymentSessionStatus.PAID;
        case UnzerWebhookEvent.PAYMENT_CANCELED:
        case UnzerWebhookEvent.CHARGE_CHANCELED:
          const { config } = await this.#getConfigurationFromPayload(payload);
          const unzerClient = new UnzerClient(config.unzerPrivateKey);
          const paymentStatus = await unzerClient.getPayment(payload.paymentId);

          /**
           * A full refund triggers both a PAYMENT_CANCELED event
           * and a CHARGE_CANCELED so we need to inspect the status
           * of the payment to determine the final status of the
           * Payment Session
           */
          if (this.event === UnzerWebhookEvent.PAYMENT_CANCELED) {
            if (paymentStatus.amount.total === "0.0000") {
              return PaymentSessionStatus.VOIDED;
            }

            return PaymentSessionStatus.REFUNDED;
          }

          if (paymentStatus.amount.total !== paymentStatus.amount.canceled) {
            return PaymentSessionStatus.PARTIALLY_REFUNDED;
          }

          return null;
        default:
          return null;
      }
    })();

    if (status !== null) {
      const paymentSession = await getPaymentSessionByPidAndPublicKey(
        payload.paymentId,
        payload.publicKey
      );
      await updatePaymentSessionStatus(paymentSession.id, status);
    }
  };

  /**
   * Makes a request to Unzer API
   *
   * @param {string} privateKey - The merchant private API key
   * @param {object} config - The configuration object
   * @param {string} config.url
   * @param {string} [config.body]
   * @param {string} [config.method='GET']
   * @returns
   */
  #callUnzerApi = async (privateKey, { url, body, method = "GET" }) => {
    const auth = Buffer.from(`${privateKey}:`).toString("base64");
    const requestBody = body ? { body: JSON.stringify(body) } : null;
    const response = await fetch(url, {
      method,
      ...(requestBody || {}),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
    });

    return response;
  };
}

/**
 * @typedef Payload
 * @property {UnzerWebhookEvent} event
 * @property {string} publicKey
 * @property {string} retrieveUrl
 * @property {string} paymentId - A unique paymentId
 */

/**
 * Enum for Unzer Webhook Event
 * @readonly
 * @enum {string}
 */
export const UnzerWebhookEvent = {
  /** @member {string} */
  /** Triggers a notification for all payment resource creation events. */
  TYPES: "types",

  /** @member {string} */
  /** Triggers a notification for all authorization related events. */
  AUTHORIZE: "authorize",

  /** @member {string} */
  /** Triggers a notification for successful authorization creation events only. */
  AUTHORIZE_SUCCEEDED: "authorize.succeeded",

  /** @member {string} */
  /** Triggers a notification for pending authorization events only. For example, an authorization, that needs the customers payment confirmation. */
  AUTHORIZE_PENDING: "authorize.pending",

  /** @member {string} */
  /** Triggers a notification for all authorization related events. */
  AUTHORIZE_FAILED: "authorize.failed",

  /** @member {string} */
  /** Triggers a notification for canceled authorization events only. For example, an authorization that is fully reversed. */
  AUTHORIZE_CANCELED: "authorize.canceled",

  /** @member {string} */
  /** Triggers a notification for all charge related events. Including direct charge & charge after authorization. */
  CHARGE: "charge",

  /** @member {string} */
  /** Triggers a notification for successful charge events only. */
  CHARGE_SUCCEDED: "charge.succeeded",

  /** @member {string} */
  /** Triggers a notification for failed charge events only. */
  CHARGE_FAILED: "charge.failed",

  /** @member {string} */
  /** Triggers a notification for pending charge events only. For example, a charge, that needs the customer's payment confirmation. */
  CHARGE_PENDING: "charge.pending",

  /** @member {string} */
  /** Triggers a notification for chargeback events only. */
  CHARGE_CHANCELED: "charge.canceled",

  /** @member {string} */
  /** Triggers a notification for chargeback events only. */
  CHARGEBACK: "chargeback",

  /** @member {string} */
  /** Triggers a notification for all customer resource related events. */
  CUSTOMER: "customer",

  /** @member {string} */
  /** Triggers a notification for successful customer creation events only. */
  CUSTOMER_CREATED: "customer.created",

  /** @member {string} */
  /** Triggers a notification for successful customer deletion events only. */
  CUSTOMER_DELETED: "customer.deleted",

  /** @member {string} */
  /** Triggers a notification for successful customer update events only. */
  CUSTOMER_UPDATED: "customer.updated",

  /** @member {string} */
  /** Triggers a notification for all authorization related events. */
  BASKET_CREATED: "basket.created",

  /** @member {string} */
  /** Triggers a notification for all authorization related events. */
  BASKET_USED: "basket.used",

  /** @member {string} */
  /** Triggers a notification for all payment related events. */
  PAYMENT: "payment",

  /** @member {string} */
  /** Triggers a notification when a payment is in pending state. This event is usually triggered when an authorization or charge which requires a customer confirmation is called. */
  PAYMENT_PENDING: "payment.pending",

  /** @member {string} */
  /**
   * Triggers a notification when a payment is in completed state.
   * This event is usually triggered in the following scenarios:
   * - When calling a direct charge, which does not require the customer's payment confirmation.
   * - When an authorization has been fully charged: calling a charge for authorization with the full amount of the authorization.
   */
  PAYMENT_COMPLETED: "payment.completed",

  /** @member {string} */
  /**
   * Triggers a notification when a payment is in canceled state.
   * This event is usually triggered when a the full amount of a payment is cancelled.
   */
  PAYMENT_CANCELED: "payment.canceled",

  /** @member {string} */
  /**
   * Triggers a notification when a payment is in partly charged state.
   * This event is usually triggered in the following scenario:
   * - When an authorization has been partly charged: calling a charge for an authorization with one part of the full authorization amount.
   */
  PAYMENT_PARTLY: "payment.partly",

  /** @member {string} */
  /**
   * Triggers a notification when a payment is in payment review state.
   * This event is usually triggered in the following scenarios:
   * - When an authorization has been over charged: calling a charge for an authorization with an amount that is greater than the amount of the authorization.
   * - When an authorization has been over charged: calling multiple charges for an authorization where the total amount is greater than the amount of the authorization.
   */
  PAYMENT_REVIEW: "payment.payment_review",

  /** @member {string} */
  /**
   * Triggers a notification when a payment is in chargeback state.
   * This event is triggered when a chargeback is called.
   * @note A chargeback payment cannot be changed under any circumstance.
   */
  PAYMENT_CHARGEBACK: "payment.chargeback",

  /** @member {string} */
  /** Triggers a notification when a shipment is called. */
  SHIPMENT: "shipment",

  /** @member {string} */
  /** Triggers a notification for all payout related events. */
  PAYOUT: "payout",

  /** @member {string} */
  /** Triggers a notification for successful payout events only. */
  PAYOUT_SUCCEEDED: "payout.succeeded",

  /** @member {string} */
  /** Triggers a notification for failed payout events only. */
  PAYOUT_FAILED: "payout.failed",
};
