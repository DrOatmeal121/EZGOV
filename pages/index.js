import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Add user's message
    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/govlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      // Add AI's reply
      setMessages([...newMessages, { role: 'assistant', content: `${data.summary}\n${data.link}` }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Something went wrong.' }]);
    }

    setQuery('');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">GovLink AI</h1>
      
      <div className="bg-white p-4 rounded-xl shadow-md w-full max-w-xl mb-6">
        {messages.map((msg, idx) => (
          <p key={idx} className={msg.role === 'user' ? "text-blue-700 font-medium" : "text-gray-800"}>
            {msg.role === 'user' ? "🧑 You: " : "🤖 GovLink: "}
            {msg.content}
          </p>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask your next question..."
          className="flex-1 p-3 rounded-lg border border-gray-300 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </main>
  );
}
🛠 Step 2. Update the Backend (pages/api/govlink.js)
Instead of just query, accept messages:

js
Copy
const { messages } = req.body;
const latestQuery = messages[messages.length - 1].content.toLowerCase();
Then use messages when calling OpenAI:

js
Copy
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: `You are a government services assistant. 
Always give:
Summary: <short helpful explanation>
Link: <official .gov or trusted .org link>`,
    },
    ...messages, // include full chat history
  ],
  max_tokens: 300,
});