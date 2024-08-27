import {
  Card,
  Layout,
  Text,
  BlockStack,
  DataTable,
  Filters,
  ChoiceList,
  Modal,
  Button,
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useState } from "react";
import { LogMessageType } from "@prisma/client";

export const PaymentLogs = () => {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app.payment-status.$paymentId/route').loader>} */
  const { paymentSession } = useLoaderData();
  const { logs } = paymentSession;

  const [active, setActive] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState({});

  const [type, setType] = useState([LogMessageType.INFO]);
  const [queryValue, setQueryValue] = useState(undefined);

  const raiseModal = useCallback(
    (log) => {
      const json = JSON.parse(log.payload);

      setModalTitle(log.message);
      setModalContent(json);
      setActive(!active);
    },
    [active, modalContent, setActive]
  );

  const handleTypeChange = useCallback((value) => setType(value), []);
  const handleTypeRemove = useCallback(() => setType([]), []);
  const handleFilterValueRemove = useCallback(() => setType([]), []);
  const handleFiltersClearAll = useCallback(
    () => handleFilterValueRemove(),
    [handleFilterValueRemove]
  );

  const appliedFilters = [];
  if (type.length != 0) {
    appliedFilters.push({
      key: "type",
      label: type.join(", "),
      onRemove: handleTypeRemove,
    });
  }

  const filters = [
    {
      key: "type",
      label: "Type",
      filter: (
        <ChoiceList
          title="Type"
          titleHidden
          choices={[
            { label: "Info", value: LogMessageType.INFO },
            { label: "Debug", value: LogMessageType.DEBUG },
            { label: "Error", value: LogMessageType.ERROR },
            { label: "Warn", value: LogMessageType.WARN },
          ]}
          selected={type || []}
          onChange={handleTypeChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const handleQueryValueRemove = useCallback(
    () => setQueryValue(undefined),
    []
  );

  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    []
  );

  return (
    <>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Filters
              queryValue={queryValue}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleFiltersQueryChange}
              onQueryClear={handleQueryValueRemove}
              onClearAll={handleFiltersClearAll}
              hideQueryField
            />
            {logs.filter((log) => type.includes(log.type) || type.length == 0)
              .length ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Type", "Prefix", "Date", "Message", "Payload"]}
                rows={logs
                  .filter((log) => type.includes(log.type) || type.length == 0)
                  .map((log) => {
                    const date = new Date(log.createdAt);
                    return [
                      log.type,
                      log.prefix,
                      date.toUTCString(),
                      log.message,
                      log.payload ? (
                        <Button onClick={() => raiseModal(log)}>Show</Button>
                      ) : (
                        ""
                      ),
                    ];
                  })}
              />
            ) : (
              <Text alignment="center" variant="headingMd" as="h6">
                No logs found
              </Text>
            )}
          </BlockStack>
        </Card>
      </Layout.Section>
      <Modal
        size="large"
        open={active}
        onClose={() => setActive(!active)}
        title={modalTitle}
        primaryAction={{ content: "Close", onAction: () => setActive(!active) }}
      >
        <Modal.Section>
          <pre>{JSON.stringify(modalContent, null, 4)}</pre>
        </Modal.Section>
      </Modal>
    </>
  );
};
