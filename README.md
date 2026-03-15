# rsocket-broker-client-js

RSocket Broker Client for JavaScript, intended for use with
[rsocket-broker](https://github.com/rsocket-broker/rsocket-broker).

## Installation

### Install as a dependency

```bash
npm install rsocket-broker-client-js
```

You need a running broker instance and a target service to connect to.

### Install for local development

```bash
git clone https://github.com/nExtendSoftware/rsocket-broker-client-js.git
cd rsocket-broker-client-js
npm install
```

The repository uses npm workspaces for the example apps, so a single root
`npm install` also installs the Angular and React example dependencies.

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

## Configuration

### Connection properties

`connect(connectionProperties)` accepts:

- `token`: bearer token sent in setup metadata
- `brokerUrl`: websocket URL of the broker, for example `ws://localhost:7171`
- `brokerClientId`: unique client identifier, usually `new BrokerClientId()`
- `brokerClientName`: logical name shown to the broker
- `connectionTags`: tags attached to the connection setup
- `keepAlive` optional: keepalive interval in milliseconds, default `10000`
- `lifetime` optional: connection lifetime in milliseconds, default `200000`
- `dataMimeType` optional: data mime type, default `application/json`
- `metadataMimeType` optional: metadata mime type, default RSocket composite metadata

### Request properties

`addMetadata(...)` and the request methods use:

- `token`: bearer token for request metadata
- `brokerClientId`: origin client identifier
- `route`: route name to encode into RSocket routing metadata
- `brokerTargetName`: logical target service name used by your app-level routing
- `addressTags`: broker address tags used for routing
- `addressMetadataTags`: additional broker metadata tags
- `flags`: one of `BrokerRoutingType.UNICAST`, `MULTICAST`, or `SHARD`

### Browser and Node usage

In the browser, the client can use the global `WebSocket` implementation.

Outside the browser, pass a websocket factory:

```ts
const brokerClient = new RsocketBrokerClient({
  webSocketFactory: (url) => new WebSocket(url),
});
```

The package requires Node `>=18` for development and publishing.

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

## Release

For npm publishing and release steps, see [RELEASING.md](RELEASING.md).
