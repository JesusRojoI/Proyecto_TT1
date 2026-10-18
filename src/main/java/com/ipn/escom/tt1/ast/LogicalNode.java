package com.ipn.escom.tt1.ast;

/**
 * Conjunción o disyunción lógica de dos condiciones ({@code AND} / {@code OR}).
 */
public class LogicalNode extends ScalarExpression {

    private final String operator;
    private final ScalarExpression left;
    private final ScalarExpression right;

    public LogicalNode(String operator, ScalarExpression left, ScalarExpression right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    @Override
    public String toSQL() {
        return "(" + left.toSQL() + " " + operator + " " + right.toSQL() + ")";
    }

    @Override
    public String toTreeString(int level) {
        String label = "AND".equals(operator) ? "Conjuncion (AND)" : "Disyuncion (OR)";
        return "  ".repeat(level) + label + "\n" +
               left.toTreeString(level + 1) +
               right.toTreeString(level + 1);
    }
}
