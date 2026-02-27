export function escapeHtml(s) {
  if (s == null) return ''
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

export function gerarMensagemSlack(r, ticketId, cliente, canal, modulo) {
  const isN3 = (r.verdict || '').includes('N3')
  const priEmoji = { crítica: '🔴', alta: '🟠', média: '🟡', baixa: '🟢' }
  const emoji = priEmoji[r.prioridade] || '🟡'
  const dataHora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const intelLines = [
    r.categoria ? `• Categoria: ${r.categoria}` : null,
    r.ambiente && r.ambiente !== 'desconhecido' ? `• Ambiente: ${r.ambiente}` : null,
    r.recorrencia && r.recorrencia !== 'desconhecido' ? `• Recorrência: ${r.recorrencia}` : null,
    r.responsabilidade && r.responsabilidade !== 'desconhecido' ? `• Responsabilidade: ${r.responsabilidade}` : null,
    r.bandeira_adquirente ? `• Bandeira/Adquirente: ${r.bandeira_adquirente}` : null,
    r.codigo_erro ? `• Código de erro: ${r.codigo_erro}` : null,
    r.impacto_financeiro ? `• Impacto financeiro: ${r.impacto_financeiro}` : null,
  ].filter(Boolean).join('\n')
  const header = isN3 ? `🔺 *[${ticketId}] Chamado Escalado para N3*` : `✅ *[${ticketId}] Chamado para Resolução N2*`
  return `${header}
${emoji} Prioridade: *${(r.prioridade || '').toUpperCase()}*

*Cliente:* ${cliente}  |  *Canal:* ${canal}  |  *Módulo:* ${modulo}

*📋 Resumo*
${r.resumo || ''}

*🔍 Diagnóstico*
${r.diagnostico || ''}
${intelLines ? `\n*ℹ️ Detalhes*\n${intelLines}` : ''}
*✅ Próximos Passos*
${(r.passos || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

*🏷️ Tags:* ${(r.tags || []).join(' · ')}

_Triado em ${dataHora}_`
}

const PRI_MAP = { crítica: 'chip-critica', alta: 'chip-alta', média: 'chip-media', baixa: 'chip-baixa' }
export function getPriorityClass(p) {
  return PRI_MAP[p] || 'chip-media'
}
