import { Buffer } from 'buffer';

import {
  Closeable,
  Deferred,
  Demultiplexer,
  Deserializer,
  DuplexConnection,
  Frame,
  FrameHandler,
  Multiplexer,
  Outbound,
  serializeFrame,
} from 'rsocket-core';

export class BrowserWebsocketDuplexConnection
  extends Deferred
  implements DuplexConnection, Outbound
{
  readonly multiplexerDemultiplexer: Multiplexer &
    Demultiplexer &
    FrameHandler;
  private inboundMessages = Promise.resolve();

  constructor(
    private readonly websocket: WebSocket,
    private readonly deserializer: Deserializer,
    multiplexerDemultiplexerFactory: (
      outbound: Outbound & Closeable
    ) => Multiplexer & Demultiplexer & FrameHandler
  ) {
    super();
    this.multiplexerDemultiplexer = multiplexerDemultiplexerFactory(this);
    this.websocket.addEventListener('close', this.handleClosed);
    this.websocket.addEventListener('error', this.handleError);
    this.websocket.addEventListener('message', this.handleMessage);
  }

  get availability(): number {
    return this.done ? 0 : 1;
  }

  override close(error?: Error): void {
    if (this.done) {
      super.close(error);
      return;
    }

    this.websocket.removeEventListener('close', this.handleClosed);
    this.websocket.removeEventListener('error', this.handleError);
    this.websocket.removeEventListener('message', this.handleMessage);

    try {
      this.websocket.close();
    } catch {
      // Ignore shutdown failures during close.
    }

    super.close(error);
  }

  send(frame: Frame): void {
    if (this.done) {
      return;
    }

    const buffer = serializeFrame(frame);
    this.websocket.send(asUint8Array(buffer));
  }

  private readonly handleClosed = (event: CloseEvent): void => {
    this.close(
      new Error(
        event.reason || 'BrowserWebsocketDuplexConnection: Socket closed unexpectedly.'
      )
    );
  };

  private readonly handleError = (): void => {
    this.close(new Error('BrowserWebsocketDuplexConnection: Socket error.'));
  };

  private readonly handleMessage = (message: MessageEvent): void => {
    this.inboundMessages = this.inboundMessages
      .then(async () => {
        const buffer = await toBuffer(message.data);
        const frame = this.deserializer.deserializeFrame(buffer);
        this.multiplexerDemultiplexer.handle(frame);
      })
      .catch((error) => {
        this.close(toError(error));
      });
  };
}

function asUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function toBuffer(payload: unknown): Promise<Buffer> {
  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload);
  }

  if (ArrayBuffer.isView(payload)) {
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  }

  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    return Buffer.from(await payload.arrayBuffer());
  }

  if (typeof payload === 'string') {
    return Buffer.from(payload);
  }

  throw new Error(
    `BrowserWebsocketDuplexConnection: Unsupported message payload ${Object.prototype.toString.call(
      payload
    )}.`
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
