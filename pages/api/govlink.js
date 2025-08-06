import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// 🧠 Helper for logging (silent in production)
const devLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 👇 pull query and messages first
  const { query, messages = [] } = req.body;

  // 👇 then fetch curated links
  const { data: curatedLinks, error } = await supabase
    .from('curated_links')
    .select('*');

  if (error) {
    console.error("❌ Error fetching curated links:", error);
  } else {
    console.log("✅ Loaded curated links:", curatedLinks.length);
  }

  // 👇 now you can normalize query
  const normalized = query.toLowerCase();
  let match = null;

  for (const entry of curatedLinks) {
    const keywords = entry.keywords || [];
    const score = keywords.filter(k =>
      normalized.includes(k.toLowerCase())
    ).length;

    if (score >= keywords.length) {
      match = entry;
      break;
    }
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
  

// 2. Fallback to OpenAI
  try {
    devLog("🤖 No strong curated match. Falling back to OpenAI.");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that returns official government websites for users' civic tasks. Your answers MUST:
- Include a short summary
- Include a trusted direct link (ending in .gov or trusted .org)
- Avoid hallucinating URLs
- If unsure, suggest searching on usa.gov`,
        },
        ...messages,
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
      note: !safeLink ? "⚠️ No direct link found. Please visit usa.gov for more info." : undefined,
    });
  } catch (error) {
    console.error("❌ Error in OpenAI API:", error);
    return res.status(500).json({
      summary: "❌ Sorry, something went wrong fetching the government link.",
      link: '',
    });
  }
}