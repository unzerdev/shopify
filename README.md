# Unzer Shopify Payments App

## Setup

Following the instructions on `SETUP_DB.md` to configure
Docker to use PostgreSQL.

1. Install all dependencies:

```shell
npm install
```

2. Create a `.env` file in the root folder, using `.env.sample` as reference

### Environment Variables

Some of the settings for the app can be modified via the use of these Environment Variables.


| Name                               | Description |
| ---------------------------------- | ----------- |
| `SHOPIFY_PAYMENTS_APP_API_VERSION` | This is the version of the API that the App uses. Shopify releases a new version quarterly, so it should be updated accordingly. More information about [Payments App API](https://shopify.dev/docs/api/payments-apps). |        
|`SHOPIFY_APP_URL` | The URL the app is running on.\ The `@shopify/cli` provides this URL as `process.env.SHOPIFY_APP_URL`.  For development this is a tunnel URL that points to your local machine.  If this is a production app, this is your production URL. |
| `UNZER_EXCLUDE_PAYMENT_TYPES` | Used to block some payments method from showing in the Setup Page and the Payments Page. It's a comma separated list of values, for example `paypal,giropay`. This is a global setting and will affect all merchants. |
| `DATABASE_URL` | URL to make the connection to the Database. Check `SETUP_DB.md` for instructions on usage. |

## Local Development

Make sure that your local DB is running on Docker Desktop.

Start ngrok tunnel:
```shell
ngrok http 3000 --subdomain=latori-17 --region=us
```

In a different terminal, start your local dev environment:

```shell
npm run dev
```

## About

This project uses [example-app--payments-app-template--remix](https://github.com/Shopify/example-app--payments-app-template--remix) as a starting point. You can take a look at `README_TEMPLATE.md` for more information on how to use this template.

## Apps
[Secured Payments by Unzer](https://partners.shopify.com/3965358/apps/194655453185/overview)\
Production App. This is the app released publicly.

[SBX Secured Payments by Unzer](https://partners.shopify.com/3965358/apps/233070133249/overview)\
Sandbox App. Used for testing.

[Latori dev app](https://partners.shopify.com/3965358/apps/240123478017/overview)\
Development App. Used for local development.

## Storefronts
[Unzer Payments Demo](https://admin.shopify.com/store/unzer-payments-demo)\
This is a demo test store that has the production app installed.
