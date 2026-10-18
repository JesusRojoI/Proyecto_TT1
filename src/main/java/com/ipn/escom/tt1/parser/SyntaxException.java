package com.ipn.escom.tt1.parser;

import java.util.List;

/**
 * Error de análisis sintáctico. Se lanza cuando la expresión viola la
 * gramática del álgebra relacional. Incluye la ubicación y la lista de tokens
 * esperados para catalogar la violación sintáctica.
 */
public class SyntaxException extends RuntimeException {

    private final String code;
    private final int line;
    private final int column;
    private final String found;
    private final List<String> expected;

    public SyntaxException(String code, String message, int line, int column,
                           String found, List<String> expected) {
        super(message);
        this.code = code;
        this.line = line;
        this.column = column;
        this.found = found;
        this.expected = expected;
    }

    public String getCode() { return code; }

    public int getLine() { return line; }

    public int getColumn() { return column; }

    public String getFound() { return found; }

    public List<String> getExpected() { return expected; }
}
