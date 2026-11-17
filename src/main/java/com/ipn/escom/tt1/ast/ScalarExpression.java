package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Nodo base para las expresiones escalares (aritméticas, lógicas, funciones,
 * comparaciones y literales) que aparecen dentro de condiciones y listas de
 * proyección/agrupación.
 */
public abstract class ScalarExpression {

    /** Subárbol concreto de la producción que originó este nodo (lo llena CUP). */
    private SyntaxNode syntax;

    public SyntaxNode getSyntax() { return syntax; }

    public void setSyntax(SyntaxNode syntax) { this.syntax = syntax; }

    public abstract String toSQL();

    public abstract String toTreeString(int level);

    /**
     * Representación estructurada del árbol sintáctico para dibujarlo en la
     * interfaz web.
     */
    public abstract Map<String, Object> toTree();
}
