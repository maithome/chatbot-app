"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Eraser,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  SendHorizontal,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import PromptsModal from "./PromptsModal";
import { MODELS, type ChatDetail, type ChatSummary, type Message, type SystemPrompt } from "./types";

const GREETING =
  "Tere! Mina olen Käänik. Küsi minult eesti keele grammatika või sõnavara kohta või alusta lihtsat vestlust.";
const DB_ERROR = "Andmebaasiga ei saanud ühendust. Proovi mõne hetke pärast uuesti.";
const MAX_LENGTH = 2000;

type Settings = { model: string; systemPromptId: string | null; temperature: number; topP: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new Error("Serveriga ei saanud ühendust. Kontrolli internetiühendust.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? DB_ERROR);
  return body as T;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("et-EE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ChatApp() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [current, setCurrent] = useState<ChatDetail | null>(null);
  const [settings, setSettings] = useState<Settings>({ model: MODELS[0], systemPromptId: null, temperature: 0.7, topP: 1 });
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    try {
      setChats(await api<ChatSummary[]>("/api/chats"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      const list = await api<SystemPrompt[]>("/api/prompts");
      setPrompts(list);
      setSettings((s) => ({
        ...s,
        systemPromptId: s.systemPromptId && list.some((p) => p.id === s.systemPromptId) ? s.systemPromptId : list[0]?.id ?? null,
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadChats(), loadPrompts()]).finally(() => setLoading(false));
  }, [loadChats, loadPrompts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [current?.messages.length, typing]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  async function openChat(id: string) {
    setError(null);
    try {
      const chat = await api<ChatDetail>(`/api/chats/${id}`);
      setCurrent(chat);
      setSettings({ model: chat.model, systemPromptId: chat.systemPromptId, temperature: chat.temperature, topP: chat.topP });
      setSidebarOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function createChat(): Promise<ChatDetail | null> {
    try {
      const chat = await api<ChatDetail>("/api/chats", { method: "POST", body: JSON.stringify(settings) });
      const detail = { ...chat, messages: [] };
      setCurrent(detail);
      await loadChats();
      return detail;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  async function newChat() {
    setError(null);
    setInput("");
    setFileName(null);
    setInputError(null);
    await createChat();
    setSidebarOpen(false);
  }

  async function deleteChat(id: string) {
    if (!window.confirm("Kas kustutada see vestlus?")) return;
    try {
      await api(`/api/chats/${id}`, { method: "DELETE" });
      if (current?.id === id) setCurrent(null);
      await loadChats();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function updateSettings(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
    if (!current) return;
    try {
      await api(`/api/chats/${current.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) {
      setInputError("Sõnum on tühi.");
      return;
    }
    if (input.length > MAX_LENGTH) {
      setInputError("Sõnum on liiga pikk (kuni 2000 tähemärki).");
      return;
    }
    setInputError(null);
    setError(null);

    const chat = current ?? (await createChat());
    if (!chat) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = { id: tempId, role: "user", content: text, createdAt: new Date().toISOString() };
    setCurrent({ ...chat, messages: [...chat.messages, optimistic] });
    setInput("");
    setFileName(null);
    setTyping(true);
    try {
      const res = await api<{ userMessage: Message; assistantMessage: Message }>(`/api/chats/${chat.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setCurrent((c) =>
        c && c.id === chat.id
          ? { ...c, messages: [...c.messages.filter((m) => m.id !== tempId), res.userMessage, res.assistantMessage] }
          : c,
      );
      await loadChats();
    } catch (e) {
      setCurrent((c) => (c ? { ...c, messages: c.messages.filter((m) => m.id !== tempId) } : c));
      setInput(text);
      setError((e as Error).message);
    } finally {
      setTyping(false);
    }
  }

  async function clearChat() {
    setInput("");
    setFileName(null);
    setInputError(null);
    if (!current) return;
    try {
      await api(`/api/chats/${current.id}/messages`, { method: "DELETE" });
      setCurrent({ ...current, messages: [], title: "Uus vestlus" });
      await loadChats();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const messages = current?.messages ?? [];

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Vestlused</h2>
          <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Sulge menüü">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {loading && <p className="px-2 py-1 text-sm text-slate-500">Laadin...</p>}
          {!loading && chats.length === 0 && <p className="px-2 py-1 text-sm text-slate-500">Vestlusi veel ei ole.</p>}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-2 ${
                current?.id === c.id ? "bg-violet-50 text-violet-900" : "hover:bg-slate-100"
              }`}
            >
              <button onClick={() => openChat(c.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                <MessageSquare size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{c.title}</span>
                  <span className="block text-xs text-slate-500">{formatDate(c.updatedAt)}</span>
                </span>
              </button>
              <button
                onClick={() => deleteChat(c.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
                aria-label="Kustuta vestlus"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            <Plus size={16} /> Uus vestlus
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-3 py-2 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Ava menüü">
              <Menu size={20} />
            </button>
            <h1 className="mr-auto text-lg font-semibold">
              Käänik <span className="hidden text-sm font-normal text-slate-500 sm:inline">· Kolmveerand Keelestuudio</span>
            </h1>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <span className="hidden sm:inline">Mudel</span>
              <select
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                aria-label="Mudel"
              >
                {MODELS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <span className="hidden sm:inline">Süsteemiprompt</span>
              <select
                value={settings.systemPromptId ?? ""}
                onChange={(e) => updateSettings({ systemPromptId: e.target.value || null })}
                className="max-w-[150px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                aria-label="Süsteemiprompt"
              >
                {prompts.length === 0 && <option value="">(puudub)</option>}
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setShowPrompts(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <Settings2 size={15} /> Halda prompte
            </button>
          </div>

          <button
            onClick={() => setShowSettings((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            aria-expanded={showSettings}
          >
            <SlidersHorizontal size={15} /> Täpsemad seaded
            <ChevronDown size={15} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
          </button>
          {showSettings && (
            <div className="mt-2 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              {(["temperature", "topP"] as const).map((key) => (
                <label key={key} className="text-sm">
                  <span className="flex justify-between">
                    <span>{key === "temperature" ? "Temperature" : "Top-P"}</span>
                    <span className="font-mono text-violet-700">{settings[key].toFixed(1)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings[key]}
                    onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
                    onPointerUp={(e) => updateSettings({ [key]: Number((e.target as HTMLInputElement).value) })}
                    onKeyUp={(e) => updateSettings({ [key]: Number((e.target as HTMLInputElement).value) })}
                    className="w-full"
                  />
                </label>
              ))}
            </div>
          )}
        </header>

        {error && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} aria-label="Sulge teade">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && !typing && (
              <div className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center text-slate-700 shadow-sm">
                {GREETING}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-2.5 text-sm shadow-sm ${
                    m.role === "user" ? "bg-violet-600 text-white" : "border border-slate-200 bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-1 text-xs text-slate-400">{formatTime(m.createdAt)}</span>
              </div>
            ))}
            {typing && (
              <div className="flex items-start">
                <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm italic text-slate-500">
                  Käänik kirjutab...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-3 py-3 md:px-6">
          <div className="mx-auto max-w-3xl">
            {fileName && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                <Paperclip size={13} /> {fileName}
                <button
                  onClick={() => {
                    setFileName(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  aria-label="Eemalda fail"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!typing) send();
                }
              }}
              placeholder="Kirjuta oma sõnum..."
              rows={1}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-red-600">{inputError}</span>
              <span className={input.length > MAX_LENGTH ? "text-red-600" : "text-slate-400"}>
                {input.length}/{MAX_LENGTH}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Paperclip size={15} /> <span className="hidden sm:inline">Lisa fail</span>
              </button>
              <button
                onClick={clearChat}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eraser size={15} /> <span className="hidden sm:inline">Tühjenda vestlus</span>
              </button>
              <button
                onClick={send}
                disabled={typing}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
              >
                <SendHorizontal size={15} /> Saada
              </button>
            </div>
          </div>
        </footer>
      </main>

      {showPrompts && <PromptsModal prompts={prompts} onClose={() => setShowPrompts(false)} onChanged={loadPrompts} />}
    </div>
  );
}
