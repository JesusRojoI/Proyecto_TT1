package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Genera la representación DOT (Graphviz) del árbol sintáctico a partir de la
 * estructura que expone cada nodo del AST. El diagrama se dibuja de arriba
 * hacia abajo y cada nodo recibe un identificador único con el formato
 * N00001, N00002, etc., tal como se describe en la documentación del proyecto.
 */
public final class DotTreeBuilder {

    private static final Map<String, String> COLORS = Map.ofEntries(
            Map.entry("select", "#2563eb"),
            Map.entry("project", "#0d9488"),
            Map.entry("join", "#6d28d9"),
            Map.entry("set", "#0e7490"),
            Map.entry("group", "#b45309"),
            Map.entry("aggregate", "#7e22ce"),
            Map.entry("compare", "#be123c"),
            Map.entry("logic", "#9f1239"),
            Map.entry("arith", "#c2410c"),
            Map.entry("function", "#047857"),
            Map.entry("table", "#334155"),
            Map.entry("attribute", "#475569"),
            Map.entry("literal", "#15803d"),
            Map.entry("assign", "#92400e"),
            Map.entry("variable", "#a16207"),
            Map.entry("list", "#64748b")
    );

    private DotTreeBuilder() {
    }

    public static String build(Map<String, Object> root) {
        StringBuilder dot = new StringBuilder();
        dot.append("digraph ArbolSintactico {\n");
        dot.append("  graph [rankdir=TB, bgcolor=\"transparent\", pad=\"0.25\", ")
           .append("nodesep=\"0.32\", ranksep=\"0.52\", splines=polyline];\n");
        dot.append("  node [shape=box, style=\"rounded,filled\", fontname=\"Helvetica\", ")
           .append("fontsize=10, margin=\"0.16,0.09\", penwidth=0, color=\"#ffffff\"];\n");
        dot.append("  edge [color=\"#94a3b8\", penwidth=1.1, arrowsize=0.7, ")
           .append("fontname=\"Helvetica\", fontsize=8, fontcolor=\"#64748b\"];\n");
        walk(root, dot, new int[] { 1 });
        dot.append("}\n");
        return dot.toString();
    }

    private static String walk(Map<String, Object> node, StringBuilder dot, int[] counter) {
        String id = String.format("N%05d", counter[0]++);
        String label = text(node.get("label"));
        String detail = text(node.get("detail"));
        String category = text(node.get("category"));
        String color = COLORS.getOrDefault(category, "#475569");

        dot.append("  ").append(id)
           .append(" [label=<").append(htmlLabel(label, detail)).append(">")
           .append(", fillcolor=\"").append(color).append("\"")
           .append(", fontcolor=\"#ffffff\"")
           .append(", tooltip=\"").append(escapeDot(label + (detail.isEmpty() ? "" : " · " + detail))).append("\"];\n");

        List<Map<String, Object>> children = children(node);
        for (Map<String, Object> child : children) {
            Object raw = child.get("node");
            if (!(raw instanceof Map<?, ?>)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> childNode = (Map<String, Object>) raw;
            String childId = walk(childNode, dot, counter);
            String edge = text(child.get("edge"));
            dot.append("  ").append(id).append(" -> ").append(childId);
            if (!edge.isEmpty()) {
                dot.append(" [label=\"").append(escapeDot(edge)).append("\"]");
            }
            dot.append(";\n");
        }
        return id;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> children(Map<String, Object> node) {
        Object raw = node.get("children");
        if (raw instanceof List<?>) {
            return (List<Map<String, Object>>) raw;
        }
        return List.of();
    }

    private static String htmlLabel(String label, String detail) {
        StringBuilder html = new StringBuilder();
        html.append("<B>").append(escapeHtml(label)).append("</B>");
        if (!detail.isEmpty()) {
            html.append("<BR/><FONT POINT-SIZE=\"8\">")
                .append(escapeHtml(detail))
                .append("</FONT>");
        }
        return html.toString();
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String escapeDot(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
