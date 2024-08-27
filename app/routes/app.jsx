import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider as PolarisAppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";
import { boundary } from "@shopify/shopify-app-remix";

import { authenticate } from "../shopify.server";
import { Card, EmptyState, Layout, Page } from "@shopify/polaris";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY;

  if (apiKey === undefined) {
    return new Response("apiKey not Found", { status: 500 });
  }

  return json({
    polarisTranslations: require("@shopify/polaris/locales/en.json"),
    apiKey: process.env.SHOPIFY_API_KEY,
  });
};

export default function App() {
  /** @type {import("@remix-run/node").SerializeFrom<loader>} */
  const { polarisTranslations, apiKey } = useLoaderData();

  return (
    <PolarisAppProvider
      isEmbeddedApp
      apiKey={apiKey}
      i18n={polarisTranslations}
    >
      <Outlet />
    </PolarisAppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <EmptyState
              heading="Something went wrong"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              {boundary.error(useRouteError())}
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
