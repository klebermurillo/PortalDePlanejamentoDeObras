// ── Estado global ─────────────────────────────────────────────────────────────
const authContext = {
  userId: localStorage.getItem("portal-user-id") || "usuario_demo",
  role:   localStorage.getItem("portal-user-role") || "usuario"
};
function authHeaders() {
  return { "x-user-id": authContext.userId, "x-user-role": authContext.role };
}

let projetos     = [];
let simulacoes   = [];
let projetoAtivo = null;
let simAtiva     = null;

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtCapex(v) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

// ── Carregar dropdowns ────────────────────────────────────────────────────────
async function carregarDiretorias() {
  const res  = await fetch("/api/diretorias", { headers: authHeaders() });
  const data = await res.json();
  const sel  = document.getElementById("filtro-diretoria");
  sel.innerHTML = '<option value="">Diretoria</option>';
  data.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.nome;
    sel.appendChild(opt);
  });
}

async function carregarProgramas(diretoriaId) {
  const url  = diretoriaId ? `/api/programas?diretoriaId=${diretoriaId}` : "/api/programas";
  const res  = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  const sel  = document.getElementById("filtro-programa");
  sel.innerHTML = '<option value="">Programa</option>';
  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nome;
    sel.appendChild(opt);
  });
}

// ── Projetos ──────────────────────────────────────────────────────────────────
async function carregarProjetos() {
  const diretoria = document.getElementById("filtro-diretoria").value;
  const programa  = document.getElementById("filtro-programa").value;
  const busca     = document.getElementById("filtro-busca").value.trim();
  const params    = new URLSearchParams();
  if (diretoria) params.set("diretoriaId", diretoria);
  if (programa)  params.set("programaId",  programa);
  if (busca)     params.set("busca",        busca);

  const res  = await fetch(`/api/projetos?${params}`, { headers: authHeaders() });
  const data = await res.json();
  projetos   = data.projetos || [];
  renderTabela();
  atualizarMatchList();
}

function renderTabela() {
  const tbody = document.getElementById("projetos-tbody");
  document.getElementById("tabela-total").textContent = `${projetos.length} projeto(s)`;
  tbody.innerHTML = "";

  if (projetos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="sim-empty-row">Nenhum projeto encontrado</td></tr>';
    return;
  }

  projetos.forEach(p => {
    const tr  = document.createElement("tr");
    const ativo = projetoAtivo?.id === p.id;
    if (ativo) tr.classList.add("sim-row-active");
    tr.innerHTML = `
      <td class="sim-td-nome">${p.nome}</td>
      <td>${p.diretoria}</td>
      <td>${p.programa}</td>
      <td>${p.escopo || "—"}</td>
      <td>${fmtCapex(p.capexEstimado)}</td>
      <td>${p.anoContratual || "—"}</td>
      <td>${p.anoReal || "—"}</td>
      <td><span class="sim-status sim-status-${(p.status || "").toLowerCase().replace(/\s/g, "-")}">${p.status || "—"}</span></td>
    `;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => selecionarProjeto(p));
    tbody.appendChild(tr);
  });
}

function selecionarProjeto(p) {
  projetoAtivo = p;
  simAtiva     = null;

  document.getElementById("sim-projeto-id").value   = p.id;
  document.getElementById("sim-id").value           = "";
  document.getElementById("dados-atual-placeholder").hidden = true;
  document.getElementById("dados-atual-content").hidden     = false;
  document.getElementById("atual-capex").textContent         = fmtCapex(p.capexEstimado);
  document.getElementById("atual-ano-contratual").textContent = p.anoContratual || "—";
  document.getElementById("atual-ano-real").textContent       = p.anoReal || "—";
  document.getElementById("atual-diretoria").textContent      = p.diretoria;
  document.getElementById("atual-programa").textContent       = p.programa;
  document.getElementById("atual-escopo").textContent         = p.escopo || "—";

  document.getElementById("btn-salvar").disabled = false;
  document.getElementById("btn-apagar").hidden   = true;

  limparFormSim();
  renderTabela();
}

// ── Busca sidebar ─────────────────────────────────────────────────────────────
function atualizarMatchList() {
  const busca = document.getElementById("busca-sidebar").value.trim().toLowerCase();
  const lista = document.getElementById("lista-matches");
  lista.innerHTML = "";

  if (!busca) { lista.hidden = true; return; }

  const matches = projetos.filter(p => p.nome.toLowerCase().includes(busca)).slice(0, 8);
  if (matches.length === 0) { lista.hidden = true; return; }

  matches.forEach(p => {
    const li = document.createElement("li");
    li.className = "sim-match-item";
    li.textContent = p.nome;
    li.addEventListener("click", () => {
      selecionarProjeto(p);
      document.getElementById("busca-sidebar").value = p.nome;
      lista.hidden = true;
    });
    lista.appendChild(li);
  });
  lista.hidden = false;
}

// ── Simulações ────────────────────────────────────────────────────────────────
async function carregarSimulacoes() {
  const res  = await fetch("/api/simulacoes", { headers: authHeaders() });
  const data = await res.json();
  simulacoes = data.simulacoes || [];
  renderSimulacoes();
}

function renderSimulacoes() {
  const tbody = document.getElementById("simulacoes-tbody");
  tbody.innerHTML = "";

  if (simulacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="sim-empty-row">Não encontramos nada para mostrar aqui</td></tr>';
    return;
  }

  simulacoes.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="sim-td-nome">${s.nomeProjeto}</td>
      <td>${s.diretoria}</td>
      <td>${s.programa}</td>
      <td>${fmtCapex(s.capexEstimadoAtual)}</td>
      <td>${fmtCapex(s.capexEstimadoSim)}</td>
      <td>${s.anoContratualAtual || "—"}</td>
      <td>${s.anoContratualSim || "—"}</td>
      <td>${s.anoRealAtual || "—"}</td>
      <td>${s.anoRealSim || "—"}</td>
      <td class="sim-td-contexto">${s.contexto || "—"}</td>
      <td>${s.dataSimulacao ? new Date(s.dataSimulacao).toLocaleDateString("pt-BR") : "—"}</td>
      <td>
        <button class="sim-btn sim-btn-sm" data-acao="editar" data-id="${s.id}">Editar</button>
        <button class="sim-btn sim-btn-danger sim-btn-sm" data-acao="excluir" data-id="${s.id}">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Form de simulação ─────────────────────────────────────────────────────────
function limparFormSim() {
  document.getElementById("sim-capex").value          = "";
  document.getElementById("sim-ano-contratual").value = "";
  document.getElementById("sim-ano-real").value       = "";
  document.getElementById("sim-contexto").value       = "";
  document.getElementById("sim-ponto-atencao").value  = "";
  document.getElementById("sim-form-msg").textContent  = "";
  document.getElementById("sim-form-msg").className    = "sim-msg";
  document.getElementById("sim-id").value              = "";
  document.getElementById("btn-apagar").hidden          = true;
  simAtiva = null;
}

function mostrarMsgForm(texto, tipo) {
  const el = document.getElementById("sim-form-msg");
  el.textContent = texto;
  el.className   = `sim-msg sim-msg-${tipo}`;
}

function mostrarMsgImport(texto, tipo) {
  const el = document.getElementById("sim-import-msg");
  el.textContent = texto;
  el.className   = `sim-msg sim-msg-${tipo}`;
}

document.getElementById("sim-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const projetoId = Number(document.getElementById("sim-projeto-id").value);
  if (!projetoId) { mostrarMsgForm("Selecione um projeto antes de salvar.", "error"); return; }

  const simId     = document.getElementById("sim-id").value;
  const capex     = document.getElementById("sim-capex").value;
  const payload   = {
    projetoId,
    capexEstimadoSim:  capex ? Number(capex) : undefined,
    anoContratualSim:  document.getElementById("sim-ano-contratual").value.trim() || undefined,
    anoRealSim:        document.getElementById("sim-ano-real").value.trim()       || undefined,
    contexto:          document.getElementById("sim-contexto").value.trim()       || undefined,
    pontoAtencao:      document.getElementById("sim-ponto-atencao").value.trim()  || undefined
  };

  const method = simId ? "PUT" : "POST";
  const url    = simId ? `/api/simulacoes/${simId}` : "/api/simulacoes";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    mostrarMsgForm(err.error || "Falha ao salvar.", "error");
    return;
  }

  mostrarMsgForm(simId ? "Simulação atualizada." : "Simulação salva.", "ok");
  limparFormSim();
  await carregarSimulacoes();
});

document.getElementById("btn-limpar-form").addEventListener("click", () => {
  limparFormSim();
  document.getElementById("btn-salvar").disabled = !projetoAtivo;
});

document.getElementById("btn-importar-excel").addEventListener("click", async () => {
  const input = document.getElementById("sim-excel-input");
  const file = input.files?.[0];

  if (!file) {
    mostrarMsgImport("Selecione um arquivo Excel para importar.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("arquivo", file);

  mostrarMsgImport("Importando planilha...", "ok");

  try {
    const res = await fetch("/api/simulador/upload", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      mostrarMsgImport(data.error || "Falha ao importar a planilha.", "error");
      return;
    }

    mostrarMsgImport(`${data.totalImportado ?? 0} simulação(ões) importada(s) com sucesso.`, "ok");
    input.value = "";
    await carregarSimulacoes();
  } catch (error) {
    mostrarMsgImport("Falha ao enviar o arquivo.", "error");
  }
});

document.getElementById("btn-apagar").addEventListener("click", async () => {
  const simId = document.getElementById("sim-id").value;
  if (!simId || !confirm("Confirmar exclusão da simulação?")) return;

  const res = await fetch(`/api/simulacoes/${simId}`, { method: "DELETE", headers: authHeaders() });
  if (res.ok) {
    mostrarMsgForm("Simulação excluída.", "ok");
    limparFormSim();
    await carregarSimulacoes();
  }
});

// ── Ações da tabela de simulações ─────────────────────────────────────────────
document.getElementById("simulacoes-tbody").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-acao]");
  if (!btn) return;
  const id   = btn.dataset.id;
  const acao = btn.dataset.acao;

  if (acao === "excluir") {
    if (!confirm("Confirmar exclusão?")) return;
    fetch(`/api/simulacoes/${id}`, { method: "DELETE", headers: authHeaders() })
      .then(() => carregarSimulacoes());
    return;
  }

  if (acao === "editar") {
    const s = simulacoes.find(x => String(x.id) === id);
    if (!s) return;

    const projeto = projetos.find(p => p.id === s.projetoId);
    if (projeto) selecionarProjeto(projeto);

    document.getElementById("sim-id").value                = s.id;
    document.getElementById("sim-capex").value             = s.capexEstimadoSim || "";
    document.getElementById("sim-ano-contratual").value    = s.anoContratualSim || "";
    document.getElementById("sim-ano-real").value          = s.anoRealSim || "";
    document.getElementById("sim-contexto").value          = s.contexto || "";
    document.getElementById("sim-ponto-atencao").value     = s.pontoAtencao || "";
    document.getElementById("btn-apagar").hidden            = false;
    simAtiva = s;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ── Filtros ───────────────────────────────────────────────────────────────────
document.getElementById("filtro-diretoria").addEventListener("change", async (e) => {
  await carregarProgramas(e.target.value || undefined);
  await carregarProjetos();
});
document.getElementById("filtro-programa").addEventListener("change", carregarProjetos);
document.getElementById("filtro-busca").addEventListener("input", carregarProjetos);

document.getElementById("btn-limpar-filtros").addEventListener("click", async () => {
  document.getElementById("filtro-diretoria").value = "";
  document.getElementById("filtro-programa").value  = "";
  document.getElementById("filtro-busca").value     = "";
  await carregarProgramas();
  await carregarProjetos();
});

document.getElementById("busca-sidebar").addEventListener("input", atualizarMatchList);
document.getElementById("btn-busca").addEventListener("click", atualizarMatchList);

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await carregarDiretorias();
  await carregarProgramas();
  await carregarProjetos();
  await carregarSimulacoes();
})();
