import assert from 'node:assert/strict';
import test from 'node:test';
import { BinanceConnector } from '../src/client.js';

test('BinanceConnector -> getTopTickers filters and sorts by volume', async () => {
  const mockTickers = [
    {
      symbol: 'BTCUSDT',
      lastPrice: '64000.00',
      priceChangePercent: '2.50',
      volume: '1500',
      quoteVolume: '96000000.00',
      highPrice: '65000.00',
      lowPrice: '63000.00',
    },
    {
      symbol: 'ETHUSDT',
      lastPrice: '3400.00',
      priceChangePercent: '-1.20',
      volume: '10000',
      quoteVolume: '34000000.00',
      highPrice: '3500.00',
      lowPrice: '3350.00',
    },
    {
      symbol: 'LOWVOLUSDT',
      lastPrice: '0.10',
      priceChangePercent: '0.50',
      volume: '10000',
      quoteVolume: '1000.00', // Below $2M threshold
      highPrice: '0.11',
      lowPrice: '0.09',
    },
    {
      symbol: 'BTCBUSD', // Not USDT
      lastPrice: '64000.00',
      priceChangePercent: '2.50',
      volume: '500',
      quoteVolume: '32000000.00',
      highPrice: '65000.00',
      lowPrice: '63000.00',
    },
  ];

  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    if (url.includes('/api/v3/ticker/24hr')) {
      return new Response(JSON.stringify(mockTickers), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  const connector = new BinanceConnector({ fetchFn: mockFetch });
  const top = await connector.getTopTickers(2_000_000);

  assert.equal(top.length, 2);
  const first = top[0];
  const second = top[1];
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.symbol, 'BTCUSDT');
  assert.equal(first.quoteVolume24h, 96_000_000);
  assert.equal(second.symbol, 'ETHUSDT');
  assert.equal(second.quoteVolume24h, 34_000_000);
});

test('BinanceConnector -> getCandles maps canonical Candle structure', async () => {
  const mockKlines = [
    [
      1727164800000, // openTime
      '64100.50', // open
      '64500.00', // high
      '63900.00', // low
      '64300.00', // close
      '125.45', // volume
      1727165699999, // closeTime
      '8066435.00', // quoteVolume
      1420, // tradesCount
      '60.0', // takerBuyBase
      '3858000.0', // takerBuyQuote
      '0',
    ],
  ];

  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    if (url.includes('/api/v3/klines')) {
      assert.ok(url.includes('symbol=SOLUSDT'));
      assert.ok(url.includes('interval=15m'));
      assert.ok(url.includes('limit=50'));
      return new Response(JSON.stringify(mockKlines), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  const connector = new BinanceConnector({ fetchFn: mockFetch });
  const candles = await connector.getCandles('SOLUSDT', '15m', 50);

  assert.equal(candles.length, 1);
  const candle = candles[0];
  assert.ok(candle);
  assert.equal(candle.openTime, 1727164800000);
  assert.equal(candle.open, 64100.5);
  assert.equal(candle.high, 64500.0);
  assert.equal(candle.low, 63900.0);
  assert.equal(candle.close, 64300.0);
  assert.equal(candle.volume, 125.45);
  assert.equal(candle.tradesCount, 1420);
});

test('BinanceConnector -> getTicker returns individual 24h ticker', async () => {
  const mockTicker = {
    symbol: 'BTCUSDT',
    lastPrice: '64200.00',
    priceChangePercent: '1.85',
    volume: '2400',
    quoteVolume: '154080000.00',
    highPrice: '64800.00',
    lowPrice: '63100.00',
  };

  const mockFetch: typeof fetch = async (input) => {
    const url = input.toString();
    if (url.includes('/api/v3/ticker/24hr') && url.includes('symbol=BTCUSDT')) {
      return new Response(JSON.stringify(mockTicker), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  };

  const connector = new BinanceConnector({ fetchFn: mockFetch });
  const ticker = await connector.getTicker('BTCUSDT');

  assert.equal(ticker.symbol, 'BTCUSDT');
  assert.equal(ticker.lastPrice, 64200);
  assert.equal(ticker.priceChangePercent, 1.85);
  assert.equal(ticker.quoteVolume24h, 154080000);
});
