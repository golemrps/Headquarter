const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userEmailLabel = document.getElementById("user-email");
const testInput = document.getElementById("test-value");
const saveBtn = document.getElementById("save-btn");
const saveStatus = document.getElementById("save-status");

function showDashboard(session) {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  userEmailLabel.textContent = session.user.email;
  loadData();
}

function showLogin() {
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = "Login fehlgeschlagen: " + error.message;
    return;
  }
  showDashboard(data.session);
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

async function loadData() {
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

(async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard(session);
  } else {
    showLogin();
  }
})();

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showDashboard(session);
  } else {
    showLogin();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
