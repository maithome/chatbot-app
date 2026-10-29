"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { SystemPrompt } from "./types";

type Props = {
  prompts: SystemPrompt[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export default function PromptsModal({ prompts, onClose, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(p: SystemPrompt) {
    setEditingId(p.id);
    setName(p.name);
    setContent(p.content);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setContent("");
    setError(null);
  }

  async function save() {
    if (!name.trim() || !content.trim()) {
      setError("Nimi ja sisu on kohustuslikud.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/prompts", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId ?? undefined, name, content }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Salvestamine ebaõnnestus.");
      return;
    }
    resetForm();
    await onChanged();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/prompts?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError("Kustutamine ebaõnnestus.");
      return;
    }
    if (editingId === id) resetForm();
    await onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Halda prompte"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Halda prompte</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Sulge">
            <X size={18} />
          </button>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {prompts.length === 0 && <li className="text-sm text-slate-500">Prompte ei ole. Lisa uus allpool.</li>}
          {prompts.map((p) => (
            <li key={p.id} className="flex items-start gap-2 rounded-md border border-slate-200 p-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="line-clamp-2 text-xs text-slate-500">{p.content}</div>
              </div>
              <button
                onClick={() => startEdit(p)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label={`Muuda prompti ${p.name}`}
                disabled={busy}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => remove(p.id)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label={`Kustuta prompt ${p.name}`}
                disabled={busy}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-slate-200 px-4 py-3">
          <div className="text-sm font-medium">{editingId ? "Muuda prompti" : "Lisa uus prompt"}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nimi, nt Hääldus"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Süsteemiprompti sisu"
            rows={3}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {editingId && (
              <button onClick={resetForm} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                Loobu
              </button>
            )}
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {editingId ? "Salvesta" : "Lisa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
