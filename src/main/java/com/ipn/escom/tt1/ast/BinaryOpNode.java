package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Operadores binarios de conjuntos y producto cartesiano:
 * UNION, INTERSECCION, DIFERENCIA y PRODUCTO CARTESIANO.
 */
public class BinaryOpNode extends Expression {

    private final String operator;
    private final Expression left;
    private final Expression right;

    public BinaryOpNode(String operator, Expression left, Expression right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    public String getOperator() { return operator; }

    private String sqlLabel() {
        switch (operator) {
            case "UNION":      return "UNION";
            case "INTERSECT":  return "INTERSECT";
            case "DIFFERENCE": return "EXCEPT";
            default:           return operator;
        }
    }

    private String treeLabel() {
        switch (operator) {
            case "UNION":      return "Union (∪)";
            case "INTERSECT":  return "Interseccion (∩)";
            case "DIFFERENCE": return "Diferencia (−)";
            case "PRODUCT":    return "Producto cartesiano (×)";
            default:           return operator;
        }
    }

    @Override
    public String toSQL() {
        if ("PRODUCT".equals(operator)) {
            return "SELECT * FROM " + left.fromClause() + " CROSS JOIN " + right.fromClause();
        }
        return left.asQuery() + "\n" + sqlLabel() + "\n" + right.asQuery();
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + treeLabel() + "\n" +
               left.toTreeString(level + 1) +
               right.toTreeString(level + 1);
    }

    private String symbol() {
        switch (operator) {
            case "UNION":      return "∪";
            case "INTERSECT":  return "∩";
            case "DIFFERENCE": return "−";
            case "PRODUCT":    return "×";
            default:           return operator;
        }
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of(symbol(), treeLabel(), "set", List.of(
                TreeNode.child(left.toTree(), "operando izquierdo"),
                TreeNode.child(right.toTree(), "operando derecho")));
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new BinaryOpNode(operator, left.expand(history), right.expand(history));
    }
}
