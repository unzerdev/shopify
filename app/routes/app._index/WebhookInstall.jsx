import { useLoaderData, useSubmit } from "@remix-run/react";
import { Button, Text, LegacyStack } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function WebhookInstall() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { webhookInstalled } = useLoaderData();
  const { t } = useTranslation();
  const submit = useSubmit();

  const handleInstallWebhook = () => {
    submit(
      {
        _action: "install-webhook",
      },
      { method: "post" }
    );
  };

  return (
    <LayoutMenu
      title={t("webhook_install.title")}
      description={t("webhook_install.description")}
      complete={webhookInstalled}
    >
      {webhookInstalled ? (
        <Text as="p" variant="bodyMd">
          {t("webhook_install.complete.description")}
        </Text>
      ) : (
        <LegacyStack distribution="equalSpacing">
          <Text as="p" variant="bodyMd">
            {t("webhook_install.incomplete.title")}
          </Text>
          <Button variant="plain" onClick={handleInstallWebhook}>
            {t("webhook_install.incomplete.action")}
          </Button>
        </LegacyStack>
      )}
    </LayoutMenu>
  );
}
