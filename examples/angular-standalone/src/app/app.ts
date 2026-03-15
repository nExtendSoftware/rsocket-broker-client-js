import { Buffer } from 'buffer';
import { Component } from '@angular/core';
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

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected connectionStatus = 'Not connected yet.';
  protected connectionError: string | null = null;

  protected readonly clientId = new BrokerClientId(
    '11223344-5566-7788-99aa-bbccddeeff00'
  );

  protected readonly connectionTags = (() => {
    const tags = new Tags();
    tags.set(1, 'frontend=angular');
    return tags;
  })();

  protected readonly addressTags = (() => {
    const tags = new Tags();
    tags.set(2, 'service=orders');
    return tags;
  })();

  protected readonly client = new RsocketBrokerClient({
    webSocketFactory: (url) => new WebSocket(url),
  });

  protected readonly connectionProperties: ConnectionProperties = {
    token: 'replace-with-a-jwt',
    brokerUrl: 'ws://localhost:7171',
    brokerClientId: this.clientId,
    brokerClientName: 'angular-example',
    connectionTags: this.connectionTags,
  };

  protected readonly requestProperties: RequestProperties = {
    token: 'replace-with-a-jwt',
    payload: Buffer.from(JSON.stringify({ orderId: 'demo-123' })),
    brokerClientId: this.clientId,
    route: 'orders.findById',
    brokerTargetName: 'orders-service',
    addressTags: this.addressTags,
    addressMetadataTags: new Tags(),
    flags: BrokerRoutingType.UNICAST,
  };

  protected readonly metadata = this.client.addMetadata(
    this.requestProperties.token,
    this.requestProperties.brokerClientId,
    this.requestProperties.route,
    this.requestProperties.addressMetadataTags,
    this.requestProperties.addressTags,
    this.requestProperties.flags
  );

  protected async connectToBroker(): Promise<void> {
    this.connectionStatus = 'Connecting...';
    this.connectionError = null;

    try {
      const rsocket = await this.client.connect(this.connectionProperties);

      this.connectionStatus = `Connected. RSocket close method available: ${String(
        typeof rsocket.close === 'function'
      )}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown connection error';

      this.connectionStatus = 'Connection failed.';
      this.connectionError = message;
    }
  }
}
