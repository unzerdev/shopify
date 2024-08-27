import { useLoaderData } from "@remix-run/react";
import { Button } from "@shopify/polaris";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function ConfigurePaymentGateway() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { shopDomain, apiKey } = useLoaderData();
  const { t } = useTranslation();

  const paymentGatewayUrl = useMemo(
    () =>
      `https://${shopDomain}/services/payments_partners/gateways/${apiKey}/settings`,
    [shopDomain, apiKey]
  );

  return (
    <LayoutMenu
      title={t("configure_payment_gateway.title")}
      description={t("configure_payment_gateway.description")}
    >
      <Button url={paymentGatewayUrl} target="_blank">
        {t("configure")}
      </Button>
    </LayoutMenu>
  );
}
