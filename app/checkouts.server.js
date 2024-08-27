import prisma from "~/db.server";

/**
 * Creates a new Checkout entity, or updates an existing one if it exists
 */
export const createOrUpdateCheckout = async ({
  id,
  lines,
  totalPrice,
  subtotalPrice,
  totalLineItemsPrice,
  totalTax,
  totalDuties,
  currency,
}) => {
  const defaults = {
    lines: JSON.stringify(lines),
    totalPrice: parseFloat(totalPrice),
    subtotalPrice: parseFloat(subtotalPrice),
    totalLineItemsPrice: parseFloat(totalLineItemsPrice),
    totalTax: parseFloat(totalTax),
    totalDuties: parseFloat(totalDuties),
    currency,
  };

  const checkout = await prisma.checkout.upsert({
    where: { id: id.toString() },
    update: {
      ...defaults,
    },
    create: {
      id: id.toString(),
      ...defaults,
    },
  });

  return checkout;
};

/**
 * Returns a Checkout from the Cart Token
 * 
 * @param {string} cartToken
 * @returns
 */
export const getCheckout = async (cartToken) => {
  const checkout = await prisma.checkout.findUnique({
    where: {
      id: cartToken,
    },
  });

  if (checkout) {
    return {
      ...checkout,
      /** @type {LineItem[]} */
      lines: JSON.parse(checkout.lines)
    }
  }

  return null;
};

/**
 * @typedef {Object} LineItem
 *
 * @property {number} key
 * @property {number} quantity
 * @property {string} variant_price
 * @property {string} title
 * @property {Array[*]} applied_discounts
 * @property {Array[*]} discount_allocations
 * @property {LineItemTaxLine[]} tax_lines
 * @property {boolean} taxable
 * 
 * @typedef {Object} LineItemTaxLine
 * 
 * @property {number} rate
 */