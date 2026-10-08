document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = document.getElementById("login-erro");
  erro.style.display = "none";

  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;

  try {
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
    await salvarSessao(usuario);
    window.location.href = "/";
  } catch {
    erro.textContent = "Não foi possível conectar ao sistema.";
    erro.style.display = "block";
  }
});
