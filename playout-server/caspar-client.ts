import net from 'net';

export interface CasparResponse {
  code: number;
  message: string;
  data?: string;
}

export interface CasparChannelInfo {
  playing: boolean;
  paused: boolean;
  foreground: string;
  background: string;
  loop: boolean;
  clipName: string;
  totalFrames: number;
  currentFrame: number;
  fps: number;
  timecode: string;
}

class CasparClient {
  private socket: net.Socket | null = null;
  private _connected = false;
  private host: string;
  private port: number;
  private responseBuffer = '';
  private pendingResolve: ((res: CasparResponse) => void) | null = null;

  constructor() {
    this.host = process.env.CASPAR_HOST || '192.168.1.232';
    this.port = parseInt(process.env.CASPAR_PORT || '5250', 10);
  }

  isConnected(): boolean {
    return this._connected;
  }

  getHost(): string {
    return `${this.host}:${this.port}`;
  }

  async connect(host?: string, port?: number): Promise<CasparResponse> {
    if (host) this.host = host;
    if (port) this.port = port;

    if (this._connected && this.socket) {
      return { code: 200, message: `Already connected to ${this.host}:${this.port}` };
    }

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setTimeout(5000);

      this.socket.connect(this.port, this.host, () => {
        this._connected = true;
        console.log(`[CasparCG] Connected to ${this.host}:${this.port}`);
        resolve({ code: 200, message: `Connected to ${this.host}:${this.port}` });
      });

      this.socket.on('data', (data: Buffer) => {
        this.responseBuffer += data.toString();
        this.processBuffer();
      });

      this.socket.on('close', () => {
        console.log('[CasparCG] Connection closed');
        this._connected = false;
        this.socket = null;
      });

      this.socket.on('error', (err: Error) => {
        console.error('[CasparCG] Socket error:', err.message);
        this._connected = false;
        this.socket = null;
        reject({ code: 500, message: err.message });
      });

      this.socket.on('timeout', () => {
        console.error('[CasparCG] Connection timeout');
        this.socket?.destroy();
        reject({ code: 408, message: 'Connection timeout' });
      });
    });
  }

  async disconnect(): Promise<CasparResponse> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this._connected = false;
    return { code: 200, message: 'Disconnected' };
  }

  private processBuffer(): void {
    const lines = this.responseBuffer.split('\r\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];

      if (/^\d{3}\s/.test(line)) {
        const code = parseInt(line.substring(0, 3), 10);
        const message = line.substring(4);

        if (code >= 200 && code < 300 && lines[i + 1] && !/^\d{3}\s/.test(lines[i + 1])) {
          let dataLines: string[] = [];
          let j = i + 1;
          while (j < lines.length - 1 && !/^\d{3}\s/.test(lines[j])) {
            dataLines.push(lines[j]);
            j++;
          }
          if (this.pendingResolve) {
            this.pendingResolve({ code, message, data: dataLines.join('\n') });
            this.pendingResolve = null;
          }
          i = j - 1;
        } else {
          if (this.pendingResolve) {
            this.pendingResolve({ code, message });
            this.pendingResolve = null;
          }
        }
      }
    }

    this.responseBuffer = lines[lines.length - 1];
  }

  private async send(command: string): Promise<CasparResponse> {
    if (!this._connected || !this.socket) {
      throw new Error('Not connected to CasparCG');
    }

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;

      setTimeout(() => {
        if (this.pendingResolve === resolve) {
          this.pendingResolve = null;
          resolve({ code: 408, message: 'Command timeout' });
        }
      }, 5000);

      this.socket!.write(command + '\r\n', (err) => {
        if (err) {
          this.pendingResolve = null;
          reject({ code: 500, message: err.message });
        }
      });

      console.log(`[CasparCG] >> ${command}`);
    });
  }

  // Helper: strip file extension for CasparCG
  private stripExtension(clip: string): string {
    return clip.replace(/\.(mp4|mxf|mov|avi|mkv|mpg|mpeg|ts|webm)$/i, '');
  }

  // ── Transport Commands ──────────────────────────────────

  async play(channel: number, layer: number, clip: string): Promise<CasparResponse> {
    return this.send(`PLAY ${channel}-${layer} "${this.stripExtension(clip)}"`);
  }

  async playLoop(channel: number, layer: number, clip: string): Promise<CasparResponse> {
    return this.send(`PLAY ${channel}-${layer} "${this.stripExtension(clip)}" LOOP`);
  }

  async playAuto(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`PLAY ${channel}-${layer}`);
  }

  async stop(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`STOP ${channel}-${layer}`);
  }

  async pause(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`PAUSE ${channel}-${layer}`);
  }

  async resume(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`RESUME ${channel}-${layer}`);
  }

  async clear(channel: number, layer?: number): Promise<CasparResponse> {
    const target = layer ? `${channel}-${layer}` : `${channel}`;
    return this.send(`CLEAR ${target}`);
  }

  async loadBG(channel: number, layer: number, clip: string, auto: boolean = false): Promise<CasparResponse> {
    const autoFlag = auto ? ' AUTO' : '';
    return this.send(`LOADBG ${channel}-${layer} "${this.stripExtension(clip)}"${autoFlag}`);
  }

  async load(channel: number, layer: number, clip: string): Promise<CasparResponse> {
    return this.send(`LOAD ${channel}-${layer} "${this.stripExtension(clip)}"`);
  }

  // ── Query Commands ──────────────────────────────────────

  async info(channel: number, layer: number): Promise<CasparResponse> {
    return this.send(`INFO ${channel}-${layer}`);
  }

  async listMedia(): Promise<CasparResponse> {
    return this.send('CLS');
  }

  async version(): Promise<CasparResponse> {
    return this.send('VERSION');
  }

  // ── Parse Helpers ───────────────────────────────────────

  parseInfoToChannelInfo(raw: CasparResponse): CasparChannelInfo {
    const defaults: CasparChannelInfo = {
      playing: false, paused: false, foreground: '', background: '',
      loop: false, clipName: '', totalFrames: 0, currentFrame: 0,
      fps: 25, timecode: '00:00:00:00',
    };

    const data = raw.data;
    if (!data) return defaults;

    try {
      const playing = data.includes('<status>playing</status>');
      const paused = data.includes('<status>paused</status>');
      const fgMatch = data.match(/<foreground>[\s\S]*?<filename>(.*?)<\/filename>[\s\S]*?<\/foreground>/);
      const bgMatch = data.match(/<background>[\s\S]*?<filename>(.*?)<\/filename>[\s\S]*?<\/background>/);
      const loopMatch = data.match(/<loop>(true|false)<\/loop>/);
      const frameMatch = data.match(/<frame>(\d+)<\/frame>/);
      const totalMatch = data.match(/<nb-frames>(\d+)<\/nb-frames>/);
      const fpsMatch = data.match(/<framerate>(\d+)<\/framerate>/);

      const clipName = fgMatch?.[1] || '';
      const currentFrame = parseInt(frameMatch?.[1] || '0', 10);
      const totalFrames = parseInt(totalMatch?.[1] || '0', 10);
      const fps = parseInt(fpsMatch?.[1] || '25', 10);

      const totalSeconds = fps > 0 ? Math.floor(currentFrame / fps) : 0;
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      const f = String(currentFrame % fps).padStart(2, '0');

      return {
        playing, paused,
        foreground: fgMatch?.[1] || '',
        background: bgMatch?.[1] || '',
        loop: loopMatch?.[1] === 'true',
        clipName,
        totalFrames,
        currentFrame,
        fps,
        timecode: `${h}:${m}:${s}:${f}`,
      };
    } catch {
      return defaults;
    }
  }

  parseMediaList(raw: CasparResponse): Array<{ name: string; type: string; duration: string }> {
    const data = raw.data;
    if (!data) return [];
    const lines = data.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const name = parts[0]?.replace(/^"|"$/g, '') || '';
      const type = parts[1] || 'MOVIE';
      const duration = parts[2] || '00:00:00:00';
      return { name, type, duration };
    });
  }
}

export const casparClient = new CasparClient();
export default casparClient;
