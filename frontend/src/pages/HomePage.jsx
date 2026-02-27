import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getSupabase } from '../lib/supabase'
import { CHAMADOS_SELECT } from '../constants'
import { getPriorityClass } from '../utils'
import ModalNovoChamado from '../components/ModalNovoChamado'

const PAGE_SIZE = 20
const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'n2', label: 'N2' },
  { key: 'n3', label: 'N3' },
  { key: 'resolvidos', label: 'Resolvidos' },
]

function startOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function statusLabel(chamado) {
  if (chamado.resolvido_em) return 'Resolvido'
  if (chamado.verdict_final === 'N3') return 'N3'
  if (chamado.verdict_final === 'N2') return 'N2'
  return 'Pendente'
}

function statusClass(chamado) {
  if (chamado.resolvido_em) return 'hi-status-ok'
  if (chamado.verdict_final) return 'hi-status-inprogress'
  return 'hi-status-pending'
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({ total: 0, pendentes: 0, n3Mes: 0, tempoMedioHoras: null })
  const [chartPrioridade, setChartPrioridade] = useState([])
  const [chartCategorias, setChartCategorias] = useState([])
  const [chamados, setChamados] = useState([])
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)

  const loadMetrics = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const startMonth = startOfMonthISO()

    const [rTotal, rPendentes, rN3Mes, rResolvidos] = await Promise.all([
      supabase.from('chamados').select('*', { count: 'exact', head: true }),
      supabase.from('chamados').select('*', { count: 'exact', head: true }).is('verdict_final', null),
      supabase.from('chamados').select('*', { count: 'exact', head: true }).eq('verdict_final', 'N3').gte('created_at', startMonth),
      supabase.from('chamados').select('created_at, resolvido_em').not('resolvido_em', 'is', null),
    ])

    let tempoMedio = null
    if (rResolvidos.data?.length) {
      const horas = rResolvidos.data.map((c) => (new Date(c.resolvido_em) - new Date(c.created_at)) / (1000 * 60 * 60))
      tempoMedio = horas.reduce((a, b) => a + b, 0) / horas.length
    }

    setMetrics({
      total: rTotal.count ?? 0,
      pendentes: rPendentes.count ?? 0,
      n3Mes: rN3Mes.count ?? 0,
      tempoMedioHoras: tempoMedio != null ? Math.round(tempoMedio * 10) / 10 : null,
    })
  }, [])

  const loadCharts = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data: rows } = await supabase.from('chamados').select('prioridade, categoria')
    if (!rows?.length) {
      setChartPrioridade([])
      setChartCategorias([])
      return
    }
    const priCount = {}
    const catCount = {}
    rows.forEach((r) => {
      const p = r.prioridade || '—'
      priCount[p] = (priCount[p] || 0) + 1
      const c = r.categoria || 'outro'
      catCount[c] = (catCount[c] || 0) + 1
    })
    setChartPrioridade(Object.entries(priCount).map(([name, value]) => ({ name, value })))
    const topCat = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
    setChartCategorias(topCat)
  }, [])

  const loadChamados = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    setLoading(true)
    let q = supabase.from('chamados').select(CHAMADOS_SELECT, { count: 'exact' }).order('created_at', { ascending: false })

    if (filter === 'pendentes') q = q.is('verdict_final', null)
    else if (filter === 'n2') q = q.eq('verdict_final', 'N2')
    else if (filter === 'n3') q = q.eq('verdict_final', 'N3')
    else if (filter === 'resolvidos') q = q.not('resolvido_em', 'is', null)

    if (search.trim()) {
      const s = search.trim()
      q = q.or(`ticket_id.ilike.%${s}%,cliente.ilike.%${s}%`)
    }

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, count, error } = await q.range(from, to)
    if (error) {
      setChamados([])
      setTotalCount(0)
    } else {
      setChamados(data || [])
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }, [filter, search, page])

  useEffect(() => {
    loadMetrics()
    loadCharts()
  }, [loadMetrics, loadCharts])

  useEffect(() => {
    loadChamados()
  }, [loadChamados])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="app-wrap">
      <header className="header-home">
        <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <div className="logo-mark">D</div>
          <span className="logo-text">Divi</span>
        </div>
        <div className="header-right">
          <span className="header-user" title={user?.email || ''}>
            {user?.email || user?.user_metadata?.name || 'Usuário'}
          </span>
          <button type="button" className="btn-primary" onClick={() => setModalNovo(true)}>
            + Novo Chamado
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="dashboard-cards">
          <div className="metric-card">
            <div className="metric-value">{metrics.total}</div>
            <div className="metric-label">Total de chamados</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.pendentes}</div>
            <div className="metric-label">Pendentes</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.n3Mes}</div>
            <div className="metric-label">Escalados N3 (mês)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.tempoMedioHoras != null ? `${metrics.tempoMedioHoras}h` : '—'}</div>
            <div className="metric-label">Tempo médio resolução</div>
          </div>
        </section>

        <section className="dashboard-charts">
          <div className="chart-card">
            <div className="chart-title">Volume por prioridade</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartPrioridade} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--light)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-title">Top 5 categorias</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={chartCategorias} margin={{ top: 8, right: 24, left: 60, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--light)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="list-section">
          <div className="list-toolbar">
            <div className="filter-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={filter === f.key ? 'filter-tab active' : 'filter-tab'}
                  onClick={() => { setFilter(f.key); setPage(0); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por cliente ou ticket..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="state-center" style={{ minHeight: 200 }}>
                <div className="spinner" />
              </div>
            ) : (
              <table className="chamados-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Cliente</th>
                    <th>Módulo</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/chamado/${c.id}`)} className="row-clickable">
                      <td>{c.ticket_id}</td>
                      <td><span className={`chip ${getPriorityClass(c.prioridade)}`}>▲ {c.prioridade || '—'}</span></td>
                      <td><span className={`hi-status ${statusClass(c)}`}>{statusLabel(c)}</span></td>
                      <td>{c.cliente || '—'}</td>
                      <td>{c.modulo || '—'}</td>
                      <td>{c.created_at ? new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button type="button" className="btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span className="pagination-info">
                Página {page + 1} de {totalPages} ({totalCount} itens)
              </span>
              <button type="button" className="btn-ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </button>
            </div>
          )}
        </section>
      </main>

      <ModalNovoChamado open={modalNovo} onClose={() => setModalNovo(false)} onCreated={() => { loadMetrics(); loadCharts(); loadChamados(); }} />
    </div>
  )
}
