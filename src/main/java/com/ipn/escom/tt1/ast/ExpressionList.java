package com.ipn.escom.tt1.ast;

import java.util.ArrayList;
import java.util.List;
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
}

// Token error es un token comodin que sirve para cachar errores de gramática. Tras
// error en javacup
// interc
// Que el sistema también pueda ejecutar en local (git clone ...)
// Fabiola ocampito
