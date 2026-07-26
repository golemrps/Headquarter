// ------------------------------------------------------------------
// Aufgabenverwaltung fuer das Cockpit.
// supabaseClient kommt aus auth-gate.js (im selben Script-Kontext).
// ------------------------------------------------------------------

const PRIORITY_LABELS = { niedrig: "Niedrig", normal: "Normal", hoch: "Hoch", sehr_hoch: "Sehr hoch" };
const PRIORITY_ORDER = { niedrig: 0, normal: 1, hoch: 2, sehr_hoch: 3 };
const EFFORT_LABELS = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };

const OLD_TASK_DAYS = 7; // ab wann offene Aufgaben rot markiert werden
const DUE_WARNING_DAYS = 2; // wie viele Tage vor Faelligkeit gewarnt wird
const ARCHIVE_AFTER_DAYS = 3; // wie lange erledigte Aufgaben sichtbar bleiben

let tasks = [];
let activeCategory = "arbeit";
let sortMode = "priority";
let editingTaskId = null;

const tabButtons = document.querySelectorAll(".category-tab");
const sortSelect = document.getElementById("sort-mode");
const taskListEl = document.getElementById("task-list");
const warningsEl = document.getElementById("due-warnings");
const newTaskBtn = document.getElementById("new-task-btn");
const archiveToggleBtn = document.getElementById("archive-toggle-btn");
const archiveSection = document.getElementById("archive-section");
const archiveListEl = document.getElementById("archive-list");

const modal = document.getElementById("task-modal");
const taskForm = document.getElementById("task-form");
const taskModalTitle = document.getElementById("task-modal-title");
const taskFormError = document.getElementById("task-form-error");
const titleInput = document.getElementById("task-title-input");
const categoryInput = document.getElementById("task-category-input");
const priorityInput = document.getElementById("task-priority-input");
const effortInput = document.getElementById("task-effort-input");
const dueInput = document.getElementById("task-due-input");
const cancelBtn = document.getElementById("task-cancel-btn");

// ---- Datenfunktionen ----

async function fetchTasks() {
  const { data, error } = await supabaseClient.from("tasks").select("*");
  if (error) {
    taskListEl.textContent = "Fehler beim Laden: " + error.message;
    return;
  }
  tasks = data;
  render();
}

async function toggleDone(task, isDone) {
  const { error } = await supabaseClient
    .from("tasks")
    .update({ completed_at: isDone ? new Date().toISOString() : null })
    .eq("id", task.id);
  if (!error) await fetchTasks();
}

async function snoozeTask(task) {
  const newDue = new Date(task.due_date + "T00:00:00");
  newDue.setDate(newDue.getDate() + 2);
  const isoDate = newDue.toISOString().slice(0, 10);
  const { error } = await supabaseClient.from("tasks").update({ due_date: isoDate }).eq("id", task.id);
  if (!error) await fetchTasks();
}

// ---- Hilfsfunktionen ----

function daysBetween(a, b) {
  return Math.floor((a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0)) / 86400000);
}

function isOld(task) {
  if (task.completed_at) return false;
  return daysBetween(new Date(), new Date(task.created_at)) >= OLD_TASK_DAYS;
}

function isArchived(task) {
  if (!task.completed_at) return false;
  return daysBetween(new Date(), new Date(task.completed_at)) >= ARCHIVE_AFTER_DAYS;
}

function isDueSoon(task) {
  if (task.completed_at || !task.due_date) return false;
  const dueDays = daysBetween(new Date(task.due_date + "T00:00:00"), new Date());
  return dueDays <= DUE_WARNING_DAYS;
}

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (sortMode === "oldest") {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    const diff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

function formatDate(value) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("de-DE");
}

function formatAge(iso) {
  const days = daysBetween(new Date(), new Date(iso));
  if (days <= 0) return "heute erstellt";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
}

// ---- Rendering ----

function render() {
  const visible = tasks.filter((t) => t.category === activeCategory && !isArchived(t));
  renderTaskList(sortTasks(visible));
  renderWarnings();
  if (!archiveSection.classList.contains("hidden")) renderArchive();
}

function renderTaskList(list) {
  taskListEl.innerHTML = "";
  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-hint";
    empty.textContent = "Keine Aufgaben hier.";
    taskListEl.appendChild(empty);
    return;
  }
  list.forEach((task) => taskListEl.appendChild(buildTaskCard(task)));
}

function buildTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  if (task.completed_at) card.classList.add("done");
  if (isOld(task)) card.classList.add("old");

  const row = document.createElement("div");
  row.className = "task-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!task.completed_at;
  checkbox.addEventListener("change", () => toggleDone(task, checkbox.checked));

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;
  title.addEventListener("click", () => openEditModal(task));

  row.appendChild(checkbox);
  row.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${task.priority}`;
  priorityBadge.textContent = PRIORITY_LABELS[task.priority];
  meta.appendChild(priorityBadge);

  const effortBadge = document.createElement("span");
  effortBadge.className = "badge effort";
  effortBadge.textContent = EFFORT_LABELS[task.effort];
  meta.appendChild(effortBadge);

  if (task.due_date) {
    const due = document.createElement("span");
    due.className = "due-date";
    due.textContent = "Fällig: " + formatDate(task.due_date);
    meta.appendChild(due);
  }

  const age = document.createElement("span");
  age.className = "created-date";
  age.textContent = formatAge(task.created_at);
  meta.appendChild(age);

  card.appendChild(row);
  card.appendChild(meta);
  return card;
}

function renderWarnings() {
  const dueSoon = tasks.filter((t) => t.category === activeCategory && isDueSoon(t));
  warningsEl.innerHTML = "";
  dueSoon.forEach((task) => {
    const box = document.createElement("div");
    box.className = "due-warning";

    const text = document.createElement("span");
    text.textContent = `"${task.title}" wird bald fällig (${formatDate(task.due_date)})`;
    box.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "due-warning-actions";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "ghost";
    viewBtn.textContent = "Ansehen";
    viewBtn.addEventListener("click", () => openEditModal(task));

    const snoozeBtn = document.createElement("button");
    snoozeBtn.type = "button";
    snoozeBtn.className = "ghost";
    snoozeBtn.textContent = "Aufschieben (+2 Tage)";
    snoozeBtn.addEventListener("click", () => snoozeTask(task));

    actions.appendChild(viewBtn);
    actions.appendChild(snoozeBtn);
    box.appendChild(actions);
    warningsEl.appendChild(box);
  });
}

function renderArchive() {
  const archived = tasks.filter((t) => t.category === activeCategory && isArchived(t));
  archiveListEl.innerHTML = "";
  if (archived.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-hint";
    empty.textContent = "Archiv ist leer.";
    archiveListEl.appendChild(empty);
    return;
  }
  archived.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card done archived";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const doneDate = document.createElement("span");
    doneDate.className = "created-date";
    doneDate.textContent = "erledigt am " + formatDate(task.completed_at);

    card.appendChild(title);
    card.appendChild(doneDate);
    archiveListEl.appendChild(card);
  });
}

// ---- Popup: Anlegen / Bearbeiten ----

function openCreateModal() {
  editingTaskId = null;
  taskForm.reset();
  taskFormError.textContent = "";
  taskModalTitle.textContent = "Neue Aufgabe";
  categoryInput.value = activeCategory;
  priorityInput.value = "normal";
  effortInput.value = "mittel";
  modal.classList.remove("hidden");
  titleInput.focus();
}

function openEditModal(task) {
  editingTaskId = task.id;
  taskFormError.textContent = "";
  taskModalTitle.textContent = "Aufgabe bearbeiten";
  titleInput.value = task.title;
  categoryInput.value = task.category;
  priorityInput.value = task.priority;
  effortInput.value = task.effort;
  dueInput.value = task.due_date || "";
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: titleInput.value.trim(),
    category: categoryInput.value,
    priority: priorityInput.value,
    effort: effortInput.value,
    due_date: dueInput.value || null,
  };
  if (!payload.title) return;

  const query = editingTaskId
    ? supabaseClient.from("tasks").update(payload).eq("id", editingTaskId)
    : supabaseClient.from("tasks").insert(payload);

  const { error } = await query;
  if (error) {
    taskFormError.textContent = "Fehler: " + error.message;
    return;
  }
  closeModal();
  await fetchTasks();
});

cancelBtn.addEventListener("click", closeModal);
newTaskBtn.addEventListener("click", openCreateModal);

// ---- Tabs, Sortierung, Archiv ----

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeCategory = btn.dataset.category;
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  render();
});

archiveToggleBtn.addEventListener("click", () => {
  const willShow = archiveSection.classList.contains("hidden");
  archiveSection.classList.toggle("hidden", !willShow);
  archiveToggleBtn.textContent = willShow ? "Archiv verbergen" : "Archiv anzeigen";
  if (willShow) renderArchive();
});

document.addEventListener("auth-ready", fetchTasks);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
