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
// Purpose: RSocket setup request and response types.
import { BrokerClientId } from './broker-client-id.js';
import { Tags } from './tags.js';

export interface H3ConnectionOptions {
  ca?: string | Uint8Array | Array<string | Uint8Array>;
  rejectUnauthorized?: boolean;
  servername?: string;
  runtimeMode?: 'auto' | 'fast' | 'portable';
  fallbackPolicy?: 'error' | 'warn-and-fallback';
  path?: string;
  headers?: Record<string, string>;
}

export interface WebTransportHash {
  algorithm: string;
  value: BufferSource;
}

export interface WebTransportConnectionOptions {
  allowPooling?: boolean;
  congestionControl?: 'default' | 'low-latency' | 'throughput';
  requireUnreliable?: boolean;
  serverCertificateHashes?: WebTransportHash[];
}

export interface ConnectionProperties {
  token: string;
  brokerUrl: string;
  brokerClientId: BrokerClientId;
  brokerClientName: string;
  connectionTags: Tags;
  keepAlive?: number;
  lifetime?: number;
  dataMimeType?: string;
  metadataMimeType?: string;
  h3?: H3ConnectionOptions;
  webTransport?: WebTransportConnectionOptions;
}
