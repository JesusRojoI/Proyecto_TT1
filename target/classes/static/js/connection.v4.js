/* =============================================================
   Conexión con MySQL, selección de base de datos y diccionario de datos.
   ============================================================= */

const Connection = (() => {
    let databases = [];
    let current = '';
    let dictionary = null;
    let onChangeCallback = null;

    function el(id) { return document.getElementById(id); }

    function status(message, kind) {
        const box = el('connectionMessage');
        const colors = {
            info: 'text-slate-500',
            ok: 'text-emerald-700',
            error: 'text-red-700'
        };
        box.className = 'connection-message text-xs ' + (colors[kind] || colors.info);
        box.textContent = message;
    }

    async function init() {
        el('connectBtn').addEventListener('click', connect);
        el('disconnectBtn').addEventListener('click', disconnect);
        el('openDictionaryBtn').addEventListener('click', openDictionary);
        el('closeDictionaryBtn').addEventListener('click', closeDictionary);
        el('dictionaryOverlay').addEventListener('click', closeDictionary);
        el('dictionarySearch').addEventListener('input', renderDictionary);

        el('databaseSelect').addEventListener('change', async () => {
            current = el('databaseSelect').value;
            dictionary = null;
            await loadDictionary();
            if (onChangeCallback) onChangeCallback(current);
        });

        try {
            const statusInfo = await API.connection();
            if (statusInfo.connected) {
                databases = statusInfo.databases || [];
                applyConnection(statusInfo);
                await loadDictionary();
            }
        } catch (e) {
            /* sin conexión previa */
        }
    }

    async function connect() {
        const host = el('connHost').value.trim();
        const port = el('connPort').value.trim();
        const user = el('connUser').value.trim();
        const password = el('connPassword').value;
        status('Conectando con MySQL...', 'info');
        el('connectBtn').disabled = true;
        try {
            const result = await API.connect(host, port, user, password);
            if (result.status === 'success') {
                databases = result.databases || [];
                applyConnection(result);
                status(result.message, 'ok');
                await loadDictionary();
            } else {
                status(result.message || 'No se pudo conectar.', 'error');
            }
        } catch (e) {
            status('Error de conexión: ' + e.message, 'error');
        } finally {
            el('connectBtn').disabled = false;
        }
    }

    async function disconnect() {
        await API.disconnect();
        databases = [];
        current = '';
        dictionary = null;
        el('connectionForm').classList.remove('hidden');
        el('connectionInfo').classList.add('hidden');
        el('exampleSelect').innerHTML = '<option value="">-- Selecciona un ejemplo --</option>';
        if (typeof Editor !== 'undefined') Editor.setDictionary(null);
        status('Conexión cerrada.', 'info');
        if (onChangeCallback) onChangeCallback('');
    }

    function applyConnection(info) {
        el('connectionForm').classList.add('hidden');
        el('connectionInfo').classList.remove('hidden');
        el('connSummary').innerHTML =
            '<i class="bi bi-check-circle text-emerald-600"></i> Conectado a <strong>' +
            escapeHtml(info.user) + '@' + escapeHtml(info.host) + ':' + info.port + '</strong>' +
            (info.serverVersion ? ' &middot; MySQL ' + escapeHtml(info.serverVersion) : '');

        const select = el('databaseSelect');
        select.innerHTML = '';
        if (!databases.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(sin bases de datos)';
            select.appendChild(opt);
            return;
        }
        databases.forEach(db => {
            const opt = document.createElement('option');
            opt.value = db;
            opt.textContent = db;
            select.appendChild(opt);
        });
        current = databases[0];
        select.value = current;
        if (onChangeCallback) onChangeCallback(current);
    }

    async function openDictionary() {
        if (!current) {
            status('Selecciona una base de datos para ver su diccionario.', 'error');
            return;
        }
        el('dictionaryPanel').classList.add('open');
        el('dictionaryPanel').setAttribute('aria-hidden', 'false');
        el('dictionaryOverlay').classList.add('open');
        el('dictionaryTitle').textContent = current;
        await loadDictionary();
    }

    function closeDictionary() {
        el('dictionaryPanel').classList.remove('open');
        el('dictionaryPanel').setAttribute('aria-hidden', 'true');
        el('dictionaryOverlay').classList.remove('open');
    }

    async function loadDictionary() {
        el('dictionaryBody').innerHTML = '<p class="text-slate-400 text-sm">Cargando diccionario...</p>';
        try {
            dictionary = await API.dictionary(current);
            if (dictionary.error) {
                if (typeof Editor !== 'undefined') Editor.setDictionary(null);
                el('dictionaryBody').innerHTML = '<p class="text-red-700 text-sm">' + escapeHtml(dictionary.error) + '</p>';
                return;
            }
            if (typeof Editor !== 'undefined') Editor.setDictionary(dictionary);
            buildExamples(dictionary);
            renderDictionary();
        } catch (e) {
            el('dictionaryBody').innerHTML = '<p class="text-red-700 text-sm">Error: ' + escapeHtml(e.message) + '</p>';
        }
    }

    function renderDictionary() {
        if (!dictionary) return;
        const filter = el('dictionarySearch').value.trim().toLowerCase();
        const tables = dictionary.tables || [];
        const fks = dictionary.foreignKeys || [];

        const fkByTable = {};
        fks.forEach(fk => {
            (fkByTable[fk.table] = fkByTable[fk.table] || []).push(fk);
        });

        let shown = 0;
        let html = '';
        tables.forEach((table, idx) => {
            const columns = table.columns || [];
            const matches = !filter ||
                table.name.toLowerCase().includes(filter) ||
                columns.some(c => c.name.toLowerCase().includes(filter));
            if (!matches) return;
            shown++;

            const collapsibleId = 'table-' + idx;
            html += '<div class="dict-table border border-slate-200 rounded-sm mb-3">';
            html += '<div class="dict-table-header flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" data-toggle="' + collapsibleId + '">';
            html += '<div class="flex items-center gap-2">';
            html += '<i class="bi bi-caret-right-fill text-slate-400 dict-caret"></i>';
            html += '<i class="bi bi-table text-blue-800"></i>';
            html += '<span class="font-semibold text-slate-700 dict-table-name cursor-pointer hover:underline" data-table="' + escapeAttr(table.name) + '">' + escapeHtml(table.name) + '</span>';
            html += '<span class="text-xs text-slate-400">' + columns.length + ' atributos</span>';
            if (table.comment) html += '<span class="text-xs text-slate-400 italic">' + escapeHtml(table.comment) + '</span>';
            html += '</div>';
            html += '<button class="text-xs font-medium text-blue-900 hover:text-white hover:bg-blue-900 border border-blue-900 px-2 py-1 rounded-sm transition" data-preview="' + escapeAttr(table.name) + '"><i class="bi bi-eye"></i> Ver datos</button>';
            html += '</div>';

            html += '<div id="' + collapsibleId + '" class="dict-table-body hidden">';
            html += '<table class="dict-columns w-full text-sm"><thead><tr>';
            html += '<th>Atributo</th><th>Tipo</th><th>Llave</th><th>Nulo</th><th>Predeterminado</th><th>Extra</th><th>Comentario</th>';
            html += '</tr></thead><tbody>';
            columns.forEach(col => {
                const keyBadge = col.key === 'PRI' ? '<span class="badge badge-pk">PK</span>'
                    : col.key === 'UNI' ? '<span class="badge badge-uni">UNI</span>'
                    : col.key === 'MUL' ? '<span class="badge badge-fk">FK</span>' : '';
                html += '<tr>';
                html += '<td class="font-medium text-slate-700">' + escapeHtml(col.name) + '</td>';
                html += '<td class="text-slate-500">' + escapeHtml(col.type || col.dataType || '') + '</td>';
                html += '<td>' + keyBadge + '</td>';
                html += '<td>' + (col.nullable ? 'Sí' : 'No') + '</td>';
                html += '<td class="text-slate-500">' + (col.defaultValue === null || col.defaultValue === undefined ? '—' : escapeHtml(String(col.defaultValue))) + '</td>';
                html += '<td class="text-slate-500">' + (col.extra ? escapeHtml(col.extra) : '—') + '</td>';
                html += '<td class="text-slate-500">' + (col.comment ? escapeHtml(col.comment) : '—') + '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';

            const rels = fkByTable[table.name] || [];
            if (rels.length) {
                html += '<div class="px-3 pb-3 text-xs text-slate-500">';
                rels.forEach(fk => {
                    html += '<div><i class="bi bi-arrow-right-short"></i> <strong>' + escapeHtml(fk.column) + '</strong> &rarr; ' +
                        escapeHtml(fk.referencedTable) + '.' + escapeHtml(fk.referencedColumn) + '</div>';
                });
                html += '</div>';
            }

            html += '</div></div>';
        });

        if (!shown) {
            html = '<p class="text-slate-400 text-sm">No se encontraron tablas que coincidan con la búsqueda.</p>';
        }
        el('dictionaryBody').innerHTML = html;
        el('dictionaryCount').textContent = shown + ' / ' + tables.length + ' tablas';

        el('dictionaryBody').querySelectorAll('[data-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('[data-preview]') || e.target.closest('[data-table]')) return;
                const body = document.getElementById(header.getAttribute('data-toggle'));
                body.classList.toggle('hidden');
                const caret = header.querySelector('.dict-caret');
                if (caret) caret.className = body.classList.contains('hidden')
                    ? 'bi bi-caret-right-fill text-slate-400 dict-caret'
                    : 'bi bi-caret-down-fill text-slate-400 dict-caret';
            });
        });
        el('dictionaryBody').querySelectorAll('[data-preview]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Modal.preview(current, btn.getAttribute('data-preview'));
            });
        });
        el('dictionaryBody').querySelectorAll('[data-table]').forEach(nameEl => {
            nameEl.addEventListener('click', (e) => {
                e.stopPropagation();
                Modal.preview(current, nameEl.getAttribute('data-table'));
            });
        });
    }

    function buildExamples(dict) {
        const select = el('exampleSelect');
        select.innerHTML = '<option value="">-- Selecciona un ejemplo --</option>';
        const tables = dict.tables || [];
        if (!tables.length) return;

        const examples = [];
        const first = tables[0];
        const cols = (first.columns || []).map(c => c.name);
        const c1 = cols[0] || 'id';

        examples.push({ v: first.name, label: 'Tabla completa: ' + first.name });
        if (cols.length) {
            examples.push({
                v: 'π(' + cols.slice(0, Math.min(3, cols.length)).join(', ') + ')(' + first.name + ')',
                label: 'Proyección sobre ' + first.name
            });
            examples.push({
                v: 'σ(' + c1 + ' > 0)(' + first.name + ')',
                label: 'Selección sobre ' + first.name
            });
        }
        if (tables[1]) {
            examples.push({ v: first.name + ' ⋈ ' + tables[1].name, label: 'Reunión: ' + first.name + ' ⋈ ' + tables[1].name });
            examples.push({ v: first.name + ' ∪ ' + tables[1].name, label: 'Unión: ' + first.name + ' ∪ ' + tables[1].name });
            examples.push({ v: first.name + ' − ' + tables[1].name, label: 'Diferencia: ' + first.name + ' − ' + tables[1].name });
        }
        examples.push({ v: 'γ(' + c1 + '; COUNT(*))(' + first.name + ')', label: 'Agrupación: conteo por ' + c1 });

        examples.forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex.v;
            opt.textContent = ex.label;
            select.appendChild(opt);
        });
    }

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function escapeAttr(s) {
        return escapeHtml(s);
    }

    function getDatabase() { return current; }
    function isConnected() { return !!current; }
    function setOnChange(cb) { onChangeCallback = cb; }

    return { init, getDatabase, isConnected, setOnChange, openDictionary };
})();
