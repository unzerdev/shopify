import { useState } from "react";
import { Form, useLoaderData } from "@remix-run/react";
import {
  Button,
  FormLayout,
  TextField,
  Text,
  InlineStack,
  Thumbnail,
  InlineGrid,
  Divider,
  Grid,
  Select,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function PaymentPageSettings() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { config } = useLoaderData();
  const { t } = useTranslation();
  const [errors, setErrors] = useState(
    /** @type {{ logoImage?: string, fullPageImage?: string }} */ ({})
  );

  const [settings, setSettings] = useState(() => {
    /** @type {import("~/payments.repository.server").PaymentPageSettings} */
    const defaultValues = {
      logoImage: "",
      fullPageImage: "",
      shopName: "",
      shopDescription: "",
      tagline: "",
      termsAndConditionUrl: "",
      privacyPolicyUrl: "",
      imprintUrl: "",
      helpUrl: "",
      contactUrl: "",
      locale: "en-GB",
    };

    if (config === null || config.paymentPageSettings === null)
      return defaultValues;

    return config.paymentPageSettings;
  });

  console.log('settings', settings);

  const handleUpdateSettings = (key, value) => {
    setSettings((oldSettings) => ({
      ...oldSettings,
      [key]: value,
    }));
  };

  const handleUpdateImage = async (key, value) => {
    try {
      await checkIfImageUrlIsValid(value);
      handleUpdateSettings(key, value);
      setErrors((oldErrors) => ({
        ...oldErrors,
        [key]: undefined,
      }));
    } catch (error) {
      handleUpdateSettings(key, "");
      setErrors((oldErrors) => ({
        ...oldErrors,
        [key]: t("errors.url_not_image"),
      }));
    }
  };

  if (config === null) return null;

  return (
    <LayoutMenu
      title={t("payment_page_settings.title")}
      description={t("payment_page_settings.description")}
      complete={config.paymentPageSettings !== null}
    >
      <Form method="post">
        <input type="hidden" name="_action" value="update-payment-page" />
        <FormLayout>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <InlineStack gap="400">
                <Thumbnail
                  source={settings.logoImage || ImageIcon}
                  size="large"
                  alt="logo"
                />
                <TextField
                  label={t("payment_page_settings.logo_image_url")}
                  name="logoImage"
                  onChange={(change) => handleUpdateImage("logoImage", change)}
                  value={settings.logoImage}
                  autoComplete="off"
                  error={errors.logoImage}
                />
              </InlineStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <InlineStack gap="400">
                <Thumbnail
                  source={settings.fullPageImage || ImageIcon}
                  size="large"
                  alt="logo"
                />
                <TextField
                  label={t("payment_page_settings.background_image_url")}
                  name="fullPageImage"
                  onChange={(change) =>
                    handleUpdateImage("fullPageImage", change)
                  }
                  value={settings.fullPageImage}
                  autoComplete="off"
                  error={errors.fullPageImage}
                />
              </InlineStack>
            </Grid.Cell>
          </Grid>

          <Divider borderColor="border" />
          <Text variant="headingSm" as="p">
            {t("payment_page_settings.text")}
          </Text>

          <TextField
            label={t("payment_page_settings.shop_name")}
            name="shopName"
            value={settings.shopName}
            onChange={(change) => handleUpdateSettings("shopName", change)}
            autoComplete="off"
          />

          <TextField
            label={t("payment_page_settings.shop_description")}
            name="shopDescription"
            value={settings.shopDescription}
            onChange={(change) =>
              handleUpdateSettings("shopDescription", change)
            }
            autoComplete="off"
          />

          <TextField
            label={t("payment_page_settings.tagline")}
            name="tagline"
            value={settings.tagline}
            onChange={(change) => handleUpdateSettings("tagline", change)}
            autoComplete="off"
          />

          <Divider borderColor="border" />
          <Text variant="headingSm" as="p">
            {t("payment_page_settings.links_and_urls")}
          </Text>
          <InlineGrid gap="400" columns={3}>
            <TextField
              label={t("payment_page_settings.help")}
              name="helpUrl"
              value={settings.helpUrl}
              onChange={(change) => handleUpdateSettings("helpUrl", change)}
              autoComplete="off"
            />
            <TextField
              label={t("payment_page_settings.contact")}
              name="contactUrl"
              value={settings.contactUrl}
              onChange={(change) => handleUpdateSettings("contactUrl", change)}
              autoComplete="off"
            />
          </InlineGrid>
          <InlineGrid gap="400" columns={3}>
            <TextField
              label={t("payment_page_settings.terms_and_conditions")}
              name="termsAndConditionUrl"
              value={settings.termsAndConditionUrl}
              onChange={(change) =>
                handleUpdateSettings("termsAndConditionUrl", change)
              }
              autoComplete="off"
            />
            <TextField
              label={t("payment_page_settings.privacy")}
              name="privacyPolicyUrl"
              value={settings.privacyPolicyUrl}
              onChange={(change) =>
                handleUpdateSettings("privacyPolicyUrl", change)
              }
              autoComplete="off"
            />
            <TextField
              label={t("payment_page_settings.imprint")}
              name="imprintUrl"
              value={settings.imprintUrl}
              onChange={(change) => handleUpdateSettings("imprintUrl", change)}
              autoComplete="off"
            />
          </InlineGrid>
          <Divider borderColor="border" />
          <Select
            label="Language"
            name="locale"
            options={[
              {
                label: "English",
                value: "en-GB",
              },
              {
                label: "Deutsch",
                value: "de-DE",
              },
            ]}
            onChange={(value) => handleUpdateSettings("locale", value)}
            value={settings.locale}
          />

          <Button variant="primary" submit>
            {t("update")}
          </Button>
        </FormLayout>
      </Form>
    </LayoutMenu>
  );
}

function checkIfImageUrlIsValid(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = function () {
      resolve(true);
    };

    image.onerror = function () {
      reject(false);
    };

    image.src = url;
  });
}
