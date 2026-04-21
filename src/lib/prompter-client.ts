// src/lib/prompter-client.ts
import net from 'net';
import fs from 'fs';
import path from 'path';
import { eventBus, EventType } from './event-bus';
import { mosBridge, MosPrompterStory } from './mos-bridge';

// Persist the last rundown across server restarts so auto-resend works
const CACHE_FILE = path.join(process.cwd(), '.prompter-cache.json');

class PrompterClient {
  private server: net.Server | null = null;
  private clientSocket: net.Socket | null = null;   // incoming socket from WinPlus (for roReq handling)
  private connected = false;     // WinPlus has contacted our server at least once
  private listening = false;
  private port: number;          // port we listen on (and WinPlus listens on for push)
  private prompterHost: string;  // WinPlus machine IP (PROMPTER_HOST)
  private ncsId: string;
  private prompterId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activeRundownId: string | null = null;
  private buffer = '';
  private healthLog: Array<{ timestamp: string; event: string; details?: string }> = [];
  private messageCounter = 1;
  private lastRundownData: { id: string, slug: string, stories: MosPrompterStory[] } | null = null;

  constructor() {
    this.port = parseInt(process.env.PROMPTER_PORT || '10541');
    this.prompterHost = process.env.PROMPTER_HOST || '';
    this.ncsId = process.env.MOS_NCS_ID || 'NEWSFORGE';
    this.prompterId = process.env.PROMPTER_MOS_ID || 'PROMPTER';
    this.loadCache();
    this.setupEventListeners();
  }

  /** Load previously cached rundown so auto-resend works after server restarts */
  private loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        if (data.activeRundownId) this.activeRundownId = data.activeRundownId;
        if (data.lastRundownData) this.lastRundownData = data.lastRundownData;
        if (typeof data.messageCounter === 'number') this.messageCounter = data.messageCounter;
        console.log(`[PROMPTER] CACHE_LOADED: Restored ${data.activeRundownId}, msgCount: ${this.messageCounter}`);
      }
    } catch { /* ignore cache read errors */ }
  }

  /** Persist rundown cache so it survives npm run dev restarts */
  private saveCache() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        activeRundownId: this.activeRundownId,
        lastRundownData: this.lastRundownData,
        messageCounter: this.messageCounter,
        savedAt: new Date().toISOString(),
      }));
    } catch { /* ignore cache write errors */ }
  }

  // ==================== SERVER MANAGEMENT ====================

  async startServer(): Promise<{ success: boolean; message: string }> {
    if (this.listening) {
      return { success: true, message: `Already listening on port ${this.port}` };
    }

    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.handleNewConnection(socket);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.log('ERROR', `Port ${this.port} already in use`);
          resolve({ success: false, message: `Port ${this.port} already in use` });
        } else {
          this.log('ERROR', err.message);
          resolve({ success: false, message: err.message });
        }
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.listening = true;
        this.log('SERVER_STARTED', `Listening on port ${this.port} — waiting for WinPlus to connect`);
        resolve({ 
          success: true, 
          message: `MOS Server listening on port ${this.port}. Now click the MOS button in WinPlus.` 
        });
      });
    });
  }

  async stopServer(): Promise<{ success: boolean; message: string }> {
    this.cleanup();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.listening = false;
          this.server = null;
          this.log('SERVER_STOPPED', 'MOS Server stopped');
          resolve({ success: true, message: 'Server stopped' });
        });
      } else {
        resolve({ success: true, message: 'Server was not running' });
      }
    });
  }  // ==================== CONNECTION HANDLING ====================

  private handleNewConnection(socket: net.Socket) {
    const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    this.log('PROMPTER_CONNECTED', `WinPlus connected from ${remoteAddress}`);

    // If there's an existing connection, close it
    if (this.clientSocket) {
      this.log('REPLACING_CONNECTION', 'Closing previous prompter connection');
      this.clientSocket.destroy();
    }

    this.clientSocket = socket;
    this.connected = true;
    this.buffer = '';   // CHANGE 4: Reset buffer on new connection

    this.log('WAITING', 'Waiting for WinPlus to initiate... (Logic V2 Active)');

    socket.on('data', (data) => {
      // CHANGE 1: Log complete inbound data with hex dump
      const str = this.decodeBuffer(data);
      console.log('[PROMPTER] ===== INBOUND RAW START =====');
      console.log(str);
      console.log('[PROMPTER] ===== INBOUND RAW END =====');
      console.log('[PROMPTER] INBOUND LENGTH:', data.length, '  DECODED LENGTH:', str.length);
      console.log('[PROMPTER] INBOUND HEX:', data.toString('hex'));

      // START HEARTBEAT ONLY AFTER FIRST DATA
      if (!this.heartbeatInterval && this.connected) {
        this.startHeartbeat();
      }

      // Sync IDs immediately from raw decoded string
      const mosIdRaw = str.match(/<mosID\s*>([\s\S]+?)<\/mosID\s*>/i);
      const ncsIdRaw = str.match(/<ncsID\s*>([\s\S]+?)<\/ncsID\s*>/i);
      if (mosIdRaw) {
        const id = mosIdRaw[1].replace(/\x00/g, '').trim();
        if (id && id !== this.prompterId) { this.log('ID_SYNC', `mosID: ${id}`); this.prompterId = id; }
      }
      // Sync ncsID if present (WinPlus might send hostname.ip or just hostname)
      const ncsMatch = str.match(/<ncsID>([^<]+)<\/ncsID>/i);
      if (ncsMatch && ncsMatch[1]) {
        const captured = ncsMatch[1].replace(/\x00/g, '').trim();
        // Only sync if captured is LONGER (don't downgrade from NEWSFORGE.IP back to NEWSFORGE)
        if (captured && captured.length > this.ncsId.length) {
          this.log('ID_SYNC', `ncsID updated to: ${captured}`);
          this.ncsId = captured;
        }
      }

      // CHANGE 2: Append decoded string to buffer and process
      this.buffer += str;
      this.processBuffer();
    });

    socket.on('close', () => {
      this.log('PROMPTER_DISCONNECTED', `WinPlus disconnected from ${remoteAddress}`);
      this.connected = false;
      this.clientSocket = null;
      this.stopHeartbeat();
    });

    socket.on('error', (err) => {
      this.log('SOCKET_ERROR', err.message);
      this.connected = false;
      this.clientSocket = null;
      this.stopHeartbeat();
    });
  }

  // ==================== INCOMING DATA (from WinPlus) ====================

  /** 
   * Detect and decode WinPlus buffer — it sends UTF-16 LE (every char has trailing \x00)
   * rawLen=240 for ~120-char messages confirms UTF-16. indexOf fails on raw utf-8 decode.
   */
  private decodeBuffer(data: Buffer): string {
    // Detect encoding from first 2 bytes
    // UTF-16 LE BOM: FF FE
    if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
      return data.slice(2).toString('utf16le');
    }
    // UTF-16 BE BOM: FE FF  
    if (data.length >= 2 && data[0] === 0xFE && data[1] === 0xFF) {
      return this.decodeBEBuffer(data.slice(2));
    }
    // UTF-16 BE without BOM: WinPlus sends 00 3C 00 6D ... (<mos> in big-endian)
    // data[0]=0x00 (high byte of '<'), data[1]=0x3C (low byte of '<')
    if (data.length >= 2 && data[0] === 0x00 && data[1] === 0x3C) {
      return this.decodeBEBuffer(data);
    }
    // UTF-16 LE without BOM: 3C 00 6D 00 ...
    if (data.length >= 2 && data[0] === 0x3C && data[1] === 0x00) {
      return data.toString('utf16le');
    }
    // Default: UTF-8
    return data.toString('utf8');
  }

  /** Manual UTF-16 Big Endian decoder — guaranteed to work, no swap16() needed */
  private decodeBEBuffer(data: Buffer): string {
    let str = '';
    for (let i = 0; i + 1 < data.length; i += 2) {
      const codePoint = (data[i] << 8) | data[i + 1];
      if (codePoint !== 0) {
        str += String.fromCharCode(codePoint);
      }
    }
    return str;
  }


  // CHANGE 2: Proper TCP buffer assembly — handles split and combined messages
  private processBuffer() {
    console.log('[PROMPTER] BUFFER LENGTH:', this.buffer.length);

    while (true) {
      const start = this.buffer.indexOf('<mos>');
      const end   = this.buffer.indexOf('</mos>');

      if (start === -1 || end === -1) {
        console.log('[PROMPTER] No complete message yet, waiting for more data');
        break;
      }

      const msg = this.buffer.substring(start, end + 6);
      this.buffer = this.buffer.substring(end + 6);

      console.log('[PROMPTER] ===== COMPLETE MOS MESSAGE =====');
      console.log(msg);
      console.log('[PROMPTER] ================================');

      this.handleMosMessage(msg);
    }
  }

  // CHANGE 3: Handle ALL possible WinPlus request types
  private handleMosMessage(xml: string) {
    console.log('[PROMPTER] Checking message for known types...');
    const lower = xml.toLowerCase();

    // Log which known types we detect
    const knownTypes = [
      'roreqall', 'rolistall', 'reqrolist', 'roreq',
      'heartbeat', 'listmachinfo', 'reqmachinfo',
      'mosreqall', 'moslistall', 'mosack',
    ];
    for (const t of knownTypes) {
      if (lower.includes(t)) {
        console.log('[PROMPTER] DETECTED MESSAGE TYPE:', t);
      }
    }

    // ── Heartbeat
    if (lower.includes('<heartbeat>')) {
      this.log('HEARTBEAT_REQ', 'Responding to WinPlus heartbeat');
      this.sendHeartbeatResponse();
      return;
    }

    // ── Any rundown list / request
    if (lower.includes('roreqall') || lower.includes('rolistall') ||
        lower.includes('reqrolist') || lower.includes('mosreqall')) {

      if (this.activeRundownId || this.lastRundownData) {
        // We have a rundown — announce it and send it
        this.log('DISCOVERY', `roReqAll received — sending roListAll + cached content`);
        const roId = this.activeRundownId || this.lastRundownData?.id;
        const roIdEntry = roId ? `<roID>${roId}</roID>` : '';
        const listAll = `<?xml version="1.0" encoding="UTF-8"?>\n<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><messageID>${this.messageCounter++}</messageID><roListAll>${roIdEntry}</roListAll></mos>`;
        this.sendRaw(listAll);
        
        if (this.lastRundownData) {
          this.log('AUTO_RESEND', `Regenerating and sending rundown ${this.lastRundownData.id}`);
          this.sendRundown(this.lastRundownData.id, this.lastRundownData.slug, this.lastRundownData.stories);
        }
      } else {
        // No rundown yet — wait silently. Sending empty roListAll confuses WinPlus.
        this.log('DISCOVERY', 'roReqAll received — no rundown yet, waiting for user to send one');
      }
      return;
    }

    // ── Specific rundown request
    if (lower.includes('roreq')) {
      this.log('RO_REQUEST', 'WinPlus requested a specific rundown');
      if (this.lastRundownData) {
        this.log('AUTO_RESEND', 'Re-sending cached rundown in response to roReq');
        this.sendRundown(this.lastRundownData.id, this.lastRundownData.slug, this.lastRundownData.stories);
      }
      return;
    }

    // ── Machine info request
    if (lower.includes('machinfo') || lower.includes('machinf')) {
      this.log('MACHINFO', 'WinPlus requesting machine info — ignoring (not implemented)');
      return;
    }

    // ── ACK
    if (lower.includes('mosack')) {
      this.log('ACK', 'Message acknowledged by WinPlus');
      return;
    }

    this.log('UNHANDLED', `Unknown message (${xml.length} bytes) — see terminal for full XML`);
  }

  // ==================== SENDING DATA (to WinPlus) ====================

  /**
   * Encodes string to UTF-16 Big Endian (required by WinPlus Unicode)
   */
  private toBEBuffer(str: string): Buffer {
    const buf = Buffer.from(str, 'utf16le');
    for (let i = 0; i < buf.length; i += 2) {
      const b1 = buf[i];
      const b2 = buf[i + 1];
      buf[i] = b2;
      buf[i + 1] = b1;
    }
    return buf;
  }

  private sendRaw(xml: string): boolean {
    if (!this.clientSocket) {
      this.log('SEND_ERROR', 'No active connection');
      return false;
    }

    try {
      // Use UTF-16 BE for all outgoing data as per WinPlus requirements
      const buf = this.toBEBuffer(xml);
      this.clientSocket.write(buf);
      
      // Log for debugging (first 100 chars)
      const cleanLog = xml.replace(/\s+/g, ' ').substring(0, 100);
      this.log('SENT', cleanLog + (xml.length > 100 ? '...' : ''));
      this.saveCache(); // Persist messageCounter increment
      return true;
    } catch (err) {
      this.log('SEND_ERROR', String(err));
      return false;
    }
  }

  /**
   * Opens a short-lived TCP connection TO WinPlus (push model).
   *
   * Per WinPlus docs: "WinPlus will LISTEN on this port for MOS messages from NCSs."
   * We (NCS) are the CLIENT. We connect to WinPlus:PROMPTER_PORT, push all messages,
   * then close. This is the correct push architecture for roCreate + roStorySend.
   */
  private pushToWinPlus(xmlMessages: string[]): Promise<boolean> {
    if (!this.prompterHost) {
      this.log('PUSH_ERROR', 'PROMPTER_HOST is not set in .env');
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(15000);

      let done = false;
      const finish = (success: boolean) => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch {}
        resolve(success);
      };

      socket.on('error', (err) => {
        this.log('PUSH_ERROR', `Cannot reach WinPlus at ${this.prompterHost}:${this.port} — ${err.message}`);
        finish(false);
      });

      socket.on('timeout', () => {
        this.log('PUSH_TIMEOUT', `Connection to WinPlus timed out`);
        finish(false);
      });

      // WinPlus closing the connection means it processed our messages
      socket.on('close', () => finish(true));

      // Log any ACK/response from WinPlus
      let inBuffer = '';
      socket.on('data', (data) => {
        inBuffer += this.decodeBuffer(data);
        this.log('PUSH_RECV', inBuffer.substring(0, 120));
        inBuffer = '';
      });

      socket.connect(this.port, this.prompterHost, async () => {
        this.log('PUSH_CONNECTED', `Connected to WinPlus at ${this.prompterHost}:${this.port}`);
        try {
          for (let i = 0; i < xmlMessages.length; i++) {
            const buf = this.toBEBuffer(xmlMessages[i]);
            // Use write with callback to ensure data is flushed before proceeding
            await new Promise<void>((res, rej) =>
              socket.write(buf, (err) => err ? rej(err) : res())
            );
            const preview = xmlMessages[i].replace(/\s+/g, ' ').substring(0, 100);
            this.log('PUSH_SENT', preview + (xmlMessages[i].length > 100 ? '...' : ''));
            this.saveCache();

            // Small gap between messages so WinPlus can parse each one sequentially.
            // roCreate must be processed BEFORE roStorySend to avoid "Message Hold Off" discard.
            if (i === 0 && xmlMessages.length > 1) {
              await new Promise(r => setTimeout(r, 600)); // longer gap after roCreate
            } else if (i < xmlMessages.length - 1) {
              await new Promise(r => setTimeout(r, 80));  // between roStorySend messages
            }
          }
          // Give WinPlus time to send ACK before we close
          await new Promise(r => setTimeout(r, 1000));
          finish(true);
        } catch (err) {
          this.log('PUSH_WRITE_ERROR', String(err));
          finish(false);
        }
      });
    });
  }

  async sendRundown(
    rundownId: string,
    rundownSlug: string,
    stories: MosPrompterStory[]
  ): Promise<boolean> {
    if (!this.prompterHost) {
      this.log('SEND_FAILED', 'PROMPTER_HOST not configured in .env');
      return false;
    }

    this.activeRundownId = rundownId;

    // Build all messages upfront
    const messages: string[] = [];

    // Message 1: roCreate — blank skeleton (WinPlus docs: "creates a blank entry for each story")
    messages.push(mosBridge.buildPrompterRoCreate(
      rundownId, rundownSlug, stories,
      this.ncsId, this.prompterId, this.messageCounter++
    ));

    // Messages 2..N+1: roStorySend per story (flat MOS 2.8.4 format)
    for (let i = 0; i < stories.length; i++) {
      messages.push(mosBridge.buildPrompterRoStorySend(
        rundownId, stories[i], i + 1,
        this.ncsId, this.prompterId, this.messageCounter++
      ));
    }

    this.log('PUSH_START', `Pushing "${rundownSlug}" to WinPlus (${stories.length} stories)`);

    // PUSH to WinPlus — we connect TO WinPlus:10541 as a client
    const success = await this.pushToWinPlus(messages);

    if (success) {
      this.lastRundownData = { id: rundownId, slug: rundownSlug, stories };
      this.log('RUNDOWN_SENT', `Pushed "${rundownSlug}" — ${stories.length} stories to WinPlus`);
    } else {
      this.log('RUNDOWN_FAILED', `Failed to push "${rundownSlug}" to WinPlus`);
    }
    return success;
  }

  async sendStoryUpdate(rundownId: string, story: MosPrompterStory): Promise<boolean> {
    const xml = mosBridge.buildPrompterStoryReplace(
      rundownId, story, this.ncsId, this.prompterId, this.messageCounter++
    );
    return this.pushToWinPlus([xml]);
  }

  async sendStoryDelete(rundownId: string, storyId: string): Promise<boolean> {
    const xml = mosBridge.buildPrompterStoryDelete(
      rundownId, storyId, this.ncsId, this.prompterId, this.messageCounter++
    );
    return this.pushToWinPlus([xml]);
  }

  async sendStoryInsert(rundownId: string, afterStoryId: string, story: MosPrompterStory): Promise<boolean> {
    const xml = mosBridge.buildPrompterStoryInsert(
      rundownId, afterStoryId, story, this.ncsId, this.prompterId, this.messageCounter++
    );
    return this.pushToWinPlus([xml]);
  }

  // ==================== HEARTBEAT ====================

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
    if (this.connected) {
      const heartbeat = `<?xml version="1.0" encoding="UTF-8"?>\n<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><messageID>${this.messageCounter++}</messageID><heartbeat></heartbeat></mos>`;
      this.sendRaw(heartbeat);
    }
  }, 10000);
}

private stopHeartbeat() {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }
}

private sendHeartbeatResponse() {
  const response = `<?xml version="1.0" encoding="UTF-8"?>\n<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><messageID>${this.messageCounter++}</messageID><heartbeat></heartbeat></mos>`;
  this.sendRaw(response);
}

  // ==================== EVENT LISTENERS ====================

  private setupEventListeners() {
    eventBus.on(EventType.STORY_UPDATED, async (payload: any) => {
      if (!this.connected || !this.activeRundownId) return;
      this.log('EVENT', `Story updated: ${payload.storyId}`);
      // Handle incremental update
    });

    eventBus.on(EventType.STORY_DELETED, async (payload: any) => {
      if (!this.connected || !this.activeRundownId) return;
      await this.sendStoryDelete(this.activeRundownId, payload.storyId);
    });

    eventBus.on(EventType.STORY_CREATED, async (payload: any) => {
      if (!this.connected || !this.activeRundownId) return;
      this.log('EVENT', `Story created: ${payload.storyId}`);
    });
  }

  // ==================== STATUS & LOGGING ====================

  private log(event: string, details?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
    };
    this.healthLog.push(entry);
    if (this.healthLog.length > 200) this.healthLog.shift();
    console.log(`[PROMPTER] ${event}: ${details || ''}`);
  }

  isConnected(): boolean {
    // With push model, we can send to WinPlus as long as PROMPTER_HOST is configured.
    // The server being active (WinPlus connected to us) is a bonus for pull/auto-resend.
    return !!this.prompterHost;
  }

  getStatus() {
    return {
      listening: this.listening,
      connected: this.connected,
      port: this.port,
      activeRundownId: this.activeRundownId,
      ncsId: this.ncsId,
      prompterId: this.prompterId,
      healthLog: this.healthLog.slice(-50),
    };
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.clientSocket) {
      this.clientSocket.destroy();
      this.clientSocket = null;
    }
    this.connected = false;
  }
}

const globalForPrompter = globalThis as unknown as { prompterClient: PrompterClient };
export const prompterClient = globalForPrompter.prompterClient || new PrompterClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrompter.prompterClient = prompterClient;
}

export default prompterClient;
