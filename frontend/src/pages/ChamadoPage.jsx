import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSupabase } from '../lib/supabase'
import { CHAMADOS_SELECT } from '../constants'
import { getPriorityClass } from '../utils'
import PostMortemModal from '../components/PostMortemModal'

export default function ChamadoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chamado, setChamado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [classifyLoading, setClassifyLoading] = useState(null)
  const [postMortemOpen, setPostMortemOpen] = useState(false)
  const [postMortemLoading, setPostMortemLoading] = useState(false)

  const loadChamado = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !id) return
    const { data, error } = await supabase.from('chamados').select(CHAMADOS_SELECT).eq('id', id).single()
    setChamado(error ? null : data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadChamado()
  }, [loadChamado])

  async function classificarChamado(tipo) {
    if (!id) return
    const supabase = getSupabase()
    if (!supabase) return
    setClassifyLoading(tipo)
    const { error } = await supabase.from('chamados').update({ verdict_final: tipo }).eq('id', id)
    setClassifyLoading(null)
    if (!error) await loadChamado()
  }

  async function confirmPostMortem(text) {
    if (!id) return
    const supabase = getSupabase()
    if (!supabase) return
    setPostMortemLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    await supabase.from('chamados').update({
      post_mortem: text,
      post_mortem_autor: u?.email || '',
      post_mortem_em: now,
      resolvido_em: now,
    }).eq('id', id)
    setPostMortemLoading(false)
    setPostMortemOpen(false)
    await loadChamado()
  }

  if (loading) {
    return (
      <div className="app-wrap">
        <div className="state-center" style={{ minHeight: '80vh' }}>
          <div className="spinner" />
          <div className="state-title">Carregando chamado...</div>
        </div>
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="app-wrap">
        <div className="state-center" style={{ minHeight: '80vh' }}>
          <div className="state-icon">⚠️</div>
          <div className="state-title">Chamado não encontrado</div>
          <button type="button" className="btn-primary" onClick={() => navigate('/home')}>Voltar ao início</button>
        </div>
      </div>
    )
  }

  const c = chamado

  return (
    <div className="app-wrap">
      <header className="header-home">
        <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <div className="logo-mark">D</div>
          <span className="logo-text">Divi</span>
        </div>
        <div className="header-right">
          <span className="header-user" title={user?.email || ''}>{user?.email || 'Usuário'}</span>
          <button type="button" className="btn-ghost" onClick={() => navigate('/home')}>← Voltar</button>
        </div>
      </header>

      <main className="home-main" style={{ maxWidth: 720 }}>
        <div className="summary-view">
          <button type="button" className="btn-ghost btn-back" onClick={() => navigate('/home')}>← Voltar</button>
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 6 }}>
              <span className="card-header-title">{c.ticket_id || '—'}</span>
              <span className={`chip ${getPriorityClass(c.prioridade)}`}>▲ {c.prioridade || '—'}</span>
              <span className={`status-badge ${c.resolvido_em ? 'status-badge-ok' : c.verdict_final ? 'status-badge-inprogress' : 'status-badge-pending'}`}>
                {c.resolvido_em ? '✓ Resolvido' : c.verdict_final ? (c.verdict_final === 'N3' ? '🔺 N3 · Em andamento' : '🔵 N2 · Em andamento') : '● Pendente'}
              </span>
              {!c.resolvido_em && c.verdict_final && (
                <button type="button" className="btn-resolve" style={{ marginLeft: 'auto' }} onClick={() => setPostMortemOpen(true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Concluir Chamado
                </button>
              )}
            </div>
            <div className="card-body">
              <div className="meta-line">
                {`Cliente: ${c.cliente || '—'}  ·  Canal: ${c.canal || '—'}  ·  Módulo: ${c.modulo || '—'}  ·  ${c.created_at ? new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}`}
              </div>
              <div className="section-label">Resumo</div>
              <div className="section-text">{c.resumo || '—'}</div>
              <div className="divider" style={{ margin: '12px 0' }} />
              <div className="section-label">Diagnóstico</div>
              <div className="section-text">{c.diagnostico || '—'}</div>
              <div className="section-label" style={{ marginTop: 12 }}>Próximos passos</div>
              <div>
                {(Array.isArray(c.passos) ? c.passos : []).length ? c.passos.map((p, i) => (
                  <div key={i} className="step-item">
                    <div className="step-num">{i + 1}</div>
                    <div className="step-text">{typeof p === 'string' ? p : String(p)}</div>
                  </div>
                )) : '—'}
              </div>
              <div className="section-label" style={{ marginTop: 12 }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Array.isArray(c.tags) ? c.tags : []).length ? c.tags.map((t, i) => <span key={i} className="tag">{t}</span>) : '—'}
              </div>
              {c.resolvido_em && (
                <>
                  <div className="section-label" style={{ marginTop: 14 }}>POST MORTEM</div>
                  <div className="section-text">{c.post_mortem || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--medium)', marginTop: 6 }}>
                    {(c.post_mortem_autor ? `Registrado por ${c.post_mortem_autor}` : '') + (c.post_mortem_em ? ` · ${new Date(c.post_mortem_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '')}
                  </div>
                </>
              )}
              {c.resolvido_em && (
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: c.verdict_final === 'N3' ? '#D5164F' : '#03733F' }}>
                  {c.verdict_final === 'N3' ? '🔺' : '✅'} {c.verdict_final === 'N3' ? 'Escalado para N3' : 'Classificado como N2'} · Resolvido em {new Date(c.resolvido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {!c.resolvido_em && c.verdict_final && (
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: c.verdict_final === 'N3' ? '#D5164F' : '#0F2D85' }}>
                  {c.verdict_final === 'N3' ? '🔺' : '🔵'} {c.verdict_final === 'N3' ? 'Escalado para N3' : 'Classificado como N2'} · aguardando conclusão
                </div>
              )}
              {!c.resolvido_em && !c.verdict_final && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-resolve" onClick={() => classificarChamado('N2')} disabled={!!classifyLoading}>
                    {classifyLoading === 'N2' ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Salvando...</> : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Classificar como N2</>}
                  </button>
                  <button type="button" className="btn-resolve btn-resolve-n3" onClick={() => classificarChamado('N3')} disabled={!!classifyLoading}>
                    {classifyLoading === 'N3' ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Salvando...</> : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> Escalar para N3</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PostMortemModal open={postMortemOpen} onClose={() => setPostMortemOpen(false)} onConfirm={confirmPostMortem} loading={postMortemLoading} />
    </div>
  )
}
