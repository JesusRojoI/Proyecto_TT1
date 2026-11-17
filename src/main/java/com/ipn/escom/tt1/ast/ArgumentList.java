package com.ipn.escom.tt1.ast;

import java.util.ArrayList;

/**
 * Lista de argumentos de una función matemática. Además de los argumentos
 * conserva el subárbol del no terminal {@code ListaArgumentos} para que el
 * árbol de sintaxis muestre la lista completa.
 */
public class ArgumentList extends ArrayList<ScalarExpression> {

    private SyntaxNode syntax;

    public SyntaxNode getSyntax() { return syntax; }

    public void setSyntax(SyntaxNode syntax) { this.syntax = syntax; }
}
