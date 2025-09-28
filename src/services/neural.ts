import { create } from 'zustand';

interface NeuralIntegrationState {
  isConnected: boolean;
  mcpConnection: WebSocket | null;
  obsidianSyncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  lastSyncTimestamp: string | null;
  activeOID: string | null;
  neuralContext: {
    saudi_healthcare?: any;
    sudan_national?: any;
    identity_verification?: any;
  };
}

interface NeuralIntegrationActions {
  initializeMCP: () => Promise<void>;
  syncWithObsidian: (data: any) => Promise<void>;
  updateNeuralContext: (context: Partial<NeuralIntegrationState['neuralContext']>) => void;
  setActiveOID: (oid: string) => void;
  disconnect: () => void;
}

export const useNeuralIntegration = create<NeuralIntegrationState & NeuralIntegrationActions>((set, get) => ({
  isConnected: false,
  mcpConnection: null,
  obsidianSyncStatus: 'idle',
  lastSyncTimestamp: null,
  activeOID: null,
  neuralContext: {},

  initializeMCP: async () => {
    const mcpEndpoint = import.meta.env.VITE_OBSIDIAN_MCP_ENDPOINT;
    if (!mcpEndpoint) {
      console.warn('MCP endpoint not configured');
      return;
    }

    try {
      const ws = new WebSocket(mcpEndpoint);

      ws.onopen = () => {
        console.log('MCP connection established');
        set({
          isConnected: true,
          mcpConnection: ws,
          obsidianSyncStatus: 'connected',
          lastSyncTimestamp: new Date().toISOString()
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('MCP message received:', data);

          if (data.type === 'obsidian_sync') {
            set(state => ({
              neuralContext: {
                ...state.neuralContext,
                ...data.context
              },
              lastSyncTimestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error parsing MCP message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('MCP connection error:', error);
        set({ obsidianSyncStatus: 'error' });
      };

      ws.onclose = () => {
        console.log('MCP connection closed');
        set({
          isConnected: false,
          mcpConnection: null,
          obsidianSyncStatus: 'idle'
        });
      };

    } catch (error) {
      console.error('Failed to initialize MCP:', error);
      set({ obsidianSyncStatus: 'error' });
    }
  },

  syncWithObsidian: async (data) => {
    const { mcpConnection } = get();
    if (!mcpConnection || mcpConnection.readyState !== WebSocket.OPEN) {
      console.warn('MCP connection not available for sync');
      return;
    }

    try {
      set({ obsidianSyncStatus: 'syncing' });

      const syncMessage = {
        type: 'identity_verification_sync',
        timestamp: new Date().toISOString(),
        oid: get().activeOID,
        data
      };

      mcpConnection.send(JSON.stringify(syncMessage));

      set({
        obsidianSyncStatus: 'connected',
        lastSyncTimestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Obsidian sync error:', error);
      set({ obsidianSyncStatus: 'error' });
    }
  },

  updateNeuralContext: (context) => {
    set(state => ({
      neuralContext: {
        ...state.neuralContext,
        ...context
      }
    }));
  },

  setActiveOID: (oid) => {
    set({ activeOID: oid });
  },

  disconnect: () => {
    const { mcpConnection } = get();
    if (mcpConnection) {
      mcpConnection.close();
    }
    set({
      isConnected: false,
      mcpConnection: null,
      obsidianSyncStatus: 'idle',
      activeOID: null
    });
  }
}));

export class BrainSAITNeuralService {
  private static instance: BrainSAITNeuralService;
  private oidHierarchy = {
    root: '1.3.6.1.4.1.61026',
    branches: {
      identity: '1.3.6.1.4.1.61026.1',
      healthcare: '1.3.6.1.4.1.61026.2',
      national: '1.3.6.1.4.1.61026.3',
      neural: '1.3.6.1.4.1.61026.4'
    }
  };

  public static getInstance(): BrainSAITNeuralService {
    if (!BrainSAITNeuralService.instance) {
      BrainSAITNeuralService.instance = new BrainSAITNeuralService();
    }
    return BrainSAITNeuralService.instance;
  }

  async initializeNeuralIntegration() {
    const neuralStore = useNeuralIntegration.getState();
    await neuralStore.initializeMCP();

    console.log('BrainSAIT Neural Integration System initialized');
    console.log('OID Hierarchy:', this.oidHierarchy);
  }

  generateNeuralOID(type: 'identity' | 'healthcare' | 'national' | 'neural', subtype?: string): string {
    const timestamp = Date.now();
    const branch = this.oidHierarchy.branches[type];
    const subtypeId = subtype ? `.${subtype.hashCode()}` : '';
    return `${branch}${subtypeId}.${timestamp}`;
  }

  async createNeuralContext(verificationData: any, countryCode?: string) {
    const neuralOID = this.generateNeuralOID('neural', 'verification');

    const context = {
      neural_oid: neuralOID,
      verification_id: verificationData.id,
      country_code: countryCode,
      timestamp: new Date().toISOString(),
      neural_features: {
        real_time_sync: import.meta.env.VITE_ENABLE_MCP_REALTIME === 'true',
        obsidian_integration: import.meta.env.VITE_ENABLE_OBSIDIAN_SYNC === 'true',
        bilingual_support: import.meta.env.VITE_ENABLE_BILINGUAL_SUPPORT === 'true',
        rtl_support: import.meta.env.VITE_ENABLE_ARABIC_RTL === 'true'
      }
    };

    const neuralStore = useNeuralIntegration.getState();
    neuralStore.setActiveOID(neuralOID);
    neuralStore.updateNeuralContext({ identity_verification: context });

    if (neuralStore.isConnected) {
      await neuralStore.syncWithObsidian(context);
    }

    return context;
  }
}

// String extension for hash code generation
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function(): number {
  let hash = 0;
  if (this.length === 0) return hash;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const neuralService = BrainSAITNeuralService.getInstance();