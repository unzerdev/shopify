import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
// @ts-ignore
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";
// @ts-ignore
import { ExternalScripts } from "remix-utils/external-scripts";
import i18next from "~/i18next.server";
import { i18nCookie } from "./cookies.server";

export async function loader({ request }) {
  const locale = await i18next.getLocale(request);

  return json(
    { locale },
    {
      headers: { "Set-Cookie": await i18nCookie.serialize(locale) },
    }
  );
}

export const handle = {
  // In the handle export, we can add a i18n key with namespaces our route
  // will need to load. This key can be a single string or an array of strings.
  // TIP: In most cases, you should set this to your defaultNS from your i18n config
  // or if you did not set one, set it to the i18next default namespace "translation"
  i18n: "app",
};

export default function App() {
  const { locale } = useLoaderData();
  const { i18n } = useTranslation();

  // This hook will change the i18n instance language to the current locale
  // detected by the loader, this way, when we do something to change the
  // language, this locale will change and i18next will load the correct
  // translation files
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <ExternalScripts />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <LiveReload />
        <Scripts />
      </body>
    </html>
  );
}
