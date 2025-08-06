import { useState } from "react";

export default function Admin() {
  const [keywords, setKeywords] = useState("");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/addCuratedLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords.split(",").map((k) => k.trim()),
          summary,
          link,
        }),
      });

      if (!response.ok) throw new Error("Failed to add link");

      setMessage("✅ Link added successfully!");
      setKeywords("");
      setSummary("");
      setLink("");
    } catch (err) {
      setMessage("❌ Error adding link. Try again.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">Admin: Add Curated Link</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-lg flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="Keywords (comma-separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="p-3 border rounded-lg"
          required
        />
        <input
          type="text"
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="p-3 border rounded-lg"
          required
        />
        <input
          type="url"
          placeholder="Official .gov/.org Link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="p-3 border rounded-lg"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Link
        </button>
      </form>

      {message && <p className="mt-4 text-lg">{message}</p>}
    </main>
  );
}