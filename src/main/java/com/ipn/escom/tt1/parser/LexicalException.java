package com.ipn.escom.tt1.parser;

/**
 * Error de análisis léxico. Se lanza cuando el escáner encuentra un carácter
 * que no pertenece a la gramática del álgebra relacional.
 */
public class LexicalException extends RuntimeException {

    private final int line;
    private final int column;
    private final String lexeme;

    public LexicalException(String message, int line, int column, String lexeme) {
        super(message);
        this.line = line;
        this.column = column;
        this.lexeme = lexeme;
    }

    public int getLine() { return line; }

    public int getColumn() { return column; }

    public String getLexeme() { return lexeme; }
}
