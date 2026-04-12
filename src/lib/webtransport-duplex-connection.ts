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
  serializeFrameWithLength,
} from 'rsocket-core';

export interface WebTransportLike {
  readonly closed: Promise<unknown>;
  close(closeInfo?: { closeCode?: number; reason?: string }): void;
}

export interface WebTransportBidirectionalStreamLike {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

export class WebTransportDuplexConnection
  extends Deferred
  implements DuplexConnection, Outbound
{
  private error?: Error;
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  private remainingBuffer: Buffer = Buffer.allocUnsafe(0);

  readonly multiplexerDemultiplexer: Multiplexer & Demultiplexer & FrameHandler;

  constructor(
    private readonly transport: WebTransportLike,
    stream: WebTransportBidirectionalStreamLike,
    private readonly deserializer: Deserializer,
    multiplexerDemultiplexerFactory: (
      outbound: Outbound & Closeable
    ) => Multiplexer & Demultiplexer & FrameHandler
  ) {
    super();

    this.reader = stream.readable.getReader();
    this.writer = stream.writable.getWriter();
    this.multiplexerDemultiplexer = multiplexerDemultiplexerFactory(this);

    void this.readLoop();
    void this.monitorTransportClose();
  }

  get availability(): number {
    return this.done ? 0 : 1;
  }

  override close(error?: Error): void {
    if (this.done) {
      super.close(error);
      return;
    }

    void this.reader.cancel(error?.message).catch(() => undefined);
    void this.writer.abort(error).catch(() => undefined);

    try {
      this.transport.close({
        closeCode: 0,
        reason: sanitizeCloseReason(error?.message),
      });
    } catch {
      // Ignore transport close failures during shutdown.
    }

    super.close(error);
  }

  send(frame: Frame): void {
    if (this.done) {
      return;
    }

    void this.writer
      .write(asUint8Array(serializeFrameWithLength(frame)))
      .catch((error) => this.close(toError(error)));
  }

  private async readLoop(): Promise<void> {
    try {
      while (true) {
        const { done, value } = await this.reader.read();

        if (done) {
          this.handleClosed();
          return;
        }

        if (!value || value.byteLength === 0) {
          continue;
        }

        const chunk = Buffer.from(
          value.buffer,
          value.byteOffset,
          value.byteLength
        );
        const buffer = Buffer.concat([
          asTypedBufferView(this.remainingBuffer),
          asTypedBufferView(chunk),
        ]);
        let lastOffset = 0;

        for (const [frame, offset] of this.deserializer.deserializeFrames(
          buffer
        )) {
          lastOffset = offset;
          this.multiplexerDemultiplexer.handle(frame);
        }

        this.remainingBuffer = buffer.slice(lastOffset);
      }
    } catch (error) {
      this.handleError(toError(error));
    }
  }

  private async monitorTransportClose(): Promise<void> {
    try {
      await this.transport.closed;
      this.handleClosed();
    } catch (error) {
      this.handleError(toError(error));
    }
  }

  private handleClosed(): void {
    if (this.done) {
      return;
    }

    const message = this.error
      ? `WebTransportDuplexConnection: ${this.error.message}`
      : 'WebTransportDuplexConnection: Session closed unexpectedly.';

    this.close(new Error(message));
  }

  private handleError(error: Error): void {
    this.error = error;
    this.close(error);
  }
}

function asUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function asTypedBufferView(buffer: Buffer): Uint8Array {
  return buffer as unknown as Uint8Array;
}

function sanitizeCloseReason(reason?: string): string {
  if (!reason) {
    return 'closed';
  }

  return reason.slice(0, 1024);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
