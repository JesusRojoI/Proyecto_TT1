package com.ipn.escom.tt1.ast;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Constructor de nodos para la representación gráfica del árbol sintáctico.
 * Cada nodo se serializa como un mapa listo para convertirse en JSON:
 * <pre>
 * { "label": "σ", "detail": "Selección", "category": "select",
 *   "children": [ { "edge": "condición", "node": { ... } } ] }
 * </pre>
 */
public final class TreeNode {

    private TreeNode() {
    }

    public static Map<String, Object> of(String label, String detail, String category,
                                         List<Map<String, Object>> children) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("label", label);
        node.put("detail", detail);
        node.put("category", category);
        node.put("children", children);
        return node;
    }

    public static Map<String, Object> leaf(String label, String detail, String category) {
        return of(label, detail, category, List.of());
    }

    public static Map<String, Object> child(Map<String, Object> node) {
        return child(node, null);
    }

    public static Map<String, Object> child(Map<String, Object> node, String edge) {
        Map<String, Object> wrapper = new LinkedHashMap<>();
        if (edge != null && !edge.isBlank()) {
            wrapper.put("edge", edge);
        }
        wrapper.put("node", node);
        return wrapper;
    }
}
