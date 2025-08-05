import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/govlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      console.log("🌐 Frontend received:", data);
      setResult(data);
    } catch (err) {
      setResult({
        summary: '❌ Something went wrong. Please try again.',
        link: '',
      });
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-5xl font-extrabold mb-4 text-blue-800">GovLink AI</h1>
      <p className="mb-6 text-center max-w-xl text-gray-700">
        Ask me anything you need to do with the government — paying tickets,
        applying for licenses, renewing documents, and more. I’ll give you the
        official link.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., I need to pay a speeding ticket from Miami"
          className="p-4 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex justify-center items-center gap-2 bg-blue-600 text-white font-semibold p-3 rounded-xl shadow hover:bg-blue-700 disabled:opacity-50 transition duration-200"
        >
          {loading && (
            <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          )}
          {loading ? 'Finding Link...' : 'Get Link'}
        </button>
      </form>

      {result && (
        <div className="bg-white p-6 rounded-2xl shadow-lg mt-10 max-w-xl w-full border border-gray-200">
          <h2 className="text-2xl font-semibold text-blue-700 mb-3">Your Result</h2>
          <p className="text-gray-800 mb-3">{result.summary}</p>
          {result.link && (
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline"
            >
              👉 {result.link}
            </a>
          )}
          {result.note && (
            <p className="text-sm text-gray-500 mt-3 italic">{result.note}</p>
          )}
        </div>
      )}
    </main>
  );
}