## Deploying a new version

Since extensions in the different apps: `dev`, `sandbox` and `production` have different settings. When deploying a new version please remove `.dev`, `.sbx` or `.prd` depending on which enviroment you are pushing the new version to, from the extension.toml file, to make sure that the correct settings are pushed to the extension depending on the app
