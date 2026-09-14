export default async function handler(req,res){
 const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
 const symbols=(u.searchParams.get('symbols')||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 const out={prices:{},fx:null};

 for(const s of symbols){
  try{
   const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`);
   if(!r.ok)continue;

   const j=await r.json(),
         q=j.chart?.result?.[0],
         m=q?.meta||{},
         closes=q?.indicators?.quote?.[0]?.close||[];

   const p=m.regularMarketPrice??closes.at(-1),
         pc=m.previousClose??closes.at(-2);

   if(Number.isFinite(p)){
    out.prices[s]={
     price:p,
     previousClose:pc??null,
     updatedAt:new Date().toISOString()
    };
   }
  }catch(e){}
 }

 try{
  const r=await fetch('https://api.frankfurter.app/v2/rates?base=USD&symbols=TWD');

  if(r.ok){
   const j=await r.json(),
         rate=j?.rates?.TWD;

   if(Number.isFinite(rate)){
    out.fx={
     usdTwd:rate,
     updatedAt:new Date().toISOString()
    };
   }
  }
 }catch(e){}

 res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
 res.status(200).json(out);
}
