export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl,
    supabasePublishableKey
  });
}
