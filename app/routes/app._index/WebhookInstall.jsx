import { useLoaderData, useSubmit } from "@remix-run/react";
import { Button, Text, LegacyStack, Modal } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";
import { useModal } from "~/utils/hooks";

export default function WebhookInstall() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { webhookInstalled } = useLoaderData();
  const { t } = useTranslation();
  const submit = useSubmit();
  const {
    open: uninstallModalOpen,
    onOpen: onOpenUninstallModal,
    onClose: onCloseUninstallModal,
  } = useModal();

  const handleInstallWebhook = () => {
    submit(
      {
        _action: "install-webhook",
      },
      { method: "post" }
    );
  };

  const handleUninstallWebhook = () => {
    submit(
      {
        _action: "uninstall-webhook",
      },
      { method: "post" }
    );
  };

  return (
    <>
      <LayoutMenu
        title={t("webhook_install.title")}
        description={t("webhook_install.description")}
        complete={webhookInstalled}
      >
        {webhookInstalled ? (
          <LegacyStack distribution="equalSpacing">
            <Text as="p" variant="bodyMd">
              {t("webhook_install.complete.description")}
            </Text>
            <Button variant="plain" onClick={() => onOpenUninstallModal()}>
              {t("webhook_install.complete.uninstall")}
            </Button>
          </LegacyStack>
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
      <Modal
        size="large"
        open={uninstallModalOpen}
        onClose={() => onCloseUninstallModal()}
        title={t("webhook_install.complete.uninstall.modal_title")}
        primaryAction={{
          content: "Close",
          onAction: () => onCloseUninstallModal(),
        }}
        secondaryActions={[
          {
            content: "Uninstall",
            onAction: () => handleUninstallWebhook(),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            {t("webhook_install.complete.uninstall.modal_content")}
          </Text>
        </Modal.Section>
      </Modal>
    </>
  );
}
