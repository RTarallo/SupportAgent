export default function ContextModal({ open, onClose, value, onChange, onSave, onClear }) {
  if (!open) return null
  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </div>
          <div>
            <div className="modal-head-title">Contexto da Operação</div>
            <div className="modal-head-sub">Injetado automaticamente em toda análise</div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="hint-box">
            💡 Descreva seus sistemas, o que você (N2) consegue resolver, o que vai para dev (N3), SLAs por cliente, integrações críticas e qualquer contexto relevante da sua operação.
          </div>
          <div className="field-group">
            <label className="field-label">Contexto</label>
            <textarea
              className="ctx-textarea"
              placeholder="Ex: Somos uma empresa SaaS B2B..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={12}
            />
          </div>
        </div>
        <div className="modal-foot">
          <span className="ctx-chars">{value.length} caracteres</span>
          <button type="button" className="btn-ghost" onClick={onClear}>Limpar</button>
          <button type="button" className="btn-primary" onClick={onSave} style={{ marginLeft: 'auto' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Salvar Contexto
          </button>
        </div>
      </div>
    </div>
  )
}
