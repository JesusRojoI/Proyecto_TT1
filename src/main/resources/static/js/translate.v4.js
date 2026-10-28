/* =============================================================
   Traducción de álgebra relacional a SQL, tokenización, errores,
   resultados y preparación del diagrama con Graphviz.
   ============================================================= */

const Translate = (() => {
    let lastExpression = '';
    let lastTableHtml = '';
    let lastTableInfo = '';
    let activeVariables = [];

    function el(id) { return document.getElementById(id); }

    function setExpandEnabled(enabled) {
        const button = el('expandResultsBtn');
        if (button) button.disabled = !enabled;
    }

    function openResultModal() {
        const modal = el('resultModal');
        const body = el('resultModalBody');
        if (!modal || !body || !lastTableHtml) return;
        body.innerHTML = lastTableHtml;
        const info = el('resultModalInfo');
        if (info) info.textContent = lastTableInfo.replace(/^\s*—\s*/, '');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-locked');
        const closeButton = el('closeResultModalBtn');
        if (closeButton) closeButton.focus();
    }

    function closeResultModal() {
        const modal = el('resultModal');
        if (!modal || !modal.classList.contains('open')) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-locked');
        const expandButton = el('expandResultsBtn');
        if (expandButton) expandButton.focus();
    }

    function initResultModal() {
        const expandButton = el('expandResultsBtn');
        const closeButton = el('closeResultModalBtn');
        const modal = el('resultModal');
        if (expandButton) expandButton.addEventListener('click', openResultModal);
        if (closeButton) closeButton.addEventListener('click', closeResultModal);
        if (modal) {
            modal.addEventListener('click', event => {
                if (event.target === modal) closeResultModal();
            });
        }
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeResultModal();
        });
    }

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

    function clearBreakdown() {
        const section = el('sqlBreakdown');
        const body = el('sqlBreakdownBody');
        const badge = el('sqlBreakdownBadge');
        if (body) body.innerHTML = '';
        if (badge) badge.textContent = '0 variables';
        if (section) section.classList.add('hidden');
    }

    /**
     * Muestra, justo antes del pie de página, el SQL de cada variable implicada
     * y el SQL final con las sustituciones. Solo se llama cuando la expresión
     * procesada utiliza variables.
     */
    function renderBreakdown(data) {
        const section = el('sqlBreakdown');
        const body = el('sqlBreakdownBody');
        const badge = el('sqlBreakdownBadge');
        if (!section || !body) return;

        const items = data && data.usesVariables && Array.isArray(data.breakdown) ? data.breakdown : [];
        if (!items.length || !data.usesVariables) {
            clearBreakdown();
            return;
        }

        const defined = items.filter(item => item.defined).length;
        if (badge) {
            badge.textContent = defined === 1 ? '1 variable' : defined + ' variables';
        }

        let html = '<div class="sql-breakdown-grid">';
        items.forEach(item => {
            const isDefined = !!item.defined;
            html += '<article class="sql-breakdown-card' + (isDefined ? '' : ' is-missing') + '">' +
                '<header class="sql-breakdown-card-head">' +
                    '<span class="sql-breakdown-var">' + escapeHtml(item.name) + '</span>' +
                    '<span class="sql-breakdown-tag">' +
                        (isDefined ? 'Variable guardada' : 'Variable sin definir') +
                    '</span>' +
                '</header>' +
                '<pre class="sql-breakdown-code">' +
                    escapeHtml(isDefined ? (item.sql || '--') : 'No existe una relación guardada para ' + item.name + '.') +
                '</pre>' +
            '</article>';
        });
        html += '</div>';

        html += '<div class="sql-breakdown-final">' +
            '<div class="sql-breakdown-final-head">' +
                '<i class="bi bi-check2-circle" aria-hidden="true"></i>' +
                '<span>SQL final con las variables sustituidas</span>' +
            '</div>' +
            '<pre class="sql-breakdown-code">' + escapeHtml(data.sql || '--') + '</pre>' +
        '</div>';

        body.innerHTML = html;
        section.classList.remove('hidden');
    }

    /**
     * Historial activo de variables. Cada variable se puede insertar en el
     * editor con un clic para reutilizarla en expresiones complejas.
     */
    function renderHistory(history) {
        activeVariables = Array.isArray(history) ? history : [];
        const container = el('historyKeys');
        const hint = el('historyHint');
        const clearButton = el('clearHistoryBtn');
        if (clearButton) clearButton.disabled = activeVariables.length === 0;
        if (!container) return;

        container.innerHTML = '';
        if (activeVariables.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'history-empty';
            empty.textContent = 'Guarda una relación para reutilizarla como @n.';
            container.appendChild(empty);
            if (hint) hint.textContent = 'Ninguna variable activa';
            return;
        }

        if (hint) {
            hint.textContent = activeVariables.length === 1
                ? '1 variable disponible'
                : activeVariables.length + ' variables disponibles';
        }
        activeVariables.forEach(item => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'history-chip';
            button.textContent = item.name;
            button.title = 'Insertar ' + item.name + ' en el editor';
            button.addEventListener('click', () => {
                Editor.insert(item.name);
                Editor.focus();
            });
            container.appendChild(button);
        });
    }

    async function refreshHistory() {
        try {
            const data = await API.history();
            renderHistory(data.history);
        } catch (error) {
            renderHistory([]);
        }
    }

    function nextVariableName() {
        let max = 0;
        activeVariables.forEach(item => {
            const match = /^@(\d+)$/.exec(item.name || '');
            if (match) max = Math.max(max, Number(match[1]));
        });
        return '@' + (max + 1);
    }

    function renderTable(execution) {
        const container = el('resultTableContainer');
        const execInfo = el('execInfo');
        lastTableHtml = '';
        lastTableInfo = '';
        setExpandEnabled(false);
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
        lastTableHtml = html;
        lastTableInfo = ' — ' + execution.rowCount + ' filas, ' + execution.elapsedMs + ' ms';
        execInfo.textContent = lastTableInfo;
        setExpandEnabled(true);
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
        clearBreakdown();
        Editor.clearMarkers();
        el('sqlEquivOutput').textContent = 'Procesando...';
        const copyButton = el('copySqlBtn');
        if (copyButton) copyButton.disabled = true;
        if (typeof TreeView !== 'undefined') TreeView.clear('Generando diagrama...');
        el('tokensContainer').innerHTML = '<span class="text-slate-400 text-sm">Tokenizando...</span>';
        el('resultTableContainer').innerHTML = '<span class="text-slate-500">Procesando...</span>';
        el('execInfo').textContent = '';
        setExpandEnabled(false);
        closeResultModal();

        try {
            const data = await API.translate(rawExpression, Connection.getDatabase());
            renderTokens(data.tokens);

            if (data.status === 'success') {
                el('sqlEquivOutput').textContent = data.sql || '--';
                if (copyButton) copyButton.disabled = false;
                if (typeof TreeView !== 'undefined') TreeView.setTree(data.treeDot, data.treeData);
                renderBreakdown(data);
                renderHistory(data.history);
                renderTable(data.execution);
            } else {
                renderError(data);
                if (Number.isInteger(data.offset)) {
                    Editor.showError(data.offset, data.errorLength, data.message || 'Error de análisis');
                }
                if (typeof TreeView !== 'undefined') TreeView.clear('La expresión no pudo analizarse.');
                el('sqlEquivOutput').textContent = '--';
                el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">No se pudo ejecutar.</span>';
                lastTableHtml = '';
                setExpandEnabled(false);
                clearBreakdown();
                renderHistory(data.history);
            }
        } catch (error) {
            renderError({ message: 'Error de conexión: ' + error.message });
            if (typeof TreeView !== 'undefined') TreeView.clear('Error de conexión.');
            el('sqlEquivOutput').textContent = '--';
            el('resultTableContainer').innerHTML = '<span class="text-red-700 text-xs">Error de conexión.</span>';
            lastTableHtml = '';
            setExpandEnabled(false);
            clearBreakdown();
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

    async function save() {
        const expression = Editor.getValue().trim();
        if (!expression) {
            alert('Primero escribe o traduce una expresión de álgebra relacional.');
            Editor.focus();
            return;
        }
        if (/^@\d+\s*<-/.test(expression)) {
            alert('La expresión ya es una asignación. Para guardarla, usa otra variable o edítala antes de guardar.');
            return;
        }
        const suggested = nextVariableName();
        const varName = prompt('Nombre de la variable (formato @n):', suggested);
        if (!varName) return;
        const cleanName = varName.trim();
        if (!/^@[0-9]+$/.test(cleanName)) {
            alert('La variable debe tener el formato @n (por ejemplo @1).');
            return;
        }
        if (activeVariables.some(item => item.name === cleanName)) {
            const overwrite = confirm(cleanName + ' ya existe. ¿Deseas reemplazar su relación guardada?');
            if (!overwrite) return;
        }
        Editor.setValue(cleanName + ' <- ' + expression);
        await run();
    }

    async function clearHistory() {
        if (!activeVariables.length) return;
        if (!confirm('¿Limpiar todas las variables guardadas en esta sesión?')) return;
        try {
            const data = await API.clearHistory();
            renderHistory(data.history);
            clearBreakdown();
            alert(data.message || 'Historial limpiado.');
        } catch (error) {
            renderError({ message: 'No se pudo limpiar el historial: ' + error.message });
        }
    }

    return {
        run, save, clearHistory, refreshHistory, copySql, getLast, initResultModal,
        setExpression: (v) => Editor.setValue(v)
    };
})();
