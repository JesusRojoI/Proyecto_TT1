package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Referencia a un atributo (columna). Puede ser simple ({@code edad}) o
 * cualificado con el nombre de la tabla ({@code Estudiantes.edad}).
 */
public class AttributeNode extends ScalarExpression {

    private final String table;
    private final String name;

    public AttributeNode(String name) {
        this(null, name);
    }

    public AttributeNode(String table, String name) {
        this.table = table;
        this.name = name;
    }

    public String getTable() { return table; }

    public String getName() { return name; }

    @Override
    public String toSQL() {
        return table == null ? name : table + "." + name;
    }

    @Override
    public String toTreeString(int level) {
        String label = table == null ? name : table + "." + name;
        return "  ".repeat(level) + "Atributo: " + label + "\n";
    }

    @Override
    public Map<String, Object> toTree() {
        String label = table == null ? name : table + "." + name;
        return TreeNode.leaf(label, "Columna de tabla", "attribute");
    }
}
