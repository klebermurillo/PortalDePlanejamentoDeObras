// ── Autenticação (mesmo padrão do simulador) ─────────────────────────────────
const authContext = {
  userId: localStorage.getItem("portal-user-id") || "usuario_demo",
  role:   localStorage.getItem("portal-user-role") || "usuario"
};
function authHeaders(json) {
  const headers = { "x-user-id": authContext.userId, "x-user-role": authContext.role };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

let diretorias = [];
let programas  = [];
let obraEmEdicaoId = null;
let usuarioEmEdicaoId = null;

// ── Abas ──────────────────────────────────────────────────────────────────
function ativarAba(nome) {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    const ativo = btn.dataset.tab === nome;
    btn.classList.toggle("btn-primary", ativo);
    btn.classList.toggle("btn-secondary", !ativo);
  });
  document.getElementById("tab-obras").hidden = nome !== "obras";
  document.getElementById("tab-usuarios").hidden = nome !== "usuarios";
  document.getElementById("tab-parametros").hidden = nome !== "parametros";
}
document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => ativarAba(btn.dataset.tab));
});

// ── Guarda de perfil (aviso visual; a API já bloqueia no backend) ────────────
function aplicarGuardaPerfil() {
  const aviso = document.getElementById("perfil-aviso");
  const isAdm = authContext.role === "adm";
  aviso.hidden = isAdm;
  document.querySelectorAll("#form-obra button, #form-usuario button, #form-parametros button").forEach((btn) => {
    btn.disabled = !isAdm && btn.type === "submit";
  });
}

function fmtCapex(v) {
  if (!v && v !== 0) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

// ── Obras ─────────────────────────────────────────────────────────────────
async function carregarDiretorias() {
  const res = await fetch("/api/diretorias", { headers: authHeaders() });
  diretorias = await res.json();
  const select = document.getElementById("obra-diretoria");
  select.innerHTML = diretorias.map((d) => `<option value="${d.id}">${d.nome}</option>`).join("");
}

async function carregarProgramas(diretoriaId) {
  const params = diretoriaId ? `?diretoriaId=${diretoriaId}` : "";
  const res = await fetch(`/api/programas${params}`, { headers: authHeaders() });
  programas = await res.json();
  const select = document.getElementById("obra-programa");
  select.innerHTML = programas.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
}

async function carregarObras() {
  const res = await fetch("/api/projetos", { headers: authHeaders() });
  const data = await res.json();
  const tbody = document.getElementById("tbody-obras");
  tbody.innerHTML = data.projetos.map((p) => `
    <tr>
      <td>${p.idProjeto}</td>
      <td>${p.nome}</td>
      <td>${p.diretoria}</td>
      <td>${p.programa}</td>
      <td>${fmtCapex(p.capexEstimado)}</td>
      <td>${p.anoContratual ?? "—"}</td>
      <td>${p.anoReal ?? "—"}</td>
      <td>${p.status ?? "—"}</td>
      <td>
        <button class="btn btn-secondary" data-editar-obra="${p.id}" type="button">Editar</button>
        <button class="btn btn-secondary" data-excluir-obra="${p.id}" type="button">Excluir</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-editar-obra]").forEach((btn) => {
    btn.addEventListener("click", () => editarObra(Number(btn.dataset.editarObra), data.projetos));
  });
  tbody.querySelectorAll("[data-excluir-obra]").forEach((btn) => {
    btn.addEventListener("click", () => excluirObra(Number(btn.dataset.excluirObra)));
  });
}

function editarObra(id, lista) {
  const p = lista.find((item) => item.id === id);
  if (!p) return;
  obraEmEdicaoId = id;
  document.getElementById("obra-id").value = id;
  document.getElementById("obra-diretoria").value = p.diretoriaId;
  carregarProgramas(p.diretoriaId).then(() => {
    document.getElementById("obra-programa").value = p.programaId;
  });
  document.getElementById("obra-id-projeto").value = p.idProjeto;
  document.getElementById("obra-nome").value = p.nome;
  document.getElementById("obra-escopo").value = p.escopo ?? "";
  document.getElementById("obra-capex-regulatorio").value = p.capexRegulatorio ?? "";
  document.getElementById("obra-capex-estimado").value = p.capexEstimado ?? "";
  document.getElementById("obra-ano-contratual").value = p.anoContratual ?? "";
  document.getElementById("obra-ano-real").value = p.anoReal ?? "";
  document.getElementById("obra-status").value = p.status ?? "";
  document.getElementById("btn-cancelar-obra").hidden = false;
}

document.getElementById("btn-cancelar-obra").addEventListener("click", () => {
  obraEmEdicaoId = null;
  document.getElementById("form-obra").reset();
  document.getElementById("btn-cancelar-obra").hidden = true;
});

async function excluirObra(id) {
  if (!confirm("Excluir esta obra?")) return;
  const res = await fetch(`/api/projetos/${id}`, { method: "DELETE", headers: authHeaders() });
  if (res.ok || res.status === 204) carregarObras();
  else alert("Não foi possível excluir a obra.");
}

document.getElementById("obra-diretoria").addEventListener("change", (e) => carregarProgramas(Number(e.target.value)));

document.getElementById("form-obra").addEventListener("submit", async (e) => {
  e.preventDefault();

  let diretoriaId = Number(document.getElementById("obra-diretoria").value);
  const novaDiretoria = document.getElementById("obra-nova-diretoria").value.trim();
  if (novaDiretoria) {
    const res = await fetch("/api/diretorias", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ nome: novaDiretoria }) });
    if (res.ok) {
      const created = await res.json();
      diretoriaId = created.id;
      await carregarDiretorias();
    }
  }

  let programaId = Number(document.getElementById("obra-programa").value);
  const novoPrograma = document.getElementById("obra-novo-programa").value.trim();
  if (novoPrograma) {
    const res = await fetch("/api/programas", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ nome: novoPrograma, diretoriaId }) });
    if (res.ok) {
      const created = await res.json();
      programaId = created.id;
    }
  }

  const payload = {
    idProjeto: document.getElementById("obra-id-projeto").value.trim(),
    nome: document.getElementById("obra-nome").value.trim(),
    programaId,
    escopo: document.getElementById("obra-escopo").value.trim() || undefined,
    capexRegulatorio: parseFloat(document.getElementById("obra-capex-regulatorio").value) || undefined,
    capexEstimado: parseFloat(document.getElementById("obra-capex-estimado").value) || undefined,
    anoContratual: document.getElementById("obra-ano-contratual").value.trim() || undefined,
    anoReal: document.getElementById("obra-ano-real").value.trim() || undefined,
    status: document.getElementById("obra-status").value.trim() || undefined
  };

  const url = obraEmEdicaoId ? `/api/projetos/${obraEmEdicaoId}` : "/api/projetos";
  const method = obraEmEdicaoId ? "PUT" : "POST";
  const res = await fetch(url, { method, headers: authHeaders(true), body: JSON.stringify(payload) });

  if (res.ok) {
    obraEmEdicaoId = null;
    document.getElementById("form-obra").reset();
    document.getElementById("btn-cancelar-obra").hidden = true;
    carregarObras();
  } else {
    const erro = await res.json().catch(() => ({}));
    alert(erro.error || "Não foi possível salvar a obra.");
  }
});

// ── Usuários ──────────────────────────────────────────────────────────────
async function carregarUsuarios() {
  const res = await fetch("/api/usuarios", { headers: authHeaders() });
  if (!res.ok) {
    document.getElementById("tbody-usuarios").innerHTML = `<tr><td colspan="5">Acesso restrito ao administrador.</td></tr>`;
    return;
  }
  const usuarios = await res.json();
  const tbody = document.getElementById("tbody-usuarios");
  tbody.innerHTML = usuarios.map((u) => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.perfil}</td>
      <td>${u.ativo ? "Sim" : "Não"}</td>
      <td>
        <button class="btn btn-secondary" data-editar-usuario="${u.id}" type="button">Editar</button>
        <button class="btn btn-secondary" data-excluir-usuario="${u.id}" type="button">Excluir</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-editar-usuario]").forEach((btn) => {
    btn.addEventListener("click", () => editarUsuario(Number(btn.dataset.editarUsuario), usuarios));
  });
  tbody.querySelectorAll("[data-excluir-usuario]").forEach((btn) => {
    btn.addEventListener("click", () => excluirUsuario(Number(btn.dataset.excluirUsuario)));
  });
}

function editarUsuario(id, lista) {
  const u = lista.find((item) => item.id === id);
  if (!u) return;
  usuarioEmEdicaoId = id;
  document.getElementById("usuario-id").value = id;
  document.getElementById("usuario-nome").value = u.nome;
  document.getElementById("usuario-email").value = u.email;
  document.getElementById("usuario-senha").value = "";
  document.getElementById("usuario-perfil").value = u.perfil;
  document.getElementById("usuario-ativo").value = String(u.ativo);
  document.getElementById("btn-cancelar-usuario").hidden = false;
}

document.getElementById("btn-cancelar-usuario").addEventListener("click", () => {
  usuarioEmEdicaoId = null;
  document.getElementById("form-usuario").reset();
  document.getElementById("btn-cancelar-usuario").hidden = true;
});

async function excluirUsuario(id) {
  if (!confirm("Excluir este usuário?")) return;
  const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE", headers: authHeaders() });
  if (res.ok || res.status === 204) carregarUsuarios();
  else alert("Não foi possível excluir o usuário.");
}

document.getElementById("form-usuario").addEventListener("submit", async (e) => {
  e.preventDefault();

  const senha = document.getElementById("usuario-senha").value;
  const payload = {
    nome: document.getElementById("usuario-nome").value.trim(),
    email: document.getElementById("usuario-email").value.trim(),
    perfil: document.getElementById("usuario-perfil").value,
    ativo: document.getElementById("usuario-ativo").value === "true"
  };
  if (senha) payload.senha = senha;

  const url = usuarioEmEdicaoId ? `/api/usuarios/${usuarioEmEdicaoId}` : "/api/usuarios";
  const method = usuarioEmEdicaoId ? "PUT" : "POST";
  const res = await fetch(url, { method, headers: authHeaders(true), body: JSON.stringify(payload) });

  if (res.ok) {
    usuarioEmEdicaoId = null;
    document.getElementById("form-usuario").reset();
    document.getElementById("btn-cancelar-usuario").hidden = true;
    carregarUsuarios();
  } else {
    const erro = await res.json().catch(() => ({}));
    alert(erro.error || "Não foi possível salvar o usuário.");
  }
});

// ── Parâmetros da Empresa ───────────────────────────────────────────────────
async function carregarParametros() {
  const res = await fetch("/api/configuracoes", { headers: authHeaders() });
  const config = await res.json();
  document.getElementById("param-juros").value = config.taxaJuros;
  document.getElementById("param-multa-ativa").value = String(config.multaAtiva);
  document.getElementById("param-multa-percentual").value = config.multaPercentual;
  document.getElementById("param-meta").value = config.metaDesempenho;
}

document.getElementById("form-parametros").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    taxaJuros: parseFloat(document.getElementById("param-juros").value) || 0,
    multaAtiva: document.getElementById("param-multa-ativa").value === "true",
    multaPercentual: parseFloat(document.getElementById("param-multa-percentual").value) || 0,
    metaDesempenho: parseFloat(document.getElementById("param-meta").value) || 0
  };
  const res = await fetch("/api/configuracoes", { method: "PUT", headers: authHeaders(true), body: JSON.stringify(payload) });
  if (res.ok) alert("Parâmetros salvos com sucesso.");
  else alert("Não foi possível salvar os parâmetros.");
});

// ── Inicialização ───────────────────────────────────────────────────────────
(async function init() {
  aplicarGuardaPerfil();
  await carregarDiretorias();
  await carregarProgramas();
  await carregarObras();
  await carregarUsuarios();
  await carregarParametros();
})();
