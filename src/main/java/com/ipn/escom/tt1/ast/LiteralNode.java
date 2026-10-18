package com.ipn.escom.tt1.ast;

/**
 * Literal escalar: número, cadena de texto o valor lógico ({@code TRUE},
 * {@code FALSE}, {@code NULL}). El valor se guarda ya listo para SQL.
 */
public class LiteralNode extends ScalarExpression {

    private final String value;
    private final String kind;

    public LiteralNode(String value, String kind) {
        this.value = value;
        this.kind = kind;
    }

    public static LiteralNode number(String value) {
        return new LiteralNode(value, "NUMERO");
    }

    public static LiteralNode text(String value) {
        return new LiteralNode("'" + value.replace("'", "''") + "'", "CADENA");
    }

    public static LiteralNode keyword(String value) {
        return new LiteralNode(value, "LOGICO");
    }

    public String getValue() { return value; }

    public String getKind() { return kind; }

    @Override
    public String toSQL() {
        return value;
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + kind + ": " + value + "\n";
    }
}
