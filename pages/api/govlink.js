import { OpenAI } from 'openai';
import { supabase } from '../../lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Utility: log only in dev mode
function devLog(...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}

// Curated government links (expand as needed)
const govLinks = [
{
    keywords: ['ticket', 'miami', 'pay'],
    summary: 'You can pay your traffic ticket online at the City of Miami portal.',
    link: 'https://www.miamigov.com/Services/Pay-Ticket',
  },
  {
    keywords: ['hunting', 'license', 'alaska'],
    summary: 'You can apply for a hunting license through Alaska Fish and Game.',
    link: 'https://www.adfg.alaska.gov/index.cfm?adfg=hunting.main',
  },
  {
    keywords: ['dmv', 'license', 'renew', 'california'],
    summary: 'Renew your California driver’s license through the DMV portal.',
    link: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/driver-license-renewal/',
  },
  {
    keywords: ['passport', 'application', 'renew'],
    summary: 'Apply for or renew a U.S. passport through the State Department.',
    link: 'https://travel.state.gov/content/travel/en/passports.html',
  },
  {
    keywords: ['tax', 'irs', 'payment'],
    summary: 'Pay your federal taxes online through the IRS website.',
    link: 'https://www.irs.gov/payments',
  },
  {
    keywords: ['vote', 'register', 'usa'],
    summary: 'Register to vote in your state at Vote.gov.',
    link: 'https://www.vote.gov/',
  },
  {
    keywords: ['social security', 'retirement', 'benefits'],
    summary: 'Apply for retirement or benefits at the Social Security Administration.',
    link: 'https://www.ssa.gov/benefits/retirement/',
  },
  {
    keywords: ['green card', 'immigration', 'uscis'],
    summary: 'Get information about green cards and immigration at USCIS.',
    link: 'https://www.uscis.gov/',
  },
  {
    keywords: ['medicare', 'apply', 'health'],
    summary: 'Apply for Medicare and find health coverage information.',
    link: 'https://www.medicare.gov/',
  },
  {
    keywords: ['medicaid', 'apply', 'healthcare'],
    summary: 'Apply for Medicaid benefits through Healthcare.gov.',
    link: 'https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/',
  },
  {
    keywords: ['snap', 'food stamps', 'apply'],
    summary: 'Apply for SNAP (food stamps) through your state portal.',
    link: 'https://www.fns.usda.gov/snap/state-directory',
  },
  {
    keywords: ['student aid', 'fafsa'],
    summary: 'Apply for federal student aid (FAFSA).',
    link: 'https://studentaid.gov/h/apply-for-aid/fafsa',
  },
  {
    keywords: ['veterans', 'benefits', 'va'],
    summary: 'Apply for veterans benefits through the VA.',
    link: 'https://www.va.gov/',
  },
  {
    keywords: ['unemployment', 'benefits'],
    summary: 'Apply for unemployment benefits through your state.',
    link: 'https://www.dol.gov/general/topic/unemployment-insurance',
  },
  {
    keywords: ['covid', 'vaccine', 'cdc'],
    summary: 'Find COVID-19 vaccine information from the CDC.',
    link: 'https://www.cdc.gov/coronavirus/2019-ncov/vaccines/',
  },
];

// 🧠 Helper to log
const devLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, messages = [] } = req.body;

  // 1. Try curated match
  const normalized = query.toLowerCase();
  const match = govLinks.find(entry =>
    entry.keywords.every(k => normalized.includes(k))
  );

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
}// 🧠 Helper to log
const devLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, messages = [] } = req.body;

  // 1. Try curated match
  const normalized = query.toLowerCase();
  const match = govLinks.find(entry =>
    entry.keywords.every(k => normalized.includes(k))
  );

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