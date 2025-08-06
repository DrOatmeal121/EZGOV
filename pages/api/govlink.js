import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🧠 Logging helper
const devLog = (...args) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, messages = [] } = req.body;

  // Fetch curated links from Supabase
  const { data: curatedLinks, error } = await supabase
    .from("curated_links")
    .select("*");

  if (error) {
    console.error("❌ Error fetching curated links:", error);
  } else {
    console.log("✅ Loaded curated links:", curatedLinks.length);
  }

  const normalized = query.toLowerCase();
  let match = null;

  // Pass 1: strict match (all keywords must match)
  match = curatedLinks.find(entry =>
    entry.keywords.every(k => normalized.includes(k.toLowerCase()))
  );

  // Pass 2: partial match (≥50% keywords)
  if (!match) {
    match = curatedLinks.find(entry => {
      const keywords = entry.keywords || [];
      const score = keywords.filter(k =>
        normalized.includes(k.toLowerCase())
      ).length;
      return keywords.length > 0 && score / keywords.length >= 0.5;
    });
  }

  if (match) {
    await supabase.from("queries").insert([
      { query, source: "curated", link: match.link },
    ]);

    return res.status(200).json({
      summary: match.summary,
      link: match.link,
      source: "curated",
    });
  }

  // 3. GPT fallback
  try {
    devLog("🤖 No curated match. Falling back to OpenAI.");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are GovLink AI. Always return official government websites (.gov or trusted .org). 
If unsure, suggest usa.gov. Provide a short helpful summary and a direct link.`,
        },
        ...messages,
        { role: "user", content: query },
      ],
      max_tokens: 350,
    });

    const reply = completion.choices[0].message.content || "";
    const urlMatch = reply.match(/https?:\/\/[^\s)]+/);
    const extractedLink = urlMatch?.[0] || "";

    const safeLink =
      extractedLink.includes(".gov") || extractedLink.includes(".org")
        ? extractedLink
        : "";

    const source = safeLink ? "gpt-3.5" : "gpt-3.5-fallback";

    await supabase.from("queries").insert([
      {
        query,
        source,
        link: safeLink,
      },
    ]);

    return res.status(200).json({
      summary: reply.replace(safeLink, "").trim(),
      link: safeLink,
      note: !safeLink
        ? "⚠️ No direct link found. Please visit usa.gov for more info."
        : undefined,
    });
  } catch (error) {
    console.error("❌ Error in OpenAI API:", error);
    return res.status(500).json({
      summary: "❌ Sorry, something went wrong fetching the government link.",
      link: "",
    });
  }
}