package com.ipn.escom.tt1.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TranslationServiceTest {

    private Map<String, Object> run(String expression) throws Exception {
        return new TranslationService().process(expression);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> tokens(Map<String, Object> response) {
        return (List<Map<String, Object>>) response.get("tokens");
    }

    @Test
    void proyectaAtributos() throws Exception {
        Map<String, Object> r = run("π(nombre, edad)(Estudiantes)");
        assertEquals("success", r.get("status"));
        assertTrue(((String) r.get("sql")).contains("SELECT nombre, edad"));
        assertTrue(((String) r.get("sql")).contains("Estudiantes"));
        assertFalse(tokens(r).isEmpty());
    }

    @Test
    void seleccionConComparador() throws Exception {
        Map<String, Object> r = run("σ(edad > 18)(Estudiantes)");
        assertEquals("success", r.get("status"));
        assertTrue(((String) r.get("sql")).contains("WHERE (edad > 18)"));
    }

    @Test
    void aceptaPalabrasComoAlias() throws Exception {
        Map<String, Object> r = run("pi(nombre)(sigma(edad >= 18)(Estudiantes))");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("SELECT nombre"));
        assertTrue(sql.contains("edad >= 18"));
    }

    @Test
    void funcionesMatematicas() throws Exception {
        Map<String, Object> r = run("π(nombre, sqrt(edad), abs(edad))(Estudiantes)");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("SQRT(edad)"));
        assertTrue(sql.contains("ABS(edad)"));
    }

    @Test
    void funcionesTrigonometricasYaNoFormanParteDelLenguaje() throws Exception {
        Map<String, Object> r = run("π(nombre, sin(edad))(Estudiantes)");
        assertEquals("error", r.get("status"));
    }

    @Test
    void operacionesDeConjuntos() throws Exception {
        assertEquals("success", run("Estudiantes ∪ Egresados").get("status"));
        assertEquals("success", run("Estudiantes ∩ Egresados").get("status"));
        assertEquals("success", run("Estudiantes − Egresados").get("status"));
        assertEquals("success", run("Estudiantes × Carreras").get("status"));
        assertEquals("success", run("Estudiantes ⋈ Inscripciones").get("status"));
    }

    @Test
    void formasPrefixDelProfesor() throws Exception {
        assertEquals("success", run("UNION(Estudiantes, Egresados)").get("status"));
        assertEquals("success", run("PRODCART(Estudiantes, Carreras)").get("status"));
        assertEquals("success", run("JOIN(Estudiantes, Inscripciones, id == estudiante_id)").get("status"));
        assertEquals("success", run("SELEC(edad > 18, Estudiantes)").get("status"));
        assertEquals("success", run("PROY(nombre; Estudiantes)").get("status"));
    }

    @Test
    void agrupacionConAgregados() throws Exception {
        Map<String, Object> r = run("γ(carrera_id; COUNT(*), MAX(edad))(Estudiantes)");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("COUNT(*)"));
        assertTrue(sql.contains("MAX(edad)"));
        assertTrue(sql.contains("GROUP BY carrera_id"));
    }

    @Test
    void relacionesAnidadasYRecursivas() throws Exception {
        Map<String, Object> r = run("π(nombre)(σ(edad > 18)(σ(carrera_id == 1)(Estudiantes)))");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("carrera_id = 1"));
        assertTrue(sql.contains("edad > 18"));
    }

    @Test
    void variablesDeHistorial() throws Exception {
        TranslationService service = new TranslationService();
        service.process("@1 <- π(nombre)(Estudiantes)");
        Map<String, Object> r = service.process("σ(nombre == 'Ana')(@1)");
        assertEquals("success", r.get("status"));
        assertTrue(((String) r.get("sql")).contains("SELECT nombre FROM Estudiantes"));
        assertTrue(((String) r.get("sql")).contains("nombre = 'Ana'"));
    }

    @Test
    void catalogaErrorSintactico() throws Exception {
        Map<String, Object> r = run("π(nombre, )(Estudiantes)");
        assertEquals("error", r.get("status"));
        assertEquals("SIN-01", r.get("errorCode"));
        assertNotNull(r.get("message"));
        assertNotNull(r.get("expected"));
        assertEquals(11, r.get("position"));
        assertEquals(10, r.get("offset"));
    }

    @Test
    void catalogaErrorLexico() throws Exception {
        Map<String, Object> r = run("π(nombre)#(Estudiantes)");
        assertEquals("error", r.get("status"));
        assertEquals("LEX-01", r.get("errorCode"));
    }

    @Test
    void catalogaExpresionVacia() throws Exception {
        Map<String, Object> r = run("   ");
        assertEquals("error", r.get("status"));
        assertEquals("SIN-00", r.get("errorCode"));
    }

    @Test
    void generaArbolSintacticoVisual() throws Exception {
        Map<String, Object> r = run("π(nombre)(Estudiantes)");
        String treeText = (String) r.get("tree");
        assertTrue(treeText.startsWith("ListExprAlgRel"));
        assertTrue(treeText.contains("Relacion"));
        assertTrue(treeText.contains("PROY"));
        assertTrue(treeText.contains("ListaAtributos"));
        assertTrue(treeText.contains("ATRIBUTO"));
        assertTrue(treeText.contains("TABLA.Estudiantes"));

        @SuppressWarnings("unchecked")
        Map<String, Object> tree = (Map<String, Object>) r.get("treeData");
        assertNotNull(tree);
        assertEquals("ListExprAlgRel", tree.get("label"));
        assertEquals("nonterminal", tree.get("category"));
        assertNotNull(tree.get("children"));
        assertTrue(containsLabel(tree, "TABLA.Estudiantes"));
        assertTrue(containsCategory(tree, "nonterminal"));
        assertTrue(containsCategory(tree, "attribute"));

        String dot = (String) r.get("treeDot");
        assertNotNull(dot);
        assertTrue(dot.startsWith("digraph ArbolSintactico"));
        assertTrue(dot.contains("N00001"));
        assertTrue(dot.contains("rankdir=LR"));
        assertTrue(dot.contains("shape=ellipse"));
        assertTrue(dot.contains("PROY"));
        assertTrue(dot.contains("ListaAtributos"));
        assertTrue(dot.contains("ATRIBUTO"));
        assertTrue(dot.contains("TABLA.Estudiantes"));

        String selectDot = (String) run("σ(nombre == 'Ana')(Estudiantes)").get("treeDot");
        assertTrue(selectDot.contains("SELEC"));
        assertTrue(selectDot.contains("expr_bool"));
        assertTrue(selectDot.contains("=="));
    }

    @Test
    @SuppressWarnings("unchecked")
    void generaElArbolDeSintaxisConcretoDelEjemplo() throws Exception {
        String expression =
                "Π(R.a,R.b,R.c,R.d ; ⋈(σ(R;R.a<R.b && R.x==R.y);Y;Y.a>=R.u));";
        Map<String, Object> r = run(expression);
        assertEquals("success", r.get("status"), String.valueOf(r.get("message")));

        String tree = (String) r.get("tree");
        assertTrue(tree.startsWith("ListExprAlgRel"));
        assertTrue(tree.contains("Relacion"));
        assertTrue(tree.contains("PROY"));
        assertTrue(tree.contains("ListaAtributos"));
        assertTrue(tree.contains("JOIN"));
        assertTrue(tree.contains("SELEC"));
        assertTrue(tree.contains("TABLA.R"));
        assertTrue(tree.contains("TABLA.Y"));
        assertTrue(tree.contains("expr_bool"));
        assertTrue(tree.contains("Condicion"));
        assertTrue(tree.contains("ATRIBUTO [R.a]"));
        assertTrue(tree.contains("ATRIBUTO [R.u]"));
        assertTrue(tree.contains("&&"));
        assertTrue(tree.contains(">="));

        Map<String, Object> treeData = (Map<String, Object>) r.get("treeData");
        assertTrue(containsLabel(treeData, "ListExprAlgRel"));
        assertTrue(containsLabel(treeData, "TABLA.R"));
        assertTrue(containsLabel(treeData, "TABLA.Y"));
        assertTrue(containsCategory(treeData, "attribute"));
        assertTrue(containsCategory(treeData, "table"));
        assertTrue(containsCategory(treeData, "nonterminal"));

        String dot = (String) r.get("treeDot");
        assertTrue(dot.contains("TABLA.R"));
        assertTrue(dot.contains("TABLA.Y"));
        assertTrue(dot.contains("expr_bool"));
        assertTrue(dot.contains("Condicion"));

        String sql = (String) r.get("sql");
        assertTrue(sql.contains("SELECT R.a, R.b, R.c, R.d"));
        assertTrue(sql.contains("R.a < R.b"));
        assertTrue(sql.contains("R.x = R.y"));
        assertTrue(sql.contains("Y.a >= R.u"));
    }

    @Test
    void aceptaLasFormasConPuntoYComaDelEjemplo() throws Exception {
        Map<String, Object> select = run("σ(R; R.a < R.b)");
        assertEquals("success", select.get("status"));
        assertTrue(((String) select.get("tree")).contains("SELEC"));
        assertTrue(((String) select.get("tree")).contains("TABLA.R"));

        Map<String, Object> join = run("⋈(R; Y; R.a == Y.a)");
        assertEquals("success", join.get("status"));
        assertTrue(((String) join.get("tree")).contains("JOIN"));
        assertTrue(((String) join.get("tree")).contains("Condicion"));

        Map<String, Object> project = run("Π(R.a; R)");
        assertEquals("success", project.get("status"));
        assertTrue(((String) project.get("tree")).contains("PROY"));
    }

    @Test
    void atributoCualificadoYCadenas() throws Exception {
        Map<String, Object> r = run("σ(Estudiantes.nombre == 'Ana')(Estudiantes)");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("Estudiantes.nombre = 'Ana'"));
    }

    @Test
    void menosUnarioYEnterosNegativos() throws Exception {
        Map<String, Object> r = run("σ(-edad < -5)(Estudiantes)");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("-edad"));
        assertTrue(sql.contains("< -5"));
    }

    @Test
    void relacionesCompuestasConParentesis() throws Exception {
        Map<String, Object> r = run("(Estudiantes × Carreras) − Egresados");
        assertEquals("success", r.get("status"));
        String sql = (String) r.get("sql");
        assertTrue(sql.contains("CROSS JOIN"));
        assertTrue(sql.contains("EXCEPT"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void desglosaVariablesYExpandeElArbol() throws Exception {
        TranslationService service = new TranslationService();
        Map<String, Object> save = service.process("@1 <- π(nombre)(Estudiantes)");
        assertEquals("success", save.get("status"));
        assertEquals("@1", save.get("saved"));
        assertFalse((Boolean) save.get("usesVariables"));
        assertEquals(1, ((List<?>) save.get("history")).size());

        Map<String, Object> r = service.process("σ(nombre == 'Ana')(@1)");
        assertEquals("success", r.get("status"));
        assertTrue((Boolean) r.get("usesVariables"));

        List<Map<String, Object>> breakdown = (List<Map<String, Object>>) r.get("breakdown");
        assertEquals(1, breakdown.size());
        assertEquals("@1", breakdown.get(0).get("name"));
        assertEquals(true, breakdown.get(0).get("defined"));
        assertTrue(((String) breakdown.get(0).get("sql")).contains("SELECT nombre FROM Estudiantes"));

        Map<String, Object> tree = (Map<String, Object>) r.get("treeData");
        assertTrue(containsCategory(tree, "variable"));
        assertFalse(containsCategory(tree, "table"));
        assertTrue(containsLabel(tree, "SELEC"));
        assertTrue(containsLabel(tree, "ListExprAlgRel"));

        String sql = (String) r.get("sql");
        assertTrue(sql.contains("SELECT nombre FROM Estudiantes"));
        assertTrue(sql.contains("nombre = 'Ana'"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void lasVariablesDependientesSeDesglosanEnOrden() throws Exception {
        TranslationService service = new TranslationService();
        service.process("@1 <- π(nombre)(Estudiantes)");
        service.process("@2 <- σ(nombre == 'Ana')(@1)");
        Map<String, Object> r = service.process("@2 ∪ Egresados");
        assertEquals("success", r.get("status"));

        List<Map<String, Object>> breakdown = (List<Map<String, Object>>) r.get("breakdown");
        assertEquals(List.of("@1", "@2"),
                breakdown.stream().map(item -> item.get("name")).toList());
        assertTrue(((String) breakdown.get(1).get("sql")).contains("nombre = 'Ana'"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void elDesgloseConservaLaDefinicionUsadaAunqueLaVariableSeReasigne() throws Exception {
        TranslationService service = new TranslationService();
        service.process("@1 <- π(nombre)(Estudiantes)");
        service.process("@2 <- σ(nombre == 'Ana')(@1)");
        service.process("@1 <- Egresados");

        Map<String, Object> r = service.process("@2");
        assertEquals("success", r.get("status"));
        List<Map<String, Object>> breakdown = (List<Map<String, Object>>) r.get("breakdown");
        assertEquals(List.of("@1", "@2"),
                breakdown.stream().map(item -> item.get("name")).toList());
        assertTrue(((String) breakdown.get(0).get("sql")).contains("SELECT nombre FROM Estudiantes"));
        assertTrue(((String) breakdown.get(1).get("sql")).contains("nombre = 'Ana'"));
    }

    @Test
    void limpiarHistorialEliminaLasVariables() throws Exception {
        TranslationService service = new TranslationService();
        service.process("@1 <- Estudiantes");
        assertFalse(service.historyEntries().isEmpty());
        service.clearHistory();
        assertTrue(service.historyEntries().isEmpty());
    }

    @SuppressWarnings("unchecked")
    private boolean containsCategory(Map<String, Object> node, String category) {
        if (node == null) return false;
        if (category.equals(node.get("category"))) return true;
        Object children = node.get("children");
        if (children instanceof List<?> list) {
            for (Object child : list) {
                if (child instanceof Map<?, ?> wrapper) {
                    Object rawNode = wrapper.get("node");
                    if (rawNode instanceof Map<?, ?> childNode
                            && containsCategory((Map<String, Object>) childNode, category)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private boolean containsLabel(Map<String, Object> node, String label) {
        if (node == null) return false;
        if (label.equals(node.get("label"))) return true;
        Object children = node.get("children");
        if (children instanceof List<?> list) {
            for (Object child : list) {
                if (child instanceof Map<?, ?> wrapper) {
                    Object rawNode = wrapper.get("node");
                    if (rawNode instanceof Map<?, ?> childNode
                            && containsLabel((Map<String, Object>) childNode, label)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
