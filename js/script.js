const KEY = "taskflow_tasks";
let tasks = JSON.parse(localStorage.getItem(KEY)) || [], editing = null;
const $ = id => document.getElementById(id);

function save() {
    localStorage.setItem(KEY, JSON.stringify(tasks))
}

function safe(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]))
}

function date(s) {
    return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    })
}

function overdue(t) {
    return t.status === "pending" && new Date(t.due + "T00:00:00") < new Date(new Date().toDateString())
}

function toast(s) {
    $("toast").textContent = s;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2200)
}

function refresh() {
    const done = tasks.filter(t => t.status === "completed").length,
        pending = tasks.length - done,
        late = tasks.filter(overdue).length,
        pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;

    $("total").textContent = tasks.length;
    $("pending").textContent = pending;
    $("done").textContent = done;
    $("overdue").textContent = late;
    $("percent").textContent = pct + "%";

    $("ring").style.background = `conic-gradient(var(--blue) ${pct * 3.6}deg,#edf0f6 0deg)`;
    $("progressText").textContent = tasks.length ? `${done} out of ${tasks.length} tasks completed. Keep going!` : "Add your first task to start tracking your progress.";

    const recent = [...tasks].sort((a, b) => b.created - a.created).slice(0, 5);

    $("recent").innerHTML = recent.length ? recent.map(t => `<div class="taskitem ${t.status === "completed" ? "done" : ""}"><input type="checkbox" ${t.status === "completed" ? "checked" : ""} onchange="toggleTask('${t.id}')"><div class="taskname"><b>${safe(t.title)}</b><small>${safe(t.subject)} · ${t.priority} priority</small></div><span class="taskdate">${date(t.due)}</span></div>`).join("") : '<div class="empty">No tasks yet. Add a task to get started.</div>';

    render();

    const upcoming = tasks.filter(t => t.status === "pending").sort((a, b) => a.due.localeCompare(b.due));

    $("upcoming").innerHTML = upcoming.length ? upcoming.map(t => {
        let d = new Date(t.due + "T00:00:00");
        return `<div class="scheduleitem"><div class="scheduledate"><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-US", {month: "short"})}</small></div><div><b>${safe(t.title)}</b><small>${safe(t.subject)} · ${date(t.due)}</small></div><span class="badge ${t.priority}">${t.priority}</span></div>`
    }).join("") : '<div class="empty">No pending tasks in your schedule.</div>';
}

function render() {
    let q = $("search").value.toLowerCase(),
        s = $("status").value,
        p = $("priorityFilter").value;

    let arr = tasks.filter(t => (t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) && (s === "all" || t.status === s) && (p === "all" || t.priority === p)).sort((a, b) => a.due.localeCompare(b.due));

    $("list").innerHTML = arr.length ? arr.map(t => `<div class="row"><div><b>${safe(t.title)}</b><small>${safe(t.subject)}${t.description ? " · " + safe(t.description) : ""}</small></div><span>${date(t.due)}${overdue(t) ? '<small style="color:#d96b73">Overdue</small>' : ""}</span><span><i class="badge ${t.priority}">${t.priority}</i></span><span><i class="badge ${t.status}">${t.status}</i></span><span><button onclick="editTask('${t.id}')">Edit</button> <button onclick="deleteTask('${t.id}')">×</button> <button onclick="toggleTask('${t.id}')">✓</button></span></div>`).join("") : '<div class="empty">No matching tasks found.</div>';

    $("count").textContent = `Showing ${arr.length} of ${tasks.length} task(s)`;
}

function show(view) {
    ["dashboard", "tasks", "schedule"].forEach(v => $(v).classList.toggle("hide", v !== view));
    $("crumb").textContent = view[0].toUpperCase() + view.slice(1);
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    $("sidebar").classList.remove("open")
}

function open(task = null) {
    editing = task ? task.id : null;
    $("modalTitle").textContent = task ? "Edit task" : "Create a task";
    $("title").value = task ? task.title : "";
    $("description").value = task ? task.description : "";
    $("subject").value = task ? task.subject : "";
    $("due").value = task ? task.due : "";
    $("priority").value = task ? task.priority : "Medium";
    $("taskStatus").value = task ? task.status : "pending";
    $("error").textContent = "";
    $("shade").classList.remove("hide");
    $("title").focus()
}

function close() {
    $("shade").classList.add("hide");
    $("form").reset();
    editing = null
}

function editTask(id) {
    let t = tasks.find(x => x.id === id);
    if (t) open(t)
}

function deleteTask(id) {
    let t = tasks.find(x => x.id === id);
    if (t && confirm(`Delete "${t.title}"?`)) {
        tasks = tasks.filter(x => x.id !== id);
        save();
        refresh();
        toast("Task deleted.")
    }
}

function toggleTask(id) {
    let t = tasks.find(x => x.id === id);
    if (t) {
        t.status = t.status === "completed" ? "pending" : "completed";
        save();
        refresh();
        toast("Task status updated.")
    }
}

document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => show(b.dataset.view));

document.querySelectorAll("[data-filter]").forEach(b => b.onclick = () => {
    $("status").value = b.dataset.filter;
    show("tasks");
    render()
});

["newTop", "add"].forEach(id => $(id).onclick = () => open());

$("viewAll").onclick = () => show("tasks");
$("close").onclick = close;
$("cancel").onclick = close;
$("menu").onclick = () => $("sidebar").classList.toggle("open");

["search", "status", "priorityFilter"].forEach(id => $(id).addEventListener(id === "search" ? "input" : "change", render));

$("form").onsubmit = e => {
    e.preventDefault();

    let title = $("title").value.trim(),
        subject = $("subject").value.trim(),
        due = $("due").value;

    if (!title || !subject || !due) {
        $("error").textContent = "Please complete the title, subject, and due date.";
        return
    }

    if (due < new Date().toISOString().slice(0, 10) && $("taskStatus").value !== "completed") {
        $("error").textContent = "Choose today or a future date for a pending task.";
        return
    }

    let data = {
        title,
        description: $("description").value.trim(),
        subject,
        due,
        priority: $("priority").value,
        status: $("taskStatus").value
    };

    if (editing) {
        let i = tasks.findIndex(t => t.id === editing);
        tasks[i] = { ...tasks[i], ...data };
        toast("Task updated.")
    } else {
        tasks.push({ id: Date.now().toString(), ...data, created: Date.now() });
        toast("New task added.")
    }

    save();
    refresh();
    close();
    show("tasks")
};

$("today").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
});

refresh();