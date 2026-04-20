import net from 'net';

// ─── MOS Protocol Constants (from .env) ─────────────────
const MOS_NCS_ID = process.env.MOS_NCS_ID || 'NEWSFORGE';
const MOS_DEVICE_ID = process.env.MOS_DEVICE_ID || 'KAYAK';
const PROMPTER_MOS_ID = process.env.PROMPTER_MOS_ID || 'PROMPTER';
const MOS_CHANNEL = process.env.MOS_CHANNEL || 'NEWSFORGE_GFX';
const LOWER_PORT = Number(process.env.MOS_LOWER_PORT) || 10546;
const UPPER_PORT = Number(process.env.MOS_UPPER_PORT) || 10545;
const HEARTBEAT_INTERVAL = (Number(process.env.MOS_HEARTBEAT_SEC) || 10) * 1000;

// ─── Types ───────────────────────────────────────────────
export interface MosBridgeStatus {
  running: boolean;
  lowerPort: { listening: boolean; clientConnected: boolean };
  upperPort: { listening: boolean; clientConnected: boolean };
  connected: boolean; // true when Gateway has connected to BOTH ports
  lastHeartbeat: string | null;
  lastHeartbeatReceived: string | null;
  lastError: string | null;
  messagesSent: number;
  messagesReceived: number;
  startedAt: string | null;
  gatewayIp: string | null;
}

export interface MosRoStory {
  storyId: string;
  storySlug: string;
  items: MosRoItem[];
}

/**
 * Simplified story structure for teleprompter updates
 * Unlike MosRoStory, this only carries script text (no CG items)
 */
export interface MosPrompterStory {
  storyId: string;
  storySlug: string;
  scriptText: string;
}

export interface MosRoItem {
  mosObjId: string;
  mosObjXml: string;
  templateName: string;
  channel: string;
  layer: string;
  orderIndex: number;
}

type MosMessageHandler = (type: string, raw: string) => void;

// ─── MOS Bridge Class (TCP SERVER) ──────────────────────
export class MosBridge {
  private lowerServer: net.Server | null = null;
  private upperServer: net.Server | null = null;
  private lowerClient: net.Socket | null = null;
  private upperClient: net.Socket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lowerBuffer = '';
  private upperBuffer = '';
  private handlers: MosMessageHandler[] = [];

  status: MosBridgeStatus = {
    running: false,
    lowerPort: { listening: false, clientConnected: false },
    upperPort: { listening: false, clientConnected: false },
    connected: false,
    lastHeartbeat: null,
    lastHeartbeatReceived: null,
    lastError: null,
    messagesSent: 0,
    messagesReceived: 0,
    startedAt: null,
    gatewayIp: null,
  };

  // ═══════════════════════════════════════════════════════
  // START / STOP — We listen, Viz Gateway connects to us
  // ═══════════════════════════════════════════════════════

  async start(): Promise<void> {
    if (this.status.running) {
      console.log('[MOS] Already running');
      return;
    }

    return new Promise((resolve, reject) => {
      let lowerReady = false;
      let upperReady = false;

      const checkBoth = () => {
        if (lowerReady && upperReady) {
          this.status.running = true;
          this.status.startedAt = new Date().toISOString();
          this.status.lastError = null;
          console.log(`[MOS] ✅ Server running — Lower :${LOWER_PORT} Upper :${UPPER_PORT}`);
          console.log(`[MOS] Waiting for Viz Gateway (${MOS_DEVICE_ID}) to connect...`);
          resolve();
        }
      };

      // ── Lower Port Server (NCS ← MOS Device commands) ──
      this.lowerServer = net.createServer((socket) => {
        const addr = socket.remoteAddress;
        console.log(`[MOS] ✅ Gateway connected on LOWER port from ${addr}`);

        if (this.lowerClient) {
          console.log('[MOS] Replacing existing lower connection');
          this.lowerClient.removeAllListeners();
          this.lowerClient.destroy();
        }

        this.lowerClient = socket;
        this.status.lowerPort.clientConnected = true;
        this.status.gatewayIp = addr || null;
        this.checkConnected();

        socket.on('data', (data) => {
          this.lowerBuffer += data.toString();
          this.processBuffer('lower');
        });

        socket.on('error', (err) => {
          console.error('[MOS] Lower client error:', err.message);
          this.status.lastError = `Lower: ${err.message}`;
        });

        socket.on('close', () => {
          console.log('[MOS] Gateway disconnected from LOWER port');
          this.lowerClient = null;
          this.status.lowerPort.clientConnected = false;
          this.lowerBuffer = '';
          this.checkConnected();
        });
      });

      this.lowerServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          this.status.lastError = `Port ${LOWER_PORT} already in use`;
          reject(new Error(`Port ${LOWER_PORT} already in use`));
        } else {
          this.status.lastError = `Lower server: ${err.message}`;
          reject(err);
        }
      });

      this.lowerServer.listen(LOWER_PORT, '0.0.0.0', () => {
        console.log(`[MOS] Lower port listening on :${LOWER_PORT}`);
        this.status.lowerPort.listening = true;
        lowerReady = true;
        checkBoth();
      });

      // ── Upper Port Server (NCS → MOS Device responses) ──
      this.upperServer = net.createServer((socket) => {
        const addr = socket.remoteAddress;
        console.log(`[MOS] ✅ Gateway connected on UPPER port from ${addr}`);

        if (this.upperClient) {
          console.log('[MOS] Replacing existing upper connection');
          this.upperClient.removeAllListeners();
          this.upperClient.destroy();
        }

        this.upperClient = socket;
        this.status.upperPort.clientConnected = true;
        this.checkConnected();

        socket.on('data', (data) => {
          this.upperBuffer += data.toString();
          this.processBuffer('upper');
        });

        socket.on('error', (err) => {
          console.error('[MOS] Upper client error:', err.message);
          this.status.lastError = `Upper: ${err.message}`;
        });

        socket.on('close', () => {
          console.log('[MOS] Gateway disconnected from UPPER port');
          this.upperClient = null;
          this.status.upperPort.clientConnected = false;
          this.upperBuffer = '';
          this.checkConnected();
        });
      });

      this.upperServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          this.status.lastError = `Port ${UPPER_PORT} already in use`;
          reject(new Error(`Port ${UPPER_PORT} already in use`));
        } else {
          this.status.lastError = `Upper server: ${err.message}`;
          reject(err);
        }
      });

      this.upperServer.listen(UPPER_PORT, '0.0.0.0', () => {
        console.log(`[MOS] Upper port listening on :${UPPER_PORT}`);
        this.status.upperPort.listening = true;
        upperReady = true;
        checkBoth();
      });

      setTimeout(() => {
        if (!this.status.running) reject(new Error('Server start timeout'));
      }, 5000);
    });
  }

  stop(): void {
    console.log('[MOS] Stopping server...');

    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }

    if (this.lowerClient) { this.lowerClient.removeAllListeners(); this.lowerClient.destroy(); this.lowerClient = null; }
    if (this.upperClient) { this.upperClient.removeAllListeners(); this.upperClient.destroy(); this.upperClient = null; }

    if (this.lowerServer) { this.lowerServer.close(); this.lowerServer = null; }
    if (this.upperServer) { this.upperServer.close(); this.upperServer = null; }

    this.lowerBuffer = '';
    this.upperBuffer = '';

    this.status = {
      running: false,
      lowerPort: { listening: false, clientConnected: false },
      upperPort: { listening: false, clientConnected: false },
      connected: false,
      lastHeartbeat: null,
      lastHeartbeatReceived: null,
      lastError: null,
      messagesSent: 0,
      messagesReceived: 0,
      startedAt: null,
      gatewayIp: null,
    };

    console.log('[MOS] Server stopped');
  }

  // Legacy compat — 'connect' = start, 'disconnect' = stop (API accepts both)
  async connect(): Promise<void> { return this.start(); }
  disconnect(): void { this.stop(); }

  // ─── Check if Gateway is fully connected ──────────────
  private checkConnected(): void {
    const wasConnected = this.status.connected;
    this.status.connected =
      this.status.lowerPort.clientConnected &&
      this.status.upperPort.clientConnected;

    if (this.status.connected && !wasConnected) {
      console.log('[MOS] ✅ Viz Gateway fully connected (both ports)');
      this.startHeartbeat();
    }

    if (!this.status.connected && wasConnected) {
      console.log('[MOS] ⚠️ Viz Gateway disconnected');
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    }
  }

  // ═══════════════════════════════════════════════════════
  // HEARTBEAT
  // ═══════════════════════════════════════════════════════

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      if (this.status.connected) {
        const hb = this.wrapMos(`<heartbeat><time>${new Date().toISOString()}</time></heartbeat>`);
        this.sendOnLower(hb);
        this.status.lastHeartbeat = new Date().toISOString();
      }
    }, HEARTBEAT_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════
  // MESSAGE PROCESSING
  // ═══════════════════════════════════════════════════════

  private processBuffer(port: 'lower' | 'upper'): void {
    const isLower = port === 'lower';
    let buffer = isLower ? this.lowerBuffer : this.upperBuffer;
    const END_TAG = '</mos>';
    let idx = buffer.indexOf(END_TAG);

    while (idx !== -1) {
      const msg = buffer.substring(0, idx + END_TAG.length).trim();
      buffer = buffer.substring(idx + END_TAG.length);
      if (msg.length > 0) { this.status.messagesReceived++; this.handleMessage(msg, port); }
      idx = buffer.indexOf(END_TAG);
    }

    if (isLower) { this.lowerBuffer = buffer; } else { this.upperBuffer = buffer; }
  }

  private handleMessage(xml: string, port: string): void {
    let type = 'unknown';

    if (xml.includes('<heartbeat>')) {
      this.status.lastHeartbeatReceived = new Date().toISOString();
      // Heartbeat with timestamp — also compact
      const reply = this.wrapMos(`<heartbeat><time>${new Date().toISOString()}</time></heartbeat>`);
      if (port === 'lower') { this.sendOnLower(reply); } else { this.sendOnUpper(reply); }
      return;
    }

    if (xml.includes('<roAck>')) type = 'roAck';
    else if (xml.includes('<mosAck>')) type = 'mosAck';
    else if (xml.includes('<roReq>')) type = 'roReq';
    else if (xml.includes('<roReqAll>')) type = 'roReqAll';
    else if (xml.includes('<roListAll>')) type = 'roListAll';
    else if (xml.includes('<roReadyToAir>')) type = 'roReadyToAir';
    else if (xml.includes('<roItemStatus>')) type = 'roItemStatus';
    else if (xml.includes('<roRunningStatus>')) type = 'roRunningStatus';
    else if (xml.includes('<roStorySend>')) type = 'roStorySend';
    else if (xml.includes('<roItemCue>')) type = 'roItemCue';

    console.log(`[MOS] ← ${port}: ${type} (${xml.length} bytes)`);

    if (type === 'roReqAll') {
      // Gateway asking for all running orders — reply empty
      console.log('[MOS] Gateway requesting all running orders');
      this.sendOnLower(this.wrapMos('<roListAll></roListAll>'));
    }

    if (type === 'roAck') {
      console.log('[MOS] ✅ Gateway acknowledged our message');
    }

    this.handlers.forEach((h) => {
      try { h(type, xml); } catch (err) { console.error('[MOS] Handler error:', err); }
    });
  }

  // ═══════════════════════════════════════════════════════
  // SEND
  // ═══════════════════════════════════════════════════════

  private sendOnLower(xml: string): boolean {
    if (!this.lowerClient) return false;
    try { this.lowerClient.write(xml); this.status.messagesSent++; return true; }
    catch (err: unknown) {
      const e = err as Error;
      console.error('[MOS] Lower send error:', e.message);
      this.status.lastError = `Send lower: ${e.message}`;
      return false;
    }
  }

  private sendOnUpper(xml: string): boolean {
    if (!this.upperClient) return false;
    try { this.upperClient.write(xml); this.status.messagesSent++; return true; }
    catch (err: unknown) {
      const e = err as Error;
      console.error('[MOS] Upper send error:', e.message);
      this.status.lastError = `Send upper: ${e.message}`;
      return false;
    }
  }

  sendMessage(mosXml: string): boolean {
    if (!this.status.connected) {
      console.error('[MOS] Cannot send — Gateway not connected');
      return false;
    }
    console.log(`[MOS] → Sending (${mosXml.length} bytes)`);
    return this.sendOnLower(mosXml);
  }

  // ─── MOS XML Wrapper ──────────────────────────────────
  private wrapMos(body: string, mosIdOverride?: string, ncsIdOverride?: string, messageId?: number): string {
    const mid = messageId ? `<messageID>${messageId}</messageID>` : '';
    // Use UTF-16 in declaration to match transmission format
    return `<?xml version="1.0" encoding="UTF-16"?><mos><mosID>${mosIdOverride || MOS_DEVICE_ID}</mosID><ncsID>${ncsIdOverride || MOS_NCS_ID}</ncsID>${mid}${body}</mos>`;
  }

  // ═══════════════════════════════════════════════════════
  // MESSAGE BUILDERS
  // ═══════════════════════════════════════════════════════

  buildRoCreate(ro: { roId: string; roSlug: string; stories: MosRoStory[] }): string {
    return this.wrapMos(`<roCreate>
        <roID>${this.esc(ro.roId)}</roID>
        <roSlug>${this.esc(ro.roSlug)}</roSlug>
        <roChannel>${MOS_CHANNEL}</roChannel>
        ${ro.stories.map((s) => this.buildStoryXml(s)).join('\n')}
      </roCreate>`);
  }

  buildRoReplace(ro: { roId: string; roSlug: string; stories: MosRoStory[] }): string {
    return this.wrapMos(`<roReplace>
        <roID>${this.esc(ro.roId)}</roID>
        <roSlug>${this.esc(ro.roSlug)}</roSlug>
        <roChannel>${MOS_CHANNEL}</roChannel>
        ${ro.stories.map((s) => this.buildStoryXml(s)).join('\n')}
      </roReplace>`);
  }

  buildRoDelete(roId: string): string {
    return this.wrapMos(`<roDelete><roID>${this.esc(roId)}</roID></roDelete>`);
  }

  buildRoStoryReplace(roId: string, story: MosRoStory): string {
    return this.wrapMos(`<roStoryReplace>
        <roID>${this.esc(roId)}</roID>
        ${this.buildStoryXml(story)}
      </roStoryReplace>`);
  }

  buildRoItemCue(roId: string, storyId: string, itemId: string): string {
    return this.wrapMos(`<roItemCue>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(storyId)}</storyID>
        <itemID>${this.esc(itemId)}</itemID>
      </roItemCue>`);
  }

  buildRoItemTake(roId: string, storyId: string, itemId: string): string {
    return this.wrapMos(`<roItemTake>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(storyId)}</storyID>
        <itemID>${this.esc(itemId)}</itemID>
      </roItemTake>`);
  }

  buildRoItemClear(roId: string, storyId: string, itemId: string): string {
    return this.wrapMos(`<roItemClear>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(storyId)}</storyID>
        <itemID>${this.esc(itemId)}</itemID>
      </roItemClear>`);
  }

  private buildStoryXml(story: MosRoStory): string {
    const items = story.items
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => {
        const externalMeta = item.mosObjXml
          ? `<mosExternalMetadata>
              <mosSchema>http://www.vizrt.com/mosObj</mosSchema>
              <mosPayload>${item.mosObjXml}</mosPayload>
            </mosExternalMetadata>`
          : '';
        return `<item>
            <itemID>${this.esc(item.mosObjId)}</itemID>
            <itemSlug>${this.esc(item.templateName)}</itemSlug>
            <objID>${this.esc(item.mosObjId)}</objID>
            <mosID>${MOS_DEVICE_ID}</mosID>
            <itemChannel>${MOS_CHANNEL}</itemChannel>
            ${externalMeta}
          </item>`;
      })
      .join('\n');

    return `<story>
        <storyID>${this.esc(story.storyId)}</storyID>
        <storySlug>${this.esc(story.storySlug)}</storySlug>
        <storyNum>${story.items[0]?.orderIndex != null ? story.items[0].orderIndex + 1 : 1}</storyNum>
        ${items}
      </story>`;
  }

  // ============================================
  // TELEPROMPTER-SPECIFIC MOS BUILDERS
  // These send script text updates to the prompter
  // ============================================

  buildPrompterRoCreate(
    roId: string, 
    roSlug: string, 
    stories: MosPrompterStory[],
    ncsIdOverride?: string,
    mosIdOverride?: string,
    messageId?: number
  ): string {
    const storiesXml = stories.map((s, i) => this.buildPrompterStoryXml(s, i + 1)).join('');
    const xml = `<roCreate><roID>${this.esc(roId)}</roID><roSlug>${this.esc(roSlug)}</roSlug><roStatus>NEW</roStatus><roChannel>${PROMPTER_MOS_ID}</roChannel>${storiesXml}</roCreate>`;
    return this.wrapMos(xml, mosIdOverride || PROMPTER_MOS_ID, ncsIdOverride, messageId);
  }

  /**
   * Individual story content send for legacy WinPlus compliance
   */
  buildPrompterRoStorySend(
    roId: string,
    story: MosPrompterStory,
    ncsIdOverride?: string,
    mosIdOverride?: string,
    messageId?: number
  ): string {
    const xml = `<roStorySend><roID>${this.esc(roId)}</roID>${this.buildPrompterStoryXml(story)}</roStorySend>`;
    return this.wrapMos(xml, mosIdOverride || PROMPTER_MOS_ID, ncsIdOverride, messageId);
  }


  /**
   * Replaces a single story's script on the teleprompter
   * Used when a producer edits a script
   */
  buildPrompterStoryReplace(
    roId: string, 
    story: MosPrompterStory,
    ncsIdOverride?: string,
    mosIdOverride?: string,
    messageId?: number
  ): string {
    return this.wrapMos(`<roStoryReplace>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(story.storyId)}</storyID>
        ${this.buildPrompterStoryXml(story)}
      </roStoryReplace>`, mosIdOverride || PROMPTER_MOS_ID, ncsIdOverride, messageId);
  }

  /**
   * Deletes a story from the teleprompter rundown
   * Used when a story is removed
   */
  buildPrompterStoryDelete(
    roId: string, 
    storyId: string,
    ncsIdOverride?: string,
    mosIdOverride?: string,
    messageId?: number
  ): string {
    return this.wrapMos(`<roStoryDelete>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(storyId)}</storyID>
      </roStoryDelete>`, mosIdOverride || PROMPTER_MOS_ID, ncsIdOverride, messageId);
  }

  /**
   * Inserts a new story into the teleprompter rundown
   * afterStoryId = story ID after which the new story appears
   * If afterStoryId is empty, inserts at the beginning
   */
  buildPrompterStoryInsert(
    roId: string,
    afterStoryId: string,
    story: MosPrompterStory,
    ncsIdOverride?: string,
    mosIdOverride?: string,
    messageId?: number
  ): string {
    return this.wrapMos(`<roStoryInsert>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(afterStoryId)}</storyID>
        ${this.buildPrompterStoryXml(story)}
      </roStoryInsert>`, mosIdOverride || PROMPTER_MOS_ID, ncsIdOverride, messageId);
  }

  /**
   * Moves a story to a new position in the teleprompter rundown
   * beforeStoryId = story ID BEFORE which the moved story should appear
   */
  buildPrompterStoryMove(
    roId: string,
    storyId: string,
    beforeStoryId: string
  ): string {
    return this.wrapMos(`<roStoryMove>
        <roID>${this.esc(roId)}</roID>
        <storyID>${this.esc(beforeStoryId)}</storyID>
        <storyID>${this.esc(storyId)}</storyID>
      </roStoryMove>`, PROMPTER_MOS_ID);
  }

  /**
   * Builds a single story XML block for the teleprompter
   * Unlike buildStoryXml(), this sends clean script text
   * instead of CG/Vizrt items
   */
  private buildPrompterStoryXml(story: MosPrompterStory, storyNum: number = 1): string {
    const cleanedText = this.cleanText(story.scriptText);
    // storyBody/storyText is the correct MOS element for teleprompter scroll text.
    // item/itemBody is for MOS graphics objects (CG), not for prompter copy.
    return `<story>
<storyID>${this.esc(story.storyId)}</storyID>
<storySlug>${this.esc(story.storySlug)}</storySlug>
<storyNum>${storyNum}</storyNum>
<storyBody>
<storyText>${this.esc(cleanedText)}</storyText>
</storyBody>
</story>`;
  }

  /**
   * Strips HTML tags and cleans script text for teleprompter display
   * Keeps it plain text only — no formatting
   */
  private cleanText(html: string): string {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
      .replace(/<p[^>]*>/gi, '\n') // Convert <p> to newlines
      .replace(/<\/p>/gi, '') // Remove closing </p>
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
      .trim();
  }

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════

  onMessage(handler: MosMessageHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }
}

// ─── Singleton ───────────────────────────────────────────
const globalForMos = globalThis as unknown as { mosBridge: MosBridge };
export const mosBridge: MosBridge = globalForMos.mosBridge || new MosBridge();
if (process.env.NODE_ENV !== 'production') { globalForMos.mosBridge = mosBridge; }
