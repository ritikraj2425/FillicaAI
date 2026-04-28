import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose secure IPC methods to the frontend renderer
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Start Playwright automation
   */
  startAgent: (jobId, userId) => {
    return ipcRenderer.invoke('playwright:start', { jobId, userId });
  },

  /**
   * Cancel automation
   */
  cancelAgent: (jobId, userId) => {
    return ipcRenderer.invoke('playwright:cancel', { jobId, userId });
  },

  /**
   * Submit user input during automation
   */
  submitAgent: (data) => {
    return ipcRenderer.invoke('playwright:submit', data);
  },

  /**
   * Listen for status updates from Playwright
   */
  onAgentStatus: (callback) => {
    ipcRenderer.on('agent_status', (event, data) => callback(data));
  },

  /**
   * Listen for errors from Playwright
   */
  onAgentError: (callback) => {
    ipcRenderer.on('agent_error', (event, data) => callback(data));
  },

  /**
   * Listen for automation completion
   */
  onAgentComplete: (callback) => {
    ipcRenderer.on('agent_complete', (event, data) => callback(data));
  },

  /**
   * Listen for deep link OAuth authentication
   */
  onDeepLinkAuth: (callback) => {
    ipcRenderer.on('deep-link-auth', (event, data) => callback(data));
  },

  /**
   * Remove listeners
   */
  offAgentStatus: () => {
    ipcRenderer.removeAllListeners('agent_status');
  },
  offAgentError: () => {
    ipcRenderer.removeAllListeners('agent_error');
  },
  offAgentComplete: () => {
    ipcRenderer.removeAllListeners('agent_complete');
  },
  offDeepLinkAuth: () => {
    ipcRenderer.removeAllListeners('deep-link-auth');
  },
});
