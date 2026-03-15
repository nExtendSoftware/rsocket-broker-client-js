# rsocket-broker-client-js

RSocket Broker Client for JavaScript, intended for use with
[rsocket-broker](https://github.com/rsocket-broker/rsocket-broker).

## Installation

```bash
npm install rsocket-broker-client-js
```

You need a running broker instance and a target service to connect to.

## Framework compatibility

Validated on March 15, 2026 with:

- Angular `21.2.4` package line, smoke-tested with Angular CLI `21.2.2`
- React `19.2.4`, smoke-tested with Vite `8`

The package now publishes compiled ESM output instead of raw TypeScript source,
which is the main requirement for current Angular and React toolchains.

Angular 21 still reports CommonJS optimization warnings for the upstream
`rsocket-*` dependencies. The application build succeeds, but those warnings
remain until the RSocket packages ship ESM builds.

## Examples

Run `npm install` at the repository root first so the workspace example
dependencies are available to TypeScript and your editor.

- React example: [examples/react-vite/README.md](examples/react-vite/README.md)
- Angular example:
  [examples/angular-standalone/README.md](examples/angular-standalone/README.md)

## Features

- Request/Response
- Request/Stream
- Fire-and-Forget
- Request/Channel client API
- Composite metadata for authentication, routing and broker frames

## Usage

```ts
import {
  BrokerClientId,
  BrokerRoutingType,
  ConnectionProperties,
  RequestProperties,
  RsocketBrokerClient,
  Tags,
} from 'rsocket-broker-client-js';

const brokerClient = new RsocketBrokerClient();
const id = new BrokerClientId();

const connectionProperties: ConnectionProperties = {
  token: 'AValidJWTToken',
  brokerUrl: 'ws://localhost:7171',
  brokerClientId: id,
  brokerClientName: 'web-broker-client',
  connectionTags: new Tags(),
  keepAlive: 10_000,
  lifetime: 200_000,
};

const rsocket = await brokerClient.connect(connectionProperties);

const requestProperties: RequestProperties = {
  token: 'AValidJWTToken',
  payload: Buffer.from(JSON.stringify({ value: 'test' })),
  brokerClientId: id,
  route: 'targetFunctionName',
  brokerTargetName: 'targetServiceName',
  addressTags: new Tags(),
  addressMetadataTags: new Tags(),
  flags: BrokerRoutingType.UNICAST,
};

const metadata = brokerClient.addMetadata(
  requestProperties.token,
  requestProperties.brokerClientId,
  requestProperties.route,
  requestProperties.addressMetadataTags,
  requestProperties.addressTags,
  requestProperties.flags
);

const response = brokerClient.requestStream(
  rsocket,
  requestProperties.payload.toString(),
  metadata
);

response.subscribe({
  next: (payload: string) => console.log(payload),
  error: (error: Error) => console.error(error),
  complete: () => console.log('complete'),
});
```

When using the client outside the browser, pass a `webSocketFactory` in the
constructor so the transport can create websocket connections.

## Building

```bash
npm run build
```

## Running unit tests

```bash
npm test
```

Unit tests run with [Vitest](https://vitest.dev/).
