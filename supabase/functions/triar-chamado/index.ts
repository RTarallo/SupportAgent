// Supabase Edge Function: chama OpenAI em nome do cliente. API key fica no backend (secrets).

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get(key: string): string | undefined };
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY não configurada no projeto. Defina em Settings → Edge Functions → Secrets." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const internalKey = req.headers.get("X-Internal-Key");
  const authHeader = req.headers.get("Authorization");
  const isInternal = internalKey && internalKey === Deno.env.get("INTERNAL_CALL_SECRET");
  if (!isInternal && (!authHeader?.startsWith("Bearer ") || !authHeader)) {
    return new Response(
      JSON.stringify({ error: "Não autorizado. Faça login." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { systemPrompt: string; userMessage: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Body inválido. Envie { systemPrompt, userMessage }." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { systemPrompt, userMessage } = body;
  if (!systemPrompt || !userMessage) {
    return new Response(
      JSON.stringify({ error: "systemPrompt e userMessage são obrigatórios." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: "OpenAI: " + (errText || res.statusText) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e instanceof Error ? e.message : "Erro ao chamar OpenAI") }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
