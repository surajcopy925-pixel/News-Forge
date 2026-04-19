import net from 'net';

interface CasparResponse {
  code: number;
  message: string;
  data?: string;
}

class CasparClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private host: string;
  private port: number;
  private responseBuffer = '';
  private pendingResolve: ((value: CasparResponse) => void) | null = null;
  private pendingReject: ((reason: Error) => void) | null = null;
  private pendingTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.host = process.env.CASPAR_HOST || 'localhost';
    this.port = parseInt(process.env.CASPAR_PORT || '5250', 10);
  }

  async connect(): Promise<CasparResponse> {
    if (this.connected && this.socket) {
      return { code: 200, message: 'Already connected' };
    }

    // Clean up old socket
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
      this.socket = null;
    }
    this.connected = false;
    this.clearPending();

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      const timeout = setTimeout(() => {
        this.socket?.destroy();
        this.socket = null;
        reject(new Error('Connection timeout (5s)'));
      }, 5000);

      this.socket.connect(this.port, this.host, () => {
        clearTimeout(timeout);
        this.connected = true;
        this.responseBuffer = '';
        console.log(`[CasparClient] Connected to ${this.host}:${this.port}`);
        resolve({ code: 200, message: `Connected to ${this.host}:${this.port}` });
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data.toString());
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.socket = null;
        console.log('[CasparClient] Connection closed');
        this.rejectPending('Connection closed');
      });

      this.socket.on('error', (err: Error) => {
        clearTimeout(timeout);
        this.connected = false;
        console.error('[CasparClient] Socket error:', err.message);
        this.rejectPending(err.message);
        reject(err);
      });
    });
  }

  disconnect(): void {
    this.clearPending();
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
      this.socket = null;
    }
    this.connected = false;
    console.log('[CasparClient] Disconnected');
  }

  private clearPending(): void {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  private rejectPending(msg: string): void {
    if (this.pendingReject) {
      const reject = this.pendingReject;
      this.clearPending();
      reject(new Error(msg));
    }
  }

  async send(command: string): Promise<CasparResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to CasparCG');
    }

    // If there's already a pending command, reject it
    if (this.pendingResolve) {
      this.rejectPending('Command overridden by: ' + command);
    }

    return new Promise((resolve, reject) => {
      this.responseBuffer = '';

      this.pendingTimeout = setTimeout(() => {
        console.warn(`[CasparClient] Command timeout: ${command}`);
        this.pendingResolve = null;
        this.pendingReject = null;
        this.pendingTimeout = null;
        reject(new Error(`Timeout: ${command}`));
      }, 5000);

      this.pendingResolve = (resp: CasparResponse) => {
        if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
        this.pendingTimeout = null;
        this.pendingResolve = null;
        this.pendingReject = null;
        resolve(resp);
      };

      this.pendingReject = (err: Error) => {
        if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
        this.pendingTimeout = null;
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(err);
      };

      console.log(`[CasparClient] >>> ${command}`);
      this.socket!.write(command + '\r\n');
    });
  }

  private handleData(data: string): void {
    this.responseBuffer += data;

    const lines = this.responseBuffer.split('\r\n');
    if (lines.length < 2) return;

    const firstLine = lines[0];
    const codeMatch = firstLine.match(/^(\d{3})\s*(.*)/);
    if (!codeMatch) return;

    const code = parseInt(codeMatch[1], 10);
    const message = codeMatch[2] || '';
    let responseData: string | undefined;

    if (code === 200 || code === 201) {
      const endIndex = this.responseBuffer.indexOf('\r\n\r\n');
      if (endIndex === -1) return; // Wait for more data
      responseData = this.responseBuffer
        .substring(firstLine.length + 2, endIndex)
        .trim();
      this.responseBuffer = this.responseBuffer.substring(endIndex + 4);
    } else {
      this.responseBuffer = lines.slice(1).join('\r\n');
    }

    const response: CasparResponse = { code, message, data: responseData };
    console.log(`[CasparClient] <<< ${code} ${message}`);

    if (this.pendingResolve) {
      this.pendingResolve(response);
    }
  }

  async play(channel: number, layer: number, clip: string): Promise<CasparResponse> {
    return this.send(`PLAY ${channel}-${layer} "${clip}"`);
  }

  async loadBg(channel: number, layer: number, clip: string, auto = false): Promise<CasparResponse> {
    const autoFlag = auto ? ' AUTO' : '';
    return this.send(`LOADBG ${channel}-${layer} "${clip}"${autoFlag}`);
  }

  async stop(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`STOP ${channel}-${layer}`);
  }

  async clear(channel: number, layer?: number): Promise<CasparResponse> {
    const target = layer ? `${channel}-${layer}` : `${channel}`;
    return this.send(`CLEAR ${target}`);
  }

  async pause(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`PAUSE ${channel}-${layer}`);
  }

  async resume(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`RESUME ${channel}-${layer}`);
  }

  async info(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`INFO ${channel}-${layer}`);
  }

  async cls(): Promise<CasparResponse> {
    return this.send('CLS');
  }

  async version(): Promise<CasparResponse> {
    return this.send('VERSION');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus() {
    return {
      connected: this.connected,
      host: this.host,
      port: this.port,
    };
  }
}

const globalForCaspar = globalThis as unknown as {
  casparClient: CasparClient | undefined;
};

export const casparClient =
  globalForCaspar.casparClient ?? new CasparClient();

if (process.env.NODE_ENV !== 'production') {
  globalForCaspar.casparClient = casparClient;
}

export default casparClient;
