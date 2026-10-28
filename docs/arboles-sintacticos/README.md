# Árboles sintácticos del proyecto

Esta carpeta contiene **28 árboles de sintaxis** producidos por el analizador
sintáctico del proyecto (gramática `src/main/cup/parser.cup` y nodos AST de
`com.ipn.escom.tt1.ast`). Cada árbol se entrega como imagen independiente:

- `png/`: imagen rasterizada a 2× para insertar en documentos o diapositivas.
- `svg/`: versión vectorial, escalable sin pérdida.
- `index.html`: galería navegable con todas las imágenes, expresiones y producciones.

Abre `index.html` en el navegador para recorrer la colección completa.

| Imagen | Árbol | Expresión de ejemplo |
|---|---|---|
| `01-seleccion-simple.png` | Selección (σ) con comparador | `σ(edad > 5)(Estudiantes)` |
| `02-seleccion-compuesta.png` | Selección (σ) con conjunción | `σ(edad >= 18 && carrera == "ISC")(Estudiantes)` |
| `03-proyeccion-atributos.png` | Proyección (π) de atributos | `π(nombre, edad)(Estudiantes)` |
| `04-proyeccion-expresion.png` | Proyección (π) con expresión aritmética | `π(nombre, salario * 1.1)(Empleados)` |
| `05-join-natural.png` | Reunión natural (⋈) | `Estudiantes ⋈ Inscripciones` |
| `06-join-theta.png` | Reunión theta (⋈ con condición) | `JOIN(Estudiantes, Inscripciones, Estudiantes.matricula == Inscripciones.matricula)` |
| `07-union.png` | Unión (∪) | `UNION(Estudiantes2023, Estudiantes2024)` |
| `08-interseccion.png` | Intersección (∩) | `INTERSEC(Estudiantes2023, Estudiantes2024)` |
| `09-diferencia.png` | Diferencia (−) | `DIF(Estudiantes2023, Estudiantes2024)` |
| `10-producto-cartesiano.png` | Producto cartesiano (×) | `Estudiantes × Carreras` |
| `11-agrupacion.png` | Agrupación (γ) con funciones de agregación | `γ(carrera; PROM(edad), COUNT(*))(Estudiantes)` |
| `12-asignacion.png` | Asignación a variable de historial (←) | `@1 <- π(nombre)(Estudiantes)` |
| `13-variable.png` | Variable de historial (@n) | `@1` |
| `14-tabla.png` | Relación base (tabla) | `Estudiantes` |
| `15-expresion-anidada.png` | Expresión anidada (operadores recursivos) | `π(nombre)(σ(edad >= 18)(Estudiantes ⋈ Inscripciones))` |
| `16-comparacion-mayor-igual.png` | Comparador mayor o igual (>=) | `σ(salario >= 15000)(Empleados)` |
| `17-comparacion-distinto.png` | Comparador distinto (!=) | `σ(carrera != "ISC")(Estudiantes)` |
| `18-logica-and.png` | Conjunción lógica (∧ / &&) | `σ(edad > 18 && calificacion >= 8.5)(Estudiantes)` |
| `19-logica-or.png` | Disyunción lógica (∨ / ||) | `σ(carrera == "ISC" || carrera == "IA")(Estudiantes)` |
| `20-negacion-logica.png` | Negación lógica (¬ / !) | `σ(!(edad < 18))(Estudiantes)` |
| `21-aritmetica-binaria.png` | Aritmética binaria (+, −, ×, ÷) | `σ(salario * 1.16 + bono > 20000)(Empleados)` |
| `22-potencia.png` | Potencia (^) | `σ(edad ^ 2 > 100)(Estudiantes)` |
| `23-menos-unario.png` | Menos unario (−) | `σ(-edad < -10)(Estudiantes)` |
| `24-funcion-matematica.png` | Función matemática | `σ(SQRT(calificacion) >= 3)(Estudiantes)` |
| `25-funcion-varios-argumentos.png` | Función con varios argumentos | `π(MOD(salario, 1000))(Empleados)` |
| `26-agregados.png` | Funciones de agregación | `γ(departamento; SUM(salario), PROM(salario), MAX(salario), MIN(salario), COUNT(*))(Empleados)` |
| `27-literales.png` | Literales (número, cadena, lógico, nulo) | `σ(edad > 5 && activo == TRUE && nombre != NULL && ciudad == "CDMX")(Estudiantes)` |
| `28-atributo-cualificado.png` | Atributo cualificado (tabla.atributo) | `σ(Estudiantes.edad > Inscripciones.edad)(JOIN(Estudiantes, Inscripciones, Estudiantes.matricula == Inscripciones.matricula))` |

> Las imágenes se generaron a partir de la salida real del parser (`Expression.toTree()`),
> por lo que la estructura mostrada corresponde exactamente a la que produce el sistema.
