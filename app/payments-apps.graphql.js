import schema from "./payments-apps.schema";

import {
  updateRefundSessionStatus,
  updateCaptureSessionStatus,
  updateVoidSessionStatus,
} from "./payments.repository.server";
import {
  PaymentStatus,
  createLogger,
  createPaymentLogger,
  PaymentKind,
  PaymentSessionStatus,
} from "~/utils/lib";

const { log } = createLogger("Payments App Client");
const { paymentLog } = createPaymentLogger("Payments App Client");

/**
 * Client to interface with the Payments Apps GraphQL API.
 *
 * paymentsAppConfigure: Configure the payments app with the provided variables.
 * paymentSessionResolve: Resolves the given payment session.
 * paymentSessionReject: Rejects the given payment session.
 * refundSessionResolve: Resolves the given refund session.
 * refundSessionReject: Rejects the given refund session.
 */
export default class PaymentsAppsClient {
  /**
   * @param {string} shop - The Shop name
   * @param {string} accessToken - The API Access Token
   * @param {PAYMENT | REFUND | CAPTURE | VOID} [type]
   */
  constructor(shop, accessToken, type) {
    this.shop = shop;
    this.type = type || PAYMENT; // default
    this.accessToken = accessToken;
    this.resolveMutation = "";
    this.rejectMutation = "";
    this.pendingMutation = "";
    if (type) this.dependencyInjector(type);
  }

  /**
   * Generic session resolution function
   * @param {object} sessionData
   * @param {string} sessionData.id - The Payment Session ID
   * @param {string} sessionData.gid - The Payment Session GraphQL ID
   *
   * @returns the response body from the Shopify Payments Apps API
   */
  async resolveSession({ id, gid }) {
    log(`Resolving session: ${this.type}`);
    const response = await this.#perform(schema[this.resolveMutation], {
      id: gid,
    });
    const responseData = response[this.resolveMutation];
    if (responseData?.userErrors?.length === 0) {
      await this.update?.(id, PaymentStatus.RESOLVE);
    }

    return responseData;
  }

  /**
   * Generic session rejection function
   * @param {*} session the session to reject upon
   * @returns the response body from the Shopify Payments Apps API
   */
  async rejectSession({ id, gid }) {
    log(`Rejecting session: ${this.type}`);
    paymentLog({
      paymentId: id,
      message: "Rejecting session",
      payload: JSON.stringify(this),
    });
    const response = await this.#perform(schema[this.rejectMutation], {
      id: gid,
      reason: {
        code: "PROCESSING_ERROR",
        merchantMessage: "The session was rejected.",
      },
    });
    const responseData = response[this.rejectMutation];
    if (responseData?.userErrors?.length === 0)
      await this.update?.(id, PaymentStatus.REJECT);

    return responseData;
  }

  /**
   * Generic session pending function
   *
   * @param {object} sessionData
   * @param {string} sessionData.id - The Payment Session ID
   * @param {string} sessionData.gid - The Payment Session GraphQL ID
   * @param {PendReason} [sessionData.reason=PendReason.BUYER_ACTION_REQUIRED] - The Payment Session GraphQL ID
   * @param {PaymentKind} sessionData.kind - The Payment Session type. Can be sale or authorization
   *
   * @returns the response body from the Shopify Payments Apps API
   */
  async pendSession({
    id,
    gid,
    reason = PendReason.BUYER_ACTION_REQUIRED,
    kind,
  }) {
    log(`Pending session: ${this.type}`);
    paymentLog({
      paymentId: id,
      message: "Pending session",
      payload: JSON.stringify(this),
    });
    if (this.type !== PAYMENT)
      throw new Error("Cannot pend a session for this client");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const response = await this.#perform(schema[this.pendingMutation], {
      id: gid,
      pendingExpiresAt: tomorrow.toISOString(),
      reason,
    });
    const responseData = response[this.pendingMutation];
    if (responseData?.userErrors?.length === 0) {
      const status =
        kind === PaymentKind.AUTHORIZATION
          ? PaymentSessionStatus.AUTHORIZATION_PENDING
          : PaymentSessionStatus.CHARGE_PENDING;
      await this.update?.(id, status);
    }

    return responseData;
  }

  /**
   * Client perform function. Calls Shopify Payments Apps API.
   * @param {*} query the query to run
   * @param {*} variables the variables to pass
   * @returns
   */
  async #perform(query, variables) {
    const apiVersion =
      process.env.SHOPIFY_PAYMENTS_APP_API_VERSION ?? "unstable";

    const response = await fetch(
      `https://${this.shop}/payments_apps/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      }
    );

    log(`Making request for shop: "${this.shop}", api: "${apiVersion}"`);

    const responseBody = await response.json();
    return response.ok ? responseBody.data : null;
  }

  /**
   * Configures the partner-managed payments gateway to work on the merchant's store. For an example of how to use the paymentsAppConfigure mutation, refer to the Onboard a merchant payments app tutorial.
   *
   * @param {string} externalHandle - A username or identifier associated with the account that the merchant has used with the partner. It displays in the Payments section in the Shopify admin. The externalHandle enables the merchant to identify the connected payment provider account.
   * @param {boolean} ready - The provider is ready to process merchant's payments.
   * @returns
   */
  async paymentsAppConfigure(externalHandle, ready) {
    log("Configuring Payments App");
    const response = await this.#perform(schema.paymentsAppConfigure, {
      externalHandle,
      ready,
    });
    
    return response?.paymentsAppConfigure;
  }

  /**
   * Function that injects the dependencies for this client based on the session type
   * @param {'payment' | 'refund' | 'capture' | 'void'} type
   * @returns {void}
   */
  dependencyInjector(type) {
    switch (type) {
      case PAYMENT:
        this.resolveMutation = "paymentSessionResolve";
        this.rejectMutation = "paymentSessionReject";
        this.pendingMutation = "paymentSessionPending";
        break;
      case REFUND:
        this.resolveMutation = "refundSessionResolve";
        this.rejectMutation = "refundSessionReject";
        this.update = updateRefundSessionStatus;
        break;
      case CAPTURE:
        this.resolveMutation = "captureSessionResolve";
        this.rejectMutation = "captureSessionReject";
        this.update = updateCaptureSessionStatus;
        break;
      case VOID:
        this.resolveMutation = "voidSessionResolve";
        this.rejectMutation = "voidSessionReject";
        this.update = updateVoidSessionStatus;
        break;
    }
  }
}

/**
 * Enum for Pending Payment Session reason
 * @readonly
 * @enum {string}
 */
const PendReason = {
  PARTNER_ACTION_REQUIRED: "PARTNER_ACTION_REQUIRED",
  BUYER_ACTION_REQUIRED: "BUYER_ACTION_REQUIRED",
  NETWORK_ACTION_REQUIRED: "NETWORK_ACTION_REQUIRED",
};

export const PAYMENT = "payment";
export const REFUND = "refund";
export const CAPTURE = "capture";
export const VOID = "void";
