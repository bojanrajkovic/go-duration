# Releasing

Pushing a `v*` tag runs `.github/workflows/publish.yml`. The workflow checks that the tag
matches the `version` in `package.json`, runs every check, and publishes to npm with
[trusted publishing](https://docs.npmjs.com/trusted-publishers/). Trusted publishing
authenticates with GitHub's OIDC token, so the repo stores no npm token.

## Cutting a release

```sh
npm version patch --no-git-tag-version   # or minor or major
git commit -am "chore: release $(node -p 'require("./package.json").version')"
git tag "v$(node -p 'require("./package.json").version')"
git push origin main --tags
```

If the tag doesn't match `package.json`, the workflow fails before publishing anything.

## Setting up trusted publishing

npm can only trust a workflow for a package that already exists, so version 0.1.0 was
published by hand:

```sh
pnpm build
npm publish
```

Link the package to the workflow right before the first release from CI, because a new trust
configuration has to publish within two days. This needs npm 11.15.0 or later and account-level
2FA:

```sh
npm trust github @bojanrajkovic/go-duration --repo bojanrajkovic/go-duration --file publish.yml --allow-publish
```

`--allow-publish` lets the workflow release directly. Without it, npm only allows
`npm stage publish`, which uploads the release and waits for a maintainer to approve it on
npmjs.com. Once a CI release succeeds, set the package's publishing access to "Require
two-factor authentication and disallow tokens" on npmjs.com.

The repository is private, so npm doesn't generate provenance attestations. They need a public
repository.
