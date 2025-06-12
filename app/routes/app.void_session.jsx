import { LogMessageType } from "@prisma/client";
import { json } from "@remix-run/node";

import { createVoidSession, getConfigurationByShopName, getPaymentSession } from "~/payments.repository.server";
import { createLogger, createPaymentLogger } from "~/utils/lib";
import UnzerClient from "~/utils/unzer-client.server";

const { log } = createLogger("Void Session");
const { paymentLog } = createPaymentLogger("Void Session");

/**
 * Saves and starts a void session.
 */
export const action = async ({ request }) => {
  const requestBody = await request.json();

  const voidSessionHash = createParams(requestBody);
  const voidSession = await createVoidSession(voidSessionHash);

  const paymentSession = await getPaymentSession(voidSession.paymentId);

  if (!voidSession) throw new Response("A VoidSession couldn't be created.", { status: 500 });

  paymentLog({paymentId: paymentSession.id, message: 'Void Created', payload: JSON.stringify(voidSession)});

  const config = await getConfigurationByShopName(paymentSession.shop);

  if (config === null) {
    log("Configuration not found");
    paymentLog({paymentId: paymentSession.id, message: 'Configuration not found', payload: JSON.stringify(paymentSession), type: LogMessageType.ERROR});
    throw new Response("Configuration not found", { status: 500 });
  }

  paymentLog({paymentId: paymentSession.id, message: 'Requesting Authorize Cancel', type: LogMessageType.DEBUG});

  const unzerClient = new UnzerClient(config.unzerPrivateKey);

  if (paymentSession.authorizations.length == 0) {

    paymentLog({paymentId: paymentSession.id, message: 'No Unzer Authorizations found!', payload: JSON.stringify(paymentSession), type: LogMessageType.ERROR});
  }

  const authorization = paymentSession.authorizations[0];

  const cancelAuthorize = await unzerClient.cancelAuthorize({
    paymentId: paymentSession.pid || '',
    authorizeId: authorization.authorizeId,
  });

  /**
   * @todo
   * 
   * may create a UnzerCancel entry here 
   */

  paymentLog({paymentId: paymentSession.id, message: 'Cancel Authorize Requested', payload: JSON.stringify(cancelAuthorize), type: LogMessageType.DEBUG});

  return json(voidSessionHash);
}

const createParams = ({id, gid, payment_id, proposed_at}) => (
  {
    id,
    gid,
    paymentId: payment_id,
    proposedAt: proposed_at,
  }
)
