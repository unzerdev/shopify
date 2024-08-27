import { Badge } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { PaymentSessionStatus } from "~/utils/lib";

export const PaymentSessionStatusBadge = ({ status }) => {
  const { t } = useTranslation("app");

  const tone = (() => {
    switch (status) {
      case PaymentSessionStatus.AUTHORIZATION_PENDING:
      case PaymentSessionStatus.PARTIALLY_PAID:
      case PaymentSessionStatus.PAYMENT_PENDING:
        return "warning";
      case PaymentSessionStatus.AUTHORIZED:
        return "attention";
      case PaymentSessionStatus.CANCELED:
      case PaymentSessionStatus.VOIDED:
        return "critical";
      case PaymentSessionStatus.CREATED:
      case PaymentSessionStatus.PAID:
      case PaymentSessionStatus.PARTIALLY_REFUNDED:
      case PaymentSessionStatus.REFUNDED:
      default:
        return;
    }
  })();

  const progress = (() => {
    switch (status) {
      case PaymentSessionStatus.AUTHORIZATION_PENDING:
      case PaymentSessionStatus.PAYMENT_PENDING:
      case PaymentSessionStatus.AUTHORIZED:
        return "incomplete";
      case PaymentSessionStatus.PARTIALLY_PAID:
      case PaymentSessionStatus.PARTIALLY_REFUNDED:
        return "partiallyComplete";
      case PaymentSessionStatus.REFUNDED:
      case PaymentSessionStatus.PAID:
      case PaymentSessionStatus.CANCELED:
      case PaymentSessionStatus.VOIDED:
        return "complete";
      case PaymentSessionStatus.CREATED:
      default:
        return;
    }
  })();

  return (
    <Badge tone={tone} progress={progress}>
      {t(`payment_session_status.${status}`)}
    </Badge>
  );
};
