package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Nodo base para las expresiones escalares (aritméticas, lógicas, funciones,
 * comparaciones y literales) que aparecen dentro de condiciones y listas de
 * proyección/agrupación.
 */
public abstract class ScalarExpression {

    public abstract String toSQL();

    public abstract String toTreeString(int level);

    /**
     * Representación estructurada del árbol sintáctico para dibujarlo en la
     * interfaz web.
     */
    public abstract Map<String, Object> toTree();
}
