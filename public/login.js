const USUARIOS_DEMO = [
  { nome: "Kleber Murillo", email: "kleber@sigpo.local", perfil: "Administrador" },
  { nome: "João",           email: "joao@sigpo.local",   perfil: "Usuário" },
  { nome: "Maria",          email: "maria@sigpo.local",  perfil: "Usuário" },
  { nome: "José",           email: "jose@sigpo.local",   perfil: "Usuário" }
];

function montarUsuariosDemo() {
  const container = document.getElementById("usuarios-demo");
  container.innerHTML = USUARIOS_DEMO.map((u) => `
    <button type="button" class="btn btn-secondary" data-demo-email="${u.email}">${u.nome} (${u.perfil})</button>
  `).join("");

  container.querySelectorAll("[data-demo-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("login-email").value = btn.dataset.demoEmail;
      document.getElementById("login-senha").value = "demo123";
    });
  });
}

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = document.getElementById("login-erro");
  erro.style.display = "none";

  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    erro.textContent = body.error || "Não foi possível entrar.";
    erro.style.display = "block";
    return;
  }

  const usuario = await res.json();
  salvarSessao(usuario);
  window.location.href = "/";
});

montarUsuariosDemo();
