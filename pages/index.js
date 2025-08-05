import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/govlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, query }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await response.json();
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `${data.summary}\n${data.link}` },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '❌ Something went wrong. Please try again.' },
      ]);
    }

    setQuery('');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">GovLink AI</h1>

      <div className="bg-white p-4 rounded-xl shadow-md w-full max-w-xl mb-6 overflow-y-auto max-h-96">
        {messages.length === 0 && (
          <p className="text-gray-500 italic">
            Ask me anything related to government services — I’ll find you the official link.
          </p>
        )}
        {messages.map((msg, idx) => (
          <p
            key={idx}
            className={`mb-2 ${
              msg.role === 'user' ? 'text-blue-700 font-medium' : 'text-gray-800'
            }`}
          >
            {msg.role === 'user' ? '🧑 You: ' : '🤖 GovLink: '}
            {msg.content}
          </p>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 p-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
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