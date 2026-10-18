package com.ipn.escom.tt1.ast;

import java.util.Map;

/**
 * Nodo base de las expresiones de álgebra relacional (relaciones). Cada nodo
 * sabe traducirse a SQL y representarse como árbol sintáctico.
 */
public abstract class Expression {

    public abstract String toSQL();

    public abstract String toTreeString(int level);

    /**
     * Vista completa de la relación como una consulta SQL ejecutable.
     */
    public String asQuery() {
        return toSQL();
    }

    /**
     * Fragmento utilizable dentro de una cláusula FROM. Las relaciones simples
     * (tablas) se usan directamente; las compuestas se envuelven como
     * subconsulta con un alias único.
     */
    public String fromClause() {
        return "(" + asQuery() + ") AS " + alias();
    }

    protected String alias() {
        return "_q" + Integer.toHexString(System.identityHashCode(this));
    }

    /**
     * Sustituye las variables de historial (@1, @2, ...) por las relaciones
     * guardadas.
     */
    public Expression expand(Map<String, Expression> history) {
        return this;
    }
}
