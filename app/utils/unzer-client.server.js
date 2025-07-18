import { createLogger } from "~/utils/lib";

const API_URL = "https://api.unzer.com";
const { log } = createLogger("Unzer Client");

/**
 * Client to interface with Unzer API.
 */
export default class UnzerClient {
  /**
   * @param {string} privateKey - The merchant private API key
   */
  constructor(privateKey) {
    this.auth = Buffer.from(`${privateKey}:`).toString("base64");
    this.customerResourceId;
  }

  /**
   * Makes an Authorize POST request to Unzer API
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/authorize_1
   *
   * @param {AuthorizeData} data - Data payload
   * @returns Promise<any>
   */
  async authorize({ amount, currency, typeId, returnUrl }) {
    const response = await this.#callApi(
      `${API_URL}/v1/payments/authorize`,
      "POST",
      {
        amount,
        currency,
        returnUrl,
        resources: {
          typeId,
        },
      }
    );

    const data = await response.json();

    return data;
  }

  /**
   * Makes an Authorize GET request to Unzer API
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/getAuthorize
   *
   * @param {string} uniqueId - The uniqueId of the authorization.
   * @returns Promise<any>
   */
  async getAuthorize(uniqueId) {
    const url = new URL(`${API_URL}/v1/payments/authorize`);
    url.searchParams.append("uniqueId", uniqueId);

    const response = await this.#callApi(url.toString());
    const data = await response.json();

    return data;
  }

  /**
   * Makes a POST Charge request to Unzer API for
   * an authorized payment
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/chargesByPayment
   *
   * @param {string} paymentId - A unique paymentId or orderId.
   * @param {object} [payload]
   * @param {string} [payload.amount] - The amount in a positive decimal value. Accepted length: Decimal{10,4}.
   * @param {string} [payload.orderId] - The unique orderId to identify payments.
   * @param {string} [payload.invoiceId] - The unique invoiceId.
   * @param {string} [payload.paymentReference] - An additional description for the transaction
   *
   * @returns Promise<any>
   */
  async chargeAuthorized(paymentId, payload) {
    log("Charging a previously authorized Payment");
    const response = await this.#callApi(
      `${API_URL}/v1/payments/${paymentId}/charges`,
      "POST",
      payload
    );
    const data = await response.json();

    if (data.isError) {
      log("Error processing charge");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error processing charge");
    }

    return data;
  }

  /**
   * Directly charge money by creating a charge transaction.
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/charges
   *
   * @param {ChargeData} data - Data payload
   * @returns Promise<any>
   */
  async charge({ amount, currency, typeId, returnUrl }) {
    const response = await this.#callApi(
      `${API_URL}/v1/payments/charges`,
      "POST",
      {
        amount,
        currency,
        returnUrl,
        resources: {
          typeId,
        },
      }
    );

    const data = await response.json();

    return data;
  }

  /**
   * Cancel payment for refund
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/cancelChargesByPayment
   *
   * @param {string} paymentId - A unique paymentId or orderId.
   * @param {object} [payload]
   * @param {string} [payload.amount] - The amount in a positive decimal value. Accepted length: Decimal{10,4}. If no amount is provided, the full payment amount is canceled
   * @param {string} [payload.paymentReference] - An additional description for the transaction
   * @param {string} [payload.reasonCode] - Only valid and required for invoice secured: The reason code for the cancel. Possible values: CANCEL, RETURN, CREDIT.
   * @param {string} [payload.amountGross] - Only valid for installment secured: The amount gross to be cancelled.
   * @param {string} [payload.amountNet] - Only valid for installment secured: The amount net to be cancelled.
   * @param {string} [payload.amountVat] - Only valid for installment secured: The amount vat to be cancelled.
   *
   * @returns {Promise<CancelChargeResponse>}
   */
  async cancel(paymentId, payload) {
    const response = await this.#callApi(
      `${API_URL}/v1/payments/${paymentId}/charges/cancels`,
      "POST",
      payload
    );

    return response.json();
  }

  /**
   * Cancel payment for refund
   * @see https://api.unzer.com/api-reference/index.html#tag/Payments/operation/cancelChargesByPayment
   *
   * @param {CancelAuthorizeData} data - Data payload
   * @returns {Promise<CancelChargeResponse>}
   */
  async cancelAuthorize({ paymentId, authorizeId, payload }) {
    const response = await this.#callApi(
      `${API_URL}/v1/payments/${paymentId}/authorize/${authorizeId}/cancels`,
      "POST",
      {
        ...payload,
      }
    );

    return response.json();
  }

  /**
   * Get a charge transaction by uniqueId.
   * @see Get a charge transaction by id, orderId, uniqueId or shortId.
   *
   * @param {string} id - Any unique id. This can be the id of the charge, orderId, uniqueId or shortId
   * @returns Promise<any>
   */
  async getCharges(id) {
    const response = await this.#callApi(
      `${API_URL}/v1/payments/charges/${id}`
    );

    const data = await response.json();

    return data;
  }

  /**
   * Retrieves a customer using a unique identifier. Should be the email.
   * @see https://api.unzer.com/api-reference/index.html#tag/Customer/operation/getCustomer
   *
   * @param {string} customerId - A unique identifier for the customer. Should be an email.
   *
   * @return Promise<any>
   */
  async getCustomer(customerId) {
    log("Fetching Customer Data");
    const response = await this.#callApi(
      `${API_URL}/v1/customers/${customerId}`
    );
    const data = await response.json();

    return data;
  }

  /**
   * Creates a basket, and then adds the ID to the client to be
   * used in future requests.
   * @see https://api.unzer.com/api-reference/index.html#tag/Basket-v2/operation/createBasketV2_2
   *
   * @param {BasketData} payload
   *
   * @returns Promise<void>
   */
  async createBasket(payload) {
    log("Creating Basket");

    const response = await this.#callApi(
      `${API_URL}/v2/baskets`,
      "POST",
      payload
    );
    const data = await response.json();

    if (data.isError) {
      log("Error creating Basket");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error creating Basket");
    }

    log("Basket successfully created");
    this.basketResourceId = data.id;
  }

  /**
   * Get a basket (v2) resource.
   * @see https://api.unzer.com/api-reference/index.html#tag/Basket-v2/operation/getBasketV2
   *
   * @param {string} basketId - The unique basket (v2) id.
   *
   * @returns Promise<any>
   */
  async getBasket(basketId) {
    log("Fetching Basket Data");

    const response = await this.#callApi(`${API_URL}/v2/baskets/${basketId}`);
    const data = await response.json();

    return data;
  }

  /**
   * Creates a customer, or returns an already created, and then adds the ID to the client to be
   * used in future requests.
   * Docs: https://api.unzer.com/api-reference/index.html#tag/Customer/operation/createCustomer_1
   * Docs: https://api.unzer.com/api-reference/index.html#tag/Customer-v1/operation/updateCustomer_1
   *
   * @param {CustomerData} customerData
   *
   * @returns Promise<void>
   */
  async createCustomer(customerData) {
    log("Checking if Customer exists");
    const customer = await this.getCustomer(customerData.email);

    if (!customer.isError) {
      log("Using existing Customer");
      const response = await this.#callApi(
        `${API_URL}/v1/customers/${customer.id}`,
        "PUT",
        customerData
      );
      const data = await response.json();

      if (data.isError) {
        log("Error creating Customer");
        (data.errors || []).forEach((error) => log(error.merchantMessage));

        throw new Error("Error updating Customer");
      }

      log("Customer updated");
      this.customerResourceId = customer.id;
    } else {
      log("Creating new Customer");
      const response = await this.#callApi(
        `${API_URL}/v1/customers`,
        "POST",
        customerData
      );
      const data = await response.json();

      if (data.isError) {
        log("Error creating Customer");
        (data.errors || []).forEach((error) => log(error.merchantMessage));

        throw new Error("Error creating Customer");
      }

      log("Customer created");
      this.customerResourceId = data.id;
    }
  }

  /**
   * Creates a metadata resource, and then adds the ID to the client to be
   * used in future requests.
   * Docs: https://api.unzer.com/api-reference/index.html#tag/Customer/operation/createCustomer_1
   *
   * @param {string} shopifyApiVersion - The API version used when creating the resource
   *
   * @returns Promise<void>
   */
  async createMetadata(shopifyApiVersion) {
    log("Creating Metadata resource");
    const response = await this.#callApi(`${API_URL}/v1/metadata`, "POST", {
      shopType: "Shopify",
      shopVersion: shopifyApiVersion,
      pluginVersion: "1.0.0",
      pluginType: "unzerdev/shopify",
    });
    const data = await response.json();

    if (data.isError) {
      log("Error creating Metadata resource");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error creating Customer");
    }

    log("Metadata Created created");
    this.metadataResourceId = data.id;
  }

  /**
   * Get a metadata resource.
   * @see https://api.unzer.com/api-reference/index.html#tag/Metadata/operation/getMetadata
   *
   * @param {string} metadataId - The previously created metadataId.
   *
   * @returns Promise<any>
   */
  async getMetadata(metadataId) {
    log("Fetching Metadata Data");

    const response = await this.#callApi(
      `${API_URL}/v1/metadata/${metadataId}`
    );
    const data = await response.json();

    return data;
  }

  /**
   * Creates a PayPage.
   *
   * Docs:
   * https://api.unzer.com/api-reference/index.html#tag/Payment-Page/operation/createPaypageCharge
   * https://api.unzer.com/api-reference/index.html#tag/Payment-Page/operation/createPaypageAuthorize
   *
   * @param {PayPageAction} action - The type of action
   * @param {PayPagePayload} payload
   *
   * @returns {Promise<PayPageData>}
   */
  async createPayPage(action, payload) {
    log("Creating Payment Page");

    const requestBody = { ...payload };
    requestBody.resources = requestBody.resources || {};
    requestBody.additionalAttributes = {
      "customerFields.paylater-installment": "birthdate",
      "customerFields.paylater-invoice": "birthdate",
      "customerFields.paylater-direct-debit": "birthdate",
    };
    if (this.customerResourceId) {
      requestBody.resources.customerId = this.customerResourceId;
    }

    if (this.basketResourceId) {
      requestBody.resources.basketId = this.basketResourceId;
    }

    if (this.metadataResourceId) {
      requestBody.resources.metadataId = this.metadataResourceId;
    }

    const response = await this.#callApi(
      `${API_URL}/v1/paypage/${action}`,
      "POST",
      requestBody
    );

    /** @type {PayPageData | ErrorData} */
    const data = await response.json();

    if ("isError" in data) {
      log("Error creating Payment Page");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error creating Payment Page");
    }

    log(`Payment Page created Successfully: ${data.id}`);

    return data;
  }

  /**
   * Get a payment using a unique paymentId
   *
   * @param {string} paymentId - A unique paymentId
   *
   * @return {Promise<PaymentData>}
   */
  async getPayment(paymentId) {
    log("Fetching Payment status");
    const response = await this.#callApi(`${API_URL}/v1/payments/${paymentId}`);
    const data = await response.json();

    return data;
  }

  /**
   * Gets all webhooks registered with the keypair
   *
   * @returns {Promise<AllWebhooksData>}
   */
  async getAllWebhooks() {
    log("Fetching Webhooks");

    const response = await this.#callApi(`${API_URL}/v1/webhooks`);
    const data = await response.json();

    return data;
  }

  /**
   * Creates a new Webhook
   *
   * @param {string} url - The URL specifying where the webhook notifications will be delivered to
   */
  async createWebhook(url, event = "all") {
    log("Creating Webhook");

    const response = await this.#callApi(`${API_URL}/v1/webhooks`, "POST", {
      url,
      event,
    });
    const data = await response.json();

    if (data.isError) {
      log("Error creating Webhook");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error creating Webhook");
    }

    return data;
  }

  /**
   * Delete a webhook resource.
   *
   * @param {string} eventId - The eventId to be updated.
   */
  async deleteWebhook(eventId) {
    log("Deleting Webhook");

    const response = await this.#callApi(
      `${API_URL}/v1/webhooks/${eventId}`,
      "DELETE"
    );
    const data = await response.json();

    if (data.isError) {
      log("Error creating Webhook");
      (data.errors || []).forEach((error) => log(error.merchantMessage));

      throw new Error("Error creating Webhook");
    }

    return data;
  }

  /**
   * Makes a GET request to Unzer API to retrieve account information
   * Provides the public key of the used private key as well as a list of the payment types available for the merchant.
   *
   * @returns {Promise<KeypairData | ErrorData>}
   */
  async keypair() {
    log("Fetching Keypair");
    const response = await this.#callApi(`${API_URL}/v1/keypair`);
    const data = await response.json();

    return data;
  }

  /**
   * Provides the public key of the used private key as well as a detailed list of the payment types available for the merchant.
   * Docs: https://api.unzer.com/api-reference/index.html#tag/Keypair/operation/getAvailablePaymentMethodTypesWithTypeInformation
   *
   * @returns {Promise<AvailablePaymentMethodTypesData>}
   */
  async getAvailablePaymentMethodTypes() {
    log("Fetching Available Payment Types");
    const response = await this.#callApi(`${API_URL}/v1/keypair/types`);
    const data = await response.json();

    return data;
  }

  /**
   * Makes a request to Unzer API
   *
   * @param {string} url
   * @param {"GET" | "POST" | "PUT" | "DELETE"} [method="GET"]
   * @param {object} [body]
   *
   * @returns Promise<Response>
   */
  async #callApi(url, method = "GET", body) {
    const requestBody = body ? { body: JSON.stringify(body) } : null;
    const response = await fetch(url, {
      method,
      ...(requestBody || {}),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.auth}`,
      },
    });

    return response;
  }
}

/**
 * @typedef {Object} KeypairData
 * @property {string} publicKey
 * @property {string[]} availablePaymentTypes
 *
 * @typedef {"create" | "pending" | "completed" | "canceled" | "partly" | "payment review" | "chargeback"} PaymentStateName
 *
 * @typedef {Object} Transaction
 * @property {string} participantId
 * @property {string} date
 * @property {string} type
 * @property {string} status
 * @property {string} url
 * @property {string} amount
 *
 * @typedef {Object} PaymentData
 * @property {string} id - The id of payment (ex: s-pay-1).
 * @property {Object} state
 * @property {number} state.id
 * @property {PaymentStateName} state.name
 * @property {Object} amount - Summary of all amounts
 * @property {string} amount.total - Initial amount reduced by cancellations during authorization
 * @property {string} amount.charged - Already charged amount
 * @property {string} amount.canceled - Refunded amount of all charges
 * @property {string} amount.remaining - Difference between total and charged
 * @property {string} currency - iso currency code
 * @property {string} orderId - Order id of the merchant application. This id can also be used to get payments from the api. The id has to be unique for the used key pair.
 * @property {string} invoiceId - InvoiceId of the merchant.
 * @property {string} invoiceId - InvoiceId of the merchant.
 * @property {Object} resources
 * @property {string} resources.customerId - Customer id used for this transaction.
 * @property {string} resources.paymentId - Id of the payment.
 * @property {string} resources.basketId - Basket ID used for this transaction.
 * @property {string} resources.metadataId - Meta data ID used for this transaction.
 * @property {string} resources.payPageId - Payment Page Id related to this payment.
 * @property {string} resources.linkPayId
 * @property {string} resources.typeId - Id of the types Resource that is to be used for this transaction.
 * @property {Transaction[]} transactions
 */

/**
 * @typedef {Object} PayPageData
 * @property {string} id
 * @property {string} redirectUrl
 * @property {string} amount
 * @property {string} returnUrl
 * @property {string} action
 * @property {string[]} excludeTypes
 * @property {Object} resources
 * @property {string} resources.paymentId
 * @property {string} resources.customerId
 * @property {string} resources.basketId
 * @property {string} resources.metadataId
 */

/**
 * @typedef {Object} PaymentType
 * @property {string} type
 * @property {string} allowCustomerTypes
 * @property {string} googleMerchantId
 * @property {boolean} allowCreditTransaction
 *
 * @typedef {Object} AvailablePaymentMethodTypesData
 * @property {string} publicKey
 * @property {string} privateKey
 * @property {PaymentType[]} paymentTypes
 */

/**
 * @typedef {Object} AuthorizeData
 * @property {string} amount - The authorization amount.
 * @property {string} currency - The authorization currency, in the ISO 4217 alpha-3 format (for example, EUR)
 * @property {string} typeId - The ID of the payment type resource to be used (for example, s-crd-fm7tifzkqewy)
 * @property {string} [returnUrl] -	The URL to redirect the customer back after the payment is complete. Required for redirect payments and credit card payments if 3-D Secure is used (for example, https://www.unzer.com)
 */

/**
 * @typedef {Object} ChargeData
 * @property {string} amount - The authorization amount.
 * @property {string} currency - The authorization currency, in the ISO 4217 alpha-3 format (for example, EUR)
 * @property {string} typeId - The ID of the payment type resource to be used (for example, s-crd-fm7tifzkqewy)
 * @property {string} [returnUrl] -	The URL to redirect the customer back after the payment is complete. Required for redirect payments and credit card payments if 3-D Secure is used (for example, https://www.unzer.com)
 */

/**
 * @typedef {Object} CancelAuthorizeData
 * @property {string} paymentId - The authorization amount.
 * @property {string} authorizeId - The authorization currency, in the ISO 4217 alpha-3 format (for example, EUR)
 * @property {object} [payload] - The ID of the payment type resource to be used (for example, s-crd-fm7tifzkqewy)
 */

/**
 * @typedef {Object} BasketData
 * @property {string} [id]
 * @property {number} totalValueGross - The total Basket value (incl VAT) of all basket items deducted by all discounts.
 * @property {string} currencyCode - The currency code in ISO_4217 format.
 * @property {string} orderId - A basket or shop reference ID sent from the shop's backend (mandatory & unique)
 * @property {BasketItem[]} basketItems
 */

/**
 * @typedef {"equals-billing" | "different-address" | "branch-pickup" | "post-office-pickup" | "pack-station"} ShippingType
 * @typedef {Object} CustomerData
 * @property {string} [id] - The unique customer ID generated by the Unzer payment system.
 * @property {string} lastname - The last name of the customer.
 * @property {string} firstname - The first name of the customer.
 * @property {string} [salutation] - The salutation used for the customer. Valid values are "mr", "mrs", or "unknown".
 * @property {string} [company] - The company of the customer.
 * @property {string} [customerId] - A unique identifier for the customer. This value can also be used instead of the resource ID.
 * @property {string} [birthDate] - Birth date of the customer in the yyyy-mm-dd or dd.mm.yyyy format.
 * @property {string} email - The email address of the customer.
 * @property {string} [phone] - The phone number of the customer. This can be either mobile number or a landline number with country code.
 * @property {string} [mobile] - The mobile number of the customer.
 * @property {string} [language] - he language of the customer. Must be a ISO 639 alpha-2 code
 * @property {Address} [billingAddress] - The Billing Address of the customer
 * @property {Address & {shippingType: ShippingType}} shippingAddress - The Shipping Address of the customer
 * @property {Object} [companyInfo] - Company details for the customer. This is required only for B2B customers.
 *
 * @typedef {Object} Address
 * @property {string} name - Address first and last name (max. 81 chars). Required in case of billing address.
 * @property {string} street - Address street (max. 64 chars). Required in case of billing address.
 * @property {string} [state] - Address state in ISO 3166-2 format (max. 8 chars). Required in case of billing address.
 * @property {string} zip - Address zip code (max. 10 chars). Required in case of billing address.
 * @property {string} city - Address city (max. 30 chars). Required in case of billing address.
 * @property {string} country - Address country in ISO A2 format (max. 2 chars). Required in case of billing address.
 */

/**
 * @typedef {Object} BasketItem
 * @property {string} basketItemReferenceId - A unique basket item reference ID (within the basket).
 * @property {number} quantity - The quantity of the basket item
 * @property {string} vat - The VAT value for the basket item in percent (0.00-100.00)
 * @property {number} amountDiscountPerUnitGross - Discount (incl. VAT) granted on the basketItems.amountPerUnitGross. A positive amount is expected.
 * @property {number} amountPerUnitGross - The amount per unit incl VAT
 * @property {string} title - The title of the basket item.
 * @property {string} [type] - The type of the basket item.
 * @property {string} [unit] - The unit description of the item.
 * @property {string} [subTitle] - The subTitle which is displayed on our Payment Page.
 * @property {string} [imageUrl] - The imageUrl for the related basketItem which will be displayed on our Payment Page.
 */

/**
 * @typedef {Object} WebhookEventData
 * @property {string} id - Describe the webhook eventId which will be returned from server)
 * @property {string} url - Declared merchant's api.
 * @property {string} event - Declared event that want to listen
 *
 * @typedef {Object} AllWebhooksData
 * @property {WebhookEventData[]} events
 */

/**
 * @typedef {Object} PayPagePayload
 * @property {number} amount - The total Basket value (incl VAT) of all basket items deducted by all discounts.
 * @property {string} currency - The currency code in ISO_4217 format.
 * @property {string} returnUrl - The URL to redirect the customer back after the payment is complete.
 * @property {string} [logoImage] - A logo image of your shop for the paypage.
 * @property {string} [fullPageImage] - A custom background image for the paypage.
 * @property {string} [shopName] - The shops name to be displayed on the paypage.
 * @property {string} [shopDescription] - The shop description to be displayed on the paypage.
 * @property {string} [tagline] - The shop description to be displayed on the paypage.
 * @property {object} [css] - CSS Data
 * @property {string} [css.shopDescription] - The defined css for shopDescription (E.g: color: #000;)
 * @property {string} [css.tagline] - The defined css for tagline (E.g: color: #000;)
 * @property {string} [css.stepline] - The defined css for the stepline (E.g: color: #000;)
 * @property {string} [css.header] - The defined css for the header (E.g: background-color: #fff;)
 * @property {string} [css.shopName] - The defined css for the shopname (E.g: color: #000;)
 * @property {string} [css.helpUrl] - The defined css for the help url label (E.g: color: #000;)
 * @property {string} [css.shopName] - The defined css for the shopname (E.g: color: #000;)
 * @property {string} [css.contactUrl] - The defined css for the contact url label (E.g: color: #000;)
 * @property {string} [css.invoiceId] - The defined css for the invoice-id label (E.g: color: #000;)
 * @property {string} [css.orderId] - The defined css for the order-id label (E.g: color: #000;)
 * @property {string} [css.backToMerchantLink] - The defined css for the the back-to-merchant link (E.g: color: #000;)
 * @property {string} [orderId] - The unique orderId to identify payments.
 * @property {string} [termsAndConditionUrl] - A link to your shops terms and conditions. The link will be displayed within the payment page.
 * @property {string} [privacyPolicyUrl] - A link to your shops privacy policy. The link will be displayed within the payment page.
 * @property {string} [imprintUrl] - A link to your shops imprint. The link will be displayed within the payment page.
 * @property {string} [helpUrl] - A link to your shops help page. The link will be displayed within the payment page.
 * @property {string} [contactUrl] - A link to your shops contact page. The link will be displayed within the payment page.
 * @property {string} [invoiceId] - The unique invoiceId.
 * @property {boolean} [card3ds] - Only valid for card payment method: A flag for specifying if the payment should be 3D-Secured or not.
 * @property {boolean} [billingAddressRequired] - A flag for specifying if a billing address is required or not.
 * @property {boolean} [shippingAddressRequired] - A flag for specifying if a shipping address is required or not.
 * @property {string[]} [excludeTypes] - A list of payment types to be excluded on the paypage.
 * @property {string} [paymentReference] - An additional description for the transaction
 * @property {Object} [additionalAttributes] - A map for defining additional attributes for specific payment methods like installment-secured (effectiveInterestRate).
 * @property {Resources} [resources]
 */

/**
 * @typedef {Object} Resources
 *
 * @property {string} [customerId] - The id of the customer resource to be used.
 * @property {string} [basketId] - The id of the basket resource to be used for this payment.
 * @property {string} [metadataId] - The id of the metadata resource to be used for this payment.
 */

/**
 * @typedef {Object} CancelChargeResponse
 *
 * @property {String} id
 * @property {String} isSuccess
 * @property {Boolean} isSuccess
 * @property {Boolean} isPending
 * @property {Boolean} isResumed
 * @property {Boolean} isError
 * @property {Boolean} card3ds
 * @property {String} redirectUrl
 * @property {UnzerResponseMessage} message
 * @property {String} amount
 * @property {String} currency
 * @property {String} date
 * @property {UnzerResponseResource} resources
 * @property {String} invoiceId
 * @property {String} paymentReference
 * @property {UnzerResponseProcessing} processing
 */

/**
 * @typedef {Object} UnzerResponseMessage
 *
 * @property {String} code
 * @property {String} merchant
 * @property {String} customer
 */

/**
 * @typedef {Object} UnzerResponseResource
 *
 * @property {String} customerId
 * @property {String} paymentId
 * @property {String} basketId
 * @property {String} metadataId
 * @property {String} payPageId
 * @property {String} traceId
 * @property {String} typeId
 */

/**
 * @typedef {Object} UnzerResponseProcessing
 *
 * @property {String} uniqueId
 * @property {String} shortId
 * @property {String} traceId
 */

/**
 * @typedef {Object} ErrorData
 * @property {string} id
 * @property {boolean} isSuccess
 * @property {boolean} isPending
 * @property {boolean} isError
 * @property {string} url
 * @property {string} traceId
 * @property {{
 *    code: string
 *    merchantMessage: string
 *    customerMessage: string
 * }[]} [errors]
 */
/**
 * Enum for PayPage creation
 * @readonly
 * @enum {string}
 */
export const PayPageAction = {
  CHARGE: "charge",
  AUTHORIZE: "authorize",
};
