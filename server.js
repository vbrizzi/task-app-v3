// Task Manager API - v3 (version final)
// Codigo refactorizado: sin duplicacion, sin vulnerabilidades, manejo de errores robusto.

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ── Base de datos en memoria ──────────────────────────────────────────────
let tasks = [
    { id: 1, title: "Revisar documentacion", done: false, priority: "alta", createdAt: new Date().toISOString() },
    { id: 2, title: "Reunion de equipo", done: false, priority: "media", createdAt: new Date().toISOString() },
    { id: 3, title: "Deploy a produccion", done: true, priority: "alta", createdAt: new Date().toISOString() },
    { id: 4, title: "Code review sprint 3", done: false, priority: "media", createdAt: new Date().toISOString() },
    { id: 5, title: "Actualizar dependencias", done: false, priority: "baja", createdAt: new Date().toISOString() }
];
let nextId = 6;

const VALID_PRIORITIES = ["alta", "media", "baja"];

// ── Utilidades ────────────────────────────────────────────────────────────

/** Busca una tarea por ID. Unica funcion, sin duplicacion. */
function findTaskById(id) {
    return tasks.find(t => t.id === parseInt(id)) || null;
}

/** Escapa caracteres HTML para prevenir XSS. */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Valida y normaliza la prioridad recibida. */
function validatePriority(priority) {
    return VALID_PRIORITIES.includes(priority) ? priority : "media";
}

// ── Middleware de manejo de errores ───────────────────────────────────────
function handleError(res, status, message) {
    return res.status(status).json({ error: message });
}

// ── GET /api/tasks ────────────────────────────────────────────────────────
app.get("/api/tasks", (req, res) => {
    const { priority, done } = req.query;
    let result = [...tasks];
    if (priority && VALID_PRIORITIES.includes(priority)) {
        result = result.filter(t => t.priority === priority);
    }
    if (done !== undefined) {
        result = result.filter(t => t.done === (done === "true"));
    }
    res.json(result);
});

// ── POST /api/tasks ───────────────────────────────────────────────────────
app.post("/api/tasks", (req, res) => {
    const { title, priority } = req.body;
    if (!title || title.trim() === "") {
        return handleError(res, 400, "El titulo es obligatorio");
    }
    if (title.trim().length > 200) {
        return handleError(res, 400, "El titulo no puede superar los 200 caracteres");
    }
    const task = {
        id: nextId++,
        title: title.trim(),
        done: false,
        priority: validatePriority(priority),
        createdAt: new Date().toISOString()
    };
    tasks.push(task);
    res.status(201).json(task);
});

// ── GET /api/tasks/search ─────────────────────────────────────────────────
app.get("/api/tasks/search", (req, res) => {
    const query = (req.query.q || "").trim();
    if (!query) return res.json([]);

    // Sin delay artificial, sin XSS: respuesta JSON limpia
    const results = tasks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase())
    );
    res.json(results);
});

// ── GET /api/tasks/:id ────────────────────────────────────────────────────
app.get("/api/tasks/:id", (req, res) => {
    const task = findTaskById(req.params.id);
    if (!task) return handleError(res, 404, "Tarea no encontrada");
    res.json(task);
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────
app.put("/api/tasks/:id", (req, res) => {
    const task = findTaskById(req.params.id);
    if (!task) return handleError(res, 404, "Tarea no encontrada");
    if (req.body.title !== undefined) {
        if (!req.body.title.trim()) return handleError(res, 400, "El titulo no puede estar vacio");
        task.title = req.body.title.trim();
    }
    if (req.body.done !== undefined) task.done = Boolean(req.body.done);
    if (req.body.priority !== undefined) task.priority = validatePriority(req.body.priority);
    res.json(task);
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────
app.delete("/api/tasks/:id", (req, res) => {
    const task = findTaskById(req.params.id);
    if (!task) return handleError(res, 404, "Tarea no encontrada");
    tasks = tasks.filter(t => t.id !== task.id);
    res.status(200).json({ message: "Tarea eliminada correctamente" });
});

// ── GET /api/stats ────────────────────────────────────────────────────────
app.get("/api/stats", (req, res) => {
    res.json({
        total: tasks.length,
        completadas: tasks.filter(t => t.done).length,
        pendientes: tasks.filter(t => !t.done).length,
        porPrioridad: {
            alta: tasks.filter(t => t.priority === "alta").length,
            media: tasks.filter(t => t.priority === "media").length,
            baja: tasks.filter(t => t.priority === "baja").length
        }
    });
});

// ── Manejo de rutas no encontradas ────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Task Manager v3 escuchando en puerto ${PORT}`);
});
