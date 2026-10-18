const Modal = (() => {
    const el = document.getElementById('tableModal');
    const bodyEl = document.getElementById('modalBody');
    const infoEl = document.getElementById('modalInfo');

    function open() { el.classList.add('open'); }
    function close() { el.classList.remove('open'); }

    document.getElementById('closeModalBtn').addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    async function preview(schema, table) {
        document.getElementById('modalSchema').textContent = schema;
        document.getElementById('modalTable').textContent = table;
        bodyEl.innerHTML = '<div class="text-slate-500 text-sm">Cargando datos...</div>';
        infoEl.textContent = '';
        open();
        try {
            const data = await API.tablePreview(schema, table);
            if (data.error) {
                bodyEl.innerHTML = '<div class="text-red-700 text-sm">' + data.error + '</div>';
                return;
            }
            const cols = data.columns || [];
            const rows = data.rows || [];
            let html = '<table class="result-table"><thead><tr>';
            cols.forEach(c => { html += '<th>' + c + '</th>'; });
            html += '</tr></thead><tbody>';
            rows.forEach(r => {
                html += '<tr>';
                cols.forEach(c => {
                    const v = r[c];
                    html += '<td>' + (v === null ? '<em class="text-slate-400">NULL</em>' : v) + '</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            bodyEl.innerHTML = html;
            infoEl.textContent = rows.length + ' filas mostradas';
        } catch (e) {
            bodyEl.innerHTML = '<div class="text-red-700 text-sm">Error: ' + e.message + '</div>';
        }
    }

    return { open, close, preview };
})();
