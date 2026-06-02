import { io, Socket } from 'socket.io-client';
import { supabase } from './supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobUpdatePayload {
  job_id: string;
  status: 'running' | 'done' | 'failed';
  result: any | null;
  error: string | null;
  timestamp: string;
}

interface SocketServiceConfig {
  onJobUpdate: (payload: JobUpdatePayload) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCKET_URL = 'https://www.api.lazarflow.app'; // Production URL
const MAX_RECONNECT_ATTEMPTS = 5;
// ─── Singleton ────────────────────────────────────────────────────────────────

class SocketService {
  private socket: Socket | null = null;
  private config: SocketServiceConfig | null = null;
  private reconnectAttempts = 0;
  private authToken: string | null = null;

  /**
   * Initialize and connect to the Socket.IO server.
   */
  async connect(config: SocketServiceConfig): Promise<boolean> {
    this.config = config;

    try {
      console.log('[SocketService] 🔌 Attempting to connect to:', SOCKET_URL);

      // Get fresh token from Supabase session (handles expiration automatically)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[SocketService] ❌ Error getting session:', sessionError.message);
        return false;
      }

      if (!session?.access_token) {
        console.warn('[SocketService] ⚠️ No valid session found, skipping connection');
        return false;
      }

      this.authToken = session.access_token;
      console.log('[SocketService] 🔑 Got fresh token from Supabase session, proceeding with connection');

      if (this.socket?.connected) {
        console.log('[SocketService] ✅ Already connected, socket ID:', this.socket.id);
        return true;
      }

      console.log('[SocketService] 🔧 Creating new Socket.IO connection...');
      this.socket = io(SOCKET_URL, {
        auth: { token: this.authToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.setupListeners();
      console.log('[SocketService] 📡 Listeners attached, waiting for connection...');
      return true;
    } catch (error) {
      console.error('[SocketService] ❌ Connection setup failed:', error);
      this.config?.onError?.(error as Error);
      return false;
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    console.log('[SocketService] 🎧 Setting up socket event listeners...');

    this.socket.on('connect', () => {
      console.log('[SocketService] ✅ Socket connected! ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.config?.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] 🔌 Socket disconnected, reason:', reason);
      this.config?.onDisconnect?.(reason);

      // Auto-reconnect if server disconnected us
      if (reason === 'io server disconnect') {
        console.log('[SocketService] 🔄 Server disconnected, attempting auto-reconnect...');
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] ❌ Socket connection error:', error.message);
      this.reconnectAttempts++;
      console.log(`[SocketService] 🔢 Reconnection attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      this.config?.onError?.(error as Error);
    });

    // Listen for socket_error events (e.g., token expired, invalid token)
    this.socket.on('socket_error', async (error: { code: string; message: string }) => {
      console.error('[SocketService] ❌ Socket error received:', error.code, error.message);

      if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
        console.log('[SocketService] 🔑 Token expired, attempting to refresh and reconnect...');
        await this.reconnect();
      } else if (error.code === 'NO_TOKEN') {
        console.log('[SocketService] ⚠️ No token provided');
      }
    });

    // Primary event: OCR job updates
    this.socket.on('ocr_job_update', (data: JobUpdatePayload) => {
      console.log('[SocketService] 📥 ocr_job_update received:', JSON.stringify(data));
      this.config?.onJobUpdate(data);
    });

    // Listen for reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[SocketService] 🔄 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[SocketService] 🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] ❌ All reconnection attempts failed');
    });

    console.log('[SocketService] ✅ All listeners registered');
  }

  /**
   * Subscribe to a specific job for granular updates.
   */
  subscribeToJob(jobId: string): void {
    console.log(`[SocketService] 📝 Subscribing to job: ${jobId}`);
    this.socket?.emit('subscribe_job', { job_id: jobId });
  }

  /**
   * Unsubscribe from a specific job.
   */
  unsubscribeFromJob(jobId: string): void {
    console.log(`[SocketService] 📭 Unsubscribing from job: ${jobId}`);
    this.socket?.emit('unsubscribe_job', { job_id: jobId });
  }

  /**
   * Disconnect from the socket server.
   */
  disconnect(): void {
    console.log('[SocketService] 🔌 disconnect() called, cleaning up...');
    this.socket?.disconnect();
    this.socket = null;
    this.config = null;
    console.log('[SocketService] 🔌 Socket disconnected and cleaned up');
  }

  /**
   * Check if socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Reconnect with fresh auth token.
   */
  async reconnect(): Promise<boolean> {
    this.disconnect();
    // Use Supabase to get fresh token
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && this.config) {
      this.authToken = session.access_token;
      return this.connect(this.config);
    }
    return false;
  }
}

export const socketService = new SocketService();