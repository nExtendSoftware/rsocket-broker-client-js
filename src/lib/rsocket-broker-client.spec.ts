import { Buffer } from 'buffer';
import { of } from 'rxjs';

import { RxRequestersFactory } from 'rsocket-adapter-rxjs';
import {
  encodeAndAddCustomMetadata,
  encodeBearerAuthMetadata,
  encodeCompositeMetadata,
  encodeRoute,
  WellKnownMimeType,
} from 'rsocket-composite-metadata';
import { ClientTransport, ConnectorConfig, RSocket } from 'rsocket-core';
import { describe, expect, it, vi } from 'vitest';

import { encodeBrokerAddress } from './broker-address-metadata';
import {
  BrokerClientId,
  hexStrToBigInt,
  uuidStrToSigBits,
} from './broker-client-id';
import { encodeBrokerRouteSetup } from './broker-route-setup-metadata';
import {
  DEFAULT_REQUEST_CHANNEL_PREFETCH,
  DEFAULT_KEEP_ALIVE,
  DEFAULT_LIFETIME,
  DEFAULT_REQUEST_STREAM_PREFETCH,
  RsocketBrokerClient,
  StringCodec,
} from './rsocket-broker-client';
import { Tags } from './tags';

import MESSAGE_RSOCKET_AUTHENTICATION = WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION;
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;

function createTags(entries: Array<[number, string]> = []): Tags {
  const tags = new Tags();

  entries.forEach(([key, value]) => tags.set(key, value));

  return tags;
}

describe('RsocketBrokerClient', () => {
  it('adds authentication, route and broker metadata', () => {
    const client = new RsocketBrokerClient();
    const brokerClientId = new BrokerClientId(
      '11223344-5566-7788-99aa-bbccddeeff00'
    );
    const addressMetadataTags = createTags([[1, 'region=eu']]);
    const addressTags = createTags([[2, 'service=test']]);

    const metadata = client.addMetadata(
      'token-123',
      brokerClientId,
      'orders.create',
      addressMetadataTags,
      addressTags,
      0x80
    );

    expect(metadata.get(MESSAGE_RSOCKET_AUTHENTICATION)).toEqual(
      encodeBearerAuthMetadata('token-123')
    );
    expect(metadata.get(MESSAGE_RSOCKET_ROUTING)).toEqual(
      encodeRoute('orders.create')
    );
    expect(metadata.get('message/x.rsocket.broker.frame.v0')).toEqual(
      encodeBrokerAddress(
        brokerClientId,
        addressMetadataTags,
        addressTags,
        0x80
      )
    );
  });

  it('omits optional auth and route metadata when not provided', () => {
    const client = new RsocketBrokerClient();
    const metadata = client.addMetadata(
      '',
      new BrokerClientId('11223344-5566-7788-99aa-bbccddeeff00'),
      '',
      new Tags(),
      new Tags(),
      0
    );

    expect(metadata.has(MESSAGE_RSOCKET_AUTHENTICATION)).toBe(false);
    expect(metadata.has(MESSAGE_RSOCKET_ROUTING)).toBe(false);
    expect(metadata.has('message/x.rsocket.broker.frame.v0')).toBe(true);
  });

  it('builds connector config with defaults and encoded setup metadata', async () => {
    const connectionTags = createTags([[7, 'env=test']]);
    const brokerClientId = new BrokerClientId(
      '11223344-5566-7788-99aa-bbccddeeff00'
    );
    const fakeSocket = { close: vi.fn() } as unknown as RSocket;
    const fakeTransport = { connect: vi.fn() } as unknown as ClientTransport;
    let capturedConfig: ConnectorConfig | undefined;

    const client = new RsocketBrokerClient({
      createConnector: (config) => {
        capturedConfig = config;
        return {
          connect: vi.fn().mockResolvedValue(fakeSocket),
        };
      },
      createTransport: () => fakeTransport,
    });

    const result = await client.connect({
      token: 'token-123',
      brokerUrl: 'ws://localhost:7171',
      brokerClientId,
      brokerClientName: 'test-client',
      connectionTags,
    });

    const expectedMetadata = encodeAndAddCustomMetadata(
      encodeCompositeMetadata(
        new Map([
          [
            MESSAGE_RSOCKET_AUTHENTICATION,
            encodeBearerAuthMetadata('token-123'),
          ],
        ])
      ),
      'message/x.rsocket.broker.frame.v0',
      encodeBrokerRouteSetup(brokerClientId, 'test-client', connectionTags)
    );

    expect(result).toBe(fakeSocket);
    expect(capturedConfig?.transport).toBe(fakeTransport);
    expect(capturedConfig?.setup?.keepAlive).toBe(DEFAULT_KEEP_ALIVE);
    expect(capturedConfig?.setup?.lifetime).toBe(DEFAULT_LIFETIME);
    expect(capturedConfig?.setup?.dataMimeType).toBe('application/json');
    expect(capturedConfig?.setup?.metadataMimeType).toBe(
      WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA.string
    );
    expect(capturedConfig?.setup?.payload?.data).toEqual(Buffer.alloc(0));
    expect(capturedConfig?.setup?.payload?.metadata).toEqual(expectedMetadata);
  });

  it('delegates fire-and-forget requests to the RSocket requester factory', () => {
    const client = new RsocketBrokerClient();
    const metadata = new Map();
    const rsocket = { close: vi.fn() } as unknown as RSocket;
    const request = vi.fn().mockReturnValue('fnf-result');

    vi.spyOn(RxRequestersFactory, 'fireAndForget').mockReturnValue(
      request as never
    );

    const result = client.fireAndForget(rsocket, 'payload', metadata);

    expect(RxRequestersFactory.fireAndForget).toHaveBeenCalledWith(
      'payload',
      client.stringCodec
    );
    expect(request).toHaveBeenCalledWith(rsocket, metadata);
    expect(result).toBe('fnf-result');
  });

  it('delegates request-response requests to the RSocket requester factory', () => {
    const client = new RsocketBrokerClient();
    const metadata = new Map();
    const rsocket = { close: vi.fn() } as unknown as RSocket;
    const request = vi.fn().mockReturnValue('rr-result');

    vi.spyOn(RxRequestersFactory, 'requestResponse').mockReturnValue(
      request as never
    );

    const result = client.requestResponse(rsocket, 'payload', metadata);

    expect(RxRequestersFactory.requestResponse).toHaveBeenCalledWith(
      'payload',
      client.stringCodec,
      client.stringCodec
    );
    expect(request).toHaveBeenCalledWith(rsocket, metadata);
    expect(result).toBe('rr-result');
  });

  it('delegates request-stream requests to the RSocket requester factory', () => {
    const client = new RsocketBrokerClient();
    const metadata = new Map();
    const rsocket = { close: vi.fn() } as unknown as RSocket;
    const request = vi.fn().mockReturnValue('stream-result');

    vi.spyOn(RxRequestersFactory, 'requestStream').mockReturnValue(
      request as never
    );

    const result = client.requestStream(rsocket, 'payload', metadata);

    expect(RxRequestersFactory.requestStream).toHaveBeenCalledWith(
      'payload',
      client.stringCodec,
      client.stringCodec,
      DEFAULT_REQUEST_STREAM_PREFETCH
    );
    expect(request).toHaveBeenCalledWith(rsocket, metadata);
    expect(result).toBe('stream-result');
  });

  it('delegates request-channel requests to the RSocket requester factory', () => {
    const client = new RsocketBrokerClient();
    const payload = of('payload');
    const metadata = new Map();
    const rsocket = { close: vi.fn() } as unknown as RSocket;
    const request = vi.fn().mockReturnValue('channel-result');

    vi.spyOn(RxRequestersFactory, 'requestChannel').mockReturnValue(
      request as never
    );

    const result = client.requestChannel(rsocket, payload, metadata);

    expect(RxRequestersFactory.requestChannel).toHaveBeenCalledWith(
      payload,
      client.stringCodec,
      client.stringCodec,
      DEFAULT_REQUEST_CHANNEL_PREFETCH,
      expect.anything()
    );
    expect(request).toHaveBeenCalledWith(rsocket, metadata);
    expect(result).toBe('channel-result');
  });

  it('encodes broker client ids without precision loss', () => {
    const bits = uuidStrToSigBits('ffffffff-ffff-ffff-ffff-ffffffffffff');

    expect(bits.msb).toBe(0xffffffffffffffffn);
    expect(bits.lsb).toBe(0xffffffffffffffffn);
    expect(hexStrToBigInt('ffffffffffffffff')).toBe(0xffffffffffffffffn);
  });

  it('encodes broker setup metadata with header, service name and tags', () => {
    const brokerClientId = new BrokerClientId(
      '11223344-5566-7788-99aa-bbccddeeff00'
    );
    const tags = createTags([[9, 'zone=west']]);

    const metadata = encodeBrokerRouteSetup(brokerClientId, 'orders', tags);

    expect(metadata.subarray(0, 6)).toEqual(
      Buffer.from([0x00, 0x00, 0x1c, 0x01, 0x04, 0x00])
    );
    expect(metadata.subarray(6, 22)).toEqual(
      Buffer.from([
        0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc,
        0xdd, 0xee, 0xff, 0x00,
      ])
    );
    expect(metadata.subarray(22, 29)).toEqual(
      Buffer.from([6, ...Buffer.from('orders')])
    );
    expect(metadata.subarray(29)).toEqual(
      Buffer.from([9, 9, ...Buffer.from('zone=west')])
    );
  });
});

describe('StringCodec', () => {
  it('round-trips strings as buffers', () => {
    const codec = new StringCodec();
    const encoded = codec.encode('payload');

    expect(codec.mimeType).toBe('application/json');
    expect(encoded).toEqual(Buffer.from('payload'));
    expect(codec.decode(encoded)).toBe('payload');
  });
});
