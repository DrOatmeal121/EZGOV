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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    const normalizedQuery = query.toLowerCase();
    devLog("📝 Incoming query:", query);

    // Score-based keyword matching
    let bestMatch = null;
    let highestScore = 0;
    for (const entry of govLinks) {
      const score = entry.keywords.filter(k => normalizedQuery.includes(k)).length;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && highestScore >= 2) {
      devLog("✅ Using curated result:", bestMatch.link);

      await supabase.from('queries').insert([
        { query, matched_link: bestMatch.link, source: 'curated' },
      ]);

      return res.status(200).json({ summary: bestMatch.summary, link: bestMatch.link });
    }

    // 🟢 Step 1: Try GPT‑3.5 first
    devLog("🤖 No curated match. Trying GPT‑3.5...");
    const gpt35 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a government services assistant.
Answer with this format:
Summary: <short helpful explanation>
Link: <direct official .gov or trusted .org URL>`,
        },
        { role: 'user', content: query },
      ],
      max_tokens: 300,
    });

    const gpt35Output = gpt35.choices[0].message.content;
    const gpt35Link = gpt35Output.match(/https?:\/\/\S+\.gov\S*/i);

    if (gpt35Link) {
      devLog("✅ GPT‑3.5 succeeded:", gpt35Link[0]);

      await supabase.from('queries').insert([
        { query, matched_link: gpt35Link[0], source: 'gpt-3.5' },
      ]);

      return res.status(200).json({
        summary: gpt35Output.replace(gpt35Link[0], '').trim(),
        link: gpt35Link[0],
        note: 'Answered via GPT‑3.5',
      });
    }

    // 🟠 Step 2: Escalate to GPT‑4 if GPT‑3.5 failed
    devLog("⚠️ GPT‑3.5 returned no .gov link. Escalating to GPT‑4...");
    const gpt4 = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a government services assistant.
Always give:
Summary: <short helpful explanation>
Link: <direct official .gov or trusted .org URL>`,
        },
        { role: 'user', content: query },
      ],
      max_tokens: 400,
    });

    const gpt4Output = gpt4.choices[0].message.content;
    const gpt4Link = gpt4Output.match(/https?:\/\/\S+\.gov\S*/i);

    await supabase.from('queries').insert([
      {
        query,
        matched_link: gpt4Link ? gpt4Link[0] : 'https://www.usa.gov/',
        source: gpt4Link ? 'gpt-4' : 'gpt-4-fallback',
      },
    ]);

    return res.status(200).json({
      summary: gpt4Output.replace(gpt4Link?.[0] || '', '').trim(),
      link: gpt4Link ? gpt4Link[0] : 'https://www.usa.gov/',
      note: gpt4Link
        ? 'Answered via GPT‑4'
        : '⚠️ GPT‑4 could not find a direct link. Defaulting to usa.gov',
    });

  } catch (error) {
    console.error("❌ Error in API handler:", error);

    return res.status(200).json({
      summary: '⚠️ The AI service is currently unavailable.',
      link: 'https://www.usa.gov/',
      note: 'Fallback provided because of an error.',
    });
  }
}