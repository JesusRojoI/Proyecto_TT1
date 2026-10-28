package com.ipn.escom.tt1.ast;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Reunión (⋈). Si no hay condición se genera una reunión natural; si existe
 * una condición se genera una reunión theta (JOIN ... ON condición).
 */
public class JoinNode extends Expression {

    private final Expression left;
    private final Expression right;
    private final ScalarExpression condition;

    public JoinNode(Expression left, Expression right, ScalarExpression condition) {
        this.left = left;
        this.right = right;
        this.condition = condition;
    }

    @Override
    public String toSQL() {
        String base = "SELECT * FROM " + left.fromClause() + " NATURAL JOIN " + right.fromClause();
        if (condition == null) {
            return base;
        }
        return "SELECT * FROM " + left.fromClause() + " JOIN " + right.fromClause() +
               " ON " + condition.toSQL();
    }

    @Override
    public String toTreeString(int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("  ".repeat(level))
          .append(condition == null ? "Reunion natural (⋈)" : "Reunion theta (⋈)")
          .append("\n");
        sb.append(left.toTreeString(level + 1));
        sb.append(right.toTreeString(level + 1));
        if (condition != null) {
            sb.append("  ".repeat(level + 1)).append("Condicion:\n");
            sb.append(condition.toTreeString(level + 2));
        }
        return sb.toString();
    }

    @Override
    public Map<String, Object> toTree() {
        List<Map<String, Object>> children = new ArrayList<>();
        children.add(TreeNode.child(left.toTree(), "izquierda"));
        children.add(TreeNode.child(right.toTree(), "derecha"));
        if (condition != null) {
            children.add(TreeNode.child(condition.toTree(), "condición"));
        }
        return TreeNode.of("⋈", condition == null ? "Reunión natural" : "Reunión theta", "join", children);
    }

    @Override
    public Expression expand(Map<String, Expression> history) {
        return new JoinNode(left.expand(history), right.expand(history), condition);
    }
}
