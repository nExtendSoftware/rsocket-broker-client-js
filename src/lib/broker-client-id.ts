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
import { v4 as uuidv4 } from 'uuid';

export interface BrokerClientIdBits {
  msb: bigint;
  lsb: bigint;
}

export class BrokerClientId {
  public readonly first: bigint;

  public readonly second: bigint;

  constructor(uuid = uuidv4()) {
    const bits = uuidStrToSigBits(uuid);

    this.first = bits.msb;
    this.second = bits.lsb;
  }

  static from(uuid: string): BrokerClientId {
    return new BrokerClientId(uuid);
  }
}

function invalidUuidError(uuid: string): Error {
  return new Error(`Invalid UUID string: '${uuid}'`);
}

function splitUuid(uuid: string): string[] {
  const parts = uuid.split('-');

  if (parts.length !== 5) {
    throw invalidUuidError(uuid);
  }

  return parts;
}

export function uuidStrToSigBits(uuid: string): BrokerClientIdBits {
  if (uuid == null) {
    throw invalidUuidError(uuid);
  }

  const parts = splitUuid(uuid);

  return {
    msb:
      (hexStrToBigInt(parts[0]) << 32n) |
      (hexStrToBigInt(parts[1]) << 16n) |
      hexStrToBigInt(parts[2]),
    lsb: (hexStrToBigInt(parts[3]) << 48n) | hexStrToBigInt(parts[4]),
  };
}

export function hexStrToBigInt(hex: string): bigint {
  return BigInt(hex.startsWith('0x') ? hex : `0x${hex}`);
}
