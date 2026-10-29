export type ChatSummary = { id: string; title: string; updatedAt: string };

export type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

export type ChatDetail = {
  id: string;
  title: string;
  model: string;
  temperature: number;
  topP: number;
  systemPromptId: string | null;
  messages: Message[];
};

export type SystemPrompt = { id: string; name: string; content: string };

export const MODELS = ["GPT-4", "Claude", "Local Llama"];
