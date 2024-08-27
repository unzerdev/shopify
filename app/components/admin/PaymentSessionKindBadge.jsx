import { Badge } from "@shopify/polaris";
import { PaymentKind, PaymentStatus } from "~/utils/lib";

export const PaymentSessionKindBadge = ({ kind, status }) => {

  const statusText = (() => {
    switch (kind) {
      case PaymentKind.AUTHORIZATION:
        return "Authorization";
      case PaymentKind.SALE:
        return 'Sale';
      default:
        return "Requires resolution";
    }
  })();

  return (
    <Badge tone={kind == PaymentKind.AUTHORIZATION ? "info" : "success"}>
      {statusText}
    </Badge>
  );
};
