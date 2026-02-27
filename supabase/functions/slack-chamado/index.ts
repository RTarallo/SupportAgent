// Supabase Edge Function: integração Slack — slash command /chamado, modal submit, block actions (Resolver N2 / Escalar N3).

const runtime = (globalThis as unknown as { Deno: { serve: (h: (r: Request) => Promise<Response> | Response) => void; env: { get(k: string): string | undefined } } }).Deno;

const SLACK_API = "https://slack.com/api";
const SYSTEM_PROMPT = `Você é um agente especialista em triagem de chamados de suporte de uma empresa de pagamentos. Analise o chamado abaixo e retorne APENAS um JSON válido, sem markdown.

Retorne este JSON exato (sem campos extras, sem markdown):
{
  "verdict": "N2 - Resolver" ou "N3 - Escalar",
  "prioridade": "crítica" ou "alta" ou "média" ou "baixa",
  "resumo": "resumo objetivo do problema em 1-2 frases",
  "diagnostico": "diagnóstico técnico: causa provável, impacto, contexto relevante (3-4 frases)",
  "confianca": número entre 0 e 100,
  "categoria": uma das opções: "link-de-pagamento" | "plugin" | "estorno" | "antifraude" | "split" | "boleto" | "pix" | "cartao" | "cobrança" | "conta" | "configuracao" | "outro",
  "ambiente": "producao" ou "sandbox" ou "desconhecido",
  "recorrencia": "pontual" ou "sistemico" ou "desconhecido",
  "responsabilidade": "interno" ou "cliente" ou "externo" ou "desconhecido",
  "bandeira_adquirente": "nome da bandeira ou adquirente afetado (Visa, Master, Elo, Pix, Boleto, Stone, Cielo, etc) ou null se não mencionado",
  "codigo_erro": "código de erro mencionado (ex: 51, 57, 05) com significado resumido, ou null se não mencionado",
  "impacto_financeiro": "estimativa de impacto financeiro se o cliente mencionar valores ou volume, ou null se não mencionado",
  "passos": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "tags": ["tag1", "tag2", "tag3"],
  "mensagem_n3": "mensagem formatada para passar ao time N3 com contexto completo, passos já tentados e hipótese de causa raiz (apenas se verdict for N3, senão string vazia)"
}

CRITÉRIOS DE ESCALONAMENTO:
- N3 (Escalar): bugs de código, infraestrutura/banco, erros 5xx persistentes, falhas em integrações/APIs, dados corrompidos, múltiplos usuários afetados.
- N2 (Resolver): configurações, permissões, orientações de uso, resets, problemas de uma única conta.

CRITÉRIOS DE PRIORIDADE:
- crítica: sistema completamente fora do ar, perda de dados, múltiplos clientes afetados simultaneamente.
- alta: OBRIGATORIAMENTE use "alta" quando o problema estiver relacionado ao fluxo transacional, incluindo: transações com muitas falhas ou todas recusadas, falha no estorno, transação não aparece para estornar, link de pagamento não gera, erro na integração de plugins de pagamento. Qualquer problema que impeça ou comprometa o processamento de pagamentos é automaticamente "alta".
- média: funcionalidade secundária com falha, problema afetando um único cliente sem impacto financeiro direto.
- baixa: dúvida de uso, orientação, problema cosmético, lentidão leve.

CRITÉRIOS DE RESPONSABILIDADE:
- interno: problema no sistema da empresa (bug, infraestrutura, configuração da plataforma).
- cliente: problema causado pelo próprio cliente (má configuração, saldo insuficiente, limite do cartão, dados errados).
- externo: problema em serviço de terceiro (banco emissor, bandeira fora do ar, SEFAZ, gateway).`;

function parseForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split("&")) {
    const [k, v] = part.split("=");
    if (k && v) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return out;
}

async function verifySlackSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): Promise<boolean> {
  if (!signature?.startsWith("v0=") || !timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false; // 5 min
  const sig = signature.slice(3);
  const base = `v0:${timestamp}:${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(base));
  const hex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === sig;
}

async function slackPost(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; channel?: string; ts?: string; error?: string }> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getModalView(triggerId: string, channelId: string) {
  return {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "chamado_modal",
      private_metadata: channelId,
      title: { type: "plain_text", text: "Novo Chamado" },
      submit: { type: "plain_text", text: "Enviar" },
      blocks: [
        {
          type: "input",
          block_id: "desc",
          element: {
            type: "plain_text_input",
            action_id: "desc",
            multiline: true,
            placeholder: { type: "plain_text", text: "Descreva o problema..." },
          },
          label: { type: "plain_text", text: "Descrição do problema" },
        },
        {
          type: "input",
          block_id: "cliente",
          element: {
            type: "plain_text_input",
            action_id: "cliente",
            placeholder: { type: "plain_text", text: "Nome do cliente" },
          },
          label: { type: "plain_text", text: "Cliente / Empresa" },
        },
        {
          type: "input",
          block_id: "modulo",
          element: {
            type: "static_select",
            action_id: "modulo",
            placeholder: { type: "plain_text", text: "Selecione" },
            options: [
              { text: { type: "plain_text", text: "link-de-pagamento" }, value: "link-de-pagamento" },
              { text: { type: "plain_text", text: "plugin" }, value: "plugin" },
              { text: { type: "plain_text", text: "estorno" }, value: "estorno" },
              { text: { type: "plain_text", text: "pix" }, value: "pix" },
              { text: { type: "plain_text", text: "cartao" }, value: "cartao" },
              { text: { type: "plain_text", text: "boleto" }, value: "boleto" },
              { text: { type: "plain_text", text: "antifraude" }, value: "antifraude" },
              { text: { type: "plain_text", text: "split" }, value: "split" },
              { text: { type: "plain_text", text: "relatorios" }, value: "relatorios" },
              { text: { type: "plain_text", text: "conta" }, value: "conta" },
              { text: { type: "plain_text", text: "outro" }, value: "outro" },
            ],
          },
          label: { type: "plain_text", text: "Módulo" },
        },
        {
          type: "input",
          block_id: "tentativas",
          element: {
            type: "static_select",
            action_id: "tentativas",
            placeholder: { type: "plain_text", text: "Selecione" },
            options: [
              { text: { type: "plain_text", text: "nenhuma" }, value: "nenhuma" },
              { text: { type: "plain_text", text: "basicas" }, value: "basicas" },
              { text: { type: "plain_text", text: "avancadas" }, value: "avancadas" },
              { text: { type: "plain_text", text: "exauridas" }, value: "exauridas" },
            ],
          },
          label: { type: "plain_text", text: "Tentativas N1" },
        },
      ],
    },
  };
}

function getValueFromViewState(values: Record<string, Record<string, { type?: string; value?: string; selected_option?: { value: string } }>>, blockId: string, actionId: string): string {
  const block = values[blockId];
  if (!block) return "";
  const action = block[actionId];
  if (!action) return "";
  if (action.selected_option?.value) return action.selected_option.value;
  return action.value ?? "";
}

function buildDmBlocks(r: Record<string, unknown>, ticketId: string, cliente: string, modulo: string, chamadoId: string): unknown[] {
  const pri = (r.prioridade as string) || "média";
  const priEmoji: Record<string, string> = { crítica: "🔴", alta: "🟠", média: "🟡", baixa: "🟢" };
  const emoji = priEmoji[pri] || "🟡";
  const passos = (r.passos as string[]) || [];
  const tags = (r.tags as string[]) || [];
  const intel: string[] = [];
  if (r.categoria) intel.push(`• Categoria: ${r.categoria}`);
  if (r.ambiente && r.ambiente !== "desconhecido") intel.push(`• Ambiente: ${r.ambiente}`);
  if (r.recorrencia && r.recorrencia !== "desconhecido") intel.push(`• Recorrência: ${r.recorrencia}`);
  if (r.responsabilidade && r.responsabilidade !== "desconhecido") intel.push(`• Responsabilidade: ${r.responsabilidade}`);
  if (r.impacto_financeiro) intel.push(`• Impacto financeiro: ${r.impacto_financeiro}`);

  const text = `🔺 *[${ticketId}] Chamado para Triagem*
${emoji} Prioridade: *${String(pri).toUpperCase()}*

*Cliente:* ${cliente}  |  *Módulo:* ${modulo}

*📋 Resumo*
${r.resumo || "—"}

*🔍 Diagnóstico*
${r.diagnostico || "—"}
${intel.length ? "\n*ℹ️ Detalhes*\n" + intel.join("\n") : ""}

*✅ Próximos Passos*
${passos.map((p, i) => `${i + 1}. ${p}`).join("\n") || "—"}

*🏷️ Tags:* ${tags.join(" · ") || "—"}`;

  return [
    { type: "section", text: { type: "mrkdwn", text } },
    {
      type: "actions",
      block_id: "actions_chamado",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✓ Resolver N2" },
          action_id: "resolver_n2",
          value: chamadoId,
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "🔺 Escalar para N3" },
          action_id: "escalar_n3",
          value: chamadoId,
        },
      ],
    },
  ];
}

runtime.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("", { status: 405 });

  const signingSecret = runtime.env.get("SLACK_SIGNING_SECRET");
  const botToken = runtime.env.get("SLACK_BOT_TOKEN");
  const internalKey = runtime.env.get("INTERNAL_CALL_SECRET");
  const supabaseUrl = runtime.env.get("SUPABASE_URL");
  const serviceRoleKey = runtime.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!signingSecret || !botToken) {
    return new Response(JSON.stringify({ error: "SLACK_SIGNING_SECRET ou SLACK_BOT_TOKEN não configurados." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Slack-Signature");
  const timestamp = req.headers.get("X-Slack-Request-Timestamp");

  const ok = await verifySlackSignature(rawBody, signature, timestamp, signingSecret);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const form = parseForm(rawBody);
  const payloadStr = form["payload"];

  if (payloadStr) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadStr) as Record<string, unknown>;
    } catch {
      return new Response("", { status: 400 });
    }

    const view = payload.view as Record<string, unknown> | undefined;
    const user = payload.user as Record<string, unknown> | undefined;
    if (payload.type === "view_submission" && view?.callback_id === "chamado_modal") {
      const state = view.state as Record<string, unknown> | undefined;
      const vs = (state?.values ?? {}) as Record<string, Record<string, { type?: string; value?: string; selected_option?: { value: string } }>>;
      const desc = getValueFromViewState(vs, "desc", "desc");
      const cliente = getValueFromViewState(vs, "cliente", "cliente") || "Não informado";
      const modulo = getValueFromViewState(vs, "modulo", "modulo") || "outro";
      const tentativas = getValueFromViewState(vs, "tentativas", "tentativas") || "nenhuma";
      const userId = user?.id as string | undefined;
      const targetChannel = (view?.private_metadata as string) || userId || "";
      if (!userId) {
        return new Response(JSON.stringify({ response_action: "errors", errors: { desc: "Erro: user não identificado." } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const backgroundWork = async () => {
        const userMessage = `CHAMADO:
- Descrição: ${desc}
- Cliente: ${cliente}
- Canal: slack
- Módulo/Sistema: ${modulo}
- Tentativas N1 já realizadas: ${tentativas}`;

        const triageUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/triar-chamado` : "";
        let result: Record<string, unknown> = {};
        if (triageUrl && internalKey) {
          const triageRes = await fetch(triageUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": internalKey,
            },
            body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userMessage }),
          });
          const triageText = await triageRes.text();
          console.log("RESPOSTA TRIAR:", triageText);
          let rawText = triageText;
          try {
            const triageData = JSON.parse(triageText);
            rawText = triageData.text || triageData.content || triageData.result || triageText;
          } catch {
            /* já é string pura */
          }
          rawText = rawText.replace(/```json|```/g, "").trim();
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          try {
            result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
          } catch {
            result = { resumo: "Erro ao parsear análise.", diagnostico: rawText || "—", prioridade: "média", passos: [], tags: [] };
          }
        } else {
          result = { resumo: "Triagem não configurada (INTERNAL_CALL_SECRET/SUPABASE_URL).", diagnostico: "—", prioridade: "média", passos: [], tags: [] };
        }

        const ticketId = "TK-" + String(Date.now()).slice(-6);
        const chamadoRow: Record<string, unknown> = {
          ticket_id: ticketId,
          texto_original: desc,
          cliente,
          canal: "slack",
          modulo,
          tentativas,
          slack_user_id: userId,
          verdict: result.verdict,
          prioridade: result.prioridade,
          resumo: result.resumo,
          diagnostico: result.diagnostico,
          confianca: result.confianca,
          categoria: result.categoria,
          ambiente: result.ambiente,
          recorrencia: result.recorrencia,
          responsabilidade: result.responsabilidade,
          bandeira_adquirente: result.bandeira_adquirente,
          codigo_erro: result.codigo_erro,
          impacto_financeiro: result.impacto_financeiro,
          passos: result.passos,
          tags: result.tags,
          mensagem_n3: result.mensagem_n3,
          mensagem_slack: null,
        };

        if (supabaseUrl && serviceRoleKey) {
          const insertRes = await fetch(`${supabaseUrl}/rest/v1/chamados`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify(chamadoRow),
          });
          if (insertRes.ok) {
            const inserted = await insertRes.json();
            const chamadoId = inserted[0]?.id;
            if (chamadoId) {
              const blocks = buildDmBlocks(result, ticketId, cliente, modulo, chamadoId);
              const post = await slackPost(botToken, "chat.postMessage", {
                channel: targetChannel,
                text: `[${ticketId}] Chamado para triagem`,
                blocks,
              });
              if (post.ok && post.channel && post.ts && serviceRoleKey) {
                await fetch(`${supabaseUrl}/rest/v1/chamados?id=eq.${chamadoId}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({ slack_channel: post.channel, slack_ts: post.ts }),
                });
              }
            }
          }
        } else {
          const blocks = buildDmBlocks(result, ticketId, cliente, modulo, "no-db");
          await slackPost(botToken, "chat.postMessage", {
            channel: targetChannel,
            text: `[${ticketId}] Chamado para triagem`,
            blocks,
          });
        }
      };

      (globalThis as unknown as { EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime.waitUntil(backgroundWork());

      return new Response(JSON.stringify({ response_action: "clear" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actions = payload.actions as Array<{ action_id: string; value: string }> | undefined;
    const container = payload.container as Record<string, string> | undefined;
    if (payload.type === "block_actions" && actions?.length) {
      const action = actions[0];
      const chamadoId = action.value;
      const channelId = container?.channel_id;
      const messageTs = container?.message_ts;
      if (!channelId || !messageTs || !chamadoId) {
        return new Response("", { status: 200 });
      }

      const isN2 = action.action_id === "resolver_n2";
      const label = isN2 ? "✅ Marcado para resolução N2" : "🔺 Escalado para N3";
      const verdictFinal = isN2 ? "N2" : "N3";

      const msg = payload.message as Record<string, unknown> | undefined;
      const blocks = (msg?.blocks ?? []) as Array<{ type: string }>;
      const existingBlocks = blocks.filter((b) => b.type !== "actions");
      const newBlocks = [
        ...existingBlocks,
        { type: "section", text: { type: "mrkdwn", text: label } },
      ];

      await slackPost(botToken, "chat.update", {
        channel: channelId,
        ts: messageTs,
        text: (msg?.text as string) || "Chamado atualizado",
        blocks: newBlocks,
      });

      if (supabaseUrl && serviceRoleKey) {
        await fetch(`${supabaseUrl}/rest/v1/chamados?id=eq.${chamadoId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ verdict_final: verdictFinal, resolvido_em: new Date().toISOString() }),
        });
      }

      return new Response("", { status: 200 });
    }
  }

  const command = form["command"];
  const triggerId = form["trigger_id"];
  const channelId = form["channel_id"];
  if (command === "/chamado" && triggerId) {
    const viewBody = getModalView(triggerId, channelId || "");
    const resp = await slackPost(botToken, "views.open", viewBody);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: resp.error || "views.open falhou" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("", { status: 200 });
  }

  return new Response("", { status: 200 });
});
