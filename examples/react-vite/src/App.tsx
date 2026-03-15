import { Buffer } from 'buffer';
import { useState } from 'react';

import {
  BrokerClientId,
  BrokerRoutingType,
  RsocketBrokerClient,
  Tags,
} from 'rsocket-broker-client-js';
import type {
  ConnectionProperties,
  RequestProperties,
} from 'rsocket-broker-client-js';

const clientId = new BrokerClientId('11223344-5566-7788-99aa-bbccddeeff00');
const connectionTags = new Tags();
connectionTags.set(1, 'frontend=react');

const addressTags = new Tags();
addressTags.set(2, 'service=orders');

const client = new RsocketBrokerClient({
  webSocketFactory: (url) => new WebSocket(url),
});

const connectionProperties: ConnectionProperties = {
  token: 'replace-with-a-jwt',
  brokerUrl: 'ws://localhost:7171',
  brokerClientId: clientId,
  brokerClientName: 'react-example',
  connectionTags,
};

const requestProperties: RequestProperties = {
  token: 'replace-with-a-jwt',
  payload: Buffer.from(JSON.stringify({ orderId: 'demo-123' })),
  brokerClientId: clientId,
  route: 'orders.findById',
  brokerTargetName: 'orders-service',
  addressTags,
  addressMetadataTags: new Tags(),
  flags: BrokerRoutingType.UNICAST,
};

const metadata = client.addMetadata(
  requestProperties.token,
  requestProperties.brokerClientId,
  requestProperties.route,
  requestProperties.addressMetadataTags,
  requestProperties.addressTags,
  requestProperties.flags
);

export default function App() {
  const [connectionStatus, setConnectionStatus] =
    useState('Not connected yet.');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  async function connectToBroker(): Promise<void> {
    setConnectionStatus('Connecting...');
    setConnectionError(null);

    try {
      const rsocket = await client.connect(connectionProperties);

      setConnectionStatus(
        `Connected. RSocket close method available: ${String(
          typeof rsocket.close === 'function'
        )}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown connection error';

      setConnectionStatus('Connection failed.');
      setConnectionError(message);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">React 19 + Vite 8</p>
        <h1>RSocket Broker Client</h1>
        <p className="lede">
          This example verifies that the package can be imported, configured,
          and used to create a live broker connection from a current React app.
        </p>

        <dl className="grid">
          <div>
            <dt>Client name</dt>
            <dd>{connectionProperties.brokerClientName}</dd>
          </div>
          <div>
            <dt>Broker URL</dt>
            <dd>{connectionProperties.brokerUrl}</dd>
          </div>
          <div>
            <dt>Routing mode</dt>
            <dd>{requestProperties.flags}</dd>
          </div>
          <div>
            <dt>Metadata entries</dt>
            <dd>{metadata.size}</dd>
          </div>
        </dl>

        <div className="actions">
          <button className="button" type="button" onClick={connectToBroker}>
            Connect to broker
          </button>
          <p className="status">{connectionStatus}</p>
          {connectionError ? <p className="error">{connectionError}</p> : null}
        </div>

        <pre className="code">
          <code>
            {[
              'const rsocket = await client.connect(connectionProperties);',
              '',
              'const response = client.requestStream(',
              '  rsocket,',
              '  requestProperties.payload.toString(),',
              '  metadata',
              ');',
            ].join('\n')}
          </code>
        </pre>
      </section>
    </main>
  );
}
