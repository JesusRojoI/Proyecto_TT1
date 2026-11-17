package com.ipn.escom.tt1.ast;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Nodo del árbol de sintaxis concreto (CST) producido por la gramática.
 *
 * <p>A diferencia de los nodos del AST, aquí se conservan los nombres de los
 * no terminales ({@code Relacion}, {@code ListaAtributos}, {@code expr_bool},
 * ...) y los terminales tal como participan en las producciones
 * ({@code PROY}, {@code (}, {@code ;}, {@code &&}, {@code TABLA.R}, ...). De
 * este modo el diagrama refleja exactamente la derivación de la expresión y no
 * solamente la estructura semántica que consume la traducción a SQL.</p>
 */
public final class SyntaxNode {

    public static final String NONTERMINAL = "nonterminal";
    public static final String TERMINAL = "terminal";
    public static final String OPERATOR = "operator";
    public static final String TABLE = "table";
    public static final String ATTRIBUTE = "attribute";
    public static final String LITERAL = "literal";
    public static final String VARIABLE = "variable";
    public static final String FUNCTION = "function";
    public static final String AGGREGATE = "aggregate";

    private final String label;
    private final String detail;
    private final String category;
    private final List<SyntaxNode> children;

    private SyntaxNode(String label, String detail, String category, List<SyntaxNode> children) {
        this.label = label;
        this.detail = detail == null ? "" : detail;
        this.category = category;
        this.children = List.copyOf(children);
    }

    public static SyntaxNode of(String label, String detail, String category,
                                List<SyntaxNode> children) {
        return new SyntaxNode(label, detail, category, children);
    }

    /** No terminal de la gramática. */
    public static SyntaxNode nonterminal(String label, SyntaxNode... children) {
        return new SyntaxNode(label, "", NONTERMINAL, Arrays.asList(children));
    }

    /** Terminal simple: palabra reservada, signo o delimitador. */
    public static SyntaxNode terminal(String label) {
        return new SyntaxNode(label, "", TERMINAL, List.of());
    }

    /** Terminal con información adicional (valor léxico, tabla, atributo...). */
    public static SyntaxNode terminal(String label, String detail, String category) {
        return new SyntaxNode(label, detail, category, List.of());
    }

    public String getLabel() { return label; }

    public String getDetail() { return detail; }

    public String getCategory() { return category; }

    public List<SyntaxNode> getChildren() { return children; }

    /** Representación serializable que consume {@link DotTreeBuilder}. */
    public Map<String, Object> toTree() {
        List<Map<String, Object>> wrapped = children.stream()
                .map(child -> TreeNode.child(child.toTree()))
                .toList();
        return TreeNode.of(label, detail, category, wrapped);
    }

    /** Vista textual con sangría, útil para pruebas y registros. */
    public String toTreeString(int level) {
        StringBuilder out = new StringBuilder();
        out.append("  ".repeat(level)).append(label);
        if (!detail.isEmpty()) {
            out.append(" [").append(detail).append(']');
        }
        out.append('\n');
        for (SyntaxNode child : children) {
            out.append(child.toTreeString(level + 1));
        }
        return out.toString();
    }

    @Override
    public String toString() {
        return label + (detail.isEmpty() ? "" : "[" + detail + "]")
                + (children.isEmpty() ? "" : children.toString());
    }
}
