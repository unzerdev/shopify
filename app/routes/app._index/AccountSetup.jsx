import { useState } from "react";
import { Form, useLoaderData } from "@remix-run/react";
import { Button, FormLayout, TextField } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function AccountSetup() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { config } = useLoaderData();
  const { t } = useTranslation();

  const [unzerPrivateKey, setUnzerPrivateKey] = useState(
    config?.unzerPrivateKey || ""
  );

  return (
    <LayoutMenu
      title={t("account_setup.title")}
      description={t("account_setup.description")}
      complete={config?.unzerPrivateKey !== undefined}
    >
      <Form method="post">
        <input type="hidden" name="_action" value="update-account" />
        <FormLayout>
          <TextField
            label={t("account_setup.private_key")}
            name="unzerPrivateKey"
            onChange={(change) => setUnzerPrivateKey(change)}
            value={unzerPrivateKey}
            autoComplete="off"
          />
          <TextField
            label={t("account_setup.public_key")}
            value={config?.unzerPublicKey || ""}
            autoComplete="off"
            helpText={t("account_setup.public_key.help_text")}
            disabled
          />
          <Button variant="primary" submit>
            {config?.ready ? t("update") : t("submit")}
          </Button>
        </FormLayout>
      </Form>
    </LayoutMenu>
  );
}
