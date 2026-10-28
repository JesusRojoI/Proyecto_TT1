document.addEventListener('DOMContentLoaded', async () => {

    /* ---------- Panel de operadores (misma anchura para todos) ---------- */
    const panel = document.getElementById('operatorsPanel');
    const catalog = AR_OPERATORS.concat(Editor.DELIMITERS);
    const groupTones = new Map(AR_OPERATOR_GROUPS.map(group => [group.id, group]));
    const groupOrder = AR_OPERATOR_GROUPS.map(group => group.id);

    groupOrder.forEach(groupId => {
        const group = groupTones.get(groupId);
        catalog.filter(op => op.group === groupId).forEach(op => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'op-btn';
            button.style.setProperty('--tone', group.tone);
            button.textContent = op.sym;
            const groupHint = group.label ? group.label + ' · ' : '';
            button.title = groupHint + (op.title ? (op.title + '. ' + op.desc) : 'Insertar ' + op.sym);
            button.setAttribute('aria-label', op.title || ('Insertar ' + op.sym));
            button.addEventListener('click', () => Editor.insert(op.insert, op.back));
            panel.appendChild(button);
        });
    });

    /* ---------- Botones de acción ---------- */
    document.getElementById('translateBtn').addEventListener('click', () => Translate.run());
    const copyButton = document.getElementById('copySqlBtn');
    if (copyButton) copyButton.addEventListener('click', () => Translate.copySql());

    /* ---------- Ejemplos ---------- */
    document.getElementById('exampleSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            Editor.setValue(e.target.value);
        }
    });

    /* ---------- Inicialización ---------- */
    await Editor.init();
    if (typeof TreeView !== 'undefined') TreeView.init();
    await Connection.init();

    /* Atajo de teclado: Escape cierra paneles. */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('dictionaryPanel').classList.remove('open');
            document.getElementById('dictionaryPanel').setAttribute('aria-hidden', 'true');
            document.getElementById('dictionaryOverlay').classList.remove('open');
            if (typeof Modal !== 'undefined') Modal.close();
        }
    });
});
