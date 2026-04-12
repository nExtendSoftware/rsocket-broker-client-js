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

import { BrowserWebsocketDuplexConnection } from './websocket-duplex-connection.js';

export type BrowserWebSocketFactory = (url: string) => WebSocket;

export interface BrowserWebsocketClientTransportOptions {
  url: string;
  wsCreator: BrowserWebSocketFactory;
}

export class BrowserWebsocketClientTransport implements ClientTransport {
  constructor(private readonly options: BrowserWebsocketClientTransportOptions) {}

  connect(
    multiplexerDemultiplexerFactory: (
      outbound: Outbound & Closeable
    ) => Multiplexer & Demultiplexer & FrameHandler
  ): Promise<DuplexConnection> {
    return new Promise((resolve, reject) => {
      const websocket = this.options.wsCreator(this.options.url);
      websocket.binaryType = 'arraybuffer';

      const openListener = (): void => {
        websocket.removeEventListener('open', openListener);
        websocket.removeEventListener('error', errorListener);
        resolve(
          new BrowserWebsocketDuplexConnection(
            websocket,
            new Deserializer(),
            multiplexerDemultiplexerFactory
          )
        );
      };

      const errorListener = (event: Event & { error?: unknown }): void => {
        websocket.removeEventListener('open', openListener);
        websocket.removeEventListener('error', errorListener);
        reject(event.error ?? new Error('BrowserWebsocketClientTransport: connect failed.'));
      };

      websocket.addEventListener('open', openListener);
      websocket.addEventListener('error', errorListener);
    });
  }
}
