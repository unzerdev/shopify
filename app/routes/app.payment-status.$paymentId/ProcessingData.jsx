import {
  Card,
  Layout,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  Modal,
} from "@shopify/polaris";
import { useFetcher, useLoaderData, useSubmit } from "@remix-run/react";
import { useEffect, useState } from "react";

export const ProcessingData = () => {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app.payment-status.$paymentId/route').loader>} */
  const { paymentData } = useLoaderData();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState(null);

  const handleOpenModal = ({ modalTitle, modalContent }) => {
    setModalTitle(modalTitle);
    setModalContent(modalContent);
    setModalOpen(true);
  };

  if (!paymentData) return null;

  const { basketId, customerId, metadataId, paymentId } = paymentData.resources;

  const items = [
    {
      title: "Payment",
      content: paymentId,
      onOpenModal: handleOpenModal,
      action: "get-payment-data",
    },
    {
      title: "Customer",
      content: customerId,
      onOpenModal: handleOpenModal,
      action: "get-customer-data",
    },
    {
      title: "Basket",
      content: basketId,
      onOpenModal: handleOpenModal,
      action: "get-basket-data",
    },
    {
      title: "Metadata",
      content: metadataId,
      onOpenModal: handleOpenModal,
      action: "get-metadata-data",
    },
  ];

  return (
    <>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h6">
              Processing Data
            </Text>

            <InlineGrid gap="400" columns={4}>
              {items.map((item) => (
                <Item key={item.title} {...item} />
              ))}
            </InlineGrid>
          </BlockStack>
        </Card>
      </Layout.Section>
      <Modal
        size="large"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        primaryAction={{
          content: "Close",
          onAction: () => setModalOpen(false),
        }}
      >
        <Modal.Section>
          <pre>{modalContent}</pre>
        </Modal.Section>
      </Modal>
    </>
  );
};

const Item = ({ title, content, onOpenModal, action }) => {
  const fetcher = useFetcher();

  const handleView = () => {
    fetcher.submit(
      {
        _action: action,
        resourceId: content,
      },
      {
        method: "POST",
      }
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && fetcher.data.payload) {
      onOpenModal({
        modalTitle: `${title} Data`,
        modalContent: JSON.stringify(fetcher.data.payload, null, 2),
      });
    }
  }, [fetcher]);

  return (
    <Card>
      <BlockStack inlineAlign="center" gap="200">
        <Text as="p">{title} ID</Text>
        <Text as="p" variant="headingMd">
          {content || "-"}
        </Text>
        <Button
          disabled={!content}
          onClick={() => handleView()}
          loading={fetcher.state !== "idle"}
        >
          View
        </Button>
      </BlockStack>
    </Card>
  );
};
