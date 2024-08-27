import { createPaymentSession } from "~/payments.repository.server";
import { createLogger } from "~/utils/lib";

const { log } = createLogger("Payment Session");

/**
 * Saves and starts a payment session.
 * Redirects back to shop if payment session was created.
 *
 * Request reference
 * https://shopify.dev/docs/apps/build/payments/request-reference#offsite-payment-request-reference
 */
export const action = async ({ request }) => {
  /** @type RequestBody */
  const requestBody = await request.json();

  const shopDomain = request.headers.get("shopify-shop-domain");

  try {
    log("Creating Payment Session");
    const paymentSession = await createPaymentSession(
      createParams(requestBody, shopDomain)
    );

    if (!paymentSession) {
      log("A PaymentSession couldn't be created");
      throw new Response("A PaymentSession couldn't be created.", {
        status: 500,
      });
    }

    log("PaymentSession created successfully, redirecting");
    return { redirect_url: buildRedirectUrl(request, paymentSession.id) };
  } catch (e) {
    const errorMessage = "Error creating Payment Session";
    let status = 500;
    log(errorMessage);

    if (e instanceof Error) {
      log(e.message);
    } else if (e instanceof Response) {
      status = e.status;
      log(e.statusText);
    }

    return new Response(errorMessage, { status });
  }
};

/**
 * @param {RequestBody} requestBody
 * @param {string} shopDomain
 */
const createParams = (
  {
    id,
    gid,
    group,
    amount,
    currency,
    test,
    kind,
    customer,
    payment_method,
    proposed_at,
    cancel_url,
    resources,
  },
  shopDomain
) => {
  const checkoutCartToken = getCartTokenFromCancelUrl(cancel_url);

  if (checkoutCartToken === null)
    throw new Error("Couldn't retrieve Checkout Cart Token");
  
  return {
    id,
    pid: resources?.paymentId,
    gid,
    group,
    amount,
    currency,
    test,
    kind,
    customer,
    paymentMethod: payment_method,
    proposedAt: proposed_at,
    cancelUrl: cancel_url,
    shop: shopDomain,
    checkoutCartToken,
  };
};

const buildRedirectUrl = (request, id) => {
  const url = new URL(request.url);
  return `${url.origin}/app/processing/${id}`;
};

const getCartTokenFromCancelUrl = (cancelUrl) => {
  const regex = /\/checkouts\/cn\/(.*?)\/processing/;
  const matches = regex.exec(cancelUrl);

  if (matches !== null && matches.length > 0) {
    return matches[1];
  }

  return null;
};

/**
 * @typedef RequestBody
 * @property {string} id - The unique identifier for the capture attempt. Used as the idempotency key. Assume that requests with a given ID are identical to Unique identifier for the payment attempt. Used as the idempotency key. It can be assumed that requests with a given ID are identical to any previously received requests with the same ID. This ID must be surfaced to the merchant so that they can correlate Shopify orders with payments managed by the Partner app.
 * @property {string} gid - Identifies the payment when communicating with Shopify (in GraphQL mutations, for example).
 * @property {string} group - A customer might open multiple tabs in their browser for a given order. All of those tabs will be associated with the same group. As a result, Shopify can initiate multiple payment flows for the same id and group, redirecting to your app each time. Your app must only call the PaymentSessionResolve once per id and group.
 * @property {string} amount - The amount to be charged. The value is always sent using a decimal point as a separator, regardless of locale.
 * @property {string} currency - Three-letter ISO 4217 currency code.
 * @property {boolean} test - Indicates whether the payment is in test or live mode. Refer to Test mode for more information.
 * @property {string} merchant_locale - The IETF BCP 47 language tag representing the language used by the merchant.
 * @property {Object} payment_method - Hash giving details on the payment method used. Refer to payment_method hash for more information.
 * @property {string} proposed_at - A timestamp representing when the capture request was proposed.
 * @property {Object} customer - If customer is included, then at least one of customer.email or customer.phone_number is present. For more information on the customer field, refer to the customer hash.
 * @property {string} kind - Either sale or authorization. If you support payment authorization, then this value is set based on the merchant's configuration. If you don't support separate authorization and capture, then the value is always sale. For sale transactions, you need to capture the funds instantly with this request. For authorization transactions, you must place a hold on the funds and capture them later when Shopify sends a capture request.
 * @property {string} cancel_url - The URL to redirect the customer when the customer quits the payment flow and returns to the merchant's website. The cancel_url attribute should only be used when a customer is on the provider page and decides to cancel their payment and return to Shopify.
 * @property {Object} resources - Unzer Payment resources
 */
