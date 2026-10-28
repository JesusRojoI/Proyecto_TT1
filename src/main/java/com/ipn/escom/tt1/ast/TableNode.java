package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Relación base: una tabla de la base de datos seleccionada.
 */
public class TableNode extends Expression {

    private final String name;

    public TableNode(String name) {
        this.name = name;
    }

    public String getName() { return name; }

    @Override
    public String toSQL() {
        return name;
    }

    @Override
    public String asQuery() {
        return "SELECT * FROM " + name;
    }

    @Override
    public String fromClause() {
        return name;
    }

    @Override
    public String toTreeString(int level) {
        return "  ".repeat(level) + "Tabla: " + name + "\n";
    }

    @Override
    public Map<String, Object> toTree() {
        return TreeNode.leaf(name, "Tabla", "table");
    }
}
