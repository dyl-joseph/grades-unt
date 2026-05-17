"use client";

import { useEffect, useState } from "react";
import { fetchManifest, decryptBlob, ManifestEntry } from "@/lib/encryptedData";

export default function EncryptedDemoPage() {
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchManifest().then(setManifest).catch((e) => setError(String(e)));
  }, []);

  async function handleSearch() {
    setError(null);
    setResult(null);
    if (!manifest) return setError('manifest not loaded');
    if (!query) return setError('enter a query');
    const q = query.toLowerCase();
    const entry = manifest.find((m) => m.tokens.some((t) => t.toLowerCase().includes(q)));
    if (!entry) return setError('no match');
    setLoading(true);
    try {
      const data = await decryptBlob(entry.id, passphrase);
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Encrypted data demo</h2>
      <p className="mt-2">Enter a passphrase and search (e.g., "ACCT 2010" or instructor last name).</p>

      <div className="mt-4 space-y-2 max-w-2xl">
        <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Passphrase" className="w-full p-2 border" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search token" className="w-full p-2 border" />
        <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white rounded">{loading ? 'Decrypting...' : 'Search & Decrypt'}</button>
      </div>

      {error && <div className="mt-4 text-red-600">{error}</div>}
      {result && (
        <pre className="mt-4 max-w-4xl overflow-auto bg-slate-100 p-4 rounded">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
