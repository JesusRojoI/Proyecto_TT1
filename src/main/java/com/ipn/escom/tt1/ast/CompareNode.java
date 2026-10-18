package com.ipn.escom.tt1.ast;

/**
 * Comparación entre dos expresiones escalares. El operador se almacena con el
 * símbolo de la gramática ({@code >}, {@code >=}, {@code <}, {@code <=},
 * {@code ==}, {@code !=}) y se traduce al operador SQL equivalente.
 */
public class CompareNode extends ScalarExpression {

    private final String operator;
    private final ScalarExpression left;
    private final ScalarExpression right;

    public CompareNode(String operator, ScalarExpression left, ScalarExpression right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    private String sqlOperator() {
        switch (operator) {
            case "==": return "=";
            case "!=": return "<>";
            default:   return operator;
        }
    }

    private String name() {
        switch (operator) {
            case ">":  return "Mayor que";
            case ">=": return "Mayor o igual que";
            case "<":  return "Menor que";
            case "<=": return "Menor o igual que";
            case "==": return "Igual a";
            case "!=": return "Distinto de";
            default:   return "Comparacion";
        }
    }

    @Override
    public String toSQL() {
        return "(" + left.toSQL() + " " + sqlOperator() + " " + right.toSQL() + ")";
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Comparacion: " + name() + " (" + operator + ")\n" +
               left.toTreeString(level + 1) +
               right.toTreeString(level + 1);
    }
}
