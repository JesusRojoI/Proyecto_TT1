package com.ipn.escom.tt1.ast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Invocación de una función matemática (SQRT, ABS, FLOOR, ...).
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

    @Override
    public Map<String, Object> toTree() {
        List<Map<String, Object>> children = new ArrayList<>();
        int index = 1;
        for (ScalarExpression argument : arguments) {
            children.add(TreeNode.child(argument.toTree(), arguments.size() == 1 ? "argumento" : "arg " + index));
            index++;
        }
        return TreeNode.of(name + "()", "Función", "function", children);
    }
}
