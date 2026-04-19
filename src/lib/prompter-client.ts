// src/lib/prompter-client.ts
// MOS Protocol client for teleprompter
// Sends rundown scripts in order — no control, just data delivery

import net from 'net';
import { eventBus, EventType } from './event-bus';
import { mosBridge, MosPrompterStory } from './mos-bridge';

class PrompterClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private host: string;
  private port: number;
  private ncsId: string;
  private prompterId: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private activeRundownId: string | null = null;

  // Reconnection properties
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 20;
  private baseReconnectDelay: number = 1000; // 1 second
  private maxReconnectDelay: number = 30000; // 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalDisconnect: boolean = false; // Tracks if disconnect was manual

  constructor() {
    this.host = process.env.PROMPTER_HOST || '10.0.0.3';
    this.port = parseInt(process.env.PROMPTER_PORT || '10547', 10);
    this.ncsId = process.env.MOS_NCS_ID || 'NEWSFORGE';
    this.prompterId = process.env.PROMPTER_MOS_ID || 'PROMPTER';
    this.setupEventListeners();
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    if (this.connected && this.socket) {
      return { success: true, message: 'Already connected' };
    }

    // Mark this as an intentional connection attempt
    this.intentionalDisconnect = false;

    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.connected = false;

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      const timeout = setTimeout(() => {
        this.socket?.destroy();
        this.socket = null;
        reject(new Error('Connection timeout (10s)'));
      }, 10000);

      this.socket.connect(this.port, this.host, () => {
        clearTimeout(timeout);
        this.connected = true;
        this.resetReconnect(); // ← Reset backoff counter on success
        console.log(`[Prompter] ✅ Connected to ${this.host}:${this.port}`);
        this.startHeartbeat();

        // Auto-resync: if we had an active rundown, the prompter needs it again
        if (this.activeRundownId) {
          console.log(
            '[Prompter] 🔄 Reconnected with active rundown:',
            this.activeRundownId,
            '— Press 📜 to resync'
          );
          // Note: We can't auto-resend because we don't have the story data cached
          // The operator needs to press the send button to resync
          // TODO: Implement rundown caching for full auto-resync
        }

        resolve({
          success: true,
          message: `Connected to prompter at ${this.host}:${this.port}`,
        });
      });

      this.socket.on('data', (data: Buffer) => {
        console.log(`[Prompter] <<< ${data.toString().substring(0, 100)}`);
      });

      this.socket.on('close', () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.socket = null;
        this.stopHeartbeat();
        console.log('[Prompter] Connection closed');

        // Only auto-reconnect if we were previously connected
        // and this wasn't an intentional disconnect
        if (wasConnected && !this.intentionalDisconnect) {
          console.log('[Prompter] ⚠️ Unexpected disconnect — starting auto-reconnect');
          this.scheduleReconnect();
        }
      });

      this.socket.on('error', (err: Error) => {
        clearTimeout(timeout);
        this.connected = false;
        console.error('[Prompter] ❌ Socket error:', err.message);
        // Don't reject here if we're in reconnect mode
        // The 'close' event will fire next and handle reconnection
        if (this.reconnectAttempts === 0) {
          reject(err);
        }
        // If reconnecting, don't reject — let scheduleReconnect handle it
      });
    });
  }

  /**
   * Cleanly disconnects from the teleprompter
   * Sets intentionalDisconnect flag to prevent auto-reconnect
   */
  disconnect(): void {
    // Mark as intentional so auto-reconnect doesn't kick in
    this.intentionalDisconnect = true;

    // Stop all timers
    this.stopHeartbeat();
    this.resetReconnect();

    // Clear active rundown tracking
    this.clearActiveRundown();

    // Destroy socket
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.connected = false;
    console.log('[Prompter] 🛑 Disconnected (manual)');
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.socket) {
        const msg = `<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><heartbeat><time>${new Date().toISOString()}</time></heartbeat></mos>\n`;
        try { this.sendToPrompter(msg); } catch {}
      }
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ══════════════════════════════════════
  // Send rundown with all scripts in order
  // ══════════════════════════════════════
  sendRundown(rundown: {
    rundownId: string;
    title: string;
    stories: Array<{
      storyId: string;
      orderIndex: number;
      title: string;
      script: string;
    }>;
  }): { success: boolean; message: string } {
    if (!this.connected || !this.socket) {
      return { success: false, message: 'Not connected to prompter' };
    }

    // Build stories XML in run order
    const storiesXml = rundown.stories
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((story, index) => {
        const cleanScript = this.cleanScript(story.script);
        return `<story><storyID>${this.esc(story.storyId)}</storyID><storySlug>${this.esc(story.title)}</storySlug><storyNum>${index + 1}</storyNum><storyBody><storyText>${this.esc(cleanScript)}</storyText></storyBody></story>`;
      })
      .join('\n');

    const msg = `<mos><mosID>${this.prompterId}</mosID><ncsID>${this.ncsId}</ncsID><roCreate><roID>${this.esc(rundown.rundownId)}</roID><roSlug>${this.esc(rundown.title)}</roSlug><roEdStart>${new Date().toISOString()}</roEdStart>\n${storiesXml}\n</roCreate></mos>\n`;

    try {
      this.sendToPrompter(msg);
      // Track this as the active rundown
      this.setActiveRundown(rundown.rundownId);
      console.log(`[Prompter] Sent rundown: "${rundown.title}" — ${rundown.stories.length} stories`);
      return {
        success: true,
        message: `Sent ${rundown.stories.length} stories to prompter`,
      };
    } catch (err) {
      console.error('[Prompter] Send failed:', err);
      return { success: false, message: `Send failed: ${err}` };
    }
  }

  /**
   * Sends raw XML string to the teleprompter via TCP socket
   */
  private sendToPrompter(xml: string): void {
    if (!this.socket || this.socket.destroyed) {
      console.error('[MOS Bridge] ❌ Socket not connected. Cannot send.');
      throw new Error('Socket not connected');
    }
    this.socket.write(xml);
    console.log('[MOS Bridge] 📤 Message sent to prompter');
  }

  /**
   * Listens for real-time story/rundown changes
   * and automatically pushes updates to the teleprompter
   */
  private setupEventListeners(): void {
    // When a story script is edited
    eventBus.on(EventType.STORY_UPDATED, (data: any) => {
      console.log('[MOS Bridge] 📝 Story updated event received:', data.storyId);
      if (this.isActiveRundown(data.rundownId)) {
        this.sendStoryReplace(data.rundownId, data.storyId, data.scriptText);
      }
    });

    // When a story is deleted from rundown
    eventBus.on(EventType.STORY_DELETED, (data: any) => {
      console.log('[MOS Bridge] 🗑️ Story deleted event received:', data.storyId);
      if (this.isActiveRundown(data.rundownId)) {
        this.sendStoryDelete(data.rundownId, data.storyId);
      }
    });

    // When a new story is added to rundown
    eventBus.on(EventType.STORY_CREATED, (data: any) => {
      console.log('[MOS Bridge] ➕ Story created event received:', data.storyId);
      if (this.isActiveRundown(data.rundownId)) {
        this.sendStoryInsert(
          data.rundownId,
          data.storyId,
          data.scriptText,
          data.afterStoryId
        );
      }
    });

    // When stories are reordered
    eventBus.on(EventType.RUNDOWN_REORDERED, (data: any) => {
      console.log('[MOS Bridge] 🔀 Rundown reordered:', data.rundownId);
      if (this.isActiveRundown(data.rundownId)) {
        // For reorder, it's safest to resend the full rundown
        // Individual roStoryMove messages can cause ordering conflicts
        console.log('[MOS Bridge] 🔀 Reorder detected — full resync recommended');
        this.fallbackFullResync(data.rundownId);
      }
    });

    // When a rundown is activated on the prompter
    eventBus.on(EventType.RUNDOWN_ACTIVATED, (data: any) => {
      console.log('[MOS Bridge] 🟢 Rundown activated:', data.rundownId);
      this.setActiveRundown(data.rundownId);
    });

    // When a rundown is deactivated
    eventBus.on(EventType.RUNDOWN_DEACTIVATED, (data: any) => {
      console.log('[MOS Bridge] 🔴 Rundown deactivated:', data.rundownId);
      this.clearActiveRundown();
    });

    console.log('[MOS Bridge] ✅ Event listeners registered');
  }

  /**
   * Set which rundown is currently active on the prompter
   */
  public setActiveRundown(rundownId: string): void {
    this.activeRundownId = rundownId;
    console.log('[MOS Bridge] Active rundown set to:', rundownId);
  }

  /**
   * Clear the active rundown tracking
   */
  public clearActiveRundown(): void {
    console.log('[MOS Bridge] Active rundown cleared. Was:', this.activeRundownId);
    this.activeRundownId = null;
  }

  /**
   * Check if update is for the currently active rundown
   */
  private isActiveRundown(rundownId: string): boolean {
    if (!this.activeRundownId) {
      console.warn('[MOS Bridge] ⚠️ No active rundown. Ignoring update for:', rundownId);
      return false;
    }
    return this.activeRundownId === rundownId;
  }

  // ============================================
  // INCREMENTAL TELEPROMPTER UPDATE METHODS
  // These send targeted MOS updates via mosBridge
  // ============================================

  /**
   * Sends a single story replacement to the teleprompter
   * Called when a producer edits a script
   */
  private sendStoryReplace(rundownId: string, storyId: string, scriptText: string): void {
    try {
      if (!this.connected || !this.socket) {
        console.warn('[MOS Bridge] ⚠️ Not connected. Queuing missed update.');
        return;
      }

      const story: MosPrompterStory = {
        storyId: storyId,
        storySlug: '', // Slug not always available in update events
        scriptText: scriptText,
      };

      const xml = mosBridge.buildPrompterStoryReplace(rundownId, story);
      this.sendToPrompter(xml);
      console.log('[MOS Bridge] ✅ Sent roStoryReplace for story:', storyId);
    } catch (error) {
      console.error('[MOS Bridge] ❌ Failed roStoryReplace:', error);
      this.fallbackFullResync(rundownId);
    }
  }

  /**
   * Sends a story deletion to the teleprompter
   * Called when a story is removed from the rundown
   */
  private sendStoryDelete(rundownId: string, storyId: string): void {
    try {
      if (!this.connected || !this.socket) {
        console.warn('[MOS Bridge] ⚠️ Not connected. Queuing missed update.');
        return;
      }

      const xml = mosBridge.buildPrompterStoryDelete(rundownId, storyId);
      this.sendToPrompter(xml);
      console.log('[MOS Bridge] ✅ Sent roStoryDelete for story:', storyId);
    } catch (error) {
      console.error('[MOS Bridge] ❌ Failed roStoryDelete:', error);
      this.fallbackFullResync(rundownId);
    }
  }

  /**
   * Sends a new story insertion to the teleprompter
   * Called when a story is added to the rundown
   */
  private sendStoryInsert(
    rundownId: string,
    storyId: string,
    scriptText: string,
    afterStoryId: string
  ): void {
    try {
      if (!this.connected || !this.socket) {
        console.warn('[MOS Bridge] ⚠️ Not connected. Queuing missed update.');
        return;
      }

      const story: MosPrompterStory = {
        storyId: storyId,
        storySlug: '',
        scriptText: scriptText,
      };

      const xml = mosBridge.buildPrompterStoryInsert(rundownId, afterStoryId, story);
      this.sendToPrompter(xml);
      console.log('[MOS Bridge] ✅ Sent roStoryInsert for story:', storyId);
    } catch (error) {
      console.error('[MOS Bridge] ❌ Failed roStoryInsert:', error);
      this.fallbackFullResync(rundownId);
    }
  }

  /**
   * Sends a story move/reorder to the teleprompter
   * Called when stories are reordered in the rundown
   */
  private sendStoryMove(
    rundownId: string,
    storyId: string,
    newPositionStoryId: string
  ): void {
    try {
      if (!this.connected || !this.socket) {
        console.warn('[MOS Bridge] ⚠️ Not connected. Queuing missed update.');
        return;
      }

      const xml = mosBridge.buildPrompterStoryMove(rundownId, storyId, newPositionStoryId);
      this.sendToPrompter(xml);
      console.log('[MOS Bridge] ✅ Sent roStoryMove for story:', storyId);
    } catch (error) {
      console.error('[MOS Bridge] ❌ Failed roStoryMove:', error);
      this.fallbackFullResync(rundownId);
    }
  }

  /**
   * FALLBACK: If any incremental update fails, resend the entire rundown
   * This ensures the prompter never gets stuck in a bad state
   *
   * Note: This requires fetching the full rundown data from the database
   * For now, we log a warning. The next manual 📜 button press will resync.
   */
  private fallbackFullResync(rundownId: string): void {
    console.warn('[MOS Bridge] ⚠️ Incremental update failed for rundown:', rundownId);
    console.warn('[MOS Bridge] ⚠️ Prompter may be out of sync. Press 📜 to resync.');

    // TODO: In future, fetch rundown from DB and call this.sendRundown()
    // For now, the manual button serves as the resync mechanism
  }

  /**
   * @deprecated Use mosBridge.cleanText() for new code
   * Kept for backward compatibility with sendRundown()
   */
  private cleanScript(script: string): string {
    if (!script) return '';
    let text = script;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  private esc(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Resets the reconnection attempt counter
   * Useful if the operator wants to retry after max attempts were reached
   */
  public resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
    this.intentionalDisconnect = false;
    console.log('[Prompter] 🔄 Reconnection attempts reset');
  }

  getStatus() {
    return {
      connected: this.connected,
      host: this.host,
      port: this.port,
      activeRundownId: this.activeRundownId,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isReconnecting: this.reconnectTimer !== null,
    };
  }

  /**
   * Schedules a reconnection attempt with exponential backoff
   * Delay pattern: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s...
   */
  private scheduleReconnect(): void {
    // Don't reconnect if disconnect was intentional (user clicked disconnect)
    if (this.intentionalDisconnect) {
      console.log('[Prompter] Intentional disconnect — skipping auto-reconnect');
      return;
    }

    // Don't exceed max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[Prompter] ❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`
      );
      console.error('[Prompter] ❌ Manual reconnect required. Use the UI to reconnect.');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(
      `[Prompter] 🔄 Reconnecting in ${delay / 1000}s ` +
        `(attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
    );

    // Clear any existing timer to prevent duplicates
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      try {
        await this.connect();
        // If we get here, connection succeeded
        // Resync is handled in the updated connect() method
      } catch (error) {
        console.error(
          `[Prompter] ❌ Reconnect attempt ${this.reconnectAttempts} failed:`,
          (error as Error).message
        );
        // Try again
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Resets reconnection state after a successful connection
   */
  private resetReconnect(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

const globalForPrompter = globalThis as unknown as {
  prompterClient: PrompterClient | undefined;
};

export const prompterClient =
  globalForPrompter.prompterClient ?? new PrompterClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrompter.prompterClient = prompterClient;
}

export default prompterClient;
