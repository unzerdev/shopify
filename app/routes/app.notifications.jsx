import { createLogger } from "~/utils/lib";
import UnzerWebhookClient from "~/utils/unzer-webhook";

const { log } = createLogger("Notifications");

export const action = async ({ request }) => {
  log('Recieved notification');

  try {
    const json = await request.json();
    const { event } = json;

    const unzerWebhookClient = new UnzerWebhookClient(event);
    await unzerWebhookClient.handle(json);
  } catch (e) {
    const errorMessage = `Error handling notification`;
    let status = 500;
    log(errorMessage);

    if (e instanceof Error) {
      log(e.message);
    }

    if (e instanceof Response) {
      status = e.status;
      log(e.statusText);
    }

    throw new Response(errorMessage, { status });
  }

  log('Notification handled successfully');

  return new Response();
};
