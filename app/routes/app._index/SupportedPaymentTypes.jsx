import { useEffect, useState } from "react";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Button,
  FormLayout,
  Checkbox,
  Grid,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { LayoutMenu } from "~/components/admin";

export default function SupportedPaymentTypes() {
  /** @type {import("@remix-run/node").SerializeFrom<import('~/routes/app._index/route').loader>} */
  const { config, availablePaymentTypes, systemExcludedPaymentTypes } =
    useLoaderData();
  const { t } = useTranslation();
  const [excludedPaymentTypes, setExcludedPaymentTypes] = useState(
    /** @type {string[]} */ ([])
  );
  const submit = useSubmit();

  useEffect(() => {
    if (config !== null && config.excludedPaymentTypes !== null) {
      setExcludedPaymentTypes(config.excludedPaymentTypes);
    }
  }, []);

  const handleAddExcludedPaymentType = (type) => {
    setExcludedPaymentTypes((oldValue) => [...oldValue, type]);
  };

  const handleRemoveExcludedPaymentType = (type) => {
    setExcludedPaymentTypes(
      excludedPaymentTypes.filter((paymentType) => paymentType !== type)
    );
  };

  /**
   * Handles Form submission for Excluded Payment Types
   *
   * @param {React.SyntheticEvent} event
   */
  const handleUpdateExcludedPaymentTypes = (event) => {
    event.preventDefault();

    submit(
      {
        _action: "update-excluded-payment-types",
        excludedPaymentTypes: excludedPaymentTypes.join(","),
      },
      { method: "post" }
    );
  };

  if (availablePaymentTypes === null) return null;

  const filteredPaymentTypes = availablePaymentTypes.filter(
    (paymentType) => !systemExcludedPaymentTypes.includes(paymentType)
  );

  return (
    <LayoutMenu
      title={t("supported_payment_types.title")}
      description={t("supported_payment_types.description")}
    >
      <form method="post" onSubmit={handleUpdateExcludedPaymentTypes}>
        <FormLayout>
          <Grid>
            {filteredPaymentTypes.map((paymentType, index) => {
              const checked = !excludedPaymentTypes.includes(paymentType);

              return (
                <Grid.Cell
                  key={index}
                  columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                >
                  <Checkbox
                    label={t(`payment_type.${paymentType}`)}
                    checked={checked}
                    onChange={(newChecked) => {
                      if (newChecked) {
                        handleRemoveExcludedPaymentType(paymentType);
                      } else {
                        handleAddExcludedPaymentType(paymentType);
                      }
                    }}
                  />
                </Grid.Cell>
              );
            })}
          </Grid>

          <Button variant="primary" submit>
            {t("update")}
          </Button>
        </FormLayout>
      </form>
    </LayoutMenu>
  );
}
