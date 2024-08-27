import { useSearchParams, useMatches } from "@remix-run/react";
import { Button, Popover, ActionList, Icon } from "@shopify/polaris";
import { CheckSmallIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n";

export function LanguageToggle() {
  const [root] = useMatches();
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState(false);
  const { t } = useTranslation("app");

  const toggleActive = useCallback(() => setActive((active) => !active), []);

  const handleUpdateLanguage = (locale) => {
    const params = new URLSearchParams(searchParams);
    params.set("lng", locale);
    setSearchParams(params, {
      preventScrollReset: true,
    });
  };

  const activator = (
    <Button onClick={toggleActive} disclosure>
      {t("language")}
    </Button>
  );

  const locale = root?.data?.locale;

  const actionItems = useMemo(
    () =>
      i18n.supportedLngs.map((lang) => ({
        content: lang.toUpperCase(),
        onAction: () => handleUpdateLanguage(lang),
        suffix: locale === lang ? <Icon source={CheckSmallIcon} /> : null,
      })),
    [locale]
  );

  return (
    <div>
      <Popover
        active={active}
        activator={activator}
        autofocusTarget="first-node"
        onClose={toggleActive}
      >
        <ActionList actionRole="menuitem" items={actionItems} />
      </Popover>
    </div>
  );
}
