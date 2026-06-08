class MockMessageEvent extends Event {
  data: string;

  constructor(data: string) {
    super('message');
    this.data = data;
  }
}

class MockWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  readyState = MockWebSocket.CONNECTING;
  url: string;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MockMessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string | URL) {
    super();
    this.url = String(url);

    window.setTimeout(() => {
      if (this.readyState !== MockWebSocket.CONNECTING) return;
      this.readyState = MockWebSocket.OPEN;
      const openEvent = new Event('open');
      this.onopen?.(openEvent);
      this.dispatchEvent(openEvent);
      this.emitPrototypeMessages();
    }, 80);
  }

  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.emitPrototypeMessages();
  }

  close(_code?: number, _reason?: string) {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code: 1000, reason: 'mock websocket closed' });
    this.onclose?.(closeEvent);
    this.dispatchEvent(closeEvent);
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    super.addEventListener(type, callback, options);
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    super.removeEventListener(type, callback, options);
  }

  private emit(data: Record<string, unknown>) {
    if (this.readyState !== MockWebSocket.OPEN) return;
    const event = new MockMessageEvent(JSON.stringify(data));
    this.onmessage?.(event);
    this.dispatchEvent(event);
  }

  private emitPrototypeMessages() {
    window.setTimeout(() => {
      this.emit({
        type: 'REPORT_STATUS',
        reportStatus: '3',
        summaryStatus: '3',
        fileStatus: '3',
        percent: 100,
      });
      this.emit({
        event: 'DEAL_FILE_PROGRESS',
        data: {
          fileStatus: '3',
          percent: 100,
        },
      });
    }, 180);
  }
}

let installed = false;

export const installMockRuntime = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  (window as any).__XIAOLI_MOCK_MODE__ = true;
  window.WebSocket = MockWebSocket as any;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return originalFetch(input, init);
    }

    if (url.includes('/mock-report') || url.includes('/mock-auth') || url.includes('/report') || url.includes('/api/iam') || url.includes('/token')) {
      return new Response(JSON.stringify({ success: true, data: true, message: 'mock fetch ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
};
