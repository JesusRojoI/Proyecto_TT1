package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Operación aritmética binaria: suma, resta, multiplicación, división o
 * potencia.
 */
public class ArithNode extends ScalarExpression {

    private final String operator;
    private final ScalarExpression left;
    private final ScalarExpression right;

    public ArithNode(String operator, ScalarExpression left, ScalarExpression right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    private String name() {
        switch (operator) {
            case "+": return "Suma";
            case "-": return "Resta";
            case "*": return "Multiplicacion";
            case "/": return "Division";
            case "^": return "Potencia";
            default:  return operator;
        }
    }

    @Override
    public String toSQL() {
        return "(" + left.toSQL() + " " + operator + " " + right.toSQL() + ")";
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + name() + " (" + operator + ")\n" +
               left.toTreeString(level + 1) +
               right.toTreeString(level + 1);
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of(operator, name(), "arith", List.of(
                TreeNode.child(left.toTree(), "izquierda"),
                TreeNode.child(right.toTree(), "derecha")));
    }
}
