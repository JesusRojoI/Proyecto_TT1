/* =============================================================
   Traducción de álgebra relacional a SQL, tokenización, errores,
   resultados y preparación del diagrama con Graphviz.
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
            html += '<span class="token-chip" title="' + escapeHtml(t.description || '') +
                ' (línea ' + t.line + ', columna ' + t.column + ')">' +
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
        if (Number.isInteger(data.position)) {
            let location = '';
            if (data.line && data.line > 0) {
                location = ' · línea ' + data.line + (data.column ? ', columna ' + data.column : '');
            }
            html += '<p class="error-position mt-2"><i class="bi bi-cursor-text"></i> ' +
                'Posición del error: carácter <strong>' + data.position + '</strong>' + location + '</p>';
        } else if (data.line && data.line > 0) {
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
        const box = el('errorBox');
        box.classList.add('hidden');
        box.innerHTML = '';
    }

    function renderTable(execution) {
        const container = el('resultTableContainer');
        const execInfo = el('execInfo');
        if (!execution) {
            container.innerHTML = '<span class="text-slate-500">Sin ejecución: conecta una base de datos para ejecutar la consulta.</span>';
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
        const rawExpression = Editor.getValue();
        const expression = rawExpression.trim();
        if (!expression) {
            clearError();
            Editor.clearMarkers();
            Editor.focus();
            return;
        }
        lastExpression = expression;
        clearError();
        Editor.clearMarkers();
        el('sqlEquivOutput').textContent = 'Procesando...';
        const copyButton = el('copySqlBtn');
        if (copyButton) copyButton.disabled = true;
        if (typeof TreeView !== 'undefined') TreeView.clear('Generando diagrama...');
        el('tokensContainer').innerHTML = '<span class="text-slate-400 text-sm">Tokenizando...</span>';
        el('resultTableContainer').innerHTML = '<span class="text-slate-500">Procesando...</span>';
        el('execInfo').textContent = '';

        try {
            const data = await API.translate(rawExpression, Connection.getDatabase());
            renderTokens(data.tokens);

            if (data.status === 'success') {
                el('sqlEquivOutput').textContent = data.sql || '--';
                if (copyButton) copyButton.disabled = false;
                if (typeof TreeView !== 'undefined') TreeView.setTree(data.treeDot, data.treeData);
                renderTable(data.execution);
            } else {
                renderError(data);
                if (Number.isInteger(data.offset)) {
                    Editor.showError(data.offset, data.errorLength, data.message || 'Error de análisis');
                }
                if (typeof TreeView !== 'undefined') TreeView.clear('La expresión no pudo analizarse.');
                el('sqlEquivOutput').textContent = '--';
                el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">No se pudo ejecutar.</span>';
            }
        } catch (error) {
            renderError({ message: 'Error de conexión: ' + error.message });
            if (typeof TreeView !== 'undefined') TreeView.clear('Error de conexión.');
            el('sqlEquivOutput').textContent = '--';
            el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">Error de conexión.</span>';
        }
    }

    function getLast() { return lastExpression; }

    async function copySql() {
        const text = el('sqlEquivOutput').textContent || '';
        if (!text || text === '--' || text === 'Procesando...') return;
        try {
            await navigator.clipboard.writeText(text);
            const button = el('copySqlBtn');
            if (button) {
                const original = button.innerHTML;
                button.innerHTML = '<i class="bi bi-check2"></i> Copiado';
                window.setTimeout(() => { button.innerHTML = original; }, 1600);
            }
        } catch (e) {
            const box = el('errorBox');
            box.classList.remove('hidden');
            box.innerHTML = '<p class="font-semibold">No se pudo copiar el SQL al portapapeles.</p>';
        }
    }

    return { run, copySql, getLast, setExpression: (v) => Editor.setValue(v) };
})();
