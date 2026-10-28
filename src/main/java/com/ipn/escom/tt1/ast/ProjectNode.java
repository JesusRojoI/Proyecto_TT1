package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Proyección (π). Selecciona un subconjunto de atributos/expresiones de una
 * relación.
 */
public class ProjectNode extends Expression {

    private final ExpressionList attributes;
    private final Expression source;

    public ProjectNode(ExpressionList attributes, Expression source) {
        this.attributes = attributes;
        this.source = source;
    }

    @Override
    public String toSQL() {
        return "SELECT " + attributes.toSQL() + " FROM " + source.fromClause();
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Proyeccion (π)\n" +
               attributes.toTreeString(level + 1) +
               "  ".repeat(level + 1) + "Fuente:\n" +
               source.toTreeString(level + 2);
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of("π", "Proyección", "project", List.of(
                TreeNode.child(attributes.toTree(), "atributos"),
                TreeNode.child(source.toTree(), "fuente")));
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new ProjectNode(attributes, source.expand(history));
    }
}
