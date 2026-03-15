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
import { BrokerClientId } from './broker-client-id';
import {
  BROKER_CLIENT_ID_LENGTH,
  BROKER_HEADER_LENGTH,
  encodeBrokerClientId,
  encodeBrokerFrameHeader,
  encodeBrokerTags,
  encodeLengthPrefixedText,
} from './encoding';
import { BrokerFrameType } from './broker-frame-type';
import { Tags } from './tags';

export class BrokerRouteSetupMetadata {
  readonly buffer: Buffer;
  static FrameHeaderBytes = BROKER_HEADER_LENGTH;
  static IdBytes = BROKER_CLIENT_ID_LENGTH;

  /**
   * Mimimum value that would overflow bitwise operators (2^32).
   */
  static readonly BITWISE_OVERFLOW = 0x100000000;

  static readonly FLAGS_MASK = 0x3ff;

  static readonly FRAME_HEADER_SIZE = BROKER_HEADER_LENGTH;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get _buffer(): Buffer {
    return this.buffer;
  }

  static encode(
    id: BrokerClientId,
    serviceName: string,
    tags: Tags
  ): BrokerRouteSetupMetadata {
    return new BrokerRouteSetupMetadata(
      encodeBrokerRouteSetup(id, serviceName, tags)
    );
  }
}

/**
 * Encode given set of routes into {@link Buffer} following the <a href="https://github.com/rsocket/rsocket/blob/master/Extensions/Routing.md">Routing Metadata Layout</a>
 *
 * @param id non-empty uuid with msb and lsb
 * @param serviceName non-empty string with service name
 * @param tags non-empty string with tags
 * @returns {Buffer} with encoded content
 */
export function encodeBrokerRouteSetup(
  id: BrokerClientId,
  serviceName: string,
  tags: Tags
): Buffer {
  return Buffer.concat([
    encodeBrokerFrameHeader(BrokerFrameType.ROUTE_SETUP),
    encodeBrokerClientId(id),
    encodeLengthPrefixedText(serviceName, 'serviceName'),
    encodeBrokerTags(tags),
  ]);
}
