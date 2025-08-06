import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { keywords, summary, link } = req.body;

    const { error } = await supabase.from("curated_links").insert([
      {
        keywords,
        summary,
        link,
      },
    ]);

    if (error) throw error;

    return res.status(200).json({ message: "Link added successfully!" });
  } catch (error) {
    console.error("❌ Error adding curated link:", error);
    return res.status(500).json({ error: "Failed to add curated link" });
  }
}