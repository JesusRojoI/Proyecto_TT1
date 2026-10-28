# TT1 · Sistema de Apoyo para la Enseñanza del Álgebra Relacional

Aplicación web desarrollada para el Trabajo Terminal **2027-A159** de la Escuela Superior de Cómputo (IPN). Permite escribir expresiones de álgebra relacional, analizarlas con JFlex y Java CUP, visualizar su árbol sintáctico con Graphviz y traducirlas a SQL para ejecutarlas sobre una base de datos MySQL local.

## Características

- Editor Monaco con resaltado, tooltips y autocompletado basado en el diccionario de la base de datos.
- Conexión dinámica a MySQL/MariaDB con las credenciales del usuario (no se almacenan).
- Diccionario de datos: tablas, atributos, llaves, relaciones y vista previa de filas.
- Tokenización y catálogo de errores léxicos y sintácticos.
- Árbol sintáctico generado en formato DOT y dibujado con Graphviz (Viz.js) en una ventana amplia.
- Controles de zoom, ajuste a la ventana y descarga del diagrama en JPG.
- Traducción a SQL y ejecución de consultas de solo lectura.

## Requisitos

- Java 21 o superior.
- Maven 3.9 o superior.
- MySQL 8 o MariaDB en el puerto 3306.
- Navegador moderno con acceso a internet para cargar Monaco Editor y las tipografías.

Graphviz no requiere instalación: se incluye Viz.js dentro del proyecto.

## Inicio rápido

```bash
git clone https://github.com/JesusRojoI/Proyecto_TT1.git
cd Proyecto_TT1

# Opcional: cargar la base de datos de prueba
sudo mysql < scripts/db_test_escuela.sql

# Compilar
mvn clean package

# Ejecutar
java -jar target/tt1-algebra-relacional-0.0.1-SNAPSHOT.jar
```

Abre <http://localhost:8080>, captura tus credenciales de MySQL en la interfaz y selecciona una base de datos.

También puedes ejecutar en modo desarrollo con:

```bash
mvn spring-boot:run
```

## Documentación en la aplicación

- `http://localhost:8080/presentacion.html`: información general y arquitectura.
- `http://localhost:8080/instalacion.html`: guía de instalación y ejecución en máquina virtual.
- `http://localhost:8080/terminos.html`: términos y condiciones de uso.
- `http://localhost:8080/api/manual`: descarga del manual de usuario en PDF.

## Estructura del proyecto

```text
src/main/java/com/ipn/escom/tt1/
  ast/         Nodos del AST y generación del formato DOT para Graphviz
  controller/  Endpoints REST de conexión, traducción y manual
  parser/      Excepciones y clases generadas por JFlex/CUP
  service/     Lógica de traducción y acceso a MySQL
src/main/cup/       Gramática de Java CUP
src/main/jflex/     Especificación del analizador léxico
src/main/resources/static/
  index.html          Interfaz principal
  presentacion.html   Acerca de la herramienta
  instalacion.html    Guía de instalación
  terminos.html       Términos y condiciones
  js/                 Módulos del frontend y Viz.js
  css/                Estilos institucionales
scripts/              Scripts SQL de prueba
docs/                 Árboles sintácticos de referencia
```

## Pruebas

```bash
mvn test
```

## Licencia y uso

Proyecto académico del Instituto Politécnico Nacional. Consulta los términos y condiciones dentro de la aplicación.
