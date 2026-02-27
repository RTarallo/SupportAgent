import { useState, useEffect } from 'react'
import { MIN_POSTMORTEM_CHARS } from '../constants'

export default function PostMortemModal({ open, onClose, onConfirm, loading }) {
  const [text, setText] = useState('')
  const len = (text || '').trim().length
  const valid = len >= MIN_POSTMORTEM_CHARS

  useEffect(() => {
    if (open) setText('')
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <div className="modal-head-title">Concluir Chamado</div>
            <div className="modal-head-sub">Registre o post mortem antes de fechar</div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">O que foi identificado e feito?</label>
            <textarea
              className="postmortem-textarea"
              placeholder="Descreva o que foi identificado, as ações tomadas e o resultado..."
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            <div className={`postmortem-counter ${valid ? 'valid' : ''}`}>
              {valid ? `${len} caracteres` : `${len} caracteres — mínimo ${MIN_POSTMORTEM_CHARS}`}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} disabled={!valid || loading} onClick={() => onConfirm((text || '').trim())}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Salvando...</span>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Concluir</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
