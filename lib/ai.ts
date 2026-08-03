type JsonSchema = Record<string, unknown>;

type ResponsePayload = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function extractText(payload: ResponsePayload) {
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")
    ?.text;
}

export async function askScoutAI<T>({
  input,
  instructions,
  schema,
  schemaName,
  model,
  reasoningEffort = "low",
  timeoutMs = 80000,
}: {
  input: unknown;
  instructions: string;
  schema: JsonSchema;
  schemaName: string;
  model: string;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: reasoningEffort },
      instructions,
      input: JSON.stringify(input),
      store: false,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI ${response.status}: ${message.slice(0, 240)}`);
  }

  const payload = (await response.json()) as ResponsePayload;
  const text = extractText(payload);
  if (!text) throw new Error("La risposta AI non contiene testo strutturato.");
  return JSON.parse(text) as T;
}
