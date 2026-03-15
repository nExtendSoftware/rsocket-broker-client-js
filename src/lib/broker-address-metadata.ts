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
import { BrokerFrameType } from './broker-frame-type';
import {
  encodeBrokerClientId,
  encodeBrokerFrameHeader,
  encodeBrokerTags,
} from './encoding';
import { Tags } from './tags';

export class BrokerAddressMetadata {
  readonly buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get _buffer(): Buffer {
    return this.buffer;
  }

  static encode(
    id: BrokerClientId,
    addressMetadataTags: Tags,
    addressTags: Tags,
    flags: number
  ): BrokerAddressMetadata {
    return new BrokerAddressMetadata(
      encodeBrokerAddress(id, addressMetadataTags, addressTags, flags)
    );
  }
}

export function encodeBrokerAddress(
  id: BrokerClientId,
  addressMetadataTags: Tags,
  addressTags: Tags,
  flags: number
): Buffer {
  return Buffer.concat([
    encodeBrokerFrameHeader(BrokerFrameType.ADDRESS, flags),
    encodeBrokerClientId(id),
    encodeBrokerTags(addressMetadataTags),
    encodeBrokerTags(addressTags),
  ]);
}
