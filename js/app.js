const testInput = document.getElementById("test-value");
const saveBtn = document.getElementById("save-btn");
const saveStatus = document.getElementById("save-status");
const userEmailLabel = document.getElementById("user-email");

async function loadData(e) {
  if (userEmailLabel && e?.detail?.session) {
    userEmailLabel.textContent = e.detail.session.user.email;
  }
  saveStatus.textContent = "Lade...";
  const { data, error } = await supabaseClient
    .from("dashboard_data")
    .select("value")
    .eq("key", "test")
    .maybeSingle();

  if (error) {
    saveStatus.textContent = "Fehler beim Laden: " + error.message;
    return;
  }
  testInput.value = data ? data.value : "";
  saveStatus.textContent = "";
}

saveBtn.addEventListener("click", async () => {
  saveStatus.textContent = "Speichere...";
  const { error } = await supabaseClient
    .from("dashboard_data")
    .upsert({ key: "test", value: testInput.value, updated_at: new Date().toISOString() });

  if (error) {
    saveStatus.textContent = "Fehler beim Speichern: " + error.message;
    return;
  }
  saveStatus.textContent = "Gespeichert ✓";
});

document.addEventListener("auth-ready", loadData);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
