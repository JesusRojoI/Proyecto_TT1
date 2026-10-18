/* =============================================================
   Traducción de álgebra relacional a SQL, tokenización, errores y resultados.
   ============================================================= */

const Translate = (() => {
    let lastExpression = '';

    function el(id) { return document.getElementById(id); }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderTokens(tokens) {
        const container = el('tokensContainer');
        if (!tokens || !tokens.length) {
            container.innerHTML = '<span class="text-slate-400 text-sm">No se reconocieron tokens.</span>';
            return;
        }
        let html = '';
        tokens.forEach(t => {
            html += '<span class="token-chip" title="' + escapeHtml(t.description || '') + ' (línea ' + t.line + ', columna ' + t.column + ')">' +
                '<span class="token-lexeme">' + escapeHtml(t.lexeme) + '</span>' +
                '<span class="token-type">' + escapeHtml(t.type) + '</span>' +
                '</span>';
        });
        container.innerHTML = html;
    }

    function renderError(data) {
        const box = el('errorBox');
        box.classList.remove('hidden');
        let html = '<p class="font-semibold">' + escapeHtml(data.message || 'Error al procesar la expresión.') + '</p>';
        if (data.detail) {
            html += '<p class="mt-1 text-red-700">' + escapeHtml(data.detail) + '</p>';
        }
        if (data.line && data.line > 0) {
            html += '<p class="mt-1 text-red-700"><i class="bi bi-geo-alt"></i> Línea ' + data.line +
                (data.column ? ', columna ' + data.column : '') + '</p>';
        }
        if (data.expected && data.expected.length) {
            html += '<p class="mt-1 text-red-700"><i class="bi bi-list-check"></i> Se esperaba uno de: ' +
                data.expected.map(escapeHtml).join(', ') + '</p>';
        }
        box.innerHTML = html;
    }

    function clearError() {
        el('errorBox').classList.add('hidden');
        el('errorBox').innerHTML = '';
    }

    function renderTable(execution) {
        const container = el('resultTableContainer');
        const execInfo = el('execInfo');
        if (!execution) {
            container.innerHTML = '<span class="text-slate-500">Sin ejecución (conecta una base de datos para ejecutar la consulta).</span>';
            execInfo.textContent = '';
            return;
        }
        if (execution.error) {
            container.innerHTML = '<div class="text-red-700 text-xs">' + escapeHtml(execution.error) + '</div>';
            execInfo.textContent = '';
            return;
        }
        const cols = execution.columns || [];
        const rows = execution.rows || [];
        if (rows.length === 0) {
            container.innerHTML = '<span class="text-slate-500">Consulta ejecutada. 0 filas devueltas.</span>';
            execInfo.textContent = ' — 0 filas, ' + execution.elapsedMs + ' ms';
            return;
        }
        let html = '<table class="result-table"><thead><tr>';
        cols.forEach(c => { html += '<th>' + escapeHtml(c) + '</th>'; });
        html += '</tr></thead><tbody>';
        rows.forEach(r => {
            html += '<tr>';
            cols.forEach(c => {
                const v = r[c];
                html += '<td>' + (v === null ? '<em class="text-slate-400">NULL</em>' : escapeHtml(v)) + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        execInfo.textContent = ' — ' + execution.rowCount + ' filas, ' + execution.elapsedMs + ' ms';
    }

    async function run() {
        const expression = Editor.getValue().trim();
        if (!expression) {
            Editor.focus();
            return;
        }
        lastExpression = expression;
        clearError();
        el('sqlEquivOutput').textContent = 'Procesando...';
        el('arEquivOutput').textContent = expression;
        el('treeOutput').textContent = 'Procesando...';
        el('expandedOutput').textContent = 'Procesando...';
        el('tokensContainer').innerHTML = '<span class="text-slate-400 text-sm">Tokenizando...</span>';
        el('resultTableContainer').innerHTML = '<span class="text-slate-500">Procesando...</span>';
        el('execInfo').textContent = '';

        try {
            const data = await API.translate(expression, Connection.getDatabase());
            renderTokens(data.tokens);

            if (data.status === 'success') {
                el('sqlEquivOutput').textContent = data.sql || '--';
                el('treeOutput').textContent = data.tree || '--';
                el('expandedOutput').textContent = data.expanded || data.sql || '--';
                el('historyKeys').textContent = (data.saved ? data.saved + ' guardado. ' : '') +
                    (data.historyKeys && data.historyKeys.length ? data.historyKeys : 'vacío');
                renderTable(data.execution);
            } else {
                renderError(data);
                el('sqlEquivOutput').textContent = '--';
                el('treeOutput').textContent = 'La expresión no pudo analizarse.';
                el('expandedOutput').textContent = '--';
                el('historyKeys').textContent = (data.historyKeys && data.historyKeys.length) ? data.historyKeys : 'vacío';
                el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">No se pudo ejecutar.</span>';
            }
        } catch (error) {
            renderError({ message: 'Error de conexión: ' + error.message });
            el('sqlEquivOutput').textContent = '--';
            el('treeOutput').textContent = 'Error de conexión.';
            el('expandedOutput').textContent = '--';
            el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">Error de conexión.</span>';
        }
    }

    async function save() {
        if (!lastExpression) { alert('Primero traduce una expresión.'); return; }
        const suggested = '@' + (Math.floor(Math.random() * 90) + 10);
        const varName = prompt('Nombre de la variable (ej. @1):', suggested);
        if (!varName) return;
        if (!/^@[0-9]+$/.test(varName.trim())) {
            alert('La variable debe tener el formato @n (por ejemplo @1).');
            return;
        }
        Editor.setValue(varName.trim() + ' <- ' + lastExpression);
        await run();
    }

    async function clearHistory() {
        if (!confirm('¿Limpiar todo el historial de variables?')) return;
        const data = await API.clearHistory();
        el('historyKeys').textContent = 'vacío';
        alert(data.message);
    }

    function getLast() { return lastExpression; }

    return { run, save, clearHistory, getLast, setExpression: (v) => Editor.setValue(v) };
})();
