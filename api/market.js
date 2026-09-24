export default async function handler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const symbols = (u.searchParams.get("symbols") || "")
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean);

  const out = { prices: {}, fx: null };

  for (const s of symbols) {
    try {
      // Intraday response metadata provides the previous regular-session close
      // directly, avoiding ambiguity in Yahoo's daily candle timestamps.
      const intradayUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1d&interval=5m&includePrePost=false`;
      const r = await fetch(intradayUrl);
      if (!r.ok) continue;

      const j = await r.json();
      let q = j.chart?.result?.[0];
      if (!q) continue;

      let m = q.meta || {};
      let price = Number.isFinite(m.regularMarketPrice)
        ? m.regularMarketPrice
        : null;
      let previousClose = Number.isFinite(m.previousClose)
        ? m.previousClose
        : (Number.isFinite(m.chartPreviousClose) ? m.chartPreviousClose : null);

      // Fallback for missing/incomplete intraday metadata: inspect daily candles
      // and choose the newest candle strictly before today's exchange-local date.
      if (!(Number.isFinite(price) && price > 0) || !(Number.isFinite(previousClose) && previousClose > 0)) {
        const dailyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=10d&interval=1d`;
        const dailyResponse = await fetch(dailyUrl);
        if (dailyResponse.ok) {
          const dailyJson = await dailyResponse.json();
          const daily = dailyJson.chart?.result?.[0];
          if (daily) {
            const dm = daily.meta || {};
            const dailyPrice = Number.isFinite(dm.regularMarketPrice) ? dm.regularMarketPrice : null;
            if (!(Number.isFinite(price) && price > 0) && dailyPrice > 0) price = dailyPrice;

            const timestamps = daily.timestamp || [];
            const closes = daily.indicators?.quote?.[0]?.close || [];
            const tz = dm.exchangeTimezoneName || m.exchangeTimezoneName || "America/New_York";
            const dateInExchange = seconds => new Intl.DateTimeFormat("en-CA", {
              timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
            }).format(new Date(seconds * 1000));
            const today = dateInExchange(Math.floor(Date.now() / 1000));
            const prior = timestamps
              .map((ts, i) => ({ date: dateInExchange(ts), close: Number(closes[i]) }))
              .filter(x => x.date < today && Number.isFinite(x.close) && x.close > 0)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            if (!(Number.isFinite(previousClose) && previousClose > 0) && prior) {
              previousClose = prior.close;
            }
          }
        }
      }

      if (Number.isFinite(price) && price > 0) {
        out.prices[s] = {
          price,
          previousClose: Number.isFinite(previousClose) && previousClose > 0 ? previousClose : null,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (e) {
      // A failed quote should not prevent other symbols from loading.
    }
  }

  // USD/TWD
  try {
    const r = await fetch("https://api.frankfurter.app/v2/rates?base=USD&symbols=TWD");
    if (r.ok) {
      const j = await r.json();
      const rate = j?.rates?.TWD;
      if (Number.isFinite(rate) && rate > 0) {
        out.fx = { usdTwd: rate, updatedAt: new Date().toISOString() };
      }
    }
  } catch (e) {
    // Keep the last successfully loaded exchange rate in the client.
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.status(200).json(out);
}
