import { useEffect, useMemo, useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Page, Text, Banner, Spinner, Layout } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import {
  getConfiguration,
  getConfigurationByShopName,
  getOrCreateConfiguration,
  updateExcludedPaymentTypes,
  updatePaymentPageConfiguration,
  updateReadyStatus,
} from "~/payments.repository.server";
import PaymentsAppsClient from "~/payments-apps.graphql";
import AccountSetup from "./AccountSetup";
import PaymentPageSettings from "./PaymentPageSettings";
import WebhookInstall from "./WebhookInstall";
import SupportedPaymentTypes from "./SupportedPaymentTypes";
import UnzerClient from "~/utils/unzer-client.server";
import { LanguageToggle } from "~/components/admin/LanguageToggle";
import { useTranslation } from "react-i18next";
import {
  createLogger,
  createNotificationsUrl,
  findAppWebhook,
} from "~/utils/lib";
import ConfigurePaymentGateway from "./ConfigurePaymentGateway";
import PaymentsDashboard from "./PaymentsDashboard";

const { log } = createLogger("Admin");

/**
 * Loads the app's configuration if it exists.
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY;

  log("Fetching configuration");
  const config = await getConfiguration(session.id);

  let webhookInstalled = false;
  /** @type {string[] | null} */
  let availablePaymentTypes = null;
  if (config !== null && config.unzerPrivateKey !== null) {
    log("Checking Webhook installation");
    const unzerClient = new UnzerClient(config.unzerPrivateKey);
    const webhooks = await unzerClient.getAllWebhooks();

    const notificationsUrl = createNotificationsUrl(request);
    webhookInstalled = findAppWebhook(webhooks.events || [], notificationsUrl);

    log("Checking Available Payment types");
    const data = await unzerClient.keypair();
    if ("availablePaymentTypes" in data) {
      availablePaymentTypes = data.availablePaymentTypes;
    }
  }

  return json({
    shopDomain: session.shop,
    apiKey: apiKey,
    config: config,
    webhookInstalled,
    availablePaymentTypes,
    systemExcludedPaymentTypes: (
      process.env.UNZER_EXCLUDE_PAYMENT_TYPES || ""
    ).split(","),
  });
};

/**
 * Saves the app's configuration.
 */
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const _action = formData.get("_action");

  switch (_action) {
    case "update-account":
      return updateAcount(session, formData);
    case "update-payment-page":
      return updatePaymentPage(session, formData);
    case "install-webhook":
      return installWebhook(session, request);
    case "update-excluded-payment-types":
      return handleUpdateExcludedPaymentTypes(session, formData);
    default:
      return new Response("Action is not defined", { status: 500 });
  }
};

export default function Index() {
  const nav = useNavigation();
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { config } = useLoaderData();
  /** @type {import("@remix-run/node").SerializeFrom<typeof action>} */
  const actionData = useActionData();
  const { t } = useTranslation("app");

  const [successMessage, setSuccessMessage] = useState(
    /** @type {ActionMessage | null} */ (
      actionData ? actionData.successMessage : null
    )
  );

  const [errors, setErrors] = useState(/** @type {ActionMessage[]} */ ([]));

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  useEffect(() => {
    if (actionData?.successMessage)
      setSuccessMessage(actionData.successMessage);
    if (actionData?.errors?.length > 0) setErrors(actionData.errors);
  }, [actionData]);

  const ErrorBanner = () =>
    errors.length > 0 && (
      <Layout.Section>
        <Banner
          title={t("errors.banner_title")}
          tone="critical"
          onDismiss={() => {
            setErrors([]);
          }}
        >
          {errors.map(({ message, messageSlug }, idx) => (
            <Text as="p" key={idx}>
              {messageSlug ? t(messageSlug) : message}
            </Text>
          ))}
        </Banner>
      </Layout.Section>
    );

  const SuccessBanner = () =>
    successMessage !== null ? (
      <Layout.Section>
        <Banner
          title={t("success.banner_title")}
          tone="success"
          onDismiss={() => {
            setSuccessMessage(null);
          }}
        >
          <Text as="p">
            {successMessage.messageSlug
              ? t(successMessage.messageSlug)
              : successMessage.message}
          </Text>
        </Banner>
      </Layout.Section>
    ) : null;

  if (isLoading) {
    return (
      <Page fullWidth>
        <div
          style={{
            display: "flex",
            height: "100vh",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner accessibilityLabel="Spinner" size="large" />
        </div>
      </Page>
    );
  }

  return (
    <Page title={t("dashboard.title")} primaryAction={<LanguageToggle />}>
      <Layout>
        <SuccessBanner />
        <ErrorBanner />
        <AccountSetup />

        {config?.unzerPrivateKey ? (
          <>
            <WebhookInstall />
            {config.ready ? (
              <>
                <ConfigurePaymentGateway />
                <SupportedPaymentTypes />
                <PaymentPageSettings />
                <PaymentsDashboard />
              </>
            ) : null}
          </>
        ) : null}
      </Layout>
    </Page>
  );
}

async function updateAcount(session, formData) {
  log("Updating account");

  const config = {
    shop: session.shop,
    accountName: formData.get("accountName"),
  };

  const unzerPrivateKey = formData.get("unzerPrivateKey");

  let data;
  if (unzerPrivateKey !== "") {
    const unzerClient = new UnzerClient(unzerPrivateKey);
    data = await unzerClient.keypair();

    if ("isError" in data) {
      return json({
        /** @type {ActionMessage[]} */
        errors: [
          {
            message: "The Private Key is not valid.",
            messageSlug: "errors.private_key_not_valid",
          },
        ],
      });
    }
  }

  log("Updating Account Configuration");
  const configuration = await getOrCreateConfiguration(session.id, {
    ...config,
    unzerPublicKey: data?.publicKey || "",
    unzerPrivateKey: data?.publicKey ? unzerPrivateKey : "",
  });

  await updateReadyState(session, configuration);

  return json({
    /** @type {ActionMessage} */
    successMessage: {
      message: "Your Account settings have been updated",
      messageSlug: "success.account_settings",
    },
  });
}

/**
 * Updates Settings for the Payment Page
 *
 * @param {*} session
 * @param {*} formData
 * @returns
 */
async function updatePaymentPage(session, formData) {
  log("Updating Payment Page configuration");

  const {
    logoImage,
    fullPageImage,
    shopName,
    shopDescription,
    tagline,
    termsAndConditionUrl,
    privacyPolicyUrl,
    imprintUrl,
    helpUrl,
    contactUrl,
  } = Object.fromEntries(formData);

  try {
    await updatePaymentPageConfiguration(session.id, {
      logoImage,
      fullPageImage,
      shopName,
      shopDescription,
      tagline,
      termsAndConditionUrl,
      privacyPolicyUrl,
      imprintUrl,
      helpUrl,
      contactUrl,
    });

    log("Payment Page settings updated successfully");
    return json({
      /** @type {ActionMessage} */
      successMessage: {
        message: "Payment Page settings updated successfully",
        messageSlug: "success.payment_page_settings",
      },
    });
  } catch (error) {
    log("Issue updating Payment Page settings");
    return json({
      /** @type {ActionMessage[]} */
      errors: [
        {
          message: "Payment Page Settings could not be updated",
          messageSlug: "errors.payment_page_settings_update",
        },
      ],
    });
  }
}

async function installWebhook(session, request) {
  log("Installing Webhook");
  const configuration = await getConfigurationByShopName(session.shop);

  if (configuration === null) {
    log("No Configuration Found");
    throw new Response("No Configuration Found", { status: 422 });
  } else if (configuration.unzerPrivateKey === null) {
    log("No Private Key Found");
    throw new Response("No Private Key Found", { status: 422 });
  }

  try {
    const unzerClient = new UnzerClient(configuration.unzerPrivateKey);
    await unzerClient.createWebhook(createNotificationsUrl(request));

    return json({ raiseBanner: true });
  } catch (e) {
    const error = (() => {
      if (e instanceof Error) {
        return {
          message: e.message,
        };
      }

      return {
        message: "Webhook could not be installed",
        messageSlug: "errors.webhook_install",
      };
    })();

    return json({
      /** @type {ActionMessage[]} */
      errors: [error],
    });
  }
}

async function handleUpdateExcludedPaymentTypes(session, formData) {
  log("Updating Excluded Payment Types");

  try {
    const { excludedPaymentTypes } = Object.fromEntries(formData);
    await updateExcludedPaymentTypes(
      session.id,
      excludedPaymentTypes.split(",")
    );

    return json({
      /** @type {ActionMessage} */
      successMessage: {
        message: "Supported Payment Types have been updated",
        messageSlug: "success.supported_payment_types",
      },
    });
  } catch (e) {
    const error = (() => {
      if (e instanceof Error) {
        return {
          message: e.message,
        };
      }

      return {
        message: "Error updating Payment Types",
        messageSlug: "errors.payment_types_update",
      };
    })();

    return json({
      /** @type {ActionMessage[]} */
      errors: [error],
    });
  }
}

/**
 *
 * @param {*} session
 * @param {import('~/payments.repository.server').ConfigurationData} configuration
 */
async function updateReadyState(session, configuration) {
  log("Updating Ready state");

  const ready =
    configuration.accountName !== "" && configuration.unzerPrivateKey !== null;

  const client = new PaymentsAppsClient(session.shop, session.accessToken);
  const response = await client.paymentsAppConfigure(
    configuration.accountName,
    ready
  );

  await updateReadyStatus(configuration.sessionId, Boolean(response));
}

/**
 * @typedef {Object} ActionMessage
 * @property {string} message - The text for the error message
 * @property {string} [messageSlug] - The string to be translated
 */
