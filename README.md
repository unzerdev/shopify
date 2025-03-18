# Unzer Shopify Payments App

### Setup

Following the instructions on `SETUP_DB.md` to configure
Docker to use PostgreSQL.

Install all dependencies:

```shell
npm install
```

Create a `.env` file in the root folder:

```
SHOPIFY_API_KEY=833ee3d4c6a097b30dafcec45997cb0e
SHOPIFY_PAYMENTQP_ID=d666e2e2-7844-48cd-a183-144c352455c5
SHOPIFY_PAYMENTS_APP_API_VERSION=2024-07
SHOPIFY_APP_URL=https://latori-17.ngrok.io/
```

### Local Development

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
[Unzer Payments](https://partners.shopify.com/3965358/apps/194655453185/overview)\
Production App. This is the app released publicly.

## Storefronts
[Unzer Payments Demo](https://admin.shopify.com/store/unzer-payments-demo)\
This is a demo test store that has the production app installed.
