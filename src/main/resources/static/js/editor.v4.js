/* =============================================================
   Editor de álgebra relacional basado en Monaco Editor.
   - Resalta los operadores de la gramática.
   - Muestra tooltips (hover) sobre cada operación relacional.
   - Si Monaco no está disponible (sin internet), usa un textarea.
   ============================================================= */

/* Catálogo único de operadores: se usa para los botones y para los tooltips.
   Las funciones trigonométricas y log()/exp() se retiraron del lenguaje. */
const AR_OPERATORS = [
    { sym: 'σ', insert: 'σ()(', back: 2, group: 'relacional', title: 'Selección (σ)', keywords: ['sigma', 'selec', 'seleccion'],
      desc: 'Filtra las tuplas de una relación que cumplen una condición.', example: 'σ(edad > 18)(Estudiantes)' },
    { sym: 'π', insert: 'π()(', back: 2, group: 'relacional', title: 'Proyección (π)', keywords: ['pi', 'proy', 'proyeccion'],
      desc: 'Selecciona un subconjunto de atributos de una relación.', example: 'π(nombre, edad)(Estudiantes)' },
    { sym: 'γ', insert: 'γ(; )()', back: 6, group: 'relacional', title: 'Agrupación (γ)', keywords: ['agrupar', 'agrup'],
      desc: 'Agrupa por atributos y calcula funciones de agregación.', example: 'γ(carrera_id; COUNT(*))(Estudiantes)' },
    { sym: '⋈', insert: ' ⋈ ', back: 0, group: 'relacional', title: 'Reunión (⋈)', keywords: ['join'],
      desc: 'Combina dos relaciones. Forma natural: R ⋈ S. Forma con condición: JOIN(R, S, cond).', example: 'Estudiantes ⋈ Inscripciones' },
    { sym: '∪', insert: ' ∪ ', back: 0, group: 'conjuntos', title: 'Unión (∪)', keywords: ['union'],
      desc: 'Devuelve las tuplas presentes en cualquiera de las dos relaciones.', example: 'Estudiantes ∪ Egresados' },
    { sym: '∩', insert: ' ∩ ', back: 0, group: 'conjuntos', title: 'Intersección (∩)', keywords: ['inter', 'intersec', 'interseccion'],
      desc: 'Devuelve las tuplas comunes a ambas relaciones.', example: 'Estudiantes ∩ Egresados' },
    { sym: '−', insert: ' − ', back: 0, group: 'conjuntos', title: 'Diferencia (−)', keywords: ['dif', 'diferencia'],
      desc: 'Devuelve las tuplas de la primera relación que no están en la segunda.', example: 'Estudiantes − Egresados' },
    { sym: '×', insert: ' × ', back: 0, group: 'conjuntos', title: 'Producto cartesiano (×)', keywords: ['prodcart', 'producto'],
      desc: 'Combina cada tupla de la primera relación con cada tupla de la segunda.', example: 'Estudiantes × Carreras' },
    { sym: 'Σ', insert: 'SUM()', back: 1, group: 'agregacion', title: 'Agregación SUM (Σ)', keywords: ['sum', 'suma'],
      desc: 'Suma los valores de una columna.', example: 'γ(carrera_id; Σ(creditos))(Materias)' },
    { sym: 'PROM', insert: 'AVG()', back: 1, group: 'agregacion', title: 'Agregación AVG (PROM)', keywords: ['prom', 'promedio', 'avg'],
      desc: 'Calcula el promedio de una columna.', example: 'γ(materia_id; PROM(calificacion))(Inscripciones)' },
    { sym: 'MAX', insert: 'MAX()', back: 1, group: 'agregacion', title: 'Agregación MAX', keywords: ['max'],
      desc: 'Obtiene el valor máximo de una columna.', example: 'γ(carrera_id; MAX(edad))(Estudiantes)' },
    { sym: 'MIN', insert: 'MIN()', back: 1, group: 'agregacion', title: 'Agregación MIN', keywords: ['min'],
      desc: 'Obtiene el valor mínimo de una columna.', example: 'γ(carrera_id; MIN(edad))(Estudiantes)' },
    { sym: 'COUNT', insert: 'COUNT()', back: 1, group: 'agregacion', title: 'Agregación COUNT', keywords: ['count', 'contar'],
      desc: 'Cuenta las tuplas o valores de una columna. Usa COUNT(*).', example: 'γ(carrera_id; COUNT(*))(Estudiantes)' },
    { sym: '>', insert: ' > ', back: 0, group: 'comparacion', title: 'Comparador mayor que (>)', keywords: [],
      desc: 'Compara dos expresiones: verdadero si la izquierda es mayor.', example: 'edad > 18' },
    { sym: '>=', insert: ' >= ', back: 0, group: 'comparacion', title: 'Comparador mayor o igual (>=)', keywords: [],
      desc: 'Verdadero si la izquierda es mayor o igual que la derecha.', example: 'edad >= 18' },
    { sym: '<', insert: ' < ', back: 0, group: 'comparacion', title: 'Comparador menor que (<)', keywords: [],
      desc: 'Verdadero si la izquierda es menor que la derecha.', example: 'edad < 30' },
    { sym: '<=', insert: ' <= ', back: 0, group: 'comparacion', title: 'Comparador menor o igual (<=)', keywords: [],
      desc: 'Verdadero si la izquierda es menor o igual que la derecha.', example: 'edad <= 30' },
    { sym: '==', insert: ' == ', back: 0, group: 'comparacion', title: 'Comparador de igualdad (==)', keywords: [],
      desc: 'Verdadero si ambas expresiones son iguales.', example: 'carrera_id == 1' },
    { sym: '!=', insert: ' != ', back: 0, group: 'comparacion', title: 'Comparador de desigualdad (!=)', keywords: [],
      desc: 'Verdadero si las expresiones son distintas.', example: 'carrera_id != 1' },
    { sym: '&&', insert: ' && ', back: 0, group: 'logica', title: 'Conjunción lógica (&&)', keywords: ['and'],
      desc: 'Verdadero si ambas condiciones se cumplen.', example: 'edad > 18 && carrera_id == 1' },
    { sym: '||', insert: ' || ', back: 0, group: 'logica', title: 'Disyunción lógica (||)', keywords: ['or'],
      desc: 'Verdadero si al menos una condición se cumple.', example: 'edad < 18 || edad > 60' },
    { sym: '!', insert: '!', back: 0, group: 'logica', title: 'Negación lógica (!)', keywords: ['not'],
      desc: 'Invierte el valor de una condición.', example: '!(carrera_id == 1)' },
    { sym: '+', insert: ' + ', back: 0, group: 'aritmetica', title: 'Suma aritmética (+)', keywords: [],
      desc: 'Suma dos expresiones numéricas.', example: 'edad + 1' },
    { sym: '*', insert: ' * ', back: 0, group: 'aritmetica', title: 'Multiplicación aritmética (*)', keywords: [],
      desc: 'Multiplica dos expresiones numéricas.', example: 'creditos * 2' },
    { sym: '/', insert: ' / ', back: 0, group: 'aritmetica', title: 'División aritmética (/)', keywords: [],
      desc: 'Divide dos expresiones numéricas.', example: 'total / cantidad' },
    { sym: '^', insert: ' ^ ', back: 0, group: 'aritmetica', title: 'Potencia aritmética (^)', keywords: [],
      desc: 'Eleva una expresión a una potencia.', example: 'edad ^ 2' },
    { sym: 'sqrt()', insert: 'sqrt()', back: 1, group: 'funciones', title: 'Raíz cuadrada', keywords: ['sqrt', 'raiz'],
      desc: 'Raíz cuadrada de una expresión.', example: 'σ(sqrt(x) > 2)(T)' },
    { sym: 'abs()', insert: 'abs()', back: 1, group: 'funciones', title: 'Valor absoluto', keywords: ['abs'],
      desc: 'Valor absoluto de una expresión.', example: 'π(abs(x))(T)' }
];

/* Tonos por categoría. Los botones de cada grupo conservan su color, pero se
   muestran en un único panel fluido, sin etiquetas ni contenedores. */
const AR_OPERATOR_GROUPS = [
    { id: 'relacional', label: 'Relacionales', tone: '#4338ca' },
    { id: 'conjuntos', label: 'Conjuntos', tone: '#0f766e' },
    { id: 'agregacion', label: 'Agregación', tone: '#7e22ce' },
    { id: 'comparacion', label: 'Comparadores', tone: '#be123c' },
    { id: 'logica', label: 'Lógica', tone: '#b45309' },
    { id: 'aritmetica', label: 'Aritmética', tone: '#c2410c' },
    { id: 'funciones', label: 'Funciones', tone: '#047857' },
    { id: 'sintaxis', label: 'Sintaxis', tone: '#475569' }
];

const Editor = (() => {
    let monacoEditor = null;
    let textarea = null;
    let readyResolve;
    const ready = new Promise(res => { readyResolve = res; });
    let dictionaryTables = [];
    let attributeIndex = new Map();   // atributo -> [tablas]
    let tableIndex = new Map();       // tabla -> [atributos]

    const DELIMITERS = [
        { sym: '(', insert: '(', back: 0, group: 'sintaxis', title: 'Paréntesis que abre',
          desc: 'Inicia una condición, lista de atributos o subexpresión.' },
        { sym: ')', insert: ')', back: 0, group: 'sintaxis', title: 'Paréntesis que cierra',
          desc: 'Cierra una condición, lista de atributos o subexpresión.' },
        { sym: ',', insert: ', ', back: 0, group: 'sintaxis', title: 'Separador (coma)',
          desc: 'Separa atributos, condiciones o relaciones.' },
        { sym: ';', insert: '; ', back: 0, group: 'sintaxis', title: 'Separador (punto y coma)',
          desc: 'Separa los atributos de agrupación de las funciones de agregación.' },
        { sym: '""', insert: '""', back: 1, group: 'sintaxis', title: 'Cadena de texto',
          desc: 'Escribe un literal de texto entre comillas dobles.' }
    ];

    function el(id) { return document.getElementById(id); }

    function buildFallback() {
        const container = el('editorContainer');
        container.innerHTML = '';
        textarea = document.createElement('textarea');
        textarea.className = 'editor-fallback';
        textarea.spellcheck = false;
        textarea.placeholder = 'Ejemplo: π(nombre, edad)(σ(edad >= 18)(Estudiantes))';
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (typeof Translate !== 'undefined') Translate.run();
            }
        });
        container.appendChild(textarea);
        readyResolve();
    }

    function lookupSymbol(ch) {
        return AR_OPERATORS.find(op => op.sym === ch);
    }

    function lookupKeyword(word) {
        if (!word) return null;
        const w = word.toLowerCase();
        return AR_OPERATORS.find(op => (op.keywords || []).includes(w));
    }

    /**
     * Carga el diccionario de la base de datos seleccionada y construye dos
     * índices: tabla -> atributos y atributo -> tablas. El segundo permite
     * recomendar todas las tablas válidas cuando un atributo se comparte.
     */
    function setDictionary(dictionary) {
        dictionaryTables = [];
        attributeIndex = new Map();
        tableIndex = new Map();

        const tables = dictionary && Array.isArray(dictionary.tables) ? dictionary.tables : [];
        tables.forEach(table => {
            const name = table.name;
            if (!name) return;
            dictionaryTables.push(name);
            const columns = Array.isArray(table.columns) ? table.columns : [];
            const names = [];
            columns.forEach(column => {
                if (!column || !column.name) return;
                names.push(column.name);
                if (!attributeIndex.has(column.name)) attributeIndex.set(column.name, []);
                if (!attributeIndex.get(column.name).includes(name)) {
                    attributeIndex.get(column.name).push(name);
                }
            });
            tableIndex.set(name, names);
        });
        updateAutocompleteHint();
    }

    function updateAutocompleteHint() {
        const hint = el('autocompleteHint');
        if (!hint) return;
        if (!dictionaryTables.length) {
            hint.innerHTML = '<i class="bi bi-lightning-charge"></i> Conecta tu MySQL para autocompletar con el diccionario.';
            hint.classList.add('is-muted');
            return;
        }
        const attributes = attributeIndex.size;
        hint.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> Autocompletado: ' +
            dictionaryTables.length + ' tablas, ' + attributes +
            ' atributos · <strong>Tab</strong> para aceptar';
        hint.classList.remove('is-muted');
    }

    function attributeSuggestions(prefix, qualifier, range) {
        const term = (prefix || '').toLowerCase();
        const suggestions = [];
        const tables = qualifier ? [qualifier] : dictionaryTables;
        const seen = new Set();

        tables.forEach(table => {
            if (!tableIndex.has(table)) return;
            tableIndex.get(table).forEach(attribute => {
                if (term && !attribute.toLowerCase().startsWith(term)) return;
                const key = table + '.' + attribute;
                if (seen.has(key)) return;
                seen.add(key);
                suggestions.push({
                    label: { label: attribute, description: table },
                    kind: monaco.languages.CompletionItemKind.Field,
                    detail: 'Tabla: ' + table,
                    documentation: qualifier
                        ? 'Atributo **' + attribute + '** de la tabla **' + table + '**.'
                        : 'Atributo **' + attribute + '** de la tabla **' + table + '**. ' +
                          'Se insertará cualificado para evitar ambigüedades.',
                    insertText: qualifier ? attribute : table + '.' + attribute,
                    filterText: attribute,
                    sortText: '0_' + table + '_' + attribute,
                    range: range
                });
            });
        });
        return suggestions;
    }

    function tableSuggestions(prefix, range) {
        const term = (prefix || '').toLowerCase();
        return dictionaryTables
            .filter(table => !term || table.toLowerCase().startsWith(term))
            .map(table => ({
                label: table,
                kind: monaco.languages.CompletionItemKind.Class,
                detail: 'Tabla de la base de datos',
                documentation: 'Relación **' + table + '** (' + (tableIndex.get(table) || []).length + ' atributos).',
                insertText: table,
                filterText: table,
                sortText: '1_' + table,
                range: range
            }));
    }

    function operatorSuggestions(range) {
        return AR_OPERATORS.map((op, i) => ({
            label: op.sym,
            kind: monaco.languages.CompletionItemKind.Operator,
            documentation: op.title + ' — ' + op.desc,
            insertText: op.insert.trim(),
            sortText: '9_' + String(i).padStart(2, '0'),
            range: range
        }));
    }

    function applyMonaco() {
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });

        require(['vs/editor/editor.main'], function () {
            monaco.languages.register({ id: 'algebraRelacional' });

            monaco.languages.setMonarchTokensProvider('algebraRelacional', {
                symbols: /[=><!~?:&|+\-*\/\^%]+/,
                tokenizer: {
                    root: [
                        [/[σπγΣ⋈∪∩]/, 'operator.relational'],
                        [/(∏|⋉|⋊)/, 'operator.relational'],
                        [/(selec|seleccion|sigma|proy|proyeccion|pi|join|union|inter|intersec|interseccion|dif|diferencia|prodcart|producto|agrupar|agrup)\b/i, 'operator.relational'],
                        [/(sum|suma|prom|promedio|avg|max|min|count|contar)\b/i, 'aggregate'],
                        [/(sqrt|raiz|abs|floor|ceil|round|mod|pow|radians|degrees)\b/i, 'function'],
                        [/(and|or|not|true|false|null)\b/i, 'keyword'],
                        [/@[0-9]+/, 'variable'],
                        [/[a-zA-Z_]\w*\.\w+/, 'qualified'],
                        [/[a-zA-Z_]\w*/, 'identifier'],
                        [/\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
                        [/"([^"\\]|\\.)*"/, 'string'],
                        [/'([^'\\]|\\.)*'/, 'string'],
                        [/[{}()\[\]]/, '@brackets'],
                        [/@symbols/, 'operator.arithmetic'],
                        [/,|;/, 'delimiter'],
                        [/\s+/, 'white']
                    ]
                }
            });

            monaco.editor.defineTheme('algebraRelacionalTheme', {
                base: 'vs',
                inherit: true,
                rules: [
                    { token: 'operator.relational', foreground: '1d4ed8', bold: true },
                    { token: 'aggregate', foreground: '7c3aed', bold: true },
                    { token: 'function', foreground: '0f766e' },
                    { token: 'keyword', foreground: 'b91c1c' },
                    { token: 'variable', foreground: 'b45309', bold: true },
                    { token: 'qualified', foreground: '0f172a', italic: true },
                    { token: 'identifier', foreground: '334155' },
                    { token: 'number', foreground: '15803d' },
                    { token: 'string', foreground: 'a16207' },
                    { token: 'delimiter', foreground: '64748b' },
                    { token: 'operator.arithmetic', foreground: '475569' }
                ],
                colors: {}
            });

            monaco.languages.setLanguageConfiguration('algebraRelacional', {                brackets: [['(', ')']],
                autoClosingPairs: [
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                ]
            });

            /* Tooltips sobre operadores y funciones. */
            monaco.languages.registerHoverProvider('algebraRelacional', {
                provideHover: function (model, position) {
                    const line = model.getLineContent(position.lineNumber);
                    const index = position.column - 1;

                    const ch = index < line.length ? line[index] : '';
                    const op = lookupSymbol(ch);
                    if (op) {
                        return { contents: hoverContents(op) };
                    }

                    const word = model.getWordAtPosition(position);
                    const kw = lookupKeyword(word ? word.word : null);
                    if (kw) {
                        return { contents: hoverContents(kw) };
                    }
                    return null;
                }
            });

            /* Autocompletado de operadores, tablas y atributos del diccionario. */
            monaco.languages.registerCompletionItemProvider('algebraRelacional', {
                triggerCharacters: ['.', ',', '(', ' ', ';'],
                provideCompletionItems: function (model, position) {
                    const word = model.getWordUntilPosition(position);
                    const range = new monaco.Range(
                        position.lineNumber,
                        word.startColumn,
                        position.lineNumber,
                        word.endColumn
                    );
                    const linePrefix = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
                    const qualified = /([A-Za-z_]\w*)\.\w*$/.exec(linePrefix);
                    const qualifier = qualified && tableIndex.has(qualified[1]) ? qualified[1] : null;

                    let suggestions = [];
                    if (qualifier) {
                        suggestions = attributeSuggestions(word.word, qualifier, range);
                    } else {
                        suggestions = tableSuggestions(word.word, range)
                            .concat(attributeSuggestions(word.word, null, range));
                        if (!word.word) {
                            suggestions = suggestions.concat(operatorSuggestions(range));
                        }
                    }
                    return { suggestions: suggestions.slice(0, 400) };
                }
            });

            const container = el('editorContainer');
            container.innerHTML = '';
            monacoEditor = monaco.editor.create(container, {
                value: '',
                language: 'algebraRelacional',
                theme: 'algebraRelacionalTheme',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Roboto Mono, monospace',
                lineNumbers: 'off',
                scrollBeyondLastLine: false,
                roundedSelection: false,
                renderLineHighlight: 'all',
                tabCompletion: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, comments: false, strings: true },
                wordBasedSuggestions: 'off',
                fixedOverflowWidgets: true,
                suggest: {
                    showWords: false,
                    preview: true,
                    insertMode: 'replace'
                },
                placeholder: 'Ejemplo: π(nombre, edad)(σ(edad >= 18)(Estudiantes))'
            });
            monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
                if (typeof Translate !== 'undefined') Translate.run();
            });
            readyResolve();
        }, function () {
            buildFallback();
        });
    }

    function hoverContents(op) {
        return [
            { value: '**' + op.title + '**' },
            { value: op.desc },
            { value: '```\n' + op.example + '\n```' }
        ];
    }

    function init() {
        updateAutocompleteHint();
        if (typeof window.require !== 'undefined' && typeof monaco === 'undefined') {
            window.MonacoEnvironment = {
                getWorkerUrl: function () {
                    const blob = new Blob([
                        "importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js');"
                    ], { type: 'text/javascript' });
                    return URL.createObjectURL(blob);
                }
            };
            try {
                applyMonaco();
            } catch (e) {
                buildFallback();
            }
        } else {
            buildFallback();
        }
        return ready;
    }

    function getValue() {
        if (monacoEditor) return monacoEditor.getValue();
        return textarea ? textarea.value : '';
    }

    function setValue(value) {
        if (monacoEditor) {
            monacoEditor.setValue(value);
            const model = monacoEditor.getModel();
            if (model) {
                monacoEditor.setPosition(model.getPositionAt(value.length));
            }
            monacoEditor.focus();
            return;
        }
        if (textarea) {
            textarea.value = value;
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = value.length;
        }
    }

    function insert(text, back) {
        const offset = back || 0;
        if (monacoEditor) {
            const selection = monacoEditor.getSelection();
            monacoEditor.executeEdits('operator', [{ range: selection, text: text, forceMoveMarkers: true }]);
            const model = monacoEditor.getModel();
            const end = model.getOffsetAt(selection.getEndPosition()) + text.length - offset;
            const pos = model.getPositionAt(end);
            monacoEditor.setPosition(pos);
            monacoEditor.focus();
            return;
        }
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            textarea.value = value.substring(0, start) + text + value.substring(end);
            const caret = start + text.length - offset;
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = caret;
        }
    }

    function focus() {
        if (monacoEditor) monacoEditor.focus();
        else if (textarea) textarea.focus();
    }

    /**
     * Marca en el editor el carácter exacto donde el analizador detectó el
     * error. En Monaco se dibuja un subrayado rojo (marker) y se coloca el
     * cursor en esa posición; con el textarea de respaldo se selecciona.
     */
    function showError(offset, length, message) {
        const value = getValue();
        const rawOffset = Number.isInteger(offset) ? offset : 0;
        const caretOffset = Math.max(0, Math.min(rawOffset, value.length));
        let start = caretOffset;
        let end = Math.min(value.length, start + Math.max(1, length || 1));
        if (value.length > 0 && start >= value.length) {
            start = value.length - 1;
            end = value.length;
        }

        if (monacoEditor && typeof monaco !== 'undefined') {
            const model = monacoEditor.getModel();
            const startPos = model.getPositionAt(start);
            const endPos = model.getPositionAt(end);
            monaco.editor.setModelMarkers(model, 'ar-analyzer', [{
                severity: monaco.MarkerSeverity.Error,
                message: message || 'Error de análisis',
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column
            }]);
            const caret = model.getPositionAt(caretOffset);
            monacoEditor.setPosition(caret);
            monacoEditor.revealPositionInCenter(caret, monaco.editor.ScrollType.Smooth);
            monacoEditor.focus();
            return;
        }

        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(start, end);
        }
    }

    function clearMarkers() {
        if (monacoEditor && typeof monaco !== 'undefined') {
            monaco.editor.setModelMarkers(monacoEditor.getModel(), 'ar-analyzer', []);
        }
    }

    return {
        init, getValue, setValue, insert, focus,
        showError, clearMarkers, setDictionary, DELIMITERS
    };
})();
