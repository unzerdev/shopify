## Setup Docker with PostgreSQL

Install Docker Desktop:\
[https://www.docker.com/get-started/](https://www.docker.com/get-started/)

Pull the Postgres image from Docker:

```shell
docker pull postgres
```

You should be able to see the image inside of the Images tab in Docker Desktop

Run the following command to run the Local DB instance:

```shell
npm run docker
```

You'll need an environment variable in the `.env` file with the following format:

```
DATABASE_URL=postgresql://{user}:{password}@{hostname}:{port}/{database-name}
```

You can copy the one in `.env.sample`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unzer-payments
```

Note: user should be the one used in compose.yml, but sometimes the local user is used instead. You can check your current user by running `echo $USER` in your terminal.

To test if everything is working properly and also to run migrations, you can run:

```shell
npm run setup
```