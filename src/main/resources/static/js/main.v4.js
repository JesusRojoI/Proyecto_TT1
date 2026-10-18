document.addEventListener('DOMContentLoaded', async () => {

    /* ---------- Banner de tip ---------- */
    if (!sessionStorage.getItem('tipDismissed')) {
        document.getElementById('tipBanner').classList.remove('hidden');
    }
    document.getElementById('closeTipBtn').addEventListener('click', () => {
        document.getElementById('tipBanner').classList.add('hidden');
        sessionStorage.setItem('tipDismissed', '1');
    });

    /* ---------- Panel de operadores ---------- */
    const panel = document.getElementById('operatorsPanel');
    const allOperators = AR_OPERATORS.concat(Editor.DELIMITERS);
    allOperators.forEach(op => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'op-btn';
        button.textContent = op.sym;
        button.title = op.title ? (op.title + '. ' + op.desc) : 'Insertar ' + op.sym;
        button.addEventListener('click', () => Editor.insert(op.insert, op.back));
        panel.appendChild(button);
    });

    /* ---------- Botones de acción ---------- */
    document.getElementById('translateBtn').addEventListener('click', () => Translate.run());
    document.getElementById('saveBtn').addEventListener('click', () => Translate.save());
    document.getElementById('clearHistoryBtn').addEventListener('click', () => Translate.clearHistory());

    /* ---------- Ejemplos ---------- */
    document.getElementById('exampleSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            Editor.setValue(e.target.value);
        }
    });

    /* ---------- Inicialización ---------- */
    await Editor.init();
    await Connection.init();

    /* Atajo de teclado: Escape cierra paneles. */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('dictionaryPanel').classList.remove('open');
            document.getElementById('dictionaryOverlay').classList.remove('open');
            if (typeof Modal !== 'undefined') Modal.close();
        }
    });
});
