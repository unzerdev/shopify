import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createOrUpdateCheckout } from "~/checkouts.server";
import { createLogger } from "~/utils/lib";

const { log } = createLogger("Webhooks");

export const action = async ({ request }) => {
  log("Authenticating Webhook");
  const { topic, shop, session, admin, payload } = await authenticate.webhook(
    request
  );

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    log("Admin context not found");
    throw new Response();
  }

  log(`Managing topic: ${topic}`);
  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }

        break;
      case "CUSTOMERS_DATA_REQUEST":
        await handleCustomersDataRequest(/** @type {CustomersDataRequestPayload} */ (payload));
        break;
      case "CUSTOMERS_REDACT":
        await handleCustomersRedact(/** @type {CustomersRedactPayload} */ (payload));
        break;
      case "SHOP_REDACT":
        await handleShopRedact(/** @type {ShopRedactPayload} */ (payload));
        break;
      default:
        const errorMessage = `Unhandled webhook topic: ${topic}`;
        log(errorMessage);
        throw new Response(errorMessage, { status: 404 });
    }

    log(`Successfully managed topic: ${topic}`);
    return new Response();
  } catch (e) {
    const errorMessage = `Error managing topic: ${topic}`;
    let status = 500;
    log(errorMessage);

    if (e instanceof Error) {
      log(e.message);
    } else if (e instanceof Response) {
      status = e.status;
      log(e.statusText);
    }

    throw new Response(errorMessage, { status });
  }
};

/**
 * Customers can request their data from a store owner. When this happens, Shopify sends a payload on the customers/data_request topic to the apps that are installed on that store.
 * 
 * If your app has been granted access to customer or order data, then it will receive a data request webhook. The webhook contains the resource IDs of the customer data that you need to provide to the store owner. It's your responsibility to provide this data to the store owner directly. In some cases, a customer record contains only the customer's email address.
 * 
 * @typedef {{
 *   shop_id: number
 *   shop_domain: string
 *   customer: {
 *     id: number
 *     email: string
 *     phone: string
 *   }
 *   orders_requested: number[]
 * }} CustomersDataRequestPayload
 *  
 * 
 * @param {CustomersDataRequestPayload} payload
 */
async function handleCustomersDataRequest(payload) {

}

/**
 * Store owners can request that data is deleted on behalf of a customer. When this happens, Shopify sends a payload on the customers/redact topic to the apps installed on that store.
 * 
 * If your app has been granted access to the store's customer or order data, then it will receive a redaction request webhook with the resource IDs that you need to redact or delete. In some cases, a customer record contains only the customer's email address.
 * 
 * If a customer hasn't placed an order in the past six months, then Shopify sends the payload 10 days after the deletion request. Otherwise, the request is withheld until six months have passed.
 * 
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance#customers-redact
 * 
 * @typedef {{
 *   shop_id: number
 *   shop_domain: string
 *   customer: {
 *     id: number
 *     email: string
 *     phone: string
 *   }
 *   orders_to_redact: number[]
 * }} CustomersRedactPayload
 * 
 * @param {CustomersRedactPayload} payload 
 */
async function handleCustomersRedact(payload) {

}

/**
 * 48 hours after a store owner uninstalls your app, Shopify sends a payload on the shop/redact topic. This webhook provides the store's shop_id and shop_domain so that you can erase data for that store from your database.
 * @see https://shopify.dev/docs/apps/build/privacy-law-compliance#shop-redact
 * 
 * @typedef {{
 *   shop_id: number
 *   shop_domain: string
 * }} ShopRedactPayload
 * 
 * @param {ShopRedactPayload} payload 
 */
async function handleShopRedact(payload) {

}
