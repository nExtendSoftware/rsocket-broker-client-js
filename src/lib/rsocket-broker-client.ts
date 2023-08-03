/*
 * Copyright 2021-2022 the original author or authors.
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

import { Injectable } from '@angular/core';

import {
  encodeCompositeMetadata, encodeRoute,
  encodeBearerAuthMetadata,
  WellKnownMimeType, encodeAndAddCustomMetadata,
} from "rsocket-composite-metadata";
import {RxRequestersFactory} from "rsocket-adapter-rxjs";
import {
  RSocket, RSocketConnector
} from "rsocket-core";
import {WebsocketClientTransport} from "rsocket-websocket-client";
import {Buffer} from "buffer";
import {BrokerClientId, encodeBrokerRouteSetup, encodeBrokerAddress} from "./rsocket/metadata";

import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;
import MESSAGE_RSOCKET_COMPOSITE_METADATA = WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA;
import MESSAGE_RSOCKET_AUTHENTICATION = WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION;
import {SetupConnection} from "./setup-connection";
import {Tags} from "./rsocket/metadata/tags";


@Injectable({
  providedIn: 'root'
})
export class rsocketBrokerClient {

  constructor() { console.log("rsocketBrokerClient constructor"); }

  readonly stringCodec = new StringCodec();

  public addMetadata(token: string, originId: BrokerClientId, route: string, addressMetaDataTags: Tags, addressTags: Tags, flags: number) {
    const map = new Map<string | number |WellKnownMimeType, Buffer>();
    if (route) {
      const encodedRoute = encodeRoute(route);
      map.set(MESSAGE_RSOCKET_ROUTING, encodedRoute);
    }
    map.set('message/x.rsocket.broker.frame.v0', encodeBrokerAddress(originId, addressMetaDataTags, addressTags, flags));
    return map;
  }

  public async requestResponse(rsocket: RSocket, payload: string, metadata : Map<string | number | WellKnownMimeType, Buffer>) {
    const request = RxRequestersFactory.requestResponse(
      payload,
      this.stringCodec,
      this.stringCodec
    );
    return request(rsocket, metadata);
  }

  public async requestStream(rsocket: RSocket, payload: string, metadata : Map<string | number | WellKnownMimeType, Buffer>) {
    const request = RxRequestersFactory.requestStream(
      payload,
      this.stringCodec,
      this.stringCodec,
      5
    );
    return request(rsocket, metadata);
  }

  public async connect(setupConnection : SetupConnection): Promise<RSocket> {
    window.Buffer = window.Buffer || Buffer;

    const connector = new RSocketConnector({
      setup: {
        payload: {  data: Buffer.allocUnsafe(0), metadata: addBrokerRouteSetup(setupConnection.token, setupConnection.brokerClientId, setupConnection.brokerClientName, setupConnection.connectionTags) },
        keepAlive: 10000,
        lifetime: 200000,
        dataMimeType: "application/json",
        metadataMimeType: MESSAGE_RSOCKET_COMPOSITE_METADATA.string,
      },

      transport: new WebsocketClientTransport({
        url: setupConnection.brokerUrl,
        wsCreator: (url) => new WebSocket(url) as never,
      }),
    });

    return await connector.connect();
  }
}

function addBrokerRouteSetup(token: string, routeId: BrokerClientId, serviceName: string, tags: Tags) {
  const map = new Map<WellKnownMimeType, Buffer>();
  map.set(MESSAGE_RSOCKET_AUTHENTICATION, encodeBearerAuthMetadata(token));
  const compositeMetaData = encodeCompositeMetadata(map);
  return encodeAndAddCustomMetadata(compositeMetaData,'message/x.rsocket.broker.frame.v0', encodeBrokerRouteSetup(routeId, serviceName, tags));
}



export class StringCodec implements Codec<string> {
  readonly mimeType: string = "application/json";

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
