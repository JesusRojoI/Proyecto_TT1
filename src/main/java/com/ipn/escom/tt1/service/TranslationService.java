package com.ipn.escom.tt1.service;

import com.ipn.escom.tt1.ast.AssignNode;
import com.ipn.escom.tt1.ast.DotTreeBuilder;
import com.ipn.escom.tt1.ast.Expression;
import com.ipn.escom.tt1.parser.Lexer;
import com.ipn.escom.tt1.parser.LexicalException;
import com.ipn.escom.tt1.parser.SyntaxException;
import com.ipn.escom.tt1.parser.parser;
import com.ipn.escom.tt1.parser.sym;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.StringReader;
import java.util.*;

@Service
public class TranslationService {

    /**
     * Relaciones temporales creadas con la forma {@code @n <- ...}. Para cada
     * variable se guarda la relación ya expandida y las variables de las que
     * depende, de modo que la interfaz pueda mostrar el desglose del SQL y el
     * árbol completo de la relación.
     */
    private final Map<String, HistoryEntry> history = new LinkedHashMap<>();

    /**
     * Definición de una variable tal como existía cuando otra relación la usó.
     * Se conserva una instantánea para que el desglose siga siendo fiel aunque
     * la variable se reasigne después.
     */
    private record Definition(String name, boolean defined, String sql) {
    }

    private record HistoryEntry(Expression expression, List<Definition> dependencies) {
    }

    /**
     * Procesa una expresión de álgebra relacional: la tokeniza, la analiza
     * sintácticamente, construye el árbol y genera la sentencia SQL. Devuelve
     * el catálogo de errores correspondiente cuando la expresión no es válida.
     */
    public synchronized Map<String, Object> process(String rawExpression) throws Exception {
        Map<String, Object> response = new LinkedHashMap<>();
        String expression = rawExpression == null ? "" : rawExpression;
        List<Map<String, Object>> tokens = new ArrayList<>();

        try {
            tokenize(expression, tokens);
        } catch (LexicalException le) {
            return error(response, "LEX-01", le.getMessage(), le.getLine(), le.getColumn(),
                    expression, tokens, null);
        } catch (IOException ioe) {
            return error(response, "LEX-99",
                    "Error inesperado durante el análisis léxico: " + ioe.getMessage(),
                    -1, -1, expression, tokens, null);
        }

        if (expression.trim().isEmpty()) {
            return error(response, "SIN-00",
                    "No se ingresó ninguna expresión de álgebra relacional.",
                    -1, -1, expression, tokens, null);
        }

        Expression ast;
        try {
            parser p = new parser(new Lexer(new StringReader(expression)));
            ast = (Expression) p.parse().value;
        } catch (SyntaxException se) {
            return error(response, se.getCode(), se.getMessage(),
                    se.getLine(), se.getColumn(), expression, tokens, se.getExpected());
        } catch (LexicalException le) {
            return error(response, "LEX-01", le.getMessage(),
                    le.getLine(), le.getColumn(), expression, tokens, null);
        } catch (Exception e) {
            return error(response, "SIN-02",
                    "Error sintáctico: " + (e.getMessage() != null ? e.getMessage() : e.toString()),
                    -1, -1, expression, tokens, null);
        }

        String saved = null;
        Expression body = ast;
        if (ast instanceof AssignNode assign) {
            saved = assign.getName();
            body = assign.getBody();
        }

        /* Las variables se recopilan antes de expandir para saber si la
           expresión procesada realmente las utiliza. */
        List<String> usedVariables = collectVariables(body.toTree());
        Expression expandedBody = body.expand(expandableHistory());
        if (saved != null) {
            List<Definition> snapshot = buildBreakdown(usedVariables).stream()
                    .map(item -> new Definition(
                            (String) item.get("name"),
                            (Boolean) item.get("defined"),
                            (String) item.get("sql")))
                    .toList();
            history.put(saved, new HistoryEntry(expandedBody, snapshot));
        }

        /* El árbol debe mostrar la relación completa: si hubo asignación se
           conserva esa etiqueta, pero su cuerpo ya contiene las variables
           sustituidas por las relaciones guardadas. */
        Expression treeAst = saved != null ? new AssignNode(saved, expandedBody) : expandedBody;
        Map<String, Object> treeData = treeAst.toTree();

        response.put("status", "success");
        response.put("sql", expandedBody.asQuery());
        response.put("tree", treeAst.toTreeString(0));
        response.put("treeData", treeData);
        response.put("treeDot", DotTreeBuilder.build(treeData));
        response.put("tokens", tokens);
        response.put("usesVariables", !usedVariables.isEmpty());
        response.put("breakdown", buildBreakdown(usedVariables));
        response.put("history", historyEntries());
        if (saved != null) {
            response.put("saved", saved);
        }
        return response;
    }

    /** Relaciones activas, con su SQL expandido, para el historial de la UI. */
    public synchronized List<Map<String, Object>> historyEntries() {
        List<Map<String, Object>> entries = new ArrayList<>();
        history.forEach((name, entry) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", name);
            item.put("sql", entry.expression().asQuery());
            item.put("dependencies", entry.dependencies().stream().map(Definition::name).toList());
            entries.add(item);
        });
        return entries;
    }

    /** Elimina todas las relaciones guardadas durante la sesión. */
    public synchronized void clearHistory() {
        history.clear();
    }

    private Map<String, Expression> expandableHistory() {
        Map<String, Expression> expressions = new LinkedHashMap<>();
        history.forEach((name, entry) -> expressions.put(name, entry.expression()));
        return expressions;
    }

    /**
     * Recorre la representación del árbol y devuelve las variables referenciadas
     * en orden de aparición, sin duplicados.
     */
    @SuppressWarnings("unchecked")
    private static List<String> collectVariables(Map<String, Object> root) {
        List<String> names = new ArrayList<>();
        collectVariables(root, names);
        return names;
    }

    @SuppressWarnings("unchecked")
    private static void collectVariables(Map<String, Object> node, List<String> names) {
        if (node == null) {
            return;
        }
        if ("variable".equals(node.get("category"))) {
            String name = String.valueOf(node.get("label"));
            if (!name.isBlank() && !names.contains(name)) {
                names.add(name);
            }
        }
        Object rawChildren = node.get("children");
        if (rawChildren instanceof List<?> children) {
            for (Object child : children) {
                if (child instanceof Map<?, ?> wrapper) {
                    Object rawNode = wrapper.get("node");
                    if (rawNode instanceof Map<?, ?> childNode) {
                        collectVariables((Map<String, Object>) childNode, names);
                    }
                }
            }
        }
    }

    /**
     * Desglose del SQL: primero las dependencias de cada variable y después la
     * variable utilizada. Las variables sin definir se conservan para que la
     * interfaz pueda señalarlas.
     */
    private List<Map<String, Object>> buildBreakdown(List<String> usedVariables) {
        List<Map<String, Object>> breakdown = new ArrayList<>();
        Set<String> visited = new LinkedHashSet<>();
        for (String name : usedVariables) {
            appendBreakdown(name, visited, breakdown);
        }
        return breakdown;
    }

    private void appendBreakdown(String name, Set<String> visited,
                                 List<Map<String, Object>> breakdown) {
        if (name == null || visited.contains(name)) {
            return;
        }
        HistoryEntry entry = history.get(name);
        if (entry == null) {
            visited.add(name);
            breakdown.add(definitionItem(new Definition(name, false, null)));
            return;
        }
        for (Definition dependency : entry.dependencies()) {
            if (visited.add(dependency.name())) {
                breakdown.add(definitionItem(dependency));
            }
        }
        visited.add(name);
        breakdown.add(definitionItem(new Definition(name, true, entry.expression().asQuery())));
    }

    private static Map<String, Object> definitionItem(Definition definition) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("name", definition.name());
        item.put("defined", definition.defined());
        item.put("sql", definition.sql());
        return item;
    }

    private void tokenize(String expression, List<Map<String, Object>> out) throws IOException {
        Lexer lexer = new Lexer(new StringReader(expression));
        java_cup.runtime.Symbol symbol;
        while ((symbol = lexer.next_token()).sym != sym.EOF) {
            String type = typeName(symbol.sym);
            String lexeme = symbol.value != null ? symbol.value.toString() : type;
            Map<String, Object> token = new LinkedHashMap<>();
            token.put("type", type);
            token.put("lexeme", lexeme);
            token.put("line", symbol.left + 1);
            token.put("column", symbol.right + 1);
            token.put("description", describe(type));
            out.add(token);
        }
    }

    private static String typeName(int id) {
        if (id >= 0 && id < sym.terminalNames.length) {
            return sym.terminalNames[id];
        }
        return "DESCONOCIDO";
    }

    private Map<String, Object> error(Map<String, Object> response, String code, String message,
                                      int line, int column, String expression,
                                      List<Map<String, Object>> tokens,
                                      List<String> expected) {
        response.put("status", "error");
        response.put("errorCode", code);
        response.put("message", "[" + code + "] " + message);
        response.put("detail", catalog(code));
        int offset = offsetOf(expression, line, column);
        response.put("offset", offset);
        response.put("position", offset + 1);
        response.put("errorLength", Math.min(1, Math.max(0, expression.length() - offset)));
        if (line >= 0) response.put("line", line);
        if (column >= 0) response.put("column", column);
        if (expected != null && !expected.isEmpty()) {
            response.put("expected", expected);
        }
        response.put("tokens", tokens);
        response.put("usesVariables", false);
        response.put("breakdown", List.of());
        response.put("history", historyEntries());
        return response;
    }

    /**
     * Convierte la línea y columna (1-based) reportadas por el analizador en el
     * índice absoluto del carácter dentro de la expresión (0-based). Si el
     * error ocurrió al final de la entrada se devuelve la longitud total.
     */
    private static int offsetOf(String text, int line, int column) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        if (line <= 0) {
            return text.length();
        }
        int currentLine = 1;
        int index = 0;
        while (index < text.length() && currentLine < line) {
            char c = text.charAt(index++);
            if (c == '\n') {
                currentLine++;
            } else if (c == '\r') {
                if (index < text.length() && text.charAt(index) == '\n') {
                    index++;
                }
                currentLine++;
            }
        }
        int safeColumn = Math.max(column, 1);
        return Math.min(index + safeColumn - 1, text.length());
    }

    /** Catálogo de violaciones sintácticas y léxicas reconocidas por el sistema. */
    private static String catalog(String code) {
        switch (code) {
            case "LEX-01": return "Carácter no reconocido: el símbolo no pertenece al alfabeto del álgebra relacional.";
            case "SIN-00": return "Expresión vacía: no hay operadores ni operandos que analizar.";
            case "SIN-01": return "Violación sintáctica: la secuencia de tokens no respeta la gramática.";
            case "SIN-02": return "Violación sintáctica durante la construcción del árbol de análisis.";
            case "LEX-99": return "Error interno del analizador léxico.";
            default:       return "Error no catalogado.";
        }
    }

    /** Descripción legible de cada tipo de token de la gramática. */
    private static String describe(String type) {
        switch (type) {
            case "SELECT":      return "Operador de selección (σ): filtra tuplas por una condición.";
            case "PROJECT":     return "Operador de proyección (π): selecciona atributos.";
            case "JOIN":        return "Operador de reunión (⋈): combina dos relaciones.";
            case "UNION":       return "Operador de unión (∪).";
            case "INTERSEC":    return "Operador de intersección (∩).";
            case "DIFFERENCE":  return "Operador de diferencia (−).";
            case "PRODUCT":     return "Operador de producto cartesiano (×).";
            case "GROUP":       return "Operador de agrupación (γ) con funciones de agregación.";
            case "SUM":         return "Función de agregación SUM/Σ (suma).";
            case "AVG":         return "Función de agregación AVG/PROM (promedio).";
            case "MAX":         return "Función de agregación MAX (máximo).";
            case "MIN":         return "Función de agregación MIN (mínimo).";
            case "COUNT":       return "Función de agregación COUNT (conteo).";
            case "FUNCTION":    return "Función matemática.";
            case "PLUS":        return "Operador aritmético de suma (+).";
            case "MINUS":       return "Operador de resta o diferencia (−).";
            case "TIMES":       return "Operador de multiplicación o producto (×).";
            case "DIVIDE":      return "Operador de división (/).";
            case "POWER":       return "Operador de potencia (^).";
            case "EQ":          return "Comparador de igualdad (==).";
            case "NE":          return "Comparador de desigualdad (!=).";
            case "GT":          return "Comparador mayor que (>).";
            case "GE":          return "Comparador mayor o igual que (>=).";
            case "LT":          return "Comparador menor que (<).";
            case "LE":          return "Comparador menor o igual que (<=).";
            case "AND":         return "Conjunción lógica (&&).";
            case "OR":          return "Disyunción lógica (||).";
            case "NOT":         return "Negación lógica (!).";
            case "ASSIGN":      return "Asignación de una relación a una variable (@n).";
            case "LPAREN":      return "Paréntesis que abre.";
            case "RPAREN":      return "Paréntesis que cierra.";
            case "COMMA":       return "Separador (coma).";
            case "SEMICOLON":   return "Separador (punto y coma).";
            case "IDENTIFIER":  return "Identificador: nombre de tabla o atributo.";
            case "QUALIFIED":   return "Atributo cualificado (tabla.atributo).";
            case "NUMBER":      return "Literal numérico.";
            case "STRING":      return "Literal de cadena.";
            case "VARIABLE":    return "Variable de historial (@1, @2, ...).";
            case "TRUE":        return "Valor lógico verdadero.";
            case "FALSE":       return "Valor lógico falso.";
            case "NULL":        return "Valor nulo.";
            default:            return "Elemento de la gramática.";
        }
    }

}
