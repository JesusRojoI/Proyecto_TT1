package com.ipn.escom.tt1.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Entrega el manual de usuario en PDF. Se busca primero en el directorio de
 * trabajo (donde se ejecuta la aplicación) y, si no está disponible, dentro de
 * los recursos empaquetados.
 */
@RestController
@RequestMapping("/api")
public class ManualController {

    private static final String FILE_NAME = "manual_usuario.pdf";

    @GetMapping("/manual")
    public ResponseEntity<Resource> manual() {
        Resource resource = locate();
        if (resource == null || !resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + FILE_NAME + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(resource);
    }

    private Resource locate() {
        Path local = Paths.get(FILE_NAME).toAbsolutePath().normalize();
        if (Files.isRegularFile(local)) {
            return new FileSystemResource(local);
        }
        Path parent = Paths.get("..", FILE_NAME).toAbsolutePath().normalize();
        if (Files.isRegularFile(parent)) {
            return new FileSystemResource(parent);
        }
        ClassPathResource bundled = new ClassPathResource("static/" + FILE_NAME);
        return bundled.exists() ? bundled : null;
    }
}
