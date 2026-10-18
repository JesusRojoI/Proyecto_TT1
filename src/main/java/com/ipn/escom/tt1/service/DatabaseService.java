package com.ipn.escom.tt1.service;

import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;

/**
 * Gestiona la conexión con el servidor MySQL local del usuario a partir de sus
 * claves, la exploración de bases de datos, el diccionario de datos y la
 * ejecución de consultas de lectura.
 */
@Service
public class DatabaseService {

    private static final Set<String> SYSTEM_SCHEMAS =
            Set.of("information_schema", "mysql", "performance_schema", "sys");
    private static final int MAX_ROWS = 500;
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private static final int DEFAULT_PREVIEW_LIMIT = 50;

    private volatile ConnectionProfile profile;
    private volatile String serverVersion;

    public static class ConnectionProfile {
        public final String host;
        public final int port;
        public final String user;
        public final String password;

        public ConnectionProfile(String host, int port, String user, String password) {
            this.host = host;
            this.port = port;
            this.user = user;
            this.password = password;
        }
    }

    // ============================================================
    // CONEXIÓN
    // ============================================================

    public synchronized Map<String, Object> connect(String host, String port, String user, String password) {
        Map<String, Object> result = new LinkedHashMap<>();
        String h = (host == null || host.isBlank()) ? "localhost" : host.trim();
        int p;
        try {
            p = (port == null || port.isBlank()) ? 3306 : Integer.parseInt(port.trim());
        } catch (NumberFormatException e) {
            result.put("status", "error");
            result.put("message", "El puerto debe ser un número válido.");
            return result;
        }

        if (user == null || user.isBlank()) {
            result.put("status", "error");
            result.put("message", "El usuario de MySQL es obligatorio.");
            return result;
        }

        try (Connection conn = DriverManager.getConnection(url(h, p, null), user, password)) {
            this.profile = new ConnectionProfile(h, p, user, password);
            this.serverVersion = conn.getMetaData().getDatabaseProductVersion();
            result.put("status", "success");
            result.put("message", "Conexión establecida correctamente.");
            result.put("host", h);
            result.put("port", p);
            result.put("user", user);
            result.put("serverVersion", serverVersion);
            result.put("databases", listDatabasesInternal());
        } catch (SQLException e) {
            result.put("status", "error");
            result.put("message", "No se pudo conectar con MySQL: " + e.getMessage());
        }
        return result;
    }

    public synchronized Map<String, Object> disconnect() {
        this.profile = null;
        this.serverVersion = null;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "success");
        result.put("message", "Conexión cerrada.");
        return result;
    }

    public Map<String, Object> status() {
        Map<String, Object> result = new LinkedHashMap<>();
        ConnectionProfile p = this.profile;
        result.put("connected", p != null);
        if (p != null) {
            result.put("host", p.host);
            result.put("port", p.port);
            result.put("user", p.user);
            result.put("serverVersion", serverVersion);
            try {
                result.put("databases", listDatabasesInternal());
            } catch (SQLException e) {
                result.put("databases", Collections.emptyList());
                result.put("warning", e.getMessage());
            }
        }
        return result;
    }

    public boolean isConnected() {
        return profile != null;
    }

    // ============================================================
    // EXPLORACIÓN
    // ============================================================

    public List<String> listDatabases() throws SQLException {
        return listDatabasesInternal();
    }

    private List<String> listDatabasesInternal() throws SQLException {
        ConnectionProfile p = requireProfile();
        List<String> databases = new ArrayList<>();
        String sql = "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME";
        try (Connection conn = open(p, null);
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String name = rs.getString(1);
                if (!SYSTEM_SCHEMAS.contains(name.toLowerCase())) {
                    databases.add(name);
                }
            }
        }
        return databases;
    }

    public List<Map<String, Object>> listTables(String database) throws SQLException {
        ConnectionProfile p = requireProfile();
        validateDatabase(p, database);
        List<Map<String, Object>> tables = new ArrayList<>();
        String sql = "SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS " +
                     "FROM information_schema.TABLES " +
                     "WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' " +
                     "ORDER BY TABLE_NAME";
        try (Connection conn = open(p, database);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, database);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> t = new LinkedHashMap<>();
                    t.put("name", rs.getString("TABLE_NAME"));
                    t.put("comment", rs.getString("TABLE_COMMENT"));
                    t.put("rowEstimate", rs.getObject("TABLE_ROWS"));
                    tables.add(t);
                }
            }
        }
        return tables;
    }

    /**
     * Diccionario de datos completo: tablas, columnas, llaves y relaciones.
     */
    public Map<String, Object> dictionary(String database) throws SQLException {
        ConnectionProfile p = requireProfile();
        validateDatabase(p, database);

        Map<String, Object> dictionary = new LinkedHashMap<>();
        dictionary.put("database", database);

        List<Map<String, Object>> tables = listTables(database);
        try (Connection conn = open(p, database)) {
            String columnSql =
                "SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, " +
                "       COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT " +
                "FROM information_schema.COLUMNS " +
                "WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? " +
                "ORDER BY ORDINAL_POSITION";
            for (Map<String, Object> table : tables) {
                String tableName = (String) table.get("name");
                List<Map<String, Object>> columns = new ArrayList<>();
                try (PreparedStatement ps = conn.prepareStatement(columnSql)) {
                    ps.setString(1, database);
                    ps.setString(2, tableName);
                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            Map<String, Object> c = new LinkedHashMap<>();
                            c.put("name", rs.getString("COLUMN_NAME"));
                            c.put("type", rs.getString("COLUMN_TYPE"));
                            c.put("dataType", rs.getString("DATA_TYPE"));
                            c.put("nullable", "YES".equalsIgnoreCase(rs.getString("IS_NULLABLE")));
                            c.put("key", rs.getString("COLUMN_KEY"));
                            c.put("defaultValue", rs.getString("COLUMN_DEFAULT"));
                            c.put("extra", rs.getString("EXTRA"));
                            c.put("comment", rs.getString("COLUMN_COMMENT"));
                            columns.add(c);
                        }
                    }
                }
                table.put("columns", columns);
            }
        }

        dictionary.put("tableCount", tables.size());
        dictionary.put("tables", tables);
        dictionary.put("foreignKeys", listForeignKeys(database));
        return dictionary;
    }

    private List<Map<String, Object>> listForeignKeys(String database) throws SQLException {
        ConnectionProfile p = requireProfile();
        List<Map<String, Object>> foreignKeys = new ArrayList<>();
        String sql =
            "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME " +
            "FROM information_schema.KEY_COLUMN_USAGE " +
            "WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL " +
            "ORDER BY TABLE_NAME, COLUMN_NAME";
        try (Connection conn = open(p, database);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, database);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> fk = new LinkedHashMap<>();
                    fk.put("table", rs.getString("TABLE_NAME"));
                    fk.put("column", rs.getString("COLUMN_NAME"));
                    fk.put("referencedTable", rs.getString("REFERENCED_TABLE_NAME"));
                    fk.put("referencedColumn", rs.getString("REFERENCED_COLUMN_NAME"));
                    fk.put("constraintName", rs.getString("CONSTRAINT_NAME"));
                    foreignKeys.add(fk);
                }
            }
        }
        return foreignKeys;
    }

    // ============================================================
    // EJECUCIÓN
    // ============================================================

    public Map<String, Object> previewTable(String database, String table) throws SQLException {
        return previewTable(database, table, DEFAULT_PREVIEW_LIMIT);
    }

    public Map<String, Object> previewTable(String database, String table, int limit) throws SQLException {
        ConnectionProfile p = requireProfile();
        validateDatabase(p, database);
        if (!tableExists(p, database, table)) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "La tabla '" + table + "' no existe en la base de datos '" + database + "'.");
            return err;
        }
        int safeLimit = Math.max(1, Math.min(limit, MAX_ROWS));
        String sql = "SELECT * FROM " + quote(table) + " LIMIT " + safeLimit;
        return executeOn(p, database, sql);
    }

    public Map<String, Object> execute(String sql, String database) {
        Map<String, Object> err = new LinkedHashMap<>();
        if (profile == null) {
            err.put("error", "No hay una conexión activa con MySQL. Conéctate para ejecutar consultas.");
            return err;
        }
        try {
            validateDatabase(profile, database);
        } catch (SQLException e) {
            err.put("error", e.getMessage());
            return err;
        }
        String trimmed = sql == null ? "" : sql.trim();
        String upper = trimmed.toUpperCase();
        if (!upper.startsWith("SELECT") && !upper.startsWith("(")) {
            err.put("error", "Solo se permiten consultas de lectura (SELECT).");
            return err;
        }
        try {
            return executeOn(profile, database, trimmed);
        } catch (SQLException e) {
            err.put("error", "No se pudo ejecutar la consulta: " + e.getMessage());
            return err;
        }
    }

    private Map<String, Object> executeOn(ConnectionProfile p, String database, String sql) throws SQLException {
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> columns = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        long start = System.currentTimeMillis();
        try (Connection conn = open(p, database);
             Statement stmt = conn.createStatement()) {
            stmt.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            stmt.setMaxRows(MAX_ROWS);
            try (ResultSet rs = stmt.executeQuery(sql)) {
                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();
                for (int i = 1; i <= colCount; i++) {
                    columns.add(meta.getColumnLabel(i));
                }
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= colCount; i++) {
                        row.put(meta.getColumnLabel(i), rs.getObject(i));
                    }
                    rows.add(row);
                }
            }
        }
        result.put("columns", columns);
        result.put("rows", rows);
        result.put("rowCount", rows.size());
        result.put("elapsedMs", System.currentTimeMillis() - start);
        return result;
    }

    // ============================================================
    // AUXILIARES
    // ============================================================

    private ConnectionProfile requireProfile() {
        ConnectionProfile p = profile;
        if (p == null) {
            throw new IllegalStateException("No hay una conexión activa con MySQL.");
        }
        return p;
    }

    private void validateDatabase(ConnectionProfile p, String database) throws SQLException {
        if (database == null || database.isBlank()) {
            throw new SQLException("No se seleccionó una base de datos.");
        }
        for (String name : listDatabasesInternal()) {
            if (name.equals(database)) {
                return;
            }
        }
        throw new SQLException("La base de datos '" + database + "' no existe en el servidor.");
    }

    private boolean tableExists(ConnectionProfile p, String database, String table) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND TABLE_TYPE = 'BASE TABLE'";
        try (Connection conn = open(p, database);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, database);
            ps.setString(2, table);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static String quote(String identifier) {
        return "`" + identifier.replace("`", "``") + "`";
    }

    private static String url(String host, int port, String database) {
        StringBuilder sb = new StringBuilder("jdbc:mysql://").append(host).append(":").append(port).append("/");
        if (database != null && !database.isBlank()) {
            sb.append(database);
        }
        sb.append("?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC")
          .append("&connectTimeout=8000&socketTimeout=30000&characterEncoding=UTF-8");
        return sb.toString();
    }

    private Connection open(ConnectionProfile p, String database) throws SQLException {
        return DriverManager.getConnection(url(p.host, p.port, database), p.user, p.password);
    }
}
