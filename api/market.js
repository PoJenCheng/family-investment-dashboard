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
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=10d&interval=1d`
      );

      if (!r.ok) continue;

      const j = await r.json();
      const q = j.chart?.result?.[0];
      const m = q?.meta || {};
      const closes = q?.indicators?.quote?.[0]?.close || [];

      // 今天的即時股價
      const price =
        Number.isFinite(m.regularMarketPrice)
          ? m.regularMarketPrice
          : closes.at(-1);

      /*
       * 當日損益的定義：
       *
       * 漲跌金額 =
       * 今天目前股價 - 前一交易日收盤價
       *
       * 漲跌比例 =
       * 漲跌金額 / 前一交易日收盤價
       *
       * 不直接使用 Yahoo meta.previousClose，
       * 改從日 K 資料判斷真正的前一交易日收盤。
       */

      const timestamps = q?.timestamp || [];
      const exchangeTz =
        m.exchangeTimezoneName || "America/New_York";

      const toExchangeDate = (unixSeconds) => {
        try {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: exchangeTz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).format(new Date(unixSeconds * 1000));
        } catch (e) {
          return new Date(unixSeconds * 1000)
            .toISOString()
            .slice(0, 10);
        }
      };

      const nowExchangeDate = toExchangeDate(
        Math.floor(Date.now() / 1000)
      );

      const candles = timestamps
        .map((ts, i) => ({
          date: toExchangeDate(ts),
          close: Number(closes[i])
        }))
        .filter(
          x =>
            Number.isFinite(x.close) &&
            x.close > 0
        );

      let previousClose = null;

      if (candles.length) {
        const last = candles[candles.length - 1];

        /*
         * 如果最新日 K 是今天：
         *   最新日 K = 今天目前價格/今天收盤
         *   前一根 = 昨日收盤
         *
         * 如果最新日 K 不是今天：
         *   最新日 K = 最近一個交易日收盤
         */
        if (last.date === nowExchangeDate) {
          previousClose =
            candles.length >= 2
              ? candles[candles.length - 2].close
              : null;
        } else {
          previousClose = last.close;
        }
      }

      const validPreviousClose =
        Number.isFinite(previousClose) &&
        previousClose > 0
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
      // 某一支股票取得失敗時，繼續處理其他股票
    }
  }

  // USD/TWD
  try {
    const r = await fetch(
      "https://api.frankfurter.app/v2/rates?base=USD&symbols=TWD"
    );

    if (r.ok) {
      const j = await r.json();
      const rate = j?.rates?.TWD;

      if (
        Number.isFinite(rate) &&
        rate > 0
      ) {
        out.fx = {
          usdTwd: rate,
          updatedAt: new Date().toISOString()
        };
      }
    }
  } catch (e) {
    // 匯率取得失敗時保留前一次成功匯率
  }

  res.setHeader(
    "Cache-Control",
    "s-maxage=60, stale-while-revalidate=300"
  );

  res.status(200).json(out);
}
