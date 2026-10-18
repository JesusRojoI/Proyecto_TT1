package com.ipn.escom.tt1.ast;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Invocación de una función trigonométrica o matemática
 * (SIN, COS, TAN, SQRT, LOG, ...).
 */
public class FunctionNode extends ScalarExpression {

    private final String name;
    private final List<ScalarExpression> arguments;

    public FunctionNode(String name, List<ScalarExpression> arguments) {
        this.name = name;
        this.arguments = arguments;
    }

    @Override
    public String toSQL() {
        return name + "(" + arguments.stream()
                .map(ScalarExpression::toSQL)
                .collect(Collectors.joining(", ")) + ")";
    }

    @Override
    public String toTreeString(int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("  ".repeat(level)).append("Funcion: ").append(name).append("()\n");
        for (ScalarExpression a : arguments) {
            sb.append(a.toTreeString(level + 1));
        }
        return sb.toString();
    }
}
