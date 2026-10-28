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

    const legendLabels = {
        select: 'Selección',
        project: 'Proyección',
        join: 'Reunión',
        set: 'Operaciones de conjuntos',
        group: 'Agrupación',
        aggregate: 'Función de agregación',
        compare: 'Comparación',
        logic: 'Conectiva lógica',
        arith: 'Aritmética',
        function: 'Función',
        table: 'Relación base',
        attribute: 'Atributo',
        literal: 'Literal',
        assign: 'Asignación',
        variable: 'Variable',
        list: 'Lista de atributos'
    };

    const legendColors = {
        select: '#3b82f6',
        project: '#14b8a6',
        join: '#6366f1',
        set: '#0891b2',
        group: '#f59e0b',
        aggregate: '#a855f7',
        compare: '#fb7185',
        logic: '#ec4899',
        arith: '#fb923c',
        function: '#10b981',
        table: '#475569',
        attribute: '#94a3b8',
        literal: '#22c55e',
        assign: '#d97706',
        variable: '#eab308',
        list: '#94a3b8'
    };

    function el(id) { return document.getElementById(id); }

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

        Object.keys(legendLabels).forEach(category => {
            if (!categories.has(category)) return;
            const chip = document.createElement('span');
            chip.className = 'tree-legend-chip';
            const dot = document.createElement('span');
            dot.className = 'tree-legend-dot';
            dot.style.background = legendColors[category] || '#475569';
            chip.appendChild(dot);
            chip.appendChild(document.createTextNode(legendLabels[category]));
            legend.appendChild(chip);
        });
        legend.classList.toggle('hidden', legend.childElementCount === 0);
    }

    /* Graphviz dibuja las cajas con esquinas redondeadas demasiado amplias.
       Se sustituye cada caja por un rectángulo con radio pequeño y uniforme. */
    function roundNodeCorners(svg) {
        svg.querySelectorAll('g.node').forEach(group => {
            const shape = group.querySelector('polygon, path');
            if (!shape) return;
            if (shape.tagName.toLowerCase() === 'polygon') {
                const points = (shape.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean);
                // Graphviz repite el primer punto al final del polígono.
                const unique = points.length > 1 && points[0] === points[points.length - 1]
                    ? points.slice(0, -1)
                    : points;
                if (unique.length !== 4) return;
            }
            let box;
            try {
                box = shape.getBBox();
            } catch (error) {
                return;
            }
            if (!box || box.width <= 0 || box.height <= 0) return;

            const rect = document.createElementNS(NS, 'rect');
            rect.setAttribute('x', box.x);
            rect.setAttribute('y', box.y);
            rect.setAttribute('width', box.width);
            rect.setAttribute('height', box.height);
            rect.setAttribute('rx', '5');
            rect.setAttribute('ry', '5');
            ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'fill-opacity', 'stroke-opacity']
                .forEach(attribute => {
                    if (shape.hasAttribute(attribute)) {
                        rect.setAttribute(attribute, shape.getAttribute(attribute));
                    }
                });
            shape.replaceWith(rect);
        });
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
            roundNodeCorners(svgElement);
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
            canvas.innerHTML = '<p class="tree-empty">' + escapeHtml(message || 'Esperando consulta...') + '</p>';
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
