package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Agrupación (γ). Agrupa por una lista de atributos y calcula funciones de
 * agregación (SUM, PROM/AVG, MAX, MIN, COUNT).
 */
public class GroupNode extends Expression {

    private final ExpressionList groupAttributes;
    private final AggregateList aggregates;
    private final Expression source;

    public GroupNode(ExpressionList groupAttributes, AggregateList aggregates, Expression source) {
        this.groupAttributes = groupAttributes;
        this.aggregates = aggregates;
        this.source = source;
    }

    @Override
    public String toSQL() {
        return "SELECT " + groupAttributes.toSQL() + ", " + aggregates.toSQL() +
               " FROM " + source.fromClause() +
               " GROUP BY " + groupAttributes.toSQL();
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Agrupacion (γ)\n" +
               groupAttributes.toTreeString(level + 1) +
               aggregates.toTreeString(level + 1) +
               "  ".repeat(level + 1) + "Fuente:\n" +
               source.toTreeString(level + 2);
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of("γ", "Agrupación", "group", List.of(
                TreeNode.child(groupAttributes.toTree(), "agrupar por"),
                TreeNode.child(aggregates.toTree(), "agregados"),
                TreeNode.child(source.toTree(), "fuente")));
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new GroupNode(groupAttributes, aggregates, source.expand(history));
    }
}
