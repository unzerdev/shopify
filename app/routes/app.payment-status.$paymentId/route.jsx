import {
  Button,
  Card,
  Layout,
  Page,
  Text,
  DescriptionList,
  DataTable,
  Modal,
  InlineStack,
  BlockStack,
  Badge,
} from "@shopify/polaris";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import {
  getConfiguration,
  getConfigurationByShopName,
  getPaymentSession,
} from "~/payments.repository.server";

import { ProcessingData } from "./ProcessingData";
import { PaymentSessionStatusBadge } from "~/components/admin";
import { createLogger, formatMoney } from "~/utils/lib";
import { PaymentDetails } from "./PaymentDetails";
import { PaymentLogs } from "./PaymentLogs";
import UnzerClient from "~/utils/unzer-client.server";
import { authenticate } from "~/shopify.server";
import { useTranslation } from "react-i18next";

const { log } = createLogger("Payment Status");

/**
 * Loads in the relevant payment session along with it's related refund, capture, and void sessions.
 */
export const loader = async ({ request, params: { paymentId } }) => {
  const { session } = await authenticate.admin(request);

  try {
    log("Fetching Payment Session");
    const paymentSession = await getPaymentSession(paymentId);

    log("Fetching Configuration");
    const config = await getConfiguration(session.id);

    if (config === null) {
      log("Configuration not found");
      throw new Response("No Configuration found", { status: 404 });
    }

    let paymentData = null;
    if (paymentSession.pid !== null) {
      const unzerClient = new UnzerClient(config.unzerPrivateKey);
      paymentData = await unzerClient.getPayment(paymentSession.pid);
    } else {
      log("pid not found for this Payment Session");
    }

    return json({
      paymentSession,
      paymentData,
      refundSessions: paymentSession.refunds,
      captureSessions: paymentSession.captures,
      voidSession: paymentSession.void,
      charges: paymentSession.charges,
      cancels: paymentSession.cancels,
      authorizations: paymentSession.authorizations,
    });
  } catch (error) {
    let errorMessage = 'Something went wrong';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error instanceof Response) {
      errorMessage = error.statusText;
    }

    throw new Response(errorMessage, { status: 500 })
  }
};

export const action = async ({ request, params: { paymentId } }) => {
  const formData = await request.formData();
  const _action = formData.get("_action");
  const resourceId = formData.get("resourceId");

  let payload;

  log(`Performing action: ${_action}`);

  const paymentSession = await getPaymentSession(paymentId);
  const config = await getConfigurationByShopName(paymentSession.shop);
  const unzerClient = new UnzerClient(config?.unzerPrivateKey);

  switch (_action) {
    case "get-payment-data":
      payload = await unzerClient.getPayment(resourceId);
      break;
    case "get-customer-data":
      payload = await unzerClient.getCustomer(resourceId);
      break;
    case "get-basket-data":
      payload = await unzerClient.getBasket(resourceId);
      break;
    case "get-metadata-data":
      payload = resourceId;
      break;
    default:
      throw new Response("Action not set");
  }

  return json({ payload });
};

export default function PaymentStatusPage() {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { paymentSession, voidSession } = useLoaderData();

  const [modal, setModal] = useState({
    title: "",
    content: "",
    open: false,
  });

  const handleOpenModal = ({ title, content }) => {
    setModal({
      title,
      content: JSON.stringify(content, null, 2),
      open: true,
    });
  };

  const handleCloseModal = () => {
    setModal({
      title: "",
      content: "",
      open: false,
    });
  };

  const voidItems = () => {
    if (!voidSession) return [];

    const items = Object.keys(voidSession).map((key) => {
      if (key === "status" && !voidSession[key]) {
        return {
          term: key,
          description: <Text as="span">Requires Resolution</Text>,
        };
      }
      return {
        term: key,
        description: <Text as="span">{voidSession[key]}</Text>,
      };
    });
    if (!voidSession.status) {
      items.push({
        term: "Action",
        description: <p>Description</p>,
      });
    }

    return items;
  };

  return (
    <>
      <Page
        title={`Payment Status`}
        backAction={{ url: "/app/payments-dashboard" }}
      >
        <BlockStack>
          <InlineStack gap="200" blockAlign="center">
            <Text variant="heading2xl" as="h3">
              {paymentSession.id}
            </Text>

            <InlineStack gap="100">
              <PaymentSessionStatusBadge status={paymentSession.status} />
              <Badge>Test</Badge>
            </InlineStack>
          </InlineStack>
          <Text as="p">{new Date(paymentSession.proposedAt).toString()}</Text>
        </BlockStack>

        <Layout>
          <PaymentDetails />
          <ProcessingData />
          <Authorizations onOpenModal={handleOpenModal} />
          <Charges onOpenModal={handleOpenModal} />
          <Captures onOpenModal={handleOpenModal} />
          <Cancels onOpenModal={handleOpenModal} />
          <Refunds onOpenModal={handleOpenModal} />
          {voidSession ? (
            <Layout.Section>
              <Card>
                <Text variant="headingMd" as="h6">
                  Void
                </Text>
                <DescriptionList items={voidItems()} />
              </Card>
            </Layout.Section>
          ) : (
            ""
          )}
          <PaymentLogs />
        </Layout>
      </Page>
      <Modal
        size="large"
        open={modal.open}
        onClose={() => handleCloseModal()}
        title={modal.title}
        primaryAction={{
          content: "Close",
          onAction: () => handleCloseModal(),
        }}
      >
        <Modal.Section>
          <pre>{modal.content}</pre>
        </Modal.Section>
      </Modal>
    </>
  );
}

const Authorizations = ({ onOpenModal }) => {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { authorizations } = useLoaderData();
  const { t } = useTranslation("app");

  const authorizeRows = authorizations.map((authorization) => {
    const date = new Date(authorization.date);
    const message = JSON.parse(authorization.message || "");

    return [
      authorization.authorizeId,
      date.toUTCString(),
      formatMoney({
        amount: authorization.amount,
        currency: authorization.currency,
      }),
      message.merchant,
      <Button
        onClick={() =>
          onOpenModal({
            title: "Authorization",
            content: authorization,
          })
        }
      >
        {t("view")}
      </Button>,
    ];
  });

  if (authorizeRows.length === 0) return null;

  return (
    <Layout.Section>
      <Card>
        <Text variant="headingMd" as="h6">
          {t("authorizations")}
        </Text>
        <DataTable
          verticalAlign="middle"
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["ID", "Date", "Amount", "Message", "Action"]}
          rows={authorizeRows}
        />
      </Card>
    </Layout.Section>
  );
};

const Charges = ({ onOpenModal }) => {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { charges } = useLoaderData();

  const chargeRows = charges.map((charge) => {
    const date = new Date(charge.date);
    const message = JSON.parse(charge.message || "");
    return [
      charge.chargeId,
      date.toUTCString(),
      formatMoney({ amount: charge.amount, currency: charge.currency }),
      message.merchant,
      <Button
        onClick={() =>
          onOpenModal({
            title: "Authorization",
            content: charge,
          })
        }
      >
        View
      </Button>,
    ];
  });

  if (chargeRows.length === 0) return null;

  return (
    <Layout.Section>
      <Card>
        <Text variant="headingMd" as="h6">
          Charges
        </Text>
        <DataTable
          verticalAlign="middle"
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["ID", "Date", "Amount", "Message", "Action"]}
          rows={chargeRows}
        />
      </Card>
    </Layout.Section>
  );
};

const Captures = ({ onOpenModal }) => {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { captureSessions } = useLoaderData();

  const captureRows = captureSessions.map((capture) => {
    const date = new Date(capture.proposedAt);
    return [
      capture.id,
      date.toUTCString(),
      amountString(capture),
      capture.status || "Requires Resolution",
      <Button
        onClick={() =>
          onOpenModal({
            title: "Authorization",
            content: capture,
          })
        }
      >
        View
      </Button>,
    ];
  });

  if (captureRows.length === 0) return null;

  return (
    <Layout.Section>
      <Card>
        <Text variant="headingMd" as="h6">
          Captures
        </Text>
        <DataTable
          verticalAlign="middle"
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["ID", "Date", "Amount", "Message", "Action"]}
          rows={captureRows}
        />
      </Card>
    </Layout.Section>
  );
};

const Cancels = ({ onOpenModal }) => {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { cancels } = useLoaderData();

  const cancelRows = cancels.map((cancel) => {
    const date = new Date(cancel.date);
    const message = JSON.parse(cancel.message);

    return [
      cancel.cancelId,
      date.toUTCString(),
      formatMoney({ amount: cancel.amount, currency: cancel.currency }),
      message.merchant,
      <Button
        onClick={() =>
          onOpenModal({
            title: "Authorization",
            content: cancel,
          })
        }
      >
        View
      </Button>,
    ];
  });

  if (cancelRows.length === 0) return null;

  return (
    <Layout.Section>
      <Card>
        <Text variant="headingMd" as="h6">
          Captures
        </Text>
        <DataTable
          verticalAlign="middle"
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["ID", "Date", "Amount", "Message", "Action"]}
          rows={cancelRows}
        />
      </Card>
    </Layout.Section>
  );
};

const Refunds = ({ onOpenModal }) => {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { refundSessions } = useLoaderData();

  const refundRows = refundSessions.map((refund) => {
    const date = new Date(refund.proposedAt);
    return [
      refund.id,
      date.toUTCString(),
      amountString(refund),
      refund.status || "Requires Resolution",
      <Button
        onClick={() =>
          onOpenModal({
            title: "Authorization",
            content: refund,
          })
        }
      >
        View
      </Button>,
    ];
  });

  if (refundRows.length === 0) return null;

  return (
    <Layout.Section>
      <Card>
        <Text variant="headingMd" as="h6">
          Captures
        </Text>
        <DataTable
          verticalAlign="middle"
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["ID", "Date", "Amount", "Message", "Action"]}
          rows={refundRows}
        />
      </Card>
    </Layout.Section>
  );
};

const amountString = ({ amount, currency }) =>
  amount.toString().concat(" ", currency);
