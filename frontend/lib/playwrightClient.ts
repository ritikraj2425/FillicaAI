/**
 * Electron IPC Client Utility
 * 
 * This utility provides a simplified interface for React components to interact with
 * the Electron main process via IPC. It's a wrapper around the preload.js API.
 */

export interface PlaywrightEvent {
  type: 'status' | 'error' | 'complete';
  status?: string;
  message?: string;
  error?: string;
  [key: string]: any;
}

class PlaywrightClient {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for all Electron events
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const electronAPI = (window as any).electronAPI;

      electronAPI.onAgentStatus((data: any) => {
        this.emit('status', data);
      });

      electronAPI.onAgentError((data: any) => {
        this.emit('error', data);
      });

      electronAPI.onAgentComplete((data: any) => {
        this.emit('complete', data);
      });

      electronAPI.onDeepLinkAuth((data: any) => {
        this.emit('deepLink', data);
      });
    }
  }

  /**
   * Start Playwright automation
   */
  async startAutomation(jobId: string, userId: string, token: string, backendUrl: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error('Not running in Electron');
    }
    return electronAPI.startAgent(jobId, userId, token, backendUrl);
  }

  /**
   * Cancel current automation
   */
  async cancelAutomation(jobId: string, userId: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error('Not running in Electron');
    }
    return electronAPI.cancelAgent(jobId, userId);
  }

  /**
   * Submit user input during automation
   */
  async submitUserInput(data: any): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error('Not running in Electron');
    }
    return electronAPI.submitAgent(data);
  }

  /**
   * Subscribe to events
   */
  on(event: 'status' | 'error' | 'complete' | 'deepLink', callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)!.delete(callback);
    };
  }

  /**
   * Emit events (used internally)
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electronAPI;
  }
}

// Export singleton instance
export const playwrightClient = new PlaywrightClient();
