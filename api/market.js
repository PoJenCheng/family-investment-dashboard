export default async function handler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const symbols = (u.searchParams.get("symbols") || "")
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(Boolean);

  const out = { prices: {}, fx: null };

  for (const s of symbols) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`
      );

      if (!r.ok) continue;

      const j = await r.json();
      const q = j.chart?.result?.[0];
      const m = q?.meta || {};
      const closes = q?.indicators?.quote?.[0]?.close || [];

      const price =
        Number.isFinite(m.regularMarketPrice)
          ? m.regularMarketPrice
          : closes.at(-1);

      // 優先使用 Yahoo 提供的前一交易日收盤價
      const previousClose =
        Number.isFinite(m.previousClose)
          ? m.previousClose
          : Number.isFinite(m.chartPreviousClose)
            ? m.chartPreviousClose
            : closes.at(-2);

      // 前收一定要是有效且大於 0 的數字
      const validPreviousClose =
        Number.isFinite(previousClose) && previousClose > 0
          ? previousClose
          : null;

      if (Number.isFinite(price)) {
        out.prices[s] = {
          price,
          previousClose: validPreviousClose,
          updatedAt: new Date().toISOString()
        };
      }
    } catch (e) {
      // 某一支股票失敗時，繼續處理其他股票
    }
  }

  try {
    const r = await fetch(
      "https://api.frankfurter.app/v2/rates?base=USD&symbols=TWD"
    );

    if (r.ok) {
      const j = await r.json();
      const rate = j?.rates?.TWD;

      if (Number.isFinite(rate) && rate > 0) {
        out.fx = {
          usdTwd: rate,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (e) {
    // 匯率取得失敗時，前端可以保留上一次成功的匯率
  }

  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=300"
  );

  res.status(200).json(out);
}
