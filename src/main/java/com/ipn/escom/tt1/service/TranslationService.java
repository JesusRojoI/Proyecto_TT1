package com.ipn.escom.tt1.service;

import com.ipn.escom.tt1.ast.AssignNode;
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

    private final Map<String, Expression> history = new LinkedHashMap<>();
    private int counter = 0;

    /**
     * Procesa una expresión de álgebra relacional: la tokeniza, la analiza
     * sintácticamente, construye el árbol y genera la sentencia SQL. Devuelve
     * el catálogo de errores correspondiente cuando la expresión no es válida.
     */
    public synchronized Map<String, Object> process(String rawExpression) throws Exception {
        Map<String, Object> response = new LinkedHashMap<>();
        String expression = rawExpression == null ? "" : rawExpression.trim();
        List<Map<String, Object>> tokens = new ArrayList<>();

        try {
            tokenize(expression, tokens);
        } catch (LexicalException le) {
            return error(response, "LEX-01", le.getMessage(),
                    le.getLine(), le.getColumn(), tokens, null);
        } catch (IOException ioe) {
            return error(response, "LEX-99",
                    "Error inesperado durante el análisis léxico: " + ioe.getMessage(),
                    -1, -1, tokens, null);
        }

        if (expression.isEmpty()) {
            return error(response, "SIN-00",
                    "No se ingresó ninguna expresión de álgebra relacional.",
                    -1, -1, tokens, null);
        }

        Expression ast;
        try {
            parser p = new parser(new Lexer(new StringReader(expression)));
            ast = (Expression) p.parse().value;
        } catch (SyntaxException se) {
            return error(response, se.getCode(), se.getMessage(),
                    se.getLine(), se.getColumn(), tokens, se.getExpected());
        } catch (LexicalException le) {
            return error(response, "LEX-01", le.getMessage(),
                    le.getLine(), le.getColumn(), tokens, null);
        } catch (Exception e) {
            return error(response, "SIN-02",
                    "Error sintáctico: " + (e.getMessage() != null ? e.getMessage() : e.toString()),
                    -1, -1, tokens, null);
        }

        String saved = null;
        if (ast instanceof AssignNode assign) {
            saved = assign.getName();
            ast = assign.getBody();
        }
        ast = ast.expand(history);
        if (saved != null) {
            history.put(saved, ast);
        }

        response.put("status", "success");
        response.put("sql", ast.asQuery());
        response.put("tree", ast.toTreeString(0));
        response.put("expanded", ast.asQuery());
        response.put("tokens", tokens);
        if (saved != null) {
            response.put("saved", saved);
        }
        response.put("historyKeys", String.join(", ", history.keySet()));
        return response;
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
                                      int line, int column, List<Map<String, Object>> tokens,
                                      List<String> expected) {
        response.put("status", "error");
        response.put("errorCode", code);
        response.put("message", "[" + code + "] " + message);
        response.put("detail", catalog(code));
        if (line >= 0) response.put("line", line);
        if (column >= 0) response.put("column", column);
        if (expected != null && !expected.isEmpty()) {
            response.put("expected", expected);
        }
        response.put("tokens", tokens);
        response.put("historyKeys", String.join(", ", history.keySet()));
        return response;
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
            case "FUNCTION":    return "Función trigonométrica o matemática.";
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

    public synchronized void clearHistory() {
        history.clear();
        counter = 0;
    }

    public synchronized Map<String, Expression> getHistory() {
        return new LinkedHashMap<>(history);
    }
}
