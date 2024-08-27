import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useLocation,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { Page, Card, DataTable, Button, Text, Bleed } from "@shopify/polaris";

import { getPaymentSessions } from "~/payments.repository.server";
import { PaymentSessionKindBadge } from "~/components/admin";
import { PaymentSessionStatusBadge } from "~/components/admin";
import { formatMoney } from "~/utils/lib";
import { authenticate } from "~/shopify.server";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Load in the payment sessions.
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const resultsQuantity = Number(url.searchParams.get("resultsQuantity") || 25);
  const [count, payments] = await getPaymentSessions(
    session.shop,
    page,
    resultsQuantity
  );

  return json({ paymentsCount: count, payments, resultsQuantity });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  return redirect(`/app/payment-status/${formData.get("paymentId")}`);
};

export default function Dashboard() {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const loaderData = useLoaderData();
  const { payments, paymentsCount, resultsQuantity } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const location = useLocation();
  const { t } = useTranslation("app");

  const paymentSessionAction = (payment) => (
    <Button
      onClick={() => {
        submit({ paymentId: payment.id }, { method: "post" });
      }}
    >
      {t('view')}
    </Button>
  );

  const rows = payments.map((payment) => {
    const { customer, status, kind, amount, currency } = payment;
    const { billing_address, email } = JSON.parse(customer);
    const { given_name, family_name } = billing_address;
    const date = new Date(payment.proposedAt);
    return [
      `${given_name} ${family_name} <${email}>`,
      date.toUTCString(),
      PaymentSessionKindBadge({ kind: kind, status: status }),
      PaymentSessionStatusBadge({ status: status }),
      formatMoney({ amount, currency }),
      paymentSessionAction(payment),
    ];
  });

  const pagination = useMemo(() => {
    const page = Number(searchParams.get("page") || 1);
    const params = new URLSearchParams(location.search);

    return {
      hasPrevious: page > 1,
      onPrevious: () => {
        params.set("page", `${page - 1}`);
        setSearchParams(params);
      },
      hasNext: paymentsCount > page * resultsQuantity,
      onNext: () => {
        params.set("page", `${page + 1}`);
        setSearchParams(params);
      },
    };
  }, [searchParams, location]);

  return (
    <Page title={t("payments_dashboard.title")} backAction={{ url: "/app" }}>
      <Card>
        <Text variant="headingMd" as="h6">
          {t("payments_dashboard.payment_sessions.title")}
        </Text>
        <Bleed marginInline="400" marginBlockEnd="400">
          <DataTable
            truncate
            verticalAlign="middle"
            columnContentTypes={["text", "text", "text", "text", "text"]}
            headings={[
              t('customer'),
              t('date'),
              t('kind'),
              t('status'),
              t('amount'),
              t('action'),
            ]}
            rows={rows}
            pagination={pagination}
          />
        </Bleed>
      </Card>
    </Page>
  );
}
