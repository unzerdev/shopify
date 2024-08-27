import {
  Badge,
  BlockStack,
  Box,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Text,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";

/**
 * @param {{
 *  title: string
 *  description: string
 *  complete?: boolean
 *  children: JSX.Element
 * }} props
 *
 * @returns {React.ReactElement}
 */
export function LayoutMenu({ title, description, complete, children }) {
  const { t } = useTranslation("app");

  const TitleElement = () => {
    return (
      <BlockStack inlineAlign="start" gap="200">
        {complete ? <Badge tone="success">{t("complete")}</Badge> : null}
        <span>{title}</span>
      </BlockStack>
    );
  };

  return (
    <Layout.AnnotatedSection title={<TitleElement />} description={description}>
      <Card roundedAbove="sm">{children}</Card>
    </Layout.AnnotatedSection>
  );
}
