/* =============================================================
   Diagrama del árbol sintáctico con Graphviz.
   El backend entrega el árbol en formato DOT; Viz.js (Graphviz
   compilado a WebAssembly) lo dibuja dentro de una ventana amplia.
   Incluye zoom, ajuste, descarga en JPG y cierre accesible.
   ============================================================= */

const TreeView = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 3;
    const MODAL_ID = 'treeModal';

    let dotSource = '';
    let treeData = null;
    let svgElement = null;
    let renderedDot = '';
    let naturalW = 0;
    let naturalH = 0;
    let zoom = 1;
    let vizPromise = null;

    /* Cada categoría se presenta con su símbolo, un nombre breve y una
       explicación de una línea. Así la leyenda explica qué hace cada nodo en
       lugar de repetir una etiqueta genérica. */
    const legendMeta = {
        select: { symbol: 'σ', label: 'Selección', hint: 'filtra filas', fill: '#dbeafe', border: '#3b82f6', ink: '#1e3a8a' },
        project: { symbol: 'π', label: 'Proyección', hint: 'elige columnas', fill: '#ccfbf1', border: '#14b8a6', ink: '#115e59' },
        join: { symbol: '⋈', label: 'Reunión', hint: 'combina relaciones', fill: '#e0e7ff', border: '#6366f1', ink: '#3730a3' },
        set: { symbol: '∪', label: 'Conjuntos', hint: 'une o resta filas', fill: '#cffafe', border: '#0891b2', ink: '#155e75' },
        group: { symbol: 'γ', label: 'Agrupación', hint: 'forma grupos', fill: '#fef3c7', border: '#f59e0b', ink: '#92400e' },
        aggregate: { symbol: '∑', label: 'Agregación', hint: 'resume valores', fill: '#f3e8ff', border: '#a855f7', ink: '#6b21a8' },
        compare: { symbol: '≥', label: 'Comparación', hint: 'contrasta valores', fill: '#ffe4e6', border: '#fb7185', ink: '#9f1239' },
        logic: { symbol: '∧', label: 'Conectiva', hint: 'une condiciones', fill: '#fce7f3', border: '#ec4899', ink: '#9d174d' },
        arith: { symbol: '±', label: 'Aritmética', hint: 'calcula números', fill: '#ffedd5', border: '#fb923c', ink: '#9a3412' },
        function: { symbol: 'ƒ', label: 'Función', hint: 'transforma valores', fill: '#d1fae5', border: '#10b981', ink: '#065f46' },
        table: { symbol: '▦', label: 'Relación base', hint: 'tabla del esquema', fill: '#cbd5e1', border: '#475569', ink: '#0f172a' },
        attribute: { symbol: '▯', label: 'Atributo', hint: 'columna de tabla', fill: '#e2e8f0', border: '#94a3b8', ink: '#1e293b' },
        literal: { symbol: '#', label: 'Literal', hint: 'valor constante', fill: '#dcfce7', border: '#22c55e', ink: '#166534' },
        assign: { symbol: '←', label: 'Asignación', hint: 'guarda resultado', fill: '#fef3c7', border: '#d97706', ink: '#78350f' },
        variable: { symbol: 'x', label: 'Variable', hint: 'referencia previa', fill: '#fef9c3', border: '#eab308', ink: '#713f12' },
        list: { symbol: '≡', label: 'Lista', hint: 'varios elementos', fill: '#f1f5f9', border: '#94a3b8', ink: '#334155' }
    };

    function el(id) { return document.getElementById(id); }

    /* Estado vacío con una pequeña ilustración vectorial del propio árbol. */
    function emptyState(message) {
        return '<div class="tree-empty-state">' +
            '<svg class="tree-empty-art" viewBox="0 0 240 132" aria-hidden="true" focusable="false">' +
                '<g fill="none" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round">' +
                    '<path d="M56 66 H90 M132 66 H160 M150 66 L186 40 M150 66 L186 94"/>' +
                '</g>' +
                '<g stroke-width="1.4">' +
                    '<ellipse cx="38" cy="66" rx="26" ry="15" fill="#dbeafe" stroke="#3b82f6"/>' +
                    '<ellipse cx="112" cy="66" rx="28" ry="15" fill="#ccfbf1" stroke="#14b8a6"/>' +
                    '<ellipse cx="204" cy="38" rx="25" ry="14" fill="#cbd5e1" stroke="#475569"/>' +
                    '<ellipse cx="204" cy="96" rx="25" ry="14" fill="#dcfce7" stroke="#22c55e"/>' +
                '</g>' +
                '<g font-family="Roboto Mono, monospace" font-size="11" text-anchor="middle">' +
                    '<text x="38" y="70" fill="#1e3a8a">σ</text>' +
                    '<text x="112" y="70" fill="#115e59">π</text>' +
                    '<text x="204" y="42" fill="#0f172a">▦</text>' +
                    '<text x="204" y="100" fill="#166534">#</text>' +
                '</g>' +
            '</svg>' +
            '<p class="tree-empty">' + escapeHtml(message) + '</p>' +
        '</div>';
    }

    function setStatus(message, kind) {
        const box = el('treeModalStatus');
        if (!box) return;
        box.textContent = message || '';
        box.className = 'tree-modal-status' + (kind === 'error' ? ' is-error' : '');
    }

    function setOpenEnabled(enabled) {
        const button = el('openTreeBtn');
        if (!button) return;
        button.disabled = !enabled;
        button.setAttribute('aria-disabled', String(!enabled));
    }

    function ensureViz() {
        if (!vizPromise) {
            if (typeof Viz === 'undefined' || typeof Viz.instance !== 'function') {
                return Promise.reject(new Error('Graphviz no está disponible en esta página.'));
            }
            vizPromise = Viz.instance();
        }
        return vizPromise;
    }

    function countNodes(node) {
        if (!node) return 0;
        const children = Array.isArray(node.children) ? node.children : [];
        return 1 + children.reduce((total, child) => total + countNodes(child.node), 0);
    }

    function extractSize(svg) {
        const box = svg.viewBox && svg.viewBox.baseVal;
        if (box && box.width > 0 && box.height > 0) {
            return { width: box.width, height: box.height };
        }
        const bbox = svg.getBBox();
        return { width: Math.max(1, bbox.width), height: Math.max(1, bbox.height) };
    }

    function applyZoom() {
        if (!svgElement) return;
        svgElement.style.width = Math.round(naturalW * zoom) + 'px';
        svgElement.style.height = Math.round(naturalH * zoom) + 'px';
    }

    function fit() {
        if (!svgElement) return;
        const canvas = el('treeModalCanvas');
        if (!canvas) return;
        const availableW = Math.max(280, canvas.clientWidth - 48);
        const availableH = Math.max(220, canvas.clientHeight - 48);
        const factor = Math.min(availableW / naturalW, availableH / naturalH, 2.4);
        zoom = Math.max(MIN_ZOOM, factor);
        applyZoom();
    }

    function zoomBy(factor) {
        if (!svgElement) return;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
        applyZoom();
    }

    function renderLegend() {
        const legend = el('treeModalLegend');
        if (!legend) return;
        legend.innerHTML = '';
        if (!treeData) {
            legend.classList.add('hidden');
            return;
        }
        const categories = new Set();
        (function collect(node) {
            if (!node) return;
            categories.add(node.category);
            (node.children || []).forEach(child => collect(child.node));
        })(treeData);

        Object.keys(legendMeta).forEach(category => {
            if (!categories.has(category)) return;
            const meta = legendMeta[category];
            const chip = document.createElement('span');
            chip.className = 'tree-legend-chip';
            chip.title = meta.label + ': ' + meta.hint;

            const symbol = document.createElement('span');
            symbol.className = 'tree-legend-symbol';
            symbol.style.setProperty('--chip-fill', meta.fill);
            symbol.style.setProperty('--chip-border', meta.border);
            symbol.style.setProperty('--chip-ink', meta.ink);
            symbol.textContent = meta.symbol;

            const copy = document.createElement('span');
            copy.className = 'tree-legend-copy';
            const strong = document.createElement('strong');
            strong.textContent = meta.label;
            const small = document.createElement('small');
            small.textContent = meta.hint;
            copy.append(strong, small);

            chip.append(symbol, copy);
            legend.appendChild(chip);
        });
        legend.classList.toggle('hidden', legend.childElementCount === 0);
    }

    async function renderDiagram() {
        if (!dotSource) return;
        const canvas = el('treeModalCanvas');
        if (!canvas) return;
        if (renderedDot === dotSource && svgElement) {
            fit();
            return;
        }

        canvas.innerHTML = '<p class="tree-empty">Generando diagrama con Graphviz...</p>';
        setStatus('Generando diagrama con Graphviz...');
        try {
            const viz = await ensureViz();
            const svgText = viz.renderString(dotSource, {
                format: 'svg',
                engine: 'dot',
                yInvert: false
            });
            canvas.innerHTML = '<div class="tree-stage">' + svgText + '</div>';
            svgElement = canvas.querySelector('svg');
            if (!svgElement) {
                throw new Error('Graphviz no devolvió un diagrama válido.');
            }
            const size = extractSize(svgElement);
            naturalW = size.width;
            naturalH = size.height;
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('height');
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMin meet');
            svgElement.style.maxWidth = 'none';
            svgElement.style.display = 'block';
            svgElement.setAttribute('role', 'img');
            svgElement.setAttribute('aria-label', 'Árbol sintáctico de la expresión de álgebra relacional');
            renderedDot = dotSource;
            renderLegend();
            fit();
            const nodes = countNodes(treeData);
            setStatus('Diagrama generado con Graphviz · ' + nodes + ' nodo' + (nodes === 1 ? '' : 's'));
        } catch (error) {
            svgElement = null;
            renderedDot = '';
            canvas.innerHTML = '<p class="tree-empty is-error">No se pudo generar el diagrama: ' +
                escapeHtml(error.message || String(error)) + '</p>';
            setStatus('Error al generar el diagrama.', 'error');
        }
    }

    async function open() {
        if (!dotSource) {
            setStatus('Primero traduce una expresión válida para generar el árbol.', 'error');
            return;
        }
        const modal = el(MODAL_ID);
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('tree-locked');
        const closeButton = el('closeTreeModalBtn');
        if (closeButton) closeButton.focus();
        await renderDiagram();
    }

    function close() {
        const modal = el(MODAL_ID);
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('tree-locked');
        const openButton = el('openTreeBtn');
        if (openButton) openButton.focus();
    }

    function setTree(dot, data) {
        dotSource = dot || '';
        treeData = data || null;
        renderedDot = '';
        svgElement = null;
        setOpenEnabled(!!dotSource);
        const hint = el('treeAvailableHint');
        if (hint) {
            hint.textContent = dotSource
                ? 'Diagrama listo. Ábrelo en la ventana amplia.'
                : 'Traduce una expresión para habilitar el diagrama.';
        }
    }

    function clear(message) {
        dotSource = '';
        treeData = null;
        renderedDot = '';
        svgElement = null;
        setOpenEnabled(false);
        const canvas = el('treeModalCanvas');
        if (canvas) {
            canvas.innerHTML = emptyState(message || 'Esperando consulta...');
        }
        const legend = el('treeModalLegend');
        if (legend) {
            legend.innerHTML = '';
            legend.classList.add('hidden');
        }
        const hint = el('treeAvailableHint');
        if (hint) hint.textContent = 'Traduce una expresión para habilitar el diagrama.';
        setStatus('');
    }

    function downloadJpg() {
        if (!svgElement) {
            setStatus('Todavía no hay un diagrama para descargar.', 'error');
            return;
        }
        setStatus('Preparando archivo JPG...');
        try {
            const clone = svgElement.cloneNode(true);
            clone.setAttribute('xmlns', NS);
            clone.setAttribute('width', naturalW);
            clone.setAttribute('height', naturalH);
            clone.style.width = naturalW + 'px';
            clone.style.height = naturalH + 'px';
            clone.style.background = '#ffffff';

            const xml = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const image = new Image();

            image.onload = function () {
                const scale = Math.min(2.5, 12000 / Math.max(naturalW, naturalH, 1));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(naturalW * scale));
                canvas.height = Math.max(1, Math.round(naturalH * scale));
                const context = canvas.getContext('2d');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                canvas.toBlob(function (jpg) {
                    if (!jpg) {
                        setStatus('No se pudo convertir el diagrama a JPG.', 'error');
                        return;
                    }
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(jpg);
                    link.download = 'arbol-sintactico.jpg';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
                    setStatus('Diagrama descargado en formato JPG.');
                }, 'image/jpeg', 0.94);
            };

            image.onerror = function () {
                URL.revokeObjectURL(url);
                setStatus('No se pudo preparar la imagen del diagrama.', 'error');
            };

            image.src = url;
        } catch (error) {
            setStatus('Error al descargar el diagrama: ' + (error.message || error), 'error');
        }
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function init() {
        const openButton = el('openTreeBtn');
        const closeButton = el('closeTreeModalBtn');
        const modal = el(MODAL_ID);

        if (openButton) openButton.addEventListener('click', open);
        if (closeButton) closeButton.addEventListener('click', close);
        if (modal) {
            modal.addEventListener('click', event => {
                if (event.target === modal) close();
            });
        }

        const zoomIn = el('treeModalZoomInBtn');
        const zoomOut = el('treeModalZoomOutBtn');
        const fitButton = el('treeModalFitBtn');
        const downloadButton = el('treeModalDownloadBtn');
        if (zoomIn) zoomIn.addEventListener('click', () => zoomBy(1.2));
        if (zoomOut) zoomOut.addEventListener('click', () => zoomBy(1 / 1.2));
        if (fitButton) fitButton.addEventListener('click', fit);
        if (downloadButton) downloadButton.addEventListener('click', downloadJpg);

        document.addEventListener('keydown', event => {
            const isOpen = modal && modal.classList.contains('open');
            if (event.key === 'Escape' && isOpen) {
                event.preventDefault();
                close();
            }
        });

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (!modal || !modal.classList.contains('open') || !svgElement) return;
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(fit, 120);
        });

        clear('El diagrama se mostrará aquí después de traducir una expresión.');
    }

    return { init, open, close, setTree, clear, fit, downloadJpg };
})();
