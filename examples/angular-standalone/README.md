# Angular Example

This example targets Angular 21 and consumes the local library package.
Use the "Connect to broker" button in the UI to execute the same
`await client.connect(connectionProperties)` flow shown in the root README.

## Run

```bash
cd ../..
npm install
cd examples/angular-standalone
npm start
```

## Build

```bash
npm run build
```

The example includes `allowedCommonJsDependencies` for the current upstream
`rsocket-*` packages, so Angular will not emit those optimization warnings.
