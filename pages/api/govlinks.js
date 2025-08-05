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
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  console.log("📝 Incoming query:", query);

  // Loose keyword match: at least 1 keyword present
  const match = govLinks.find(entry =>
    entry.keywords.some(keyword => query.toLowerCase().includes(keyword))
  );

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
          content: `You are a helpful assistant that returns official government websites for users' civic tasks.
Always include:
1. A short summary of the task
2. A direct trusted link (preferably .gov or official .org)
3. A note if no exact match exists.
Never make up a URL.`,
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