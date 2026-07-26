// ------------------------------------------------------------------
// Headquarter-Uebersicht: dringendste Aufgaben ueber alle Bereiche
// hinweg, plus eine Kennzahl pro Bereich.
// ------------------------------------------------------------------

const topTasksEl = document.getElementById("top-tasks");
const metricStudiumEl = document.getElementById("metric-studium");
const metricModeEl = document.getElementById("metric-mode");
const metricTiktokEl = document.getElementById("metric-tiktok");

const TOP_TASK_COUNT = 5;

async function loadOverview() {
  try {
    const [tasks, modeMetrics, tiktokMetrics] = await Promise.all([
      fetchTasks(["studium", "mode", "tiktok"]),
      loadLatestMetrics("mode"),
      loadLatestMetrics("tiktok"),
    ]);
    renderTopTasks(tasks);
    renderStudiumMetric(tasks);
    renderModeMetric(tasks);
    renderTiktokMetric(tiktokMetrics);
  } catch (e) {
    topTasksEl.textContent = "Fehler beim Laden: " + e.message;
  }
}

function renderTopTasks(tasks) {
  const open = tasks.filter((t) => !t.erledigt);
  const top = sortTasks(open, "priority").slice(0, TOP_TASK_COUNT);

  topTasksEl.innerHTML = "";
  if (top.length === 0) {
    topTasksEl.appendChild(buildEmptyHint("Keine offenen Aufgaben. Gut gemacht!"));
    return;
  }
  top.forEach((task) => {
    topTasksEl.appendChild(
      buildTaskCard(task, {
        showBereich: true,
        showStrang: true,
        onToggle: async (t, checked) => {
          await toggleTaskDone(t, checked);
          await loadOverview();
        },
      })
    );
  });
}

function renderStudiumMetric(tasks) {
  const open = tasks.filter((t) => t.bereich === "studium" && !t.erledigt && t.deadline);
  if (open.length === 0) {
    metricStudiumEl.textContent = "Keine offene Deadline";
    return;
  }
  const next = [...open].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  metricStudiumEl.textContent = "Nächste Deadline: " + formatDate(next.deadline);
}

function renderModeMetric(tasks) {
  const modeTasks = tasks.filter((t) => t.bereich === "mode");
  if (modeTasks.length === 0) {
    metricModeEl.textContent = "Noch keine Aufgaben";
    return;
  }
  const done = modeTasks.filter((t) => t.erledigt).length;
  const pct = Math.round((done / modeTasks.length) * 100);
  metricModeEl.textContent = `Fortschritt: ${pct}%`;
}

async function loadLatestMetrics(bereich) {
  const { data, error } = await supabaseClient
    .from("metrics")
    .select("*")
    .eq("bereich", bereich)
    .order("datum", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

function renderTiktokMetric(rows) {
  if (!rows || rows.length === 0) {
    metricTiktokEl.textContent = "Noch keine Kanalzahlen";
    return;
  }
  const latest = rows[0];
  const weekAgoTarget = new Date(latest.datum);
  weekAgoTarget.setDate(weekAgoTarget.getDate() - 7);

  const reference = rows.find((r) => new Date(r.datum) <= weekAgoTarget) || null;

  let text = `${latest.follower ?? "–"} Follower`;
  if (reference && latest.follower != null && reference.follower != null) {
    const diff = latest.follower - reference.follower;
    const sign = diff > 0 ? "+" : "";
    text += ` (${sign}${diff} ggü. Vorwoche)`;
  }
  metricTiktokEl.textContent = text;
}

document.addEventListener("auth-ready", loadOverview);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
