package com.ipn.escom.tt1.controller;

import com.ipn.escom.tt1.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Endpoints de conexión con MySQL, exploración de bases de datos y diccionario
 * de datos. La conexión se realiza con las claves locales del usuario.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ConnectionController {

    @Autowired private DatabaseService databaseService;

    @PostMapping("/connection/connect")
    public ResponseEntity<?> connect(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(databaseService.connect(
                request.get("host"),
                request.get("port"),
                request.get("user"),
                request.get("password")));
    }

    @GetMapping("/connection")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(databaseService.status());
    }

    @PostMapping("/connection/disconnect")
    public ResponseEntity<?> disconnect() {
        return ResponseEntity.ok(databaseService.disconnect());
    }

    @GetMapping("/databases")
    public ResponseEntity<?> databases() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("databases", databaseService.listDatabases());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.ok(error(e));
        }
    }

    @GetMapping("/database/{database}/dictionary")
    public ResponseEntity<?> dictionary(@PathVariable String database) {
        try {
            return ResponseEntity.ok(databaseService.dictionary(database));
        } catch (Exception e) {
            return ResponseEntity.ok(error(e));
        }
    }

    @GetMapping("/database/{database}/tables")
    public ResponseEntity<?> tables(@PathVariable String database) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("tables", databaseService.listTables(database));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.ok(error(e));
        }
    }

    @GetMapping("/database/{database}/table/{table}/preview")
    public ResponseEntity<?> preview(@PathVariable String database, @PathVariable String table) {
        try {
            return ResponseEntity.ok(databaseService.previewTable(database, table));
        } catch (Exception e) {
            return ResponseEntity.ok(error(e));
        }
    }

    private Map<String, Object> error(Exception e) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", e.getMessage() != null ? e.getMessage() : e.toString());
        return response;
    }
}
