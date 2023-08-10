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



import { BrokerClientId } from "./broker-client-id";
import { Tags } from "./tags";

export class BrokerRouteSetupMetadata {
  _buffer: Buffer;
  static FrameHeaderBytes = 6;
  static IdBytes = 32;

  /**
   * Mimimum value that would overflow bitwise operators (2^32).
   */
  static readonly BITWISE_OVERFLOW = 0x100000000;

  static readonly FLAGS_MASK = 0x3ff;

  static readonly FRAME_HEADER_SIZE = 6;

  constructor(buffer: Buffer) {
    this._buffer = buffer;
  }

}

function toHex(first: bigint) {
  return first.toString(16)
}

/**
 * Encode given set of routes into {@link Buffer} following the <a href="https://github.com/rsocket/rsocket/blob/master/Extensions/Routing.md">Routing Metadata Layout</a>
 *
 * @param id non-empty uuid with msb and lsb
 * @param serviceName non-empty string with service name
 * @param tags non-empty string with tags
 * @returns {Buffer} with encoded content
 */
export function encodeBrokerRouteSetup(id: BrokerClientId, serviceName: string, tags : Tags): Buffer {

  const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);

  const idFirstBuffer = Buffer.allocUnsafe(8);
    idFirstBuffer.write(toHex(id.first), 0);
  const idSecondBuffer = Buffer.allocUnsafe(8);
    idSecondBuffer.write(toHex(id.second), 0);
  const idBuffer = Buffer.concat([idFirstBuffer, idSecondBuffer]);

  const serviceNameBuffer = Buffer.from(serviceName);
  const serviceNameMetadataBuffer = Buffer.allocUnsafe(1 + serviceName.length);
  serviceNameMetadataBuffer.writeUInt8(serviceName.length, 0);
  serviceNameBuffer.copy(serviceNameMetadataBuffer, 1)

  return Buffer.concat([buffer, idBuffer, serviceNameMetadataBuffer]);
}








