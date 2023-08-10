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


import { Tags } from "./tags";
import { BrokerFrameType } from "./broker-frame-type";
import { BrokerClientId } from "./broker-client-id";

export class BrokerAddressMetadata {
    _buffer: Buffer;

    constructor(buffer: Buffer) {
        this._buffer = buffer;
    }
}

function toHex(first: bigint) {
    return first.toString(16)
}

function encodeAddressFrameTags(addressTags : Tags) {
    let tagsBuffer = Buffer.alloc(0);
    addressTags.forEach((value, key) => {
        const tagBuffer = Buffer.from(value);
        const tagMetadataBuffer = Buffer.allocUnsafe(2 + value.length);
        tagMetadataBuffer.writeUInt8(key, 0);
        tagMetadataBuffer.writeUInt8(value.length, 1);
        tagBuffer.copy(tagMetadataBuffer, 2)
        tagsBuffer = Buffer.concat([tagsBuffer, tagMetadataBuffer]);
    });
    return tagsBuffer;
}

function encodeHeaderTypeAndFlags(flags: number) {
    const frameMask = Number(BrokerFrameType.ADDRESS << 10);
    const typeAndFlags = Number(frameMask | flags);
    const hexValue = typeAndFlags.toString(16);
    const headerBuffer = Buffer.from([
        0x00, 0x00, 0x1C, 0x01
    ]);
    return Buffer.concat([headerBuffer, Buffer.from(hexValue, 'hex')]);
}

function encodeOriginatorId(id: BrokerClientId) {
    const idFirstBuffer = Buffer.allocUnsafe(8);
    idFirstBuffer.write(toHex(id.first), 0);
    const idSecondBuffer = Buffer.allocUnsafe(8);
    idSecondBuffer.write(toHex(id.second), 0);
    return Buffer.concat([idFirstBuffer, idSecondBuffer]);
}

export function encodeBrokerAddress(id: BrokerClientId, addressMetadataTags: Tags, addressTags : Tags, flags: number ): Buffer {

    const headerBuffer = encodeHeaderTypeAndFlags(flags);
    const idBuffer = encodeOriginatorId(id);

    const tagsMetaDataBuffer = encodeAddressFrameTags(addressMetadataTags);
    const tagsAddressBuffer = encodeAddressFrameTags(addressTags);

    return Buffer.concat([headerBuffer, idBuffer, tagsMetaDataBuffer, tagsAddressBuffer]);
}
