-- ============================================================
-- Base de datos de prueba para el Sistema de Algebra Relacional
-- TT1 - ESCOM
--
-- Crea:
--   * Base de datos : escuela_ar
--   * Usuario       : ar_user  /  Contrasena: Ar_Test#2026
--   * Tablas        : alumno, materia, inscripcion, profesor
--   * Datos de prueba realistas (incluye NULLs y recursividad)
--
-- Ejecutar como root del sistema:
--   sudo mysql < scripts/db_test_escuela.sql
-- ============================================================

DROP DATABASE IF EXISTS escuela_ar;
CREATE DATABASE escuela_ar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Usuario de aplicacion (autenticacion por contrasena / TCP)
-- ------------------------------------------------------------
DROP USER IF EXISTS 'ar_user'@'localhost';
DROP USER IF EXISTS 'ar_user'@'127.0.0.1';
CREATE USER 'ar_user'@'localhost' IDENTIFIED BY 'Ar_Test#2026';
CREATE USER 'ar_user'@'127.0.0.1' IDENTIFIED BY 'Ar_Test#2026';
GRANT ALL PRIVILEGES ON escuela_ar.* TO 'ar_user'@'localhost';
GRANT ALL PRIVILEGES ON escuela_ar.* TO 'ar_user'@'127.0.0.1';
FLUSH PRIVILEGES;

USE escuela_ar;

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
CREATE TABLE profesor (
    id_profesor   INT          NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(80)  NOT NULL,
    apellidos     VARCHAR(80)  NOT NULL,
    correo        VARCHAR(120),
    PRIMARY KEY (id_profesor),
    UNIQUE KEY uq_profesor_correo (correo)
) ENGINE=InnoDB;

CREATE TABLE materia (
    id_materia    INT          NOT NULL AUTO_INCREMENT,
    clave         VARCHAR(15)  NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    creditos      INT          NOT NULL DEFAULT 0,
    id_profesor   INT,
    PRIMARY KEY (id_materia),
    UNIQUE KEY uq_materia_clave (clave),
    CONSTRAINT fk_materia_profesor
        FOREIGN KEY (id_profesor) REFERENCES profesor (id_profesor)
) ENGINE=InnoDB;

-- Tabla con relacion recursiva: requisito de otra materia
CREATE TABLE materia_requisito (
    id_materia    INT NOT NULL,
    id_requisito  INT NOT NULL,
    PRIMARY KEY (id_materia, id_requisito),
    CONSTRAINT fk_req_materia
        FOREIGN KEY (id_materia) REFERENCES materia (id_materia),
    CONSTRAINT fk_req_requisito
        FOREIGN KEY (id_requisito) REFERENCES materia (id_materia)
) ENGINE=InnoDB;

CREATE TABLE alumno (
    boleta        VARCHAR(12)  NOT NULL,
    nombre        VARCHAR(80)  NOT NULL,
    apellidos     VARCHAR(80)  NOT NULL,
    edad          INT,
    semestre      INT,
    correo        VARCHAR(120),
    promedio      DECIMAL(4,2),
    PRIMARY KEY (boleta)
) ENGINE=InnoDB;

CREATE TABLE inscripcion (
    id_inscripcion INT         NOT NULL AUTO_INCREMENT,
    boleta         VARCHAR(12) NOT NULL,
    id_materia     INT         NOT NULL,
    periodo        VARCHAR(12) NOT NULL,
    calificacion   DECIMAL(4,2),
    PRIMARY KEY (id_inscripcion),
    CONSTRAINT fk_insc_alumno
        FOREIGN KEY (boleta) REFERENCES alumno (boleta),
    CONSTRAINT fk_insc_materia
        FOREIGN KEY (id_materia) REFERENCES materia (id_materia)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Datos de prueba
-- ------------------------------------------------------------
INSERT INTO profesor (id_profesor, nombre, apellidos, correo) VALUES
    (1, 'Andres',   'Ortigoza Campos', 'aortigoza@ipn.mx'),
    (2, 'Maria',    'Lopez Rayon',     'mlopez@ipn.mx'),
    (3, 'Juan',     'Perez Gomez',     'jperez@ipn.mx'),
    (4, 'Laura',    'Sanchez Diaz',    'lsanchez@ipn.mx');

INSERT INTO materia (id_materia, clave, nombre, creditos, id_profesor) VALUES
    (1, 'TT1',  'Trabajo Terminal I',                    8, 1),
    (2, 'AR',   'Algebra Relacional',                    6, 1),
    (3, 'BD',   'Bases de Datos',                        8, 2),
    (4, 'PROG', 'Programacion Orientada a Objetos',      8, 3),
    (5, 'CALC', 'Calculo Diferencial',                   8, 4),
    (6, 'EST',  'Probabilidad y Estadistica',            6, 4),
    (7, 'COMP', 'Compiladores',                          6, NULL);

-- Recursividad: TT1 requiere AR y BD; BD requiere PROG; AR requiere CALC
INSERT INTO materia_requisito (id_materia, id_requisito) VALUES
    (1, 2), (1, 3),
    (3, 4),
    (2, 5),
    (6, 5);

INSERT INTO alumno (boleta, nombre, apellidos, edad, semestre, correo, promedio) VALUES
    ('2022630001', 'Jesus',   'Rios',     21, 7, 'jrios@alumno.ipn.mx',   8.75),
    ('2022630002', 'Ana',     'Garcia',   20, 5, 'agarcia@alumno.ipn.mx', 9.20),
    ('2022630003', 'Luis',    'Martinez', 22, 9, 'lmartinez@alumno.ipn.mx', 7.40),
    ('2022630004', 'Sofia',   'Hernandez',19, 3, 'shernandez@alumno.ipn.mx', 8.90),
    ('2022630005', 'Diego',   'Ramirez',  23, 9, 'dramirez@alumno.ipn.mx', 6.80),
    ('2022630006', 'Valeria', 'Torres',   21, 7, NULL,                     NULL);

INSERT INTO inscripcion (boleta, id_materia, periodo, calificacion) VALUES
    ('2022630001', 1, '2026-1', 9.0),
    ('2022630001', 2, '2025-2', 8.5),
    ('2022630002', 3, '2026-1', 9.5),
    ('2022630002', 5, '2025-2', 9.0),
    ('2022630003', 1, '2026-1', 7.0),
    ('2022630003', 4, '2025-2', 8.0),
    ('2022630004', 5, '2026-1', 8.9),
    ('2022630004', 2, '2026-1', NULL),
    ('2022630005', 6, '2026-1', 6.5),
    ('2022630006', 7, '2026-1', NULL);

-- ------------------------------------------------------------
-- Resumen
-- ------------------------------------------------------------
SELECT 'Base de datos creada correctamente' AS resultado;
SELECT COUNT(*) AS profesores    FROM profesor;
SELECT COUNT(*) AS materias      FROM materia;
SELECT COUNT(*) AS alumnos       FROM alumno;
SELECT COUNT(*) AS inscripciones FROM inscripcion;
