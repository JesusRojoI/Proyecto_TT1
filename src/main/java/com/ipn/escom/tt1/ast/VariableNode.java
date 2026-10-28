package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Variable de historial ({@code @1}, {@code @2}, ...). Al expandir se sustituye
 * por la relación previamente guardada.
 */
public class VariableNode extends Expression {

    private static final ThreadLocal<java.util.Set<String>> EXPANDING =
            ThreadLocal.withInitial(java.util.HashSet::new);

    private final String name;

    public VariableNode(String name) {
        this.name = name;
    }

    public String getName() { return name; }

    @Override
    public String toSQL() {
        return name;
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Variable: " + name + "\n";
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.leaf(name, "Variable", "variable");
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        Expression stored = history.get(name);
        if (stored == null) {
            return this;
        }
        java.util.Set<String> expanding = EXPANDING.get();
        if (!expanding.add(name)) {
            // Referencia recursiva: se detiene la expansión para evitar ciclos.
            return this;
        }
        try {
            return stored.expand(history);
        } finally {
            expanding.remove(name);
        }
    }
}
