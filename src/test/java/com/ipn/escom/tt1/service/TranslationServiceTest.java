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
        assertTrue(((String) r.get("tree")).contains("Proyeccion"));
        assertTrue(((String) r.get("tree")).contains("Tabla: Estudiantes"));

        @SuppressWarnings("unchecked")
        Map<String, Object> tree = (Map<String, Object>) r.get("treeData");
        assertNotNull(tree);
        assertEquals("π", tree.get("label"));
        assertNotNull(tree.get("children"));

        String dot = (String) r.get("treeDot");
        assertNotNull(dot);
        assertTrue(dot.startsWith("digraph ArbolSintactico"));
        assertTrue(dot.contains("N00001"));
        assertTrue(dot.contains("rankdir=TB"));
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
}
