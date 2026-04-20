// src/lib/prompter-client.ts
import net from 'net';
import { eventBus, EventType } from './event-bus';
import { mosBridge, MosPrompterStory } from './mos-bridge';

class PrompterClient {
  private server: net.Server | null = null;
  private clientSocket: net.Socket | null = null;
  private connected = false;
  private listening = false;
  private port: number;
  private ncsId: string;
  private prompterId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activeRundownId: string | null = null;
  private buffer = '';
  private healthLog: Array<{ timestamp: string; event: string; details?: string }> = [];

  constructor() {
    this.port = parseInt(process.env.PROMPTER_PORT || '10541');
    this.ncsId = process.env.MOS_NCS_ID || 'NEWSFORGE';
    this.prompterId = process.env.PROMPTER_MOS_ID || 'PROMPTER';
    this.setupEventListeners();
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
  }

  // ==================== CONNECTION HANDLING ====================

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
    this.startHeartbeat();

    socket.on('data', (data) => {
      this.handleIncomingData(data);
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

  private handleIncomingData(data: Buffer) {
    this.buffer += data.toString();

    // Process complete MOS messages
    while (true) {
      const startTag = this.buffer.indexOf('<mos>');
      const endTag = this.buffer.indexOf('</mos>');

      if (startTag === -1 || endTag === -1) break;

      const message = this.buffer.substring(startTag, endTag + 6);
      this.buffer = this.buffer.substring(endTag + 6);

      this.log('RECEIVED', message.substring(0, 200));

      // Handle heartbeat requests
      if (message.includes('<heartbeat>')) {
        this.sendHeartbeatResponse();
      }

      // Handle roReq (WinPlus requesting a rundown)
      if (message.includes('<roReq>')) {
        this.log('RO_REQUEST', 'WinPlus is requesting a rundown');
        // If we have an active rundown, resend it
        if (this.activeRundownId) {
          this.log('AUTO_RESEND', `Resending rundown ${this.activeRundownId}`);
        }
      }

      // Handle mosAck
      if (message.includes('<mosAck>')) {
        this.log('ACK_RECEIVED', 'WinPlus acknowledged message');
      }
    }
  }

  // ==================== SENDING DATA (to WinPlus) ====================

  private sendRaw(xml: string): boolean {
    if (!this.clientSocket || !this.connected) {
      this.log('SEND_FAILED', 'No prompter connected');
      return false;
    }

    try {
      this.clientSocket.write(xml);
      this.log('SENT', xml.substring(0, 150) + '...');
      return true;
    } catch (err: any) {
      this.log('SEND_ERROR', err.message);
      return false;
    }
  }

  async sendRundown(
    rundownId: string,
    rundownSlug: string,
    stories: MosPrompterStory[]
  ): Promise<boolean> {
    if (!this.connected) {
      this.log('SEND_FAILED', 'WinPlus is not connected. Start the server and connect WinPlus first.');
      return false;
    }

    this.activeRundownId = rundownId;

    const roCreateXml = mosBridge.buildPrompterRoCreate(
      rundownId,
      rundownSlug,
      stories
    );

    const success = this.sendRaw(roCreateXml);
    if (success) {
      this.log('RUNDOWN_SENT', `Sent rundown "${rundownSlug}" with ${stories.length} stories`);
    }
    return success;
  }

  async sendStoryUpdate(
    rundownId: string,
    story: MosPrompterStory
  ): Promise<boolean> {
    if (!this.connected) return false;

    const xml = mosBridge.buildPrompterStoryReplace(rundownId, story);
    return this.sendRaw(xml);
  }

  async sendStoryDelete(
    rundownId: string,
    storyId: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    const xml = mosBridge.buildPrompterStoryDelete(rundownId, storyId);
    return this.sendRaw(xml);
  }

  async sendStoryInsert(
    rundownId: string,
    afterStoryId: string,
    story: MosPrompterStory
  ): Promise<boolean> {
    if (!this.connected) return false;

    const xml = mosBridge.buildPrompterStoryInsert(rundownId, afterStoryId, story);
    return this.sendRaw(xml);
  }

  // ==================== HEARTBEAT ====================

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        const heartbeat = `<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><heartbeat></heartbeat></mos>`;
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
    const response = `<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><heartbeat></heartbeat></mos>`;
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
    return this.connected;
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
