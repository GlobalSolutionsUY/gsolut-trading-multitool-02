import { useCallback, useEffect, useRef, useState } from 'react';

interface StablecoinItem {
  symbol: string;
  name: string;
  price: number;
  pegTarget: number;
  deviationPercent: number;
  isPegged: boolean;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  priceChangePercent: number;
  updatedAt: string;
}

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
}

interface StatusData {
  service: string;
  version: string;
  activeProvider: string;
}

type StreamMode = 'SSE_STREAM' | 'POLLING';

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [stables, setStables] = useState<StablecoinItem[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>('SSE_STREAM');
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [lastTickAt, setLastTickAt] = useState<string>('');
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Initial Health & Status Check
  const checkHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const [hRes, sRes] = await Promise.all([fetch('/health'), fetch('/api/status')]);
      if (!hRes.ok || !sRes.ok) throw new Error('Backend health check failed');
      const hData = (await hRes.json()) as HealthData;
      const sData = (await sRes.json()) as StatusData;
      setHealth(hData);
      setStatus(sData);
      setLatency(Math.round(performance.now() - start));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHealth(null);
    }
  }, []);

  // 2. Fetch Stablecoins via REST
  const fetchStablesRest = useCallback(async () => {
    try {
      const res = await fetch('/api/market/stables');
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching stables`);
      const data = (await res.json()) as { items: StablecoinItem[]; timestamp: string };
      setStables(data.items);
      setLastTickAt(new Date().toLocaleTimeString());
      setUpdateCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // 3. Setup SSE Live Stream
  useEffect(() => {
    checkHealth();
    const healthInterval = setInterval(checkHealth, 15000);

    if (streamMode === 'SSE_STREAM') {
      const es = new EventSource('/api/market/stables/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setStreamActive(true);
        setError(null);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: string;
            items: StablecoinItem[];
            timestamp: string;
          };
          if (Array.isArray(payload.items)) {
            setStables(payload.items);
            setLastTickAt(new Date().toLocaleTimeString());
            setUpdateCount((c) => c + 1);
          }
        } catch (parseErr) {
          console.error('SSE parse error:', parseErr);
        }
      };

      es.onerror = () => {
        setStreamActive(false);
        // Fallback fetch via REST if stream drops
        fetchStablesRest();
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
        clearInterval(healthInterval);
      };
    }

    // Polling mode
    fetchStablesRest();
    const pollInterval = setInterval(fetchStablesRest, 4000);
    setStreamActive(false);

    return () => {
      clearInterval(pollInterval);
      clearInterval(healthInterval);
    };
  }, [streamMode, checkHealth, fetchStablesRest]);

  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(vol).toLocaleString()}`;
  };

  const getDeviationStyle = (dev: number) => {
    const abs = Math.abs(dev);
    if (abs <= 0.05)
      return { color: 'var(--color-bullish)', label: 'PEGGED', bg: 'rgba(63, 185, 80, 0.15)' };
    if (abs <= 0.15)
      return { color: '#d29922', label: 'SLIGHT DEVIATION', bg: 'rgba(210, 153, 34, 0.15)' };
    return { color: 'var(--color-bearish)', label: 'DEPEGGED', bg: 'rgba(248, 81, 73, 0.15)' };
  };

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Header & Connection Telemetry */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Trading Multitool Copilot
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Stablecoin Liquidity & Telemetry Stream (Binance Public Data)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Connection Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: health ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
              color: health ? 'var(--color-bullish)' : 'var(--color-bearish)',
              border: `1px solid ${health ? 'var(--color-bullish)' : 'var(--color-bearish)'}`,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: health ? 'var(--color-bullish)' : 'var(--color-bearish)',
                boxShadow: health ? '0 0 8px var(--color-bullish)' : 'none',
              }}
            />
            {health ? `CONNECTED (${latency ?? 0}ms)` : 'DISCONNECTED'}
          </div>

          {/* Provider Badge */}
          {status && (
            <span
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              Provider:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {status.activeProvider.toUpperCase()}
              </strong>
            </span>
          )}
        </div>
      </header>

      {/* Stream Controls & Status Bar */}
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-card)',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: streamActive ? 'var(--color-bullish)' : '#d29922',
                animation: streamActive ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {streamActive ? 'Live SSE Stream Active' : 'Polling Fallback Active'}
            </span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Updates: <strong style={{ color: 'var(--text-primary)' }}>{updateCount}</strong> | Last
            Tick:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {lastTickAt || 'Connecting...'}
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setStreamMode((m) => (m === 'SSE_STREAM' ? 'POLLING' : 'SSE_STREAM'))}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Mode: {streamMode === 'SSE_STREAM' ? 'SSE Stream (3s)' : 'Polling (4s)'}
          </button>

          <button
            type="button"
            onClick={fetchStablesRest}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid var(--color-bearish)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            color: 'var(--color-bearish)',
            fontSize: '0.875rem',
          }}
        >
          <strong>Connection Notice:</strong> {error}
        </div>
      )}

      {/* Stablecoins Grid */}
      <section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {stables.map((coin) => {
            const dev = getDeviationStyle(coin.deviationPercent);
            return (
              <div
                key={coin.symbol}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {/* Header */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{coin.name}</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {coin.symbol}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: dev.bg,
                      color: dev.color,
                      border: `1px solid ${dev.color}`,
                    }}
                  >
                    {dev.label}
                  </span>
                </div>

                {/* Main Price & Deviation */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${coin.price.toFixed(4)}
                  </span>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: dev.color,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {coin.deviationPercent >= 0
                      ? `+${coin.deviationPercent.toFixed(2)}%`
                      : `${coin.deviationPercent.toFixed(2)}%`}
                  </span>
                </div>

                {/* Secondary Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>
                      24h Quote Volume
                    </span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatVolume(coin.quoteVolume24h)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>24h Range</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${coin.low24h.toFixed(4)} - ${coin.high24h.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Info */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}
      >
        <span>Trading Multitool 02 · Market Intelligence Baseline</span>
        <span>Uptime: {health ? `${Math.round(health.uptime)}s` : 'N/A'}</span>
      </footer>
    </main>
  );
}
