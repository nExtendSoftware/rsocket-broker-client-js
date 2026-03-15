# Releasing

## Prerequisites

- npm account with publish access to `rsocket-broker-client-js`
- `npm login`
- clean working tree
- version updated in `package.json`

## Recommended release flow

Run from the repository root:

```bash
npm install
npm run lint
npm test
npm run build
npm pack
```

`npm pack` is useful as a final verification step because the package runs
`prepack`, builds automatically, and lets you inspect what would be published.

## Publish

```bash
npm publish
```

This package already has `"publishConfig": { "access": "public" }`, so no extra
flag is required for public npm publishing.

## What gets published

The npm package publishes the compiled ESM build from
`dist/rsocket-broker-client-js/src` plus `README.md` and `LICENSE`.

Raw source files and example applications are not part of the published package.
