// ------------------------------------------------------------------
// Gemeinsame Bausteine fuer alle Bereichsseiten (Studium, Mode,
// TikTok, Headquarter-Uebersicht). Wird nach auth-gate.js
// eingebunden, supabaseClient ist bereits vorhanden.
// ------------------------------------------------------------------

const PRIORITY_LABELS = { niedrig: "Niedrig", normal: "Normal", hoch: "Hoch", sehr_hoch: "Sehr hoch" };
const PRIORITY_ORDER = { niedrig: 0, normal: 1, hoch: 2, sehr_hoch: 3 };
const STRANG_LABELS = {
  design: "Design",
  produktion: "Produktion",
  personal_brand: "Personal Brand",
  brand_account: "Brand Account",
  admin: "Admin",
};
const BEREICH_LABELS = { studium: "Studium", mode: "Modemarke", tiktok: "TikTok" };

const OLD_TASK_DAYS = 7; // ab wann offene Aufgaben rot markiert werden
const DUE_WARNING_DAYS = 2; // wie viele Tage vor Faelligkeit gewarnt wird
const ARCHIVE_AFTER_DAYS = 3; // wie lange erledigte Aufgaben sichtbar bleiben

function daysBetween(a, b) {
  return Math.floor((a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0)) / 86400000);
}

function isOld(task) {
  if (task.erledigt) return false;
  return daysBetween(new Date(), new Date(task.erstellt_am)) >= OLD_TASK_DAYS;
}

function isArchived(task) {
  if (!task.erledigt) return false;
  return daysBetween(new Date(), new Date(task.erledigt)) >= ARCHIVE_AFTER_DAYS;
}

function isDueSoon(task) {
  if (task.erledigt || !task.deadline) return false;
  return daysBetween(new Date(task.deadline + "T00:00:00"), new Date()) <= DUE_WARNING_DAYS;
}

function sortTasks(list, mode) {
  return [...list].sort((a, b) => {
    if (mode === "oldest") {
      return new Date(a.erstellt_am) - new Date(b.erstellt_am);
    }
    const diff = PRIORITY_ORDER[b.dringlichkeit] - PRIORITY_ORDER[a.dringlichkeit];
    if (diff !== 0) return diff;
    return new Date(a.erstellt_am) - new Date(b.erstellt_am);
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

async function fetchTasks(bereichList) {
  const { data, error } = await supabaseClient.from("tasks").select("*").in("bereich", bereichList);
  if (error) throw error;
  return data;
}

function toggleTaskDone(task, isDone) {
  return supabaseClient
    .from("tasks")
    .update({ erledigt: isDone ? new Date().toISOString() : null })
    .eq("id", task.id);
}

function snoozeTaskDeadline(task) {
  const newDue = new Date(task.deadline + "T00:00:00");
  newDue.setDate(newDue.getDate() + 2);
  return supabaseClient
    .from("tasks")
    .update({ deadline: newDue.toISOString().slice(0, 10) })
    .eq("id", task.id);
}

function buildTaskCard(task, { showStrang = false, showBereich = false, onToggle, onEdit } = {}) {
  const card = document.createElement("div");
  card.className = "task-card";
  if (task.erledigt) card.classList.add("done");
  if (isOld(task)) card.classList.add("old");

  const row = document.createElement("div");
  row.className = "task-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!task.erledigt;
  checkbox.addEventListener("change", () => onToggle && onToggle(task, checkbox.checked));

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.titel;
  title.addEventListener("click", () => onEdit && onEdit(task));

  row.appendChild(checkbox);
  row.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";

  if (showBereich) {
    const bereichBadge = document.createElement("span");
    bereichBadge.className = "badge bereich";
    bereichBadge.textContent = BEREICH_LABELS[task.bereich];
    meta.appendChild(bereichBadge);
  }

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${task.dringlichkeit}`;
  priorityBadge.textContent = PRIORITY_LABELS[task.dringlichkeit];
  meta.appendChild(priorityBadge);

  if (showStrang && task.strang) {
    const strangBadge = document.createElement("span");
    strangBadge.className = "badge strang";
    strangBadge.textContent = STRANG_LABELS[task.strang];
    meta.appendChild(strangBadge);
  }

  if (task.deadline) {
    const due = document.createElement("span");
    due.className = "due-date";
    due.textContent = "Fällig: " + formatDate(task.deadline);
    meta.appendChild(due);
  }

  const age = document.createElement("span");
  age.className = "created-date";
  age.textContent = formatAge(task.erstellt_am);
  meta.appendChild(age);

  card.appendChild(row);
  card.appendChild(meta);
  return card;
}

function buildDueWarning(task, { onView, onSnooze } = {}) {
  const box = document.createElement("div");
  box.className = "due-warning";

  const text = document.createElement("span");
  text.textContent = `"${task.titel}" wird bald fällig (${formatDate(task.deadline)})`;
  box.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "due-warning-actions";

  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.className = "ghost";
  viewBtn.textContent = "Ansehen";
  viewBtn.addEventListener("click", () => onView && onView(task));

  const snoozeBtn = document.createElement("button");
  snoozeBtn.type = "button";
  snoozeBtn.className = "ghost";
  snoozeBtn.textContent = "Aufschieben (+2 Tage)";
  snoozeBtn.addEventListener("click", () => onSnooze && onSnooze(task));

  actions.appendChild(viewBtn);
  actions.appendChild(snoozeBtn);
  box.appendChild(actions);
  return box;
}

function buildEmptyHint(text) {
  const el = document.createElement("p");
  el.className = "empty-hint";
  el.textContent = text;
  return el;
}

// ------------------------------------------------------------------
// Wiederverwendbarer Controller fuer eine Aufgabenliste eines
// einzelnen Bereichs (Studium, Mode, TikTok). Uebernimmt Laden,
// Sortieren, Archiv, Faelligkeits-Warnungen und das Anlegen/
// Bearbeiten-Popup.
// ------------------------------------------------------------------
function createTaskListController({ bereich, showStrang = false, els, onChange }) {
  let tasks = [];
  let sortMode = "priority";
  let editingTaskId = null;

  async function load() {
    try {
      tasks = await fetchTasks([bereich]);
      render();
      if (onChange) onChange(tasks);
    } catch (e) {
      els.taskListEl.textContent = "Fehler beim Laden: " + e.message;
    }
  }

  function render() {
    const visible = tasks.filter((t) => !isArchived(t));
    renderTaskList(sortTasks(visible, sortMode));
    renderWarnings();
    if (els.archiveSection && !els.archiveSection.classList.contains("hidden")) renderArchiveList();
  }

  function renderTaskList(list) {
    els.taskListEl.innerHTML = "";
    if (list.length === 0) {
      els.taskListEl.appendChild(buildEmptyHint("Keine Aufgaben hier."));
      return;
    }
    list.forEach((task) =>
      els.taskListEl.appendChild(buildTaskCard(task, { showStrang, onToggle: handleToggle, onEdit: openEditModal }))
    );
  }

  function renderWarnings() {
    if (!els.warningsEl) return;
    els.warningsEl.innerHTML = "";
    tasks.filter(isDueSoon).forEach((task) => {
      els.warningsEl.appendChild(buildDueWarning(task, { onView: openEditModal, onSnooze: handleSnooze }));
    });
  }

  function renderArchiveList() {
    if (!els.archiveListEl) return;
    const archived = tasks.filter(isArchived);
    els.archiveListEl.innerHTML = "";
    if (archived.length === 0) {
      els.archiveListEl.appendChild(buildEmptyHint("Archiv ist leer."));
      return;
    }
    archived.forEach((task) => {
      const card = document.createElement("div");
      card.className = "task-card done archived";
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.titel;
      const doneDate = document.createElement("span");
      doneDate.className = "created-date";
      doneDate.textContent = "erledigt am " + formatDate(task.erledigt);
      card.appendChild(title);
      card.appendChild(doneDate);
      els.archiveListEl.appendChild(card);
    });
  }

  async function handleToggle(task, checked) {
    const { error } = await toggleTaskDone(task, checked);
    if (!error) await load();
  }

  async function handleSnooze(task) {
    const { error } = await snoozeTaskDeadline(task);
    if (!error) await load();
  }

  function openCreateModal() {
    editingTaskId = null;
    els.taskForm.reset();
    els.taskFormError.textContent = "";
    els.taskModalTitle.textContent = "Neue Aufgabe";
    els.priorityInput.value = "normal";
    if (showStrang && els.strangInput) els.strangInput.value = "design";
    els.modal.classList.remove("hidden");
    els.titleInput.focus();
  }

  function openEditModal(task) {
    editingTaskId = task.id;
    els.taskFormError.textContent = "";
    els.taskModalTitle.textContent = "Aufgabe bearbeiten";
    els.titleInput.value = task.titel;
    els.priorityInput.value = task.dringlichkeit;
    if (showStrang && els.strangInput) els.strangInput.value = task.strang || "design";
    els.dueInput.value = task.deadline || "";
    els.modal.classList.remove("hidden");
  }

  function closeModal() {
    els.modal.classList.add("hidden");
  }

  els.taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      titel: els.titleInput.value.trim(),
      dringlichkeit: els.priorityInput.value,
      deadline: els.dueInput.value || null,
    };
    if (showStrang && els.strangInput) payload.strang = els.strangInput.value;
    if (!payload.titel) return;

    const query = editingTaskId
      ? supabaseClient.from("tasks").update(payload).eq("id", editingTaskId)
      : supabaseClient.from("tasks").insert({ ...payload, bereich });

    const { error } = await query;
    if (error) {
      els.taskFormError.textContent = "Fehler: " + error.message;
      return;
    }
    closeModal();
    await load();
  });

  els.cancelBtn.addEventListener("click", closeModal);
  if (els.newTaskBtn) els.newTaskBtn.addEventListener("click", openCreateModal);

  if (els.sortSelect) {
    els.sortSelect.addEventListener("change", () => {
      sortMode = els.sortSelect.value;
      render();
    });
  }

  if (els.archiveToggleBtn) {
    els.archiveToggleBtn.addEventListener("click", () => {
      const willShow = els.archiveSection.classList.contains("hidden");
      els.archiveSection.classList.toggle("hidden", !willShow);
      els.archiveToggleBtn.textContent = willShow ? "Archiv verbergen" : "Archiv anzeigen";
      if (willShow) renderArchiveList();
    });
  }

  document.addEventListener("auth-ready", load);

  return { load, getTasks: () => tasks, openEditModal };
}

// ------------------------------------------------------------------
// Wiederverwendbarer Controller fuer die Kanalzahlen-Tabelle
// (Modemarke + TikTok): Formular zum Eintragen, Tabelle mit
// Verlauf, absteigend nach Datum.
// ------------------------------------------------------------------
function createMetricsController({ bereich, els }) {
  let rows = [];

  async function load() {
    const { data, error } = await supabaseClient
      .from("metrics")
      .select("*")
      .eq("bereich", bereich)
      .order("datum", { ascending: false });
    if (error) {
      els.errorEl.textContent = "Fehler beim Laden: " + error.message;
      return [];
    }
    rows = data;
    renderTable(rows);
    return rows;
  }

  function renderTable(list) {
    els.tableBody.innerHTML = "";
    if (list.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.className = "empty-hint";
      td.textContent = "Noch keine Einträge.";
      tr.appendChild(td);
      els.tableBody.appendChild(tr);
      return;
    }
    list.forEach((row) => {
      const tr = document.createElement("tr");
      const dateTd = document.createElement("td");
      dateTd.textContent = formatDate(row.datum);
      const followerTd = document.createElement("td");
      followerTd.textContent = row.follower ?? "–";
      const viewsTd = document.createElement("td");
      viewsTd.textContent = row.views ?? "–";
      tr.appendChild(dateTd);
      tr.appendChild(followerTd);
      tr.appendChild(viewsTd);
      els.tableBody.appendChild(tr);
    });
  }

  els.formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.errorEl.textContent = "";
    const payload = {
      bereich,
      datum: els.dateInput.value,
      follower: els.followerInput.value ? Number(els.followerInput.value) : null,
      views: els.viewsInput.value ? Number(els.viewsInput.value) : null,
    };
    if (!payload.datum) return;
    const { error } = await supabaseClient.from("metrics").insert(payload);
    if (error) {
      els.errorEl.textContent = "Fehler: " + error.message;
      return;
    }
    els.formEl.reset();
    await load();
  });

  document.addEventListener("auth-ready", load);
  return { load, getRows: () => rows };
}
