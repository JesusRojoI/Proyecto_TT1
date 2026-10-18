package com.ipn.escom.tt1.ast;

/**
 * Operación unaria: negación aritmética (menos unario) o negación lógica.
 */
public class UnaryNode extends ScalarExpression {

    private final String operator;
    private final ScalarExpression operand;

    public UnaryNode(String operator, ScalarExpression operand) {
        this.operator = operator;
        this.operand = operand;
    }

    @Override
    public String toSQL() {
        if ("NOT".equals(operator)) {
            return "NOT (" + operand.toSQL() + ")";
        }
        return "-" + operand.toSQL();
    }

    @Override
    public String toTreeString(int level) {
        String label = "NOT".equals(operator) ? "Negacion logica (NOT)" : "Menos unario (-)";
        return "  ".repeat(level) + label + "\n" +
               operand.toTreeString(level + 1);
    }
}
