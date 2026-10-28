package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Asignación de una relación a una variable del historial:
 * {@code @1 <- π(...)(Tabla)}.
 */
public class AssignNode extends Expression {

    private final String name;
    private final Expression body;

    public AssignNode(String name, Expression body) {
        this.name = name;
        this.body = body;
    }

    public String getName() { return name; }

    public Expression getBody() { return body; }

    @Override
    public String toSQL() {
        return body.toSQL();
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Asignacion: " + name + "\n" +
               body.toTreeString(level + 1);
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.of(name, "Asignación", "assign", List.of(
                TreeNode.child(body.toTree(), "expresión")));
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new AssignNode(name, body.expand(history));
    }
}
