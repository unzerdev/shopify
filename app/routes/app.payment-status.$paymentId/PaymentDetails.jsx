import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Card,
  DescriptionList,
  InlineCode,
  InlineGrid,
  Layout,
  Text,
} from "@shopify/polaris";

import { capitalize, formatMoney } from "~/utils/lib";

export const PaymentDetails = () => {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app.payment-status.$paymentId/route').loader>} */
  const { paymentSession } = useLoaderData();
  const { amount, currency, kind } = paymentSession;

  const headlineProps = {
    variant: "bodySm",
    tone: "subdued",
    as: "p",
  };

  const titleProps = {
    variant: "heading2xl",
    as: "p",
    fontWeight: "regular",
  };

  const paymentItems = buildPaymentItems(paymentSession);

  return (
    <Layout.Section>
      <BlockStack gap="400">
        <InlineGrid gap="400" columns={2}>
          <Card>
            <Text {...headlineProps}>Payment Kind</Text>
            <Text {...titleProps}>
              {capitalize(kind)}
            </Text>
          </Card>
          <Card>
            <Text {...headlineProps}>Amount</Text>
            <Text {...titleProps}>{formatMoney({ amount, currency })}</Text>
          </Card>
        </InlineGrid>
        <Card>
          <Text variant="headingMd" as="h6">
            Details
          </Text>
          <DescriptionList items={paymentItems} />
        </Card>
      </BlockStack>
    </Layout.Section>
  );
};

const buildPaymentItems = (paymentSession) => {
  const items = [
    {
      term: "Payment Session ID",
      description: (
        <Text as="span">
          <InlineCode>{paymentSession.id}</InlineCode>
        </Text>
      ),
    },
    {
      term: "GraphQL ID",
      description: (
        <Text as="span">
          <InlineCode>{paymentSession.gid}</InlineCode>
        </Text>
      ),
    },
    {
      term: "Group",
      description: (
        <Text as="span">
          <InlineCode>{paymentSession.group}</InlineCode>
        </Text>
      ),
    },
  ];

  return items;
};
