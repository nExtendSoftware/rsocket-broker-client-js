import {
  ClientTransport,
  Closeable,
  Demultiplexer,
  Deserializer,
  DuplexConnection,
  FrameHandler,
  Multiplexer,
  Outbound,
} from 'rsocket-core';

import { WebTransportConnectionOptions } from './connection-properties.js';
import {
  WebTransportBidirectionalStreamLike,
  WebTransportDuplexConnection,
  WebTransportLike,
} from './webtransport-duplex-connection.js';

export type WebTransportFactory = (
  url: string,
  options?: WebTransportConnectionOptions
) => BrowserWebTransportLike;

export interface WebTransportClientOptions {
  url: string;
  transportFactory?: WebTransportFactory;
  options?: WebTransportConnectionOptions;
}

export class WebTransportClientTransport implements ClientTransport {
  private readonly transportFactory: WebTransportFactory;
  private readonly url: string;

  constructor(private readonly options: WebTransportClientOptions) {
    this.url = normalizeWebTransportUrl(options.url);
    this.transportFactory =
      options.transportFactory ?? defaultWebTransportFactory;
  }

  async connect(
    multiplexerDemultiplexerFactory: (
      outbound: Outbound & Closeable
    ) => Multiplexer & Demultiplexer & FrameHandler
  ): Promise<DuplexConnection> {
    const transport = this.transportFactory(this.url, this.options.options);

    try {
      await transport.ready;
      const stream = (await transport.createBidirectionalStream()) as
        | WebTransportBidirectionalStreamLike
        | undefined;

      if (!stream) {
        throw new Error(
          'WebTransportClientTransport: No bidirectional stream was created.'
        );
      }

      return new WebTransportDuplexConnection(
        transport,
        stream,
        new Deserializer(),
        multiplexerDemultiplexerFactory
      );
    } catch (error) {
      try {
        transport.close({ closeCode: 0, reason: 'connect failed' });
      } catch {
        // Ignore shutdown failures after a failed connect.
      }

      throw toError(error);
    }
  }
}

interface WebTransportConstructor {
  new (
    url: string,
    options?: WebTransportConnectionOptions
  ): BrowserWebTransportLike;
}

interface BrowserWebTransportLike extends WebTransportLike {
  readonly ready: Promise<unknown>;
  createBidirectionalStream(): Promise<WebTransportBidirectionalStreamLike>;
}

function defaultWebTransportFactory(
  url: string,
  options?: WebTransportConnectionOptions
): BrowserWebTransportLike {
  const scope = globalThis as typeof globalThis & {
    WebTransport?: WebTransportConstructor;
  };

  if (!scope.WebTransport) {
    throw new Error(
      'No WebTransport implementation is available. Use a browser with native WebTransport support or pass a webTransportFactory.'
    );
  }

  return new scope.WebTransport(url, options) as BrowserWebTransportLike;
}

function normalizeWebTransportUrl(url: string): string {
  if (url.startsWith('wts://')) {
    return `https://${url.slice('wts://'.length)}`;
  }

  return url;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
