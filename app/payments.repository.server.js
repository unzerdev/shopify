import { LogMessageType, Prisma, UnzerCancelStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "~/db.server";
import {
  validatePaymentKind,
  validatePaymentStatus,
  PaymentSessionStatus,
  validatePaymentSessionStatus,
} from "~/utils/lib";

const logPrefix = "Payment Repository";

/**
 * Creates a PaymentSession entity with the provided data.
 * 
 * @param {Object} paymentSession
 * @param {string} paymentSession.id - The Shopify Payment Session id
 * @param {string} paymentSession.gid - The Shopify Payment Session GraphQL id
 * @param {string} paymentSession.group
 * @param {string} paymentSession.amount
 * @param {string} paymentSession.currency
 * @param {boolean} paymentSession.test
 * @param {string} paymentSession.kind
 * @param {string} paymentSession.shop
 * @param {Object} paymentSession.paymentMethod
 * @param {Object} paymentSession.customer
 * @param {string} paymentSession.cancelUrl
 * @param {string} paymentSession.proposedAt
 * @param {string} paymentSession.checkoutCartToken
 */
export const createPaymentSession = async (paymentSession) => {
  const { id, amount, paymentMethod, customer } = paymentSession;
  const session = await prisma.paymentSession.create({
    data: {
      ...paymentSession,
      amount: new Prisma.Decimal(parseFloat(amount)),
      paymentMethod: JSON.stringify(paymentMethod),
      customer: JSON.stringify(customer),
      status: PaymentSessionStatus.CREATED,
    },
  });

  createLogMessage(
    id,
    LogMessageType.INFO,
    logPrefix,
    "Payment Session Created",
    JSON.stringify(session)
  );

  return session;
};

/**
 * Updates the given PaymentSession's status.
 *
 * @param {string} id
 * @param {PaymentSessionStatus} status
 */
export const updatePaymentSessionStatus = async (id, status) => {
  if (!validatePaymentSessionStatus(status)) return;
  return await prisma.paymentSession.update({
    where: { id },
    data: { status: status },
  });
};

/**
 * Updates the given PaymentSession's kind.
 */
export const updatePaymentSessionKind = async (id, kind) => {
  if (!validatePaymentKind(kind)) return;
  return await prisma.paymentSession.update({
    where: { id },
    data: { kind: kind },
  });
};

/**
 * Updates the given PaymentSession with Unzer's payment id
 * after the Payment Page has been created
 *
 * @param {string} paymentId - The Payment Session ID
 * @param {string} pid - The Payment ID
 * @param {string} publicKey - Unzer API Public Key
 */
export const updatePaymentSessionPidAndPublicKey = async (
  paymentId,
  pid,
  publicKey
) => {
  return await prisma.paymentSession.update({
    where: { id: paymentId },
    data: {
      pid,
      publicKey,
    },
  });
};

/**
 * Returns the PaymentSession entity with the provided paymentId.
 */
export const getPaymentSession = async (id) => {
  return await prisma.paymentSession.findUniqueOrThrow({
    where: { id },
    include: {
      refunds: true,
      captures: true,
      void: true,
      charges: true,
      cancels: true,
      authorizations: true,
      logs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
};

/**
 * Returns the PaymentSession entity with the provided paymentId and Public Key
 *
 * @param {string} pid
 * @param {string} publicKey
 */
export const getPaymentSessionByPidAndPublicKey = async (pid, publicKey) => {
  return await prisma.paymentSession.findFirstOrThrow({
    where: { pid, publicKey },
    include: { refunds: true, captures: true, void: true },
  });
};

/**
 * Fetches payment sessions depending on page
 *
 * @param {string} shopName - The store name
 * @param {number} [page=1] - The current page
 * @param {number} [take=25] - The quantity of results
 *
 * @returns {Promise<[number, import('@prisma/client').PaymentSession[]]>}
 */
export const getPaymentSessions = async (shopName, page = 1, take = 25) => {
  const where = {
    shop: shopName,
  };

  return await prisma.$transaction([
    prisma.paymentSession.count({ where }),
    prisma.paymentSession.findMany({
      skip: page * take - take,
      take,
      orderBy: { proposedAt: "desc" },
      where,
    }),
  ]);
};

/**
 * Creates a RefundSession entity with the provided data.
 */
export const createRefundSession = async (refundSession) => {
  const { amount } = refundSession;
  return await prisma.refundSession.create({
    data: {
      ...refundSession,
      amount: parseFloat(amount),
    },
  });
};

/**
 * Updates the given RefundSession's status.
 */
export const updateRefundSessionStatus = async (id, status) => {
  if (!validatePaymentStatus(status)) return;
  return await prisma.refundSession.update({
    where: { id },
    data: { status: status },
  });
};

/**
 * Creates a CaptureSession entity with the provided data.
 */
export const createCaptureSession = async (captureSession) => {
  const { amount } = captureSession;
  return await prisma.captureSession.create({
    data: {
      ...captureSession,
      amount: parseFloat(amount),
    },
  });
};

/**
 * Updates the given CaptureSession's status
 */
export const updateCaptureSessionStatus = async (id, status) => {
  if (!validatePaymentStatus(status)) return;
  return await prisma.captureSession.update({
    where: { id },
    data: { status: status },
  });
};

/**
 * Creates a VoidSession entity with the provided data.
 */
export const createVoidSession = async (voidSession) => {
  return await prisma.voidSession.create({ data: voidSession });
};

/**
 * Updates the given VoidSession's status
 */
export const updateVoidSessionStatus = async (id, status) => {
  if (!validatePaymentStatus(status)) return;
  return await prisma.voidSession.update({
    where: { id },
    data: { status: status },
  });
};

/**
 * @typedef PaymentPageSettings
 * @property {string} logoImage
 * @property {string} fullPageImage
 * @property {string} shopName
 * @property {string} tagline
 * @property {string} helpUrl
 * @property {string} contactUrl
 * @property {string} shopDescription
 * @property {string} termsAndConditionUrl
 * @property {string} privacyPolicyUrl
 * @property {string} imprintUrl
 * @property {string} locale
 *
 * @typedef ConfigurationData
 * @property {import('@prisma/client').Configuration["id"]} id
 * @property {import('@prisma/client').Configuration["sessionId"]} sessionId
 * @property {import('@prisma/client').Configuration["shop"]} shop
 * @property {import('@prisma/client').Configuration["unzerPublicKey"] | null} unzerPublicKey
 * @property {import('@prisma/client').Configuration["unzerPrivateKey"] | null} unzerPrivateKey
 * @property {import('@prisma/client').Configuration["ready"]} ready
 * @property {PaymentPageSettings | null} paymentPageSettings
 * @property {string[]} excludedPaymentTypes
 */

/**
 * Returns the configuration for the provided session.
 *
 * @returns {Promise<ConfigurationData | null>}
 */
export const getConfiguration = async (sessionId) => {
  const configuration = await prisma.configuration.findUnique({
    where: { sessionId },
  });

  if (!configuration) return null;

  return formatConfiguration(configuration);
};

/**
 * Returns the configuration using the shop's name
 *
 * @returns {Promise<ConfigurationData | null>}
 */
export const getConfigurationByShopName = async (shopName) => {
  const configuration = await prisma.configuration.findFirst({
    where: { shop: shopName },
  });

  if (!configuration) return null;

  return formatConfiguration(configuration);
};

/**
 * Returns the configuration for the session if it exists, create it otherwise.
 *
 * @returns {Promise<ConfigurationData>}
 */
export const getOrCreateConfiguration = async (sessionId, config) => {
  const configuration = await prisma.configuration.upsert({
    where: { sessionId },
    update: { ...config },
    create: { sessionId, ...config },
  });

  return formatConfiguration(configuration);
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {string} sessionId
 * @param {PaymentPageSettings} paymentPageSettings
 *
 * @returns {Promise<ConfigurationData>}
 */
export const updatePaymentPageConfiguration = async (
  sessionId,
  paymentPageSettings
) => {
  const configuration = await prisma.configuration.update({
    where: { sessionId },
    data: {
      paymentPageSettings: JSON.stringify(paymentPageSettings),
    },
  });

  return formatConfiguration(configuration);
};

/**
 * Updates the Excluded Payment Types list
 *
 * @param {string} sessionId
 * @param {string[]} excludedPaymentTypes
 *
 * @returns {Promise<ConfigurationData>}
 */
export const updateExcludedPaymentTypes = async (
  sessionId,
  excludedPaymentTypes
) => {
  const configuration = await prisma.configuration.update({
    where: { sessionId },
    data: {
      excludedPaymentTypes: JSON.stringify(excludedPaymentTypes),
    },
  });

  return formatConfiguration(configuration);
};

/**
 * Updates the ready status in the Configuration
 *
 * @param {string} sessionId
 * @param {boolean} ready
 *
 * @returns {Promise<ConfigurationData>}
 */
export const updateReadyStatus = async (
  sessionId,
  ready
) => {
  const configuration = await prisma.configuration.update({
    where: { sessionId },
    data: {
      ready,
    },
  });

  return formatConfiguration(configuration);
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {String} paymentId
 * @param {UnzerChargePayload} payload
 */
export const createUnzerCharge = async (paymentId, payload) => {
  const charge = await prisma.unzerCharge.create({
    data: {
      chargeId: payload.id,
      paymentId: paymentId,
      isSuccess: payload.isSuccess,
      isPending: payload.isPending,
      isResumed: payload.isResumed,
      isError: payload.isError,
      card3ds: payload.card3ds,
      redirectUrl: payload.redirectUrl,
      message: JSON.stringify(payload.message),
      amount: payload.amount,
      currency: payload.currency,
      date: new Date(payload.date),
      resources: JSON.stringify(payload.resources),
      invoiceId: payload.invoiceId,
      paymentReference: payload.paymentReference,
      processing: JSON.stringify(payload.processing),
    },
  });

  return charge;
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {String} paymentId
 * @param {UnzerAuthorizePayload} payload
 */
export const createUnzerAuthorize = async (paymentId, payload) => {
  const authorize = await prisma.unzerAuthorize.create({
    data: {
      authorizeId: payload.id,
      paymentId: paymentId,
      isSuccess: payload.isSuccess,
      isPending: payload.isPending,
      isResumed: payload.isResumed,
      isError: payload.isError,
      card3ds: payload.card3ds,
      redirectUrl: payload.redirectUrl,
      message: JSON.stringify(payload.message),
      amount: payload.amount,
      currency: payload.currency,
      date: new Date(payload.date),
      resources: JSON.stringify(payload.resources),
      invoiceId: payload.invoiceId,
      paymentReference: payload.paymentReference,
      processing: JSON.stringify(payload.processing),
    },
  });

  return authorize;
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {String} pid
 * @param {String} cancelId
 */
export const getUnzerCancel = async (pid, cancelId) => {
  const cancel = await prisma.unzerCancel.findFirst({
    where: {
      cancelId,
      payment: {
        pid,
      },
    },
    include: { refund: true, void: true },
  });
  return cancel;
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {UnzerCancelPayload} payload
 */
export const createUnzerCancel = async (payload) => {
  const charge = await prisma.unzerCancel.create({
    data: {
      ...payload,
    },
  });

  return charge;
};

/**
 * Updates the paymentPage configuration object
 *
 * @param {UnzerCancelPayload} payload
 */
export const updateUnzerCancel = async (id, payload) => {
  const charge = await prisma.unzerCancel.update({
    where: {
      id,
    },
    data: {
      ...payload,
    },
  });

  return charge;
};

/**
 * Creates a Log entry for a payment
 * @param {String} paymentId
 * @param {LogMessageType} type
 * @param {String} prefix
 * @param {String} message
 * @param {String} payload
 */
export const createLogMessage = async (
  paymentId,
  type,
  prefix,
  message,
  payload
) => {
  try {
    await prisma.paymentLog.create({
      data: {
        paymentId,
        prefix,
        message,
        type,
        payload,
      },
    });
  } catch (e) {
    if (paymentId) {
      await prisma.paymentLog.create({
        data: {
          paymentId,
          prefix: "SYSTEM",
          message: e.message,
          type: LogMessageType.ERROR,
          payload: JSON.stringify(e),
        },
      });
    }
    console.error(e);
  }
};

/**
 * Formats the Configuration to parse JSON fields
 *
 * @param {import('@prisma/client').Configuration} configuration
 */
function formatConfiguration(configuration) {
  const {
    unzerPrivateKey,
    unzerPublicKey,
    paymentPageSettings,
    excludedPaymentTypes,
  } = configuration;

  return {
    ...configuration,
    unzerPrivateKey: unzerPrivateKey === "" ? null : unzerPrivateKey,
    unzerPublicKey: unzerPublicKey === "" ? null : unzerPublicKey,
    paymentPageSettings: JSON.parse(paymentPageSettings || "null"),
    excludedPaymentTypes: JSON.parse(excludedPaymentTypes || "[]"),
  };
}

/**
 * @typedef {Object} UnzerCancelPayload
 *
 * @property {String} [cancelId]
 * @property {String} [chargeId]
 * @property {String} [paymentId]
 * @property {String} [refundId]
 * @property {String} [voidId]
 * @property {UnzerCancelStatus} [status]
 * @property {Boolean} [isSuccess]
 * @property {Boolean} [isPending]
 * @property {Boolean} [isResumed]
 * @property {Boolean} [isError]
 * @property {Boolean} [card3ds]
 * @property {String} [redirectUrl]
 * @property {Object} [message]
 * @property {Decimal} [amount]
 * @property {String} [currency]
 * @property {Date} [date]
 * @property {Object} [resources]
 * @property {String} [invoiceId]
 * @property {String} [paymentReference]
 * @property {Object} [processing]
 *
 */

/**
 * @typedef {Object} UnzerCancelPayloadProcessing
 *
 * @property {String} uniqueId
 * @property {String} shortId
 * @property {String} traceId
 */

/**
 * @typedef {Object} UnzerChargePayload
 *
 * @property {String} id
 * @property {Boolean} isSuccess
 * @property {Boolean} isPending
 * @property {Boolean} isResumed
 * @property {Boolean} isError
 * @property {Boolean} card3ds
 * @property {String} redirectUrl
 * @property {Object} message
 * @property {Decimal} amount
 * @property {String} currency
 * @property {Date} date
 * @property {Object} resources
 * @property {String} invoiceId
 * @property {String} paymentReference
 * @property {Object} processing
 *
 */

/**
 * @typedef {Object} UnzerAuthorizePayload
 *
 * @property {String} id
 * @property {Boolean} isSuccess
 * @property {Boolean} isPending
 * @property {Boolean} isResumed
 * @property {Boolean} isError
 * @property {Boolean} card3ds
 * @property {String} redirectUrl
 * @property {Object} message
 * @property {Decimal} amount
 * @property {String} currency
 * @property {Date} date
 * @property {Object} resources
 * @property {String} invoiceId
 * @property {String} paymentReference
 * @property {Object} processing
 *
 */
