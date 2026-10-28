package com.ipn.escom.tt1.controller;

import com.ipn.escom.tt1.service.DatabaseService;
import com.ipn.escom.tt1.service.TranslationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TranslationController {

    @Autowired private TranslationService translationService;
    @Autowired private DatabaseService databaseService;

    /**
     * Traduce una expresión de álgebra relacional a SQL. Si hay una base de
     * datos seleccionada y conexión activa, ejecuta la consulta resultante.
     */
    @PostMapping("/translate")
    public ResponseEntity<?> translate(@RequestBody Map<String, String> request) {
        String expression = request.get("expression");
        String database = request.get("database");
        try {
            Map<String, Object> response = translationService.process(expression);
            if ("success".equals(response.get("status")) && response.containsKey("sql")) {
                String sql = (String) response.get("sql");
                boolean executable = sql != null && !sql.contains("<") && !sql.contains("UNKNOWN");
                if (executable && databaseService.isConnected() && database != null && !database.isBlank()) {
                    response.put("execution", databaseService.execute(sql, database));
                }
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("errorCode", "SIS-01");
            error.put("message", e.getMessage() != null ? e.getMessage() : e.toString());
            return ResponseEntity.ok(error);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> history() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("history", translationService.historyEntries());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/history/clear")
    public ResponseEntity<?> clearHistory() {
        translationService.clearHistory();
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Historial limpiado.");
        response.put("history", translationService.historyEntries());
        return ResponseEntity.ok(response);
    }
}
