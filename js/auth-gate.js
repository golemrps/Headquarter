// ------------------------------------------------------------------
// Gemeinsames Login-Gate fuer alle Seiten. Wird als klassisches
// <script> vor dem seitenspezifischen Code eingebunden (nach
// config.js). Erwartet im HTML: #login-view (mit #login-form,
// #email, #password, #login-error) und #app-view.
//
// Meldet sich die Person einmal an, gilt die Supabase-Sitzung
// seitenuebergreifend (gleiche Domain) - kein erneuter Login noetig,
// wenn man z.B. von der 3D-Seite ins Cockpit wechselt.
// ------------------------------------------------------------------

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

function showApp(session) {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  document.dispatchEvent(new CustomEvent("auth-ready", { detail: { session } }));
}

function showLogin() {
  appView.classList.add("hidden");
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
  showApp(data.session);
});

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "logout-btn") {
    supabaseClient.auth.signOut();
  }
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp(session);
  } else {
    showLogin();
  }
});

(async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showApp(session);
  } else {
    showLogin();
  }
})();
