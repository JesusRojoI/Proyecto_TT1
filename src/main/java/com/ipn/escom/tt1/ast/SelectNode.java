package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Selección (σ). Filtra las tuplas de una relación que satisfacen una
 * condición lógica.
 */
public class SelectNode extends Expression {

    private final ScalarExpression condition;
    private final Expression source;

    public SelectNode(ScalarExpression condition, Expression source) {
        this.condition = condition;
        this.source = source;
    }

    @Override
    public String toSQL() {
        return "SELECT * FROM " + source.fromClause() + " WHERE " + condition.toSQL();
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Seleccion (σ)\n" +
               "  ".repeat(level + 1) + "Condicion:\n" +
               condition.toTreeString(level + 2) +
               "  ".repeat(level + 1) + "Fuente:\n" +
               source.toTreeString(level + 2);
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of("σ", "Filtra filas", "select", List.of(
                TreeNode.child(condition.toTree(), "condición"),
                TreeNode.child(source.toTree(), "relación")));
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new SelectNode(condition, source.expand(history));
    }
}
