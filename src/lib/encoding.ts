import { Buffer } from 'buffer';

import { BrokerClientId } from './broker-client-id.js';
import { BrokerFrameType } from './broker-frame-type.js';
import { Tags } from './tags.js';

export const BROKER_FRAME_MIME_TYPE = 'message/x.rsocket.broker.frame.v0';
export const BROKER_HEADER_LENGTH = 6;
export const BROKER_CLIENT_ID_LENGTH = 16;
export const BROKER_DEFAULT_DATA_MIME_TYPE = 'application/json';

const BROKER_METADATA_PREFIX = Buffer.from([0x00, 0x00, 0x1c, 0x01]);
const BROKER_FRAME_TYPE_SHIFT = 10;
const MAX_METADATA_VALUE_LENGTH = 0xff;

function assertByteSizedLength(length: number, fieldName: string): void {
  if (length > MAX_METADATA_VALUE_LENGTH) {
    throw new Error(
      `${fieldName} exceeds the maximum supported length of ${MAX_METADATA_VALUE_LENGTH} bytes.`
    );
  }
}

export function encodeBrokerFrameHeader(
  frameType: BrokerFrameType,
  flags = 0
): Buffer {
  const header = Buffer.alloc(2);
  header.writeUInt16BE((frameType << BROKER_FRAME_TYPE_SHIFT) | flags, 0);

  return Buffer.concat([
    asBufferView(BROKER_METADATA_PREFIX),
    asBufferView(header),
  ]);
}

export function encodeBrokerClientId(id: BrokerClientId): Buffer {
  const buffer = Buffer.alloc(BROKER_CLIENT_ID_LENGTH);
  buffer.writeBigUInt64BE(id.first, 0);
  buffer.writeBigUInt64BE(id.second, 8);

  return buffer;
}

export function encodeBrokerTags(tags: Tags): Buffer {
  const encodedTags: Buffer[] = [];

  tags.forEach((value, key) => {
    const valueBuffer = Buffer.from(value);

    assertByteSizedLength(valueBuffer.length, `Tag ${key}`);

    const tagBuffer = Buffer.alloc(2 + valueBuffer.length);
    tagBuffer.writeUInt8(key, 0);
    tagBuffer.writeUInt8(valueBuffer.length, 1);
    valueBuffer.copy(asBufferView(tagBuffer), 2);
    encodedTags.push(tagBuffer);
  });

  return Buffer.concat(encodedTags.map(asBufferView));
}

export function encodeLengthPrefixedText(
  value: string,
  fieldName: string
): Buffer {
  const valueBuffer = Buffer.from(value);

  assertByteSizedLength(valueBuffer.length, fieldName);

  const encodedValue = Buffer.alloc(1 + valueBuffer.length);
  encodedValue.writeUInt8(valueBuffer.length, 0);
  valueBuffer.copy(asBufferView(encodedValue), 1);

  return encodedValue;
}

function asBufferView(buffer: Buffer): Uint8Array {
  return buffer as unknown as Uint8Array;
}
