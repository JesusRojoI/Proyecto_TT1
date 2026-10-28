package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Función de agregación (SUM, PROM/AVG, MAX, MIN, COUNT). Puede operar sobre
 * una expresión o sobre {@code *} (COUNT(*)&nbsp;).
 */
public class AggregateExpression extends ScalarExpression {

    private final String name;
    private final ScalarExpression argument;
    private final boolean star;

    public AggregateExpression(String name, ScalarExpression argument, boolean star) {
        this.name = name;
        this.argument = argument;
        this.star = star;
    }

    public String getName() { return name; }

    @Override
    public String toSQL() {
        return star ? name + "(*)" : name + "(" + argument.toSQL() + ")";
    }

    @Override
    public String toTreeString(int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("  ".repeat(level)).append("Agregacion: ").append(name).append("()\n");
        if (star) {
            sb.append("  ".repeat(level + 1)).append("*\n");
        } else {
            sb.append(argument.toTreeString(level + 1));
        }
        return sb.toString();
    }

    @Override
    public Map<String, Object> toTree() {
        if (star) {
            return TreeNode.of(name + "(*)", "Agregación", "aggregate", List.of());
        }
        return TreeNode.of(name + "()", "Agregación", "aggregate", List.of(
                TreeNode.child(argument.toTree(), "aplicado a")));
    }
}
