import EventEmitter from 'node:events';
import type { OpportunitySetup } from '@gsolut/types';

export interface RadarStateSnapshot {
  lastScanTimestamp: number;
  isScanning: boolean;
  scannedSymbolsCount: number;
  activeOpportunities: OpportunitySetup[];
  recentHistory: OpportunitySetup[];
}

export class RadarStateStore extends EventEmitter {
  private activeOpportunities: Map<string, OpportunitySetup> = new Map();
  private history: OpportunitySetup[] = [];
  private readonly maxHistory: number;
  private lastScanTimestamp = 0;
  private isScanning = false;
  private scannedSymbolsCount = 0;

  constructor(maxHistory = 100) {
    super();
    this.maxHistory = maxHistory;
  }

  public setScanning(status: boolean, count = 0): void {
    this.isScanning = status;
    if (status) {
      this.emit('scan_start', { timestamp: Date.now() });
    } else {
      this.lastScanTimestamp = Date.now();
      this.scannedSymbolsCount = count;
      this.emit('scan_complete', {
        timestamp: this.lastScanTimestamp,
        count: this.scannedSymbolsCount,
        activeCount: this.activeOpportunities.size,
      });
    }
  }

  public registerOpportunity(setup: OpportunitySetup): void {
    const existing = this.activeOpportunities.get(setup.symbol);
    this.activeOpportunities.set(setup.symbol, setup);

    // Add to history
    this.history.unshift(setup);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    if (!existing || existing.id !== setup.id) {
      this.emit('opportunity', setup);
    }
  }

  public removeOpportunity(symbol: string): void {
    if (this.activeOpportunities.has(symbol)) {
      this.activeOpportunities.delete(symbol);
      this.emit('opportunity_removed', { symbol, timestamp: Date.now() });
    }
  }

  public getActiveOpportunities(): OpportunitySetup[] {
    return Array.from(this.activeOpportunities.values()).sort(
      (a, b) => b.detectedAt - a.detectedAt,
    );
  }

  public getHistory(limit = 50): OpportunitySetup[] {
    return this.history.slice(0, limit);
  }

  public getSnapshot(): RadarStateSnapshot {
    return {
      lastScanTimestamp: this.lastScanTimestamp,
      isScanning: this.isScanning,
      scannedSymbolsCount: this.scannedSymbolsCount,
      activeOpportunities: this.getActiveOpportunities(),
      recentHistory: this.getHistory(20),
    };
  }

  public clear(): void {
    this.activeOpportunities.clear();
    this.history = [];
    this.lastScanTimestamp = 0;
    this.isScanning = false;
    this.scannedSymbolsCount = 0;
  }
}

// Global shared store singleton for in-process telemetry
export const defaultRadarStore = new RadarStateStore();
