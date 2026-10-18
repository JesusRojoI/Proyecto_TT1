/* =============================================================
   Editor de álgebra relacional basado en Monaco Editor.
   - Resalta los operadores de la gramática.
   - Muestra tooltips (hover) sobre cada operación relacional.
   - Si Monaco no está disponible (sin internet), usa un textarea.
   ============================================================= */

/* Catálogo único de operadores: se usa para los botones y para los tooltips. */
const AR_OPERATORS = [
    { sym: 'σ', insert: 'σ()(', back: 2, title: 'Selección (σ)', keywords: ['sigma', 'selec', 'seleccion'],
      desc: 'Filtra las tuplas de una relación que cumplen una condición.', example: 'σ(edad > 18)(Estudiantes)' },
    { sym: 'π', insert: 'π()(', back: 2, title: 'Proyección (π)', keywords: ['pi', 'proy', 'proyeccion'],
      desc: 'Selecciona un subconjunto de atributos de una relación.', example: 'π(nombre, edad)(Estudiantes)' },
    { sym: '⋈', insert: ' ⋈ ', back: 0, title: 'Reunión (⋈)', keywords: ['join'],
      desc: 'Combina dos relaciones. Forma natural: R ⋈ S. Forma con condición: JOIN(R, S, cond).', example: 'Estudiantes ⋈ Inscripciones' },
    { sym: '∪', insert: ' ∪ ', back: 0, title: 'Unión (∪)', keywords: ['union'],
      desc: 'Devuelve las tuplas presentes en cualquiera de las dos relaciones.', example: 'Estudiantes ∪ Egresados' },
    { sym: '∩', insert: ' ∩ ', back: 0, title: 'Intersección (∩)', keywords: ['inter', 'intersec', 'interseccion'],
      desc: 'Devuelve las tuplas comunes a ambas relaciones.', example: 'Estudiantes ∩ Egresados' },
    { sym: '−', insert: ' − ', back: 0, title: 'Diferencia (−)', keywords: ['dif', 'diferencia'],
      desc: 'Devuelve las tuplas de la primera relación que no están en la segunda.', example: 'Estudiantes − Egresados' },
    { sym: '×', insert: ' × ', back: 0, title: 'Producto cartesiano (×)', keywords: ['prodcart', 'producto'],
      desc: 'Combina cada tupla de la primera relación con cada tupla de la segunda.', example: 'Estudiantes × Carreras' },
    { sym: 'γ', insert: 'γ(; )()', back: 6, title: 'Agrupación (γ)', keywords: ['agrupar', 'agrup'],
      desc: 'Agrupa por atributos y calcula funciones de agregación.', example: 'γ(carrera_id; COUNT(*))(Estudiantes)' },
    { sym: 'Σ', insert: 'SUM()', back: 1, title: 'Agregación SUM (Σ)', keywords: ['sum', 'suma'],
      desc: 'Suma los valores de una columna.', example: 'γ(carrera_id; Σ(creditos))(Materias)' },
    { sym: 'PROM', insert: 'AVG()', back: 1, title: 'Agregación AVG (PROM)', keywords: ['prom', 'promedio', 'avg'],
      desc: 'Calcula el promedio de una columna.', example: 'γ(materia_id; PROM(calificacion))(Inscripciones)' },
    { sym: 'MAX', insert: 'MAX()', back: 1, title: 'Agregación MAX', keywords: ['max'],
      desc: 'Obtiene el valor máximo de una columna.', example: 'γ(carrera_id; MAX(edad))(Estudiantes)' },
    { sym: 'MIN', insert: 'MIN()', back: 1, title: 'Agregación MIN', keywords: ['min'],
      desc: 'Obtiene el valor mínimo de una columna.', example: 'γ(carrera_id; MIN(edad))(Estudiantes)' },
    { sym: 'COUNT', insert: 'COUNT()', back: 1, title: 'Agregación COUNT', keywords: ['count', 'contar'],
      desc: 'Cuenta las tuplas o valores de una columna. Usa COUNT(*).', example: 'γ(carrera_id; COUNT(*))(Estudiantes)' },
    { sym: '>', insert: ' > ', back: 0, title: 'Comparador mayor que (>)', keywords: [],
      desc: 'Compara dos expresiones: verdadero si la izquierda es mayor.', example: 'edad > 18' },
    { sym: '>=', insert: ' >= ', back: 0, title: 'Comparador mayor o igual (>=)', keywords: [],
      desc: 'Verdadero si la izquierda es mayor o igual que la derecha.', example: 'edad >= 18' },
    { sym: '<', insert: ' < ', back: 0, title: 'Comparador menor que (<)', keywords: [],
      desc: 'Verdadero si la izquierda es menor que la derecha.', example: 'edad < 30' },
    { sym: '<=', insert: ' <= ', back: 0, title: 'Comparador menor o igual (<=)', keywords: [],
      desc: 'Verdadero si la izquierda es menor o igual que la derecha.', example: 'edad <= 30' },
    { sym: '==', insert: ' == ', back: 0, title: 'Comparador de igualdad (==)', keywords: [],
      desc: 'Verdadero si ambas expresiones son iguales.', example: 'carrera_id == 1' },
    { sym: '!=', insert: ' != ', back: 0, title: 'Comparador de desigualdad (!=)', keywords: [],
      desc: 'Verdadero si las expresiones son distintas.', example: 'carrera_id != 1' },
    { sym: '&&', insert: ' && ', back: 0, title: 'Conjunción lógica (&&)', keywords: ['and'],
      desc: 'Verdadero si ambas condiciones se cumplen.', example: 'edad > 18 && carrera_id == 1' },
    { sym: '||', insert: ' || ', back: 0, title: 'Disyunción lógica (||)', keywords: ['or'],
      desc: 'Verdadero si al menos una condición se cumple.', example: 'edad < 18 || edad > 60' },
    { sym: '!', insert: '!', back: 0, title: 'Negación lógica (!)', keywords: ['not'],
      desc: 'Invierte el valor de una condición.', example: '!(carrera_id == 1)' },
    { sym: '+', insert: ' + ', back: 0, title: 'Suma aritmética (+)', keywords: [],
      desc: 'Suma dos expresiones numéricas.', example: 'edad + 1' },
    { sym: '*', insert: ' * ', back: 0, title: 'Multiplicación aritmética (*)', keywords: [],
      desc: 'Multiplica dos expresiones numéricas.', example: 'creditos * 2' },
    { sym: '/', insert: ' / ', back: 0, title: 'División aritmética (/)', keywords: [],
      desc: 'Divide dos expresiones numéricas.', example: 'total / cantidad' },
    { sym: '^', insert: ' ^ ', back: 0, title: 'Potencia aritmética (^)', keywords: [],
      desc: 'Eleva una expresión a una potencia.', example: 'edad ^ 2' },
    { sym: 'sin()', insert: 'sin()', back: 1, title: 'Función seno', keywords: ['sin'],
      desc: 'Seno de un ángulo (radianes).', example: 'σ(sin(x) > 0.5)(T)' },
    { sym: 'cos()', insert: 'cos()', back: 1, title: 'Función coseno', keywords: ['cos'],
      desc: 'Coseno de un ángulo (radianes).', example: 'π(cos(x))(T)' },
    { sym: 'tan()', insert: 'tan()', back: 1, title: 'Función tangente', keywords: ['tan'],
      desc: 'Tangente de un ángulo (radianes).', example: 'π(tan(x))(T)' },
    { sym: 'asin()', insert: 'asin()', back: 1, title: 'Arco seno', keywords: ['asin'],
      desc: 'Ángulo cuyo seno es el valor dado.', example: 'π(asin(x))(T)' },
    { sym: 'acos()', insert: 'acos()', back: 1, title: 'Arco coseno', keywords: ['acos'],
      desc: 'Ángulo cuyo coseno es el valor dado.', example: 'π(acos(x))(T)' },
    { sym: 'atan()', insert: 'atan()', back: 1, title: 'Arco tangente', keywords: ['atan'],
      desc: 'Ángulo cuya tangente es el valor dado.', example: 'π(atan(x))(T)' },
    { sym: 'sqrt()', insert: 'sqrt()', back: 1, title: 'Raíz cuadrada', keywords: ['sqrt', 'raiz'],
      desc: 'Raíz cuadrada de una expresión.', example: 'σ(sqrt(x) > 2)(T)' },
    { sym: 'abs()', insert: 'abs()', back: 1, title: 'Valor absoluto', keywords: ['abs'],
      desc: 'Valor absoluto de una expresión.', example: 'π(abs(x))(T)' },
    { sym: 'log()', insert: 'log()', back: 1, title: 'Logaritmo', keywords: ['log', 'ln'],
      desc: 'Logaritmo natural o en base 10.', example: 'π(log(x))(T)' },
    { sym: 'exp()', insert: 'exp()', back: 1, title: 'Exponencial', keywords: ['exp'],
      desc: 'Número e elevado a la expresión.', example: 'π(exp(x))(T)' }
];

const Editor = (() => {
    let monacoEditor = null;
    let textarea = null;
    let readyResolve;
    const ready = new Promise(res => { readyResolve = res; });

    const DELIMITERS = [
        { sym: '(', insert: '(', back: 0 },
        { sym: ')', insert: ')', back: 0 },
        { sym: ',', insert: ', ', back: 0 },
        { sym: ';', insert: '; ', back: 0 },
        { sym: '""', insert: '""', back: 1 }
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
                        [/(sin|cos|tan|asin|acos|atan|atan2|sqrt|raiz|log|ln|exp|abs|floor|ceil|round|mod|pow|radians|degrees)\b/i, 'function'],
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

            /* Autocompletado de operadores. */
            monaco.languages.registerCompletionItemProvider('algebraRelacional', {
                provideCompletionItems: function () {
                    const suggestions = AR_OPERATORS.map((op, i) => ({
                        label: op.sym,
                        kind: monaco.languages.CompletionItemKind.Operator,
                        documentation: op.title + ' — ' + op.desc,
                        insertText: op.insert.trim(),
                        sortText: '0' + i
                    }));
                    return { suggestions: suggestions };
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
        if (typeof window.require !== 'undefined' && typeof monaco === 'undefined') {
            window.MonacoEnvironment = {
                getWorkerUrl: function () {
                    const blob = new Blob([
                        "importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/editor.worker.js');"
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
            monacoEditor.focus();
            return;
        }
        if (textarea) {
            textarea.value = value;
            textarea.focus();
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

    return { init, getValue, setValue, insert, focus, DELIMITERS };
})();
