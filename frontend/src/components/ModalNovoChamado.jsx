import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSupabase } from '../lib/supabase'
import { SYSTEM_PROMPT } from '../constants'
import { gerarMensagemSlack } from '../utils'

const CANAL_OPTS = [
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'chat', label: 'Chat' },
  { value: 'portal', label: 'Portal' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'slack', label: 'Slack' },
]

const MODULO_OPTS = [
  'link-de-pagamento', 'plugin', 'estorno', 'pix', 'cartao', 'boleto', 'antifraude', 'split', 'relatorios', 'conta', 'outro',
]

const TENTATIVAS_OPTS = [
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'basicas', label: 'Básicas' },
  { value: 'avancadas', label: 'Avançadas' },
  { value: 'exauridas', label: 'Exauridas' },
]

function gerarTicketId() {
  const tc = parseInt(localStorage.getItem('tc') || '0', 10) + 1
  localStorage.setItem('tc', String(tc))
  return 'TK-' + String(tc).padStart(4, '0')
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function ModalNovoChamado({ open, onClose, onCreated }) {
  const { session } = useAuth()
  const [descricao, setDescricao] = useState('')
  const [cliente, setCliente] = useState('')
  const [canal, setCanal] = useState('email')
  const [modulo, setModulo] = useState('outro')
  const [tentativas, setTentativas] = useState('nenhuma')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setDescricao('')
    setCliente('')
    setCanal('email')
    setModulo('outro')
    setTentativas('nenhuma')
    setError('')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const texto = descricao.trim()
    if (!texto) {
      setError('Informe a descrição do problema.')
      return
    }
    if (!session?.access_token) {
      setError('Sessão expirada. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    if (!supabase) {
      setError('Supabase não configurado.')
      setLoading(false)
      return
    }

    let operationContext = ''
    const { data: ctxRow } = await supabase.from('contexto_operacao').select('body').eq('user_id', session.user.id).maybeSingle()
    if (ctxRow?.body) operationContext = ctxRow.body

    const userMessage = `${operationContext ? `CONTEXTO DA OPERAÇÃO (use sempre como referência):\n${operationContext}\n\n` : ''}CHAMADO:
- Descrição: ${texto}
- Cliente: ${cliente || 'Não informado'}
- Canal: ${canal}
- Módulo/Sistema: ${modulo}
- Tentativas N1 já realizadas: ${tentativas}`

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/triar-chamado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || res.statusText || 'Erro na análise')
      const rawText = (data.text || '').replace(/```json|```/g, '').trim()
      const result = JSON.parse(rawText)
      const ticketId = gerarTicketId()
      const slackMsg = gerarMensagemSlack(result, ticketId, cliente || 'Não informado', canal, modulo)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não encontrado')
      await supabase.from('chamados').insert({
        user_id: user.id,
        ticket_id: ticketId,
        texto_original: texto,
        cliente: cliente || null,
        canal: canal,
        modulo: modulo,
        tentativas: tentativas,
        contexto_operacao: operationContext || null,
        verdict: result.verdict,
        prioridade: result.prioridade,
        resumo: result.resumo,
        diagnostico: result.diagnostico,
        confianca: result.confianca ?? null,
        categoria: result.categoria || null,
        ambiente: result.ambiente || null,
        recorrencia: result.recorrencia || null,
        responsabilidade: result.responsabilidade || null,
        bandeira_adquirente: result.bandeira_adquirente || null,
        codigo_erro: result.codigo_erro || null,
        impacto_financeiro: result.impacto_financeiro || null,
        passos: result.passos || null,
        tags: result.tags || null,
        mensagem_n3: result.mensagem_n3 || null,
        mensagem_slack: slackMsg,
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao criar chamado.')
    }
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && !loading && (reset(), onClose())}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div className="modal-head-title">Novo Chamado</div>
          <button type="button" className="btn-close" onClick={() => !loading && (reset(), onClose())}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error visible" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field-group">
              <label className="field-label">Descrição do problema *</label>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o problema..." rows={4} required />
            </div>
            <div className="field-group">
              <label className="field-label">Cliente / Empresa</label>
              <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="field-group">
              <label className="field-label">Canal</label>
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                {CANAL_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Módulo</label>
              <select value={modulo} onChange={(e) => setModulo(e.target.value)}>
                {MODULO_OPTS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Tentativas N1</label>
              <select value={tentativas} onChange={(e) => setTentativas(e.target.value)}>
                {TENTATIVAS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={() => !loading && (reset(), onClose())} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Criando...</> : 'Criar e analisar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
