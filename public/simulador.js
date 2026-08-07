const form = document.getElementById("registro-form");
const uploadForm = document.getElementById("upload-form");
const tabelaBody = document.getElementById("tabela-body");
const kpiTotal = document.getElementById("kpi-total");
const formMsg = document.getElementById("form-msg");
const uploadMsg = document.getElementById("upload-msg");
const cancelarBtn = document.getElementById("cancelar-edicao");
const gerarPdfBtn = document.getElementById("gerar-pdf");

let registros = [];
let editandoId = null;

function exibirMensagem(el, texto, tipo) {
  el.className = `msg ${tipo}`;
  el.textContent = texto;
}

function limparMensagem(el) {
  el.className = "msg";
  el.textContent = "";
}

function payloadFromForm() {
  const data = new FormData(form);
  return {
    usuario: String(data.get("usuario") || "").trim(),
    dataSimulacao: String(data.get("dataSimulacao") || "").trim() || undefined,
    entregavel: String(data.get("entregavel") || "").trim() || undefined,
    capexEstimadoAtual: data.get("capexEstimadoAtual") ? Number(data.get("capexEstimadoAtual")) : undefined,
    capexEstimadoSim: data.get("capexEstimadoSim") ? Number(data.get("capexEstimadoSim")) : undefined,
    anoAnttSim: String(data.get("anoAnttSim") || "").trim() || undefined,
    anoRealSim: String(data.get("anoRealSim") || "").trim() || undefined,
    pontoAtencao: String(data.get("pontoAtencao") || "").trim() || undefined,
    contexto: String(data.get("contexto") || "").trim() || undefined
  };
}

function preencherForm(registro) {
  form.usuario.value = registro.usuario || "";
  form.dataSimulacao.value = registro.dataSimulacao || "";
  form.entregavel.value = registro.entregavel || "";
  form.capexEstimadoAtual.value = registro.capexEstimadoAtual ?? "";
  form.capexEstimadoSim.value = registro.capexEstimadoSim ?? "";
  form.anoAnttSim.value = registro.anoAnttSim || "";
  form.anoRealSim.value = registro.anoRealSim || "";
  form.pontoAtencao.value = registro.pontoAtencao || "";
  form.contexto.value = registro.contexto || "";
}

function resetForm() {
  form.reset();
  editandoId = null;
  cancelarBtn.style.display = "none";
}

function renderTabela() {
  tabelaBody.innerHTML = "";
  kpiTotal.textContent = String(registros.length);

  registros.forEach((registro) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${registro.id}</td>
      <td>${registro.usuario ?? ""}</td>
      <td>${registro.entregavel ?? ""}</td>
      <td>${Number(registro.capexEstimadoAtual || 0).toLocaleString("pt-BR")}</td>
      <td>${Number(registro.capexEstimadoSim || 0).toLocaleString("pt-BR")}</td>
      <td>
        <button class="btn btn-secondary" data-acao="editar" data-id="${registro.id}">Editar</button>
        <button class="btn" style="background:#fde8e8;color:#8f2424;border:1px solid #f3b6b6" data-acao="excluir" data-id="${registro.id}">Excluir</button>
      </td>
    `;
    tabelaBody.appendChild(tr);
  });
}

async function carregarRegistros() {
  const response = await fetch("/api/simulador/registros");
  const data = await response.json();
  registros = data.registros || [];
  renderTabela();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagem(formMsg);

  try {
    const payload = payloadFromForm();

    const response = await fetch(editandoId ? `/api/simulador/registros/${editandoId}` : "/api/simulador/registros", {
      method: editandoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falha ao salvar registro.");
    }

    exibirMensagem(formMsg, editandoId ? "Registro atualizado com sucesso." : "Registro criado com sucesso.", "ok");
    resetForm();
    await carregarRegistros();
  } catch (error) {
    exibirMensagem(formMsg, error.message || "Erro inesperado.", "error");
  }
});

cancelarBtn.addEventListener("click", () => {
  resetForm();
  limparMensagem(formMsg);
});

tabelaBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const id = Number(target.dataset.id || 0);
  const acao = target.dataset.acao;
  if (!id || !acao) {
    return;
  }

  if (acao === "editar") {
    const registro = registros.find((item) => item.id === id);
    if (!registro) {
      return;
    }

    preencherForm(registro);
    editandoId = id;
    cancelarBtn.style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (acao === "excluir") {
    if (!confirm("Confirma exclusão do registro?")) {
      return;
    }

    const response = await fetch(`/api/simulador/registros/${id}`, { method: "DELETE" });
    if (!response.ok) {
      exibirMensagem(formMsg, "Falha ao excluir registro.", "error");
      return;
    }

    exibirMensagem(formMsg, "Registro excluído.", "ok");
    await carregarRegistros();
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagem(uploadMsg);

  try {
    const formData = new FormData(uploadForm);
    const response = await fetch("/api/simulador/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Falha na importação.");
    }

    exibirMensagem(uploadMsg, `Importação concluída: ${data.totalImportado} registro(s).`, "ok");
    uploadForm.reset();
    await carregarRegistros();
  } catch (error) {
    exibirMensagem(uploadMsg, error.message || "Erro inesperado.", "error");
  }
});

gerarPdfBtn.addEventListener("click", async () => {
  const linhas = registros
    .map(
      (r) =>
        `<tr><td>${r.usuario ?? ""}</td><td>${r.entregavel ?? ""}</td><td>${r.capexEstimadoAtual ?? ""}</td><td>${r.capexEstimadoSim ?? ""}</td></tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
          h1 { color: #0f5a5f; }
        </style>
      </head>
      <body>
        <h1>Relatório do Simulador</h1>
        <p>Total de registros: ${registros.length}</p>
        <table>
          <thead>
            <tr><th>Usuário</th><th>Entregável</th><th>Capex Atual</th><th>Capex Sim</th></tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </body>
    </html>
  `;

  const response = await fetch("/api/relatorios/gerar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, fileName: "relatorio_simulador.pdf" })
  });

  const data = await response.json();
  if (!response.ok) {
    exibirMensagem(formMsg, data.error || "Falha ao gerar relatório.", "error");
    return;
  }

  window.open(data.downloadPath, "_blank");
});

carregarRegistros().catch(() => {
  exibirMensagem(formMsg, "Falha ao carregar registros iniciais.", "error");
});
