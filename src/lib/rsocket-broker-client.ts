/*
 * Copyright 2021-2023 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Buffer } from 'buffer';
import { asyncScheduler, Observable } from 'rxjs';
import { RxRequestersFactory } from 'rsocket-adapter-rxjs';
import {
  encodeAndAddCustomMetadata,
  encodeBearerAuthMetadata,
  encodeCompositeMetadata,
  encodeRoute,
  WellKnownMimeType,
} from 'rsocket-composite-metadata';
import { RSocketConnector } from 'rsocket-core';
import type { ClientTransport, ConnectorConfig, RSocket } from 'rsocket-core';
import { WebsocketClientTransport } from 'rsocket-websocket-client';

import { encodeBrokerAddress } from './broker-address-metadata';
import { BrokerClientId } from './broker-client-id';
import { ConnectionProperties } from './connection-properties';
import {
  BROKER_DEFAULT_DATA_MIME_TYPE,
  BROKER_FRAME_MIME_TYPE,
} from './encoding';
import { encodeBrokerRouteSetup } from './broker-route-setup-metadata';
import { Tags } from './tags';

import MESSAGE_RSOCKET_AUTHENTICATION = WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION;
import MESSAGE_RSOCKET_COMPOSITE_METADATA = WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA;
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;

export type BrokerMetadataKey = string | number | WellKnownMimeType;
export type BrokerMetadata = Map<BrokerMetadataKey, Buffer>;
export type WebSocketFactory = (url: string) => WebSocket;

type ConnectorLike = Pick<RSocketConnector, 'connect'>;
type ConnectorFactory = (config: ConnectorConfig) => ConnectorLike;
type TransportFactory = (connection: ConnectionProperties) => ClientTransport;
type BufferGlobal = typeof globalThis & {
  Buffer?: typeof Buffer;
  WebSocket?: new (url: string) => WebSocket;
  window?: {
    Buffer?: typeof Buffer;
  };
};

export interface RsocketBrokerClientOptions {
  createConnector?: ConnectorFactory;
  createTransport?: TransportFactory;
  webSocketFactory?: WebSocketFactory;
}

export const DEFAULT_KEEP_ALIVE = 10_000;
export const DEFAULT_LIFETIME = 200_000;
export const DEFAULT_REQUEST_STREAM_PREFETCH = 5;
export const DEFAULT_REQUEST_CHANNEL_PREFETCH = 256;

function createConnectorFactory(): ConnectorFactory {
  return (config) => new RSocketConnector(config);
}

function createTransportFactory(
  webSocketFactory?: WebSocketFactory
): TransportFactory {
  return (connection) =>
    new WebsocketClientTransport({
      url: connection.brokerUrl,
      wsCreator: resolveWebSocketFactory(webSocketFactory),
    });
}

export class RsocketBrokerClient {
  readonly stringCodec = new StringCodec();

  private readonly createConnector: ConnectorFactory;

  private readonly createTransport: TransportFactory;

  constructor(options: RsocketBrokerClientOptions = {}) {
    this.createConnector = options.createConnector ?? createConnectorFactory();
    this.createTransport =
      options.createTransport ??
      createTransportFactory(options.webSocketFactory);
  }

  public addMetadata(
    token: string,
    originId: BrokerClientId,
    route: string,
    addressMetadataTags: Tags,
    addressTags: Tags,
    flags: number
  ): BrokerMetadata {
    const metadata = createBrokerMetadata();

    addAuthenticationMetadata(metadata, token);
    addRouteMetadata(metadata, route);
    metadata.set(
      BROKER_FRAME_MIME_TYPE,
      encodeBrokerAddress(originId, addressMetadataTags, addressTags, flags)
    );

    return metadata;
  }

  public fireAndForget(
    rsocket: RSocket,
    payload: string,
    metadata: BrokerMetadata
  ) {
    const request = RxRequestersFactory.fireAndForget(
      payload,
      this.stringCodec
    );
    return request(rsocket, metadata);
  }

  public requestResponse(
    rsocket: RSocket,
    payload: string,
    metadata: BrokerMetadata
  ) {
    const request = RxRequestersFactory.requestResponse(
      payload,
      this.stringCodec,
      this.stringCodec
    );

    return request(rsocket, metadata);
  }

  public requestStream(
    rsocket: RSocket,
    payload: string,
    metadata: BrokerMetadata
  ) {
    const request = RxRequestersFactory.requestStream(
      payload,
      this.stringCodec,
      this.stringCodec,
      DEFAULT_REQUEST_STREAM_PREFETCH
    );

    return request(rsocket, metadata);
  }

  public requestChannel(
    rsocket: RSocket,
    payload: Observable<string>,
    metadata: BrokerMetadata
  ) {
    const request = RxRequestersFactory.requestChannel(
      payload,
      this.stringCodec,
      this.stringCodec,
      DEFAULT_REQUEST_CHANNEL_PREFETCH,
      asyncScheduler
    );

    return request(rsocket, metadata);
  }

  public async connect(
    setupConnection: ConnectionProperties
  ): Promise<RSocket> {
    const {
      brokerClientId,
      brokerClientName,
      connectionTags,
      dataMimeType = BROKER_DEFAULT_DATA_MIME_TYPE,
      keepAlive = DEFAULT_KEEP_ALIVE,
      lifetime = DEFAULT_LIFETIME,
      metadataMimeType = MESSAGE_RSOCKET_COMPOSITE_METADATA.string,
      token,
    } = setupConnection;

    ensureBufferGlobal();

    const connector = this.createConnector(
      createConnectorConfig(this.createTransport(setupConnection), {
        brokerClientId,
        brokerClientName,
        connectionTags,
        dataMimeType,
        keepAlive,
        lifetime,
        metadataMimeType,
        token,
      })
    );

    return connector.connect();
  }
}

function createBrokerMetadata(): BrokerMetadata {
  return new Map<BrokerMetadataKey, Buffer>();
}

function addAuthenticationMetadata(
  metadata: Map<WellKnownMimeType | BrokerMetadataKey, Buffer>,
  token: string
): void {
  if (!token) {
    return;
  }

  metadata.set(MESSAGE_RSOCKET_AUTHENTICATION, encodeBearerAuthMetadata(token));
}

function addRouteMetadata(metadata: BrokerMetadata, route: string): void {
  if (!route) {
    return;
  }

  metadata.set(MESSAGE_RSOCKET_ROUTING, encodeRoute(route));
}

function createConnectorConfig(
  transport: ClientTransport,
  options: {
    brokerClientId: BrokerClientId;
    brokerClientName: string;
    connectionTags: Tags;
    dataMimeType: string;
    keepAlive: number;
    lifetime: number;
    metadataMimeType: string;
    token: string;
  }
): ConnectorConfig {
  return {
    setup: {
      payload: {
        data: Buffer.alloc(0),
        metadata: encodeSetupMetadata(
          options.token,
          options.brokerClientId,
          options.brokerClientName,
          options.connectionTags
        ),
      },
      keepAlive: options.keepAlive,
      lifetime: options.lifetime,
      dataMimeType: options.dataMimeType,
      metadataMimeType: options.metadataMimeType,
    },
    transport,
  };
}

function encodeSetupMetadata(
  token: string,
  routeId: BrokerClientId,
  serviceName: string,
  tags: Tags
): Buffer {
  const metadata = new Map<WellKnownMimeType, Buffer>();

  addAuthenticationMetadata(metadata, token);

  return encodeAndAddCustomMetadata(
    encodeCompositeMetadata(metadata),
    BROKER_FRAME_MIME_TYPE,
    encodeBrokerRouteSetup(routeId, serviceName, tags)
  );
}

function ensureBufferGlobal(): void {
  const scope = globalThis as BufferGlobal;

  scope.Buffer ??= Buffer;

  if (scope.window) {
    scope.window.Buffer ??= Buffer;
  }
}

function resolveWebSocketFactory(
  webSocketFactory?: WebSocketFactory
): WebSocketFactory {
  if (webSocketFactory) {
    return webSocketFactory;
  }

  const scope = globalThis as BufferGlobal;

  if (!scope.WebSocket) {
    throw new Error(
      'No WebSocket implementation is available. Pass a webSocketFactory when connecting outside the browser.'
    );
  }

  const WebSocketImplementation = scope.WebSocket;

  return (url) => new WebSocketImplementation(url);
}

export class StringCodec implements Codec<string> {
  readonly mimeType = 'application/json';

  decode(buffer: Buffer): string {
    return buffer.toString();
  }

  encode(entity: string): Buffer {
    return Buffer.from(entity);
  }
}

export interface Codec<D> {
  mimeType: string;

  encode(entity: D): Buffer;
  decode(buffer: Buffer): D;
}
