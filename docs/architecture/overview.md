# System Architecture: Trading Multitool Copilot

## 1. High-Level Vision

The **Trading Multitool Copilot** is a market intelligence radar and tactical opportunity assistant designed for human-in-the-loop decision makers (**Ger & Freya**).

It does **not** execute trades autonomously. Its mission is to continuously ingest market data, filter out noise and illiquid risk, calculate deterministic pattern anomalies, rank high-conviction setups, and dispatch structured alerts for human review.

```
Market Data Ingestion (Binance / Connectors)
        │
        ▼
Opportunity Radars (Spot Rebound / Future Modules)
        │
        ▼
Shared Risk Filter (Score, Classification & Rationale)
        │
        ▼
Alerting & Copilot Dashboard (Telegram & Web UI)
        │
        ▼
Human Operator Decision (Ger & Freya)
```

---

## 2. Decoupled Provider-Agnostic Design

All exchange interactions are isolated behind abstract connector interfaces (`ExchangeConnector`):
- **`connector-binance` (MVP)**: Public market data via REST & WebSocket streams.
- **Future Connectors**: Bitunix, Bitget, Trading Different, DEX feeds.

The detection algorithms (`packages/radar-spot`), risk engine (`packages/risk-filter`), and alerters (`packages/alerter-telegram`) remain completely decoupled from specific exchange protocols.

---

## 3. Core Principles: Ponytail & Anti-Slop

- **Ponytail (Simplicity / YAGNI)**: Minimal working code, standard libraries first, zero unnecessary external dependencies or speculative abstraction layers.
- **Anti-Slop**: Purposeful UI and copy, high signal-to-noise ratio, zero AI fluff.
- **Deterministic Math**: Pure rule-based algorithms and indicators; no blackbox price-prediction models.
