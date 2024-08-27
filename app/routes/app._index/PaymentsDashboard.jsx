import { Button } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function PaymentsDasboard() {
  const { t } = useTranslation("app");

  return (
    <LayoutMenu
      title={t("payments_dashboard_menu.title")}
      description={t("payments_dashboard_menu.description")}
    >
      <Button url="/app/payments-dashboard">{t("view")}</Button>
    </LayoutMenu>
  );
}
