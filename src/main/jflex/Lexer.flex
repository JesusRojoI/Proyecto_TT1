package com.ipn.escom.tt1.parser;

import java_cup.runtime.Symbol;

%%

/* =============================================================
   Analizador lexico del Algebra Relacional (TT1)
   Basado en la propuesta de DefExpRegLexi.flex del profesor,
   ampliado con funciones matematicas, cadenas, comentarios y
   soporte de simbolos unicode (operadores griegos).
   ============================================================= */

%class Lexer
%public
%unicode
%cup
%line
%column
%caseless

%{
    private Symbol symbol(int type) {
        return new Symbol(type, yyline, yycolumn);
    }
    private Symbol symbol(int type, Object value) {
        return new Symbol(type, yyline, yycolumn, value);
    }
%}

LineTerminator = \r|\n|\r\n
WhiteSpace     = {LineTerminator} | [ \t\f]
Identifier     = [a-zA-Z_][a-zA-Z0-9_]*
Variable       = "@"[0-9]+
Digit          = [0-9]
Number         = {Digit}+("."{Digit}+)?([eE][+-]?{Digit}+)?

%%

/* ---------- Comentarios y espacios en blanco (se ignoran) ---------- */
"--"[^\r\n]*        { /* comentario de linea estilo SQL */ }
"//"[^\r\n]*        { /* comentario de linea estilo Java */ }
"/*"~"*/"           { /* comentario de bloque */ }
{WhiteSpace}        { /* ignorar */ }

/* ---------- Operadores relacionales (simbolos unicode) ---------- */
"σ"                 { return symbol(sym.SELECT, yytext()); }
"π"                 { return symbol(sym.PROJECT, yytext()); }
"⋈"                 { return symbol(sym.JOIN, yytext()); }
"∪"                 { return symbol(sym.UNION, yytext()); }
"∩"                 { return symbol(sym.INTERSEC, yytext()); }
"γ"                 { return symbol(sym.GROUP, yytext()); }
"Σ"                 { return symbol(sym.SUM, yytext()); }

/* ---------- Operadores relacionales (palabras) ---------- */
"selec"             { return symbol(sym.SELECT, yytext()); }
"seleccion"         { return symbol(sym.SELECT, yytext()); }
"selección"         { return symbol(sym.SELECT, yytext()); }
"sigma"             { return symbol(sym.SELECT, yytext()); }
"proy"              { return symbol(sym.PROJECT, yytext()); }
"proyeccion"        { return symbol(sym.PROJECT, yytext()); }
"proyección"        { return symbol(sym.PROJECT, yytext()); }
"pi"                { return symbol(sym.PROJECT, yytext()); }
"join"              { return symbol(sym.JOIN, yytext()); }
"union"             { return symbol(sym.UNION, yytext()); }
"inter"             { return symbol(sym.INTERSEC, yytext()); }
"intersec"          { return symbol(sym.INTERSEC, yytext()); }
"interseccion"      { return symbol(sym.INTERSEC, yytext()); }
"intersección"      { return symbol(sym.INTERSEC, yytext()); }
"dif"               { return symbol(sym.DIFFERENCE, yytext()); }
"diferencia"        { return symbol(sym.DIFFERENCE, yytext()); }
"prodcart"          { return symbol(sym.PRODUCT, yytext()); }
"producto"          { return symbol(sym.PRODUCT, yytext()); }
"agrupar"           { return symbol(sym.GROUP, yytext()); }
"agrup"             { return symbol(sym.GROUP, yytext()); }

/* ---------- Funciones de agregacion ---------- */
"sum"               { return symbol(sym.SUM, yytext()); }
"suma"              { return symbol(sym.SUM, yytext()); }
"prom"              { return symbol(sym.AVG, yytext()); }
"promedio"          { return symbol(sym.AVG, yytext()); }
"avg"               { return symbol(sym.AVG, yytext()); }
"max"               { return symbol(sym.MAX, yytext()); }
"min"               { return symbol(sym.MIN, yytext()); }
"count"             { return symbol(sym.COUNT, yytext()); }
"contar"            { return symbol(sym.COUNT, yytext()); }

/* ---------- Operadores de comparacion ---------- */
">="                { return symbol(sym.GE, yytext()); }
"<="                { return symbol(sym.LE, yytext()); }
"=="                { return symbol(sym.EQ, yytext()); }
"!="                { return symbol(sym.NE, yytext()); }
"<>"                { return symbol(sym.NE, yytext()); }
">"                 { return symbol(sym.GT, yytext()); }
"<"                 { return symbol(sym.LT, yytext()); }

/* ---------- Operadores logicos ---------- */
"&&"                { return symbol(sym.AND, yytext()); }
"||"                { return symbol(sym.OR, yytext()); }
"!"                 { return symbol(sym.NOT, yytext()); }
"and"               { return symbol(sym.AND, yytext()); }
"or"                { return symbol(sym.OR, yytext()); }
"not"               { return symbol(sym.NOT, yytext()); }

/* ---------- Operadores aritmeticos ---------- */
"+"                 { return symbol(sym.PLUS, yytext()); }
"-"                 { return symbol(sym.MINUS, yytext()); }
"−"                 { return symbol(sym.MINUS, yytext()); }
"*"                 { return symbol(sym.TIMES, yytext()); }
"×"                 { return symbol(sym.TIMES, yytext()); }
"/"                 { return symbol(sym.DIVIDE, yytext()); }
"^"                 { return symbol(sym.POWER, yytext()); }

/* ---------- Asignacion ---------- */
"<-"                { return symbol(sym.ASSIGN, yytext()); }
"="                 { return symbol(sym.ASSIGN, yytext()); }

/* ---------- Delimitadores ---------- */
"("                 { return symbol(sym.LPAREN, yytext()); }
")"                 { return symbol(sym.RPAREN, yytext()); }
","                 { return symbol(sym.COMMA, yytext()); }
";"                 { return symbol(sym.SEMICOLON, yytext()); }

/* ---------- Funciones matemáticas ---------- */
"sqrt"              { return symbol(sym.FUNCTION, "SQRT"); }
"raiz"              { return symbol(sym.FUNCTION, "SQRT"); }
"abs"               { return symbol(sym.FUNCTION, "ABS"); }
"floor"             { return symbol(sym.FUNCTION, "FLOOR"); }
"ceil"              { return symbol(sym.FUNCTION, "CEIL"); }
"round"             { return symbol(sym.FUNCTION, "ROUND"); }
"mod"               { return symbol(sym.FUNCTION, "MOD"); }
"pow"               { return symbol(sym.FUNCTION, "POW"); }
"radians"           { return symbol(sym.FUNCTION, "RADIANS"); }
"degrees"           { return symbol(sym.FUNCTION, "DEGREES"); }

/* ---------- Valores logicos ---------- */
"true"              { return symbol(sym.TRUE, "TRUE"); }
"false"             { return symbol(sym.FALSE, "FALSE"); }
"null"              { return symbol(sym.NULL, "NULL"); }

/* ---------- Literales y nombres ---------- */
{Variable}          { return symbol(sym.VARIABLE, yytext()); }
{Identifier}"."{Identifier}
                    { return symbol(sym.QUALIFIED, yytext()); }
{Identifier}        { return symbol(sym.IDENTIFIER, yytext()); }
{Number}            { return symbol(sym.NUMBER, yytext()); }
\"([^\"\\]|\\.)*\"  { String s = yytext(); return symbol(sym.STRING, s.substring(1, s.length() - 1)); }
\'([^\'\\]|\\.)*\'  { String s = yytext(); return symbol(sym.STRING, s.substring(1, s.length() - 1)); }

/* ---------- Error lexico ---------- */
[^]                 {
                        throw new LexicalException(
                            "Carácter no reconocido '" + yytext() + "' en el análisis léxico.",
                            yyline + 1, yycolumn + 1, yytext());
                    }
