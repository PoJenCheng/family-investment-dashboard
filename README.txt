家庭投資儀表板 V1.3 — Cloud Database 版

核心架構：
瀏覽器 → Vercel → Supabase Database
Vercel 掛掉不會刪除 Supabase 資料；市場 API 掛掉則保留前一次成功價格。

首次設定：
1. 建立 Supabase project。
2. 在 SQL Editor 執行 supabase_schema.sql。
3. Authentication 建立登入方式（Email）。
4. 取得 Project URL 與 anon/publishable key。
5. 打開 index.html，把 __SUPABASE_URL__ 與 __SUPABASE_ANON_KEY__ 替換成你的值。
   注意：Supabase anon/publishable key 可放前端，但必須搭配正確 RLS；絕對不要把 service_role key 放進前端。
6. 將整個資料夾推到 GitHub，再 Import 到 Vercel。
7. Vercel 部署後使用網站註冊/登入。
8. 手機可將網站加入主畫面。

備份：
- 備份頁下載 JSON。
- JSON 匯入會以目前登入帳號寫入雲端。
- 建議另行保留定期下載的 JSON。

V1.3 尚未做：
- 自動排程把 DB 備份到第二家雲端
- 多人共享同一登入帳號的細緻權限
- 已實現損益 FIFO/平均成本的正式會計報表
- 股票拆股、股息、ADR、匯款手續費等公司行動

市場資料：
- Yahoo Finance chart endpoint：非官方市場資料介面。
- Frankfurter：USD/TWD 參考匯率。


PRODUCTION PATCH
Set Vercel Environment Variables: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
Do not place a Supabase Secret Key/service_role key in the browser or GitHub.
