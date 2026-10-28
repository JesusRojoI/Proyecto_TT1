package com.ipn.escom.tt1.ast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Lista de expresiones escalares usada por PROY (π) para indicar los
 * atributos que se proyectan y por AGRUPAR (γ) para los atributos de
 * agrupación.
 */
public class ExpressionList extends ScalarExpression {

    private final List<ScalarExpression> expressions = new ArrayList<>();

    public ExpressionList(ScalarExpression first) {
        expressions.add(first);
    }

    public ExpressionList add(ScalarExpression expr) {
        expressions.add(expr);
        return this;
    }

    @Override
    public String toSQL() {
        return expressions.stream()
                .map(ScalarExpression::toSQL)
                .collect(Collectors.joining(", "));
    }

    @Override
    public String toTreeString(int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("  ".repeat(level)).append("Lista de atributos/expresiones:\n");
        for (ScalarExpression e : expressions) {
            sb.append(e.toTreeString(level + 1));
        }
        return sb.toString();
    }

    @Override
    public Map<String, Object> toTree() {
        List<Map<String, Object>> children = expressions.stream()
                .map(e -> TreeNode.child(e.toTree()))
                .toList();
        return TreeNode.of("Atributos",
                expressions.size() == 1 ? "1 atributo" : expressions.size() + " atributos",
                "list", children);
    }
}

// Token error es un token comodin que sirve para cachar errores de gramática. Tras
// error en javacup
// interc
// Que el sistema también pueda ejecutar en local (git clone ...)
// Fabiola ocampito
