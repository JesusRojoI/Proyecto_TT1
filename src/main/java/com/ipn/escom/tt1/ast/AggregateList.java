package com.ipn.escom.tt1.ast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Lista de funciones de agregación usadas por el operador AGRUPAR (γ).
 */
public class AggregateList extends ScalarExpression {

    private final List<AggregateExpression> aggregates = new ArrayList<>();

    public AggregateList(AggregateExpression first) {
        aggregates.add(first);
    }

    public AggregateList add(AggregateExpression aggregate) {
        aggregates.add(aggregate);
        return this;
    }

    @Override
    public String toSQL() {
        return aggregates.stream()
                .map(AggregateExpression::toSQL)
                .collect(Collectors.joining(", "));
    }

    @Override
    public String toTreeString(int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("  ".repeat(level)).append("Funciones de agregacion:\n");
        for (AggregateExpression a : aggregates) {
            sb.append(a.toTreeString(level + 1));
        }
        return sb.toString();
    }

    @Override
    public Map<String, Object> toTree() {
        List<Map<String, Object>> children = aggregates.stream()
                .map(a -> TreeNode.child(a.toTree()))
                .toList();
        return TreeNode.of("agregados", aggregates.size() + " función(es)", "list", children);
    }
}
