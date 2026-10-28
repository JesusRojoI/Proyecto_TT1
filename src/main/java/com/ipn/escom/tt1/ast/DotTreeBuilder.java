package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.Map;

/**
 * Genera la representación DOT (Graphviz) del árbol sintáctico a partir de la
 * estructura que expone cada nodo del AST. El diagrama se dibuja de arriba
 * hacia abajo y cada nodo recibe un identificador único con el formato
 * N00001, N00002, etc., tal como se describe en la documentación del proyecto.
 *
 * <p>Los nodos usan un relleno suave con texto oscuro y borde de color, de modo
 * que el diagrama conserve la paleta institucional sin perder legibilidad.</p>
 */
public final class DotTreeBuilder {

    /** Relleno, borde y color de texto para cada tipo de nodo. */
    private record Style(String fill, String border, String text) {
    }

    private static final Map<String, Style> STYLES = Map.ofEntries(
            Map.entry("select", new Style("#dbeafe", "#3b82f6", "#1e3a8a")),
            Map.entry("project", new Style("#ccfbf1", "#14b8a6", "#115e59")),
            Map.entry("join", new Style("#e0e7ff", "#6366f1", "#3730a3")),
            Map.entry("set", new Style("#cffafe", "#0891b2", "#155e75")),
            Map.entry("group", new Style("#fef3c7", "#f59e0b", "#92400e")),
            Map.entry("aggregate", new Style("#f3e8ff", "#a855f7", "#6b21a8")),
            Map.entry("compare", new Style("#ffe4e6", "#fb7185", "#9f1239")),
            Map.entry("logic", new Style("#fce7f3", "#ec4899", "#9d174d")),
            Map.entry("arith", new Style("#ffedd5", "#fb923c", "#9a3412")),
            Map.entry("function", new Style("#d1fae5", "#10b981", "#065f46")),
            Map.entry("table", new Style("#cbd5e1", "#475569", "#0f172a")),
            Map.entry("attribute", new Style("#e2e8f0", "#94a3b8", "#1e293b")),
            Map.entry("literal", new Style("#dcfce7", "#22c55e", "#166534")),
            Map.entry("assign", new Style("#fef3c7", "#d97706", "#78350f")),
            Map.entry("variable", new Style("#fef9c3", "#eab308", "#713f12")),
            Map.entry("list", new Style("#f1f5f9", "#94a3b8", "#334155"))
    );

    private DotTreeBuilder() {
    }

    public static String build(Map<String, Object> root) {
        StringBuilder dot = new StringBuilder();
        dot.append("digraph ArbolSintactico {\n");
        dot.append("  graph [rankdir=TB, bgcolor=\"transparent\", pad=\"0.2\", ")
           .append("nodesep=\"0.34\", ranksep=\"0.46\", splines=polyline];\n");
        dot.append("  node [shape=box, style=\"filled\", fontname=\"Helvetica\", ")
           .append("fontsize=11, margin=\"0.2,0.11\", penwidth=1.1];\n");
        dot.append("  edge [color=\"#94a3b8\", penwidth=1.1, arrowsize=0.7, ")
           .append("fontname=\"Helvetica\", fontsize=8.5, fontcolor=\"#64748b\"];\n");
        walk(root, dot, new int[] { 1 });
        dot.append("}\n");
        return dot.toString();
    }

    private static String walk(Map<String, Object> node, StringBuilder dot, int[] counter) {
        String id = String.format("N%05d", counter[0]++);
        String label = text(node.get("label"));
        String detail = text(node.get("detail"));
        String category = text(node.get("category"));
        Style style = STYLES.getOrDefault(category, new Style("#f1f5f9", "#94a3b8", "#334155"));

        dot.append("  ").append(id)
           .append(" [label=<").append(htmlLabel(label, detail, style.text())).append(">")
           .append(", fillcolor=\"").append(style.fill()).append("\"")
           .append(", color=\"").append(style.border()).append("\"")
           .append(", fontcolor=\"").append(style.text()).append("\"")
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

    private static String htmlLabel(String label, String detail, String textColor) {
        StringBuilder html = new StringBuilder();
        html.append("<B>").append(escapeHtml(label)).append("</B>");
        if (!detail.isEmpty()) {
            html.append("<BR/><FONT POINT-SIZE=\"8.5\" COLOR=\"")
                .append(textColor)
                .append("\">")
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
