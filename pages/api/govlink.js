import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const { query } = req.body;

  console.log("📝 Incoming query:", query);

  // Improved keyword match: rank by number of keyword matches
const normalizedQuery = query.toLowerCase();
let bestMatch = null;
let highestScore = 0;

for (const entry of govLinks) {
  const score = entry.keywords.filter(keyword =>
    normalizedQuery.includes(keyword)
  ).length;

  if (score > highestScore) {
    highestScore = score;
    bestMatch = entry;
  }
}

if (bestMatch && highestScore > 0) {
  return res.status(200).json({ summary: bestMatch.summary, link: bestMatch.link });
}

  console.log("✅ Matched entry:", match);

  if (match) {
    return res.status(200).json({ summary: match.summary, link: match.link });
  }

  // Fallback to OpenAI if no curated match
  try {
    console.log("🤖 Calling OpenAI with query:", query);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Always return:
1. A short summary
2. Exactly one trusted .gov or official .org link
3. If no exact link exists, suggest the official state/federal portal.
Never invent links.`,
        },
        { role: 'user', content: query },
      ],
    });

    const output = completion.choices[0].message.content;
    console.log("🤖 GPT Output:", output);

    const urlRegex = /(https?:\/\/[\w./\-?&=#%]+)/g;
    const extractedLink = output.match(urlRegex)?.[0] || '';

    return res.status(200).json({
      summary: output.replace(extractedLink, '').trim(),
      link: extractedLink,
      note: 'This result was generated via OpenAI. Double-check before submitting sensitive info.',
    });
  } catch (error) {
    console.error("❌ Error in OpenAI API:", error);
    return res.status(500).json({
      summary: '❌ Sorry, something went wrong fetching the government link.',
      link: '',
    });
  }
}