import { LogMessageType } from "@prisma/client";
import { createLogMessage } from "~/payments.repository.server";

/**
 * Enum for Payment kind
 * @readonly
 * @enum {string}
 */
export const PaymentKind = {
  SALE: "sale",
  AUTHORIZATION: "authorization",
};

/**
 * Enum for Payment status
 * @readonly
 * @enum {string}
 */
export const PaymentStatus = {
  RESOLVE: "resolve",
  REJECT: "reject",
  PENDING: "pending",
};

/**
 * Enum for Payment Session status
 * @readonly
 * @enum {string}
 */
export const PaymentSessionStatus = {
  CREATED: "created",
  CANCELED: "canceled",
  AUTHORIZED: "authorized",
  AUTHORIZATION_PENDING: "authorization_pending",
  PAYMENT_PENDING: "payment_pending",
  CHARGE_PENDING: "charge_pending",
  PAID: "paid",
  PARTIALLY_PAID: "partially_paid",
  VOIDED: "voided",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

/**
 * Checks if a Payment Session status is valid
 *
 * @param {PaymentSessionStatus} status
 * @returns {boolean}
 */
export const validatePaymentSessionStatus = (status) =>
  Object.values(PaymentSessionStatus).includes(status);

/**
 * Checks if a Payment Session status is valid
 *
 * @param {PaymentStatus} status
 * @returns {boolean}
 */
export const validatePaymentStatus = (status) =>
  Object.values(PaymentStatus).includes(status);

/**
 * Checks if a Payment Session status is valid
 *
 * @param {PaymentKind} kind
 * @returns {boolean}
 */
export const validatePaymentKind = (kind) =>
  Object.values(PaymentKind).includes(kind);

/**
 * Generates string with amount and currency
 *
 * @param {object} money
 * @param {string | number} money.amount
 * @param {string} money.currency
 * @returns {string}
 */
export const formatMoney = ({ amount, currency }) =>
  amount.toString().concat(" ", currency);

/**
 * Creates a logger instance with a predefined prefix
 * @param {string} prefix
 * @returns
 */
export const createLogger = (prefix) => {
  const logPrefix = `[${prefix}]`;

  return {
    log: (message) => console.log(`${logPrefix} ${message}`),
  };
};

/**
 * Creates a logger instance with a predefined prefix
 * @param {string} prefix
 * @returns
 */
export const createPaymentLogger = (prefix) => {
  return {
    /**
     * @param {PaymenLogParams} param0
     */
    paymentLog: async ({
      paymentId,
      message,
      payload = "",
      type = LogMessageType.INFO,
    }) => {
      try {
        await createLogMessage(
          paymentId,
          type,
          `${prefix ? `${prefix}` : ""}`,
          message,
          payload
        );
      } catch (e) {
        console.error(e);
      }
    },
  };
};

/**
 * Capitalize a string
 * @param {string} string
 * @returns {string}
 */
export const capitalize = (string) =>
  `${string.charAt(0).toUpperCase()}${string.slice(1).toLowerCase()}`;

/**
 * Finds the Webhook created for the app or returns null
 *
 * @param {Array} webhooks - The list of webhooks returned from the keypair
 * @param {string} url - The URL to where the webhook sends notifications
 *
 * @returns {boolean}
 */
export const findAppWebhook = (webhooks, url) => {
  return webhooks.findIndex((webhook) => webhook.url === url) !== -1;
};

/**
 * Creates the notifications full url from the request object
 *
 * @param {Request} request
 *
 * @returns {string}
 */
export const createNotificationsUrl = (request) => {
  const url = new URL(request.url);

  return `https://${url.host}/app/notifications`;
};

/**
 * @typedef {Object} PaymenLogParams
 *
 * @param {String} paymentId
 * @param {String} message
 * @param {String} payload
 * @param {LogMessageType} type
 */