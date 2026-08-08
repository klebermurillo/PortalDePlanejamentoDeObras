const form = document.getElementById("registro-form");
const cenarioForm = document.getElementById("cenario-form");
const uploadForm = document.getElementById("upload-form");
const tabelaBody = document.getElementById("tabela-body");
const kpiTotal = document.getElementById("kpi-total");
const formMsg = document.getElementById("form-msg");
const uploadMsg = document.getElementById("upload-msg");
const cancelarBtn = document.getElementById("cancelar-edicao");
const gerarPdfBtn = document.getElementById("gerar-pdf");
const curvaChart = document.getElementById("curva-s-chart");

const horasExtrasToggle = document.getElementById("horasExtrasToggle");
const resumoEquipes = document.getElementById("resumo-equipes");
const resumoPrazo = document.getElementById("resumo-prazo");
const resumoHoras = document.getElementById("resumo-horas");
const resumoOutorga = document.getElementById("resumo-outorga");
const resumoMulta = document.getElementById("resumo-multa");
const resumoRisco = document.getElementById("resumo-risco");
const resumoTotal = document.getElementById("resumo-total");
const kpiCenarioAtual = document.getElementById("kpi-cenario-atual");
const kpiCenarioSimulado = document.getElementById("kpi-cenario-simulado");
const kpiEconomia = document.getElementById("kpi-economia");
const kpiAderenciaAtual = document.getElementById("kpi-aderencia-atual");
const kpiAderenciaSimulada = document.getElementById("kpi-aderencia-simulada");

let registros = [];
let editandoId = null;
let horasExtrasAtivo = "sim";

const authContext = {
  userId: localStorage.getItem("portal-user-id") || "usuario_demo",
  role: localStorage.getItem("portal-user-role") || "usuario"
};

function getAuthHeaders() {
  return {
    "x-user-id": authContext.userId,
    "x-user-role": authContext.role
  };
}

function exibirMensagem(el, texto, tipo) {
  el.className = `msg ${tipo}`;
  el.textContent = texto;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

function formatMillions(value) {
  return `R$ ${(value / 1000000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mi`;
}

function formatPercent(value) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function getScenarioInputs() {
  const data = new FormData(cenarioForm);
  return {
    numeroEquipes: Number(data.get("numeroEquipes") || 12),
    prazoDias: Number(data.get("prazoDias") || 180),
    horasExtras: horasExtrasAtivo === "sim",
    outorga: Number(data.get("outorgaValor") || 0),
    multaPercentual: Number(data.get("multaPercentual") || 0),
    riscoOperacional: String(data.get("riscoOperacional") || "medio")
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDatasetTotals() {
  const fallbackAtual = 18400000;
  const fallbackSimulado = 17100000;

  const totalAtual = registros.reduce((acc, item) => acc + Number(item.capexEstimadoAtual || 0), 0);
  const totalSim = registros.reduce((acc, item) => acc + Number(item.capexEstimadoSim || 0), 0);

  return {
    atual: totalAtual > 0 ? totalAtual : fallbackAtual,
    simuladoBase: totalSim > 0 ? totalSim : fallbackSimulado,
    quantidade: registros.length
  };
}

function logisticCurve(points, steepness, midpoint, scale) {
  return Array.from({ length: points }, (_, index) => {
    const x = index / (points - 1);
    const y = 1 / (1 + Math.exp(-steepness * (x - midpoint)));
    return clamp(y * scale, 0, 1);
  });
}

function buildChartSeries(scenario) {
  const labels = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];
  const referencia = logisticCurve(labels.length, 8, 0.44, 1);
  const actualMidpoint = clamp(0.48 + scenario.riskWeight * 0.04 + (scenario.hoursExtraPenalty > 0 ? 0.02 : -0.02), 0.25, 0.72);
  const simulatedMidpoint = clamp(actualMidpoint - scenario.teamGain * 0.14 - scenario.hoursExtraBenefit * 0.06, 0.18, 0.65);

  const atual = logisticCurve(labels.length, 8.2, actualMidpoint, scenario.actualCompletionScale);
  const simulado = logisticCurve(labels.length, 8.6, simulatedMidpoint, scenario.simulatedCompletionScale);

  return { labels, referencia, atual, simulado };
}

function polylinePoints(values, width, height, padding) {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values.map((value, index) => {
    const x = padding + (usableWidth * index) / Math.max(1, values.length - 1);
    const y = height - padding - value * usableHeight;
    return `${x},${y}`;
  }).join(" ");
}

function renderCurvaS(series) {
  const width = 760;
  const height = 320;
  const padding = 36;
  const leftAxis = 48;
  const bottomAxis = 28;
  const lineWidth = width - leftAxis - padding;
  const chartHeight = height - padding - bottomAxis;
  const startX = leftAxis;
  const endX = width - padding;
  const startY = padding;
  const endY = height - bottomAxis;

  const horizontalGrid = [0, 0.25, 0.5, 0.75, 1]
    .map((step) => {
      const y = endY - step * (chartHeight - startY + padding);
      return `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" class="chart-grid" />`;
    })
    .join("");

  const verticalGrid = series.labels
    .map((_, index) => {
      const x = startX + (lineWidth * index) / Math.max(1, series.labels.length - 1);
      return `<line x1="${x}" y1="${startY}" x2="${x}" y2="${endY}" class="chart-grid chart-grid-vertical" />`;
    })
    .join("");

  const yLabels = [0, 25, 50, 75, 100]
    .map((step) => {
      const y = endY - (step / 100) * (chartHeight - startY + padding);
      return `<text x="10" y="${y + 4}" class="chart-axis-label">${step}%</text>`;
    })
    .join("");

  const xLabels = series.labels
    .map((label, index) => {
      const x = startX + (lineWidth * index) / Math.max(1, series.labels.length - 1);
      return `<text x="${x}" y="${height - 6}" text-anchor="middle" class="chart-axis-label">${label}</text>`;
    })
    .join("");

  const lines = `
    <polyline points="${polylinePoints(series.referencia, width, height, padding)}" class="chart-line chart-line-reference" />
    <polyline points="${polylinePoints(series.atual, width, height, padding)}" class="chart-line chart-line-current" />
    <polyline points="${polylinePoints(series.simulado, width, height, padding)}" class="chart-line chart-line-simulated" />
  `;

  curvaChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="22" class="chart-bg" />
    ${horizontalGrid}
    ${verticalGrid}
    ${yLabels}
    ${xLabels}
    ${lines}
  `;
}

function buildScenarioMetrics() {
  const params = getScenarioInputs();
  const totals = getDatasetTotals();
  const prazoBase = 198;
  const riskMap = { baixo: 0.02, medio: 0.05, alto: 0.09 };
  const riskWeight = riskMap[params.riscoOperacional] ?? 0.05;
  const teamGain = clamp((params.numeroEquipes - 10) / 18, -0.25, 0.35);
  const hoursExtraPenalty = params.horasExtras ? 0.022 : 0;
  const hoursExtraBenefit = params.horasExtras ? 0 : 0.055;
  const prazoReductionRatio = clamp((params.numeroEquipes - 10) * 0.018 + hoursExtraBenefit - riskWeight * 0.2, -0.08, 0.24);
  const novoPrazo = Math.max(90, Math.round(params.prazoDias * (1 - prazoReductionRatio)));
  const multaImpact = totals.atual * (params.multaPercentual / 100) * clamp((params.prazoDias - novoPrazo) / params.prazoDias, 0.06, 0.4) * 0.18;
  const efficiencyImpact = totals.atual * (0.035 + teamGain * 0.18 + hoursExtraBenefit * 0.24 - riskWeight * 0.08);
  const scenarioCost = Math.max(0, totals.atual - efficiencyImpact + params.outorga + multaImpact + totals.atual * hoursExtraPenalty);
  const economia = totals.atual - scenarioCost;
  const actualCompletionScale = clamp(0.86 - riskWeight * 0.8, 0.55, 0.98);
  const simulatedCompletionScale = clamp(actualCompletionScale + teamGain * 0.22 + hoursExtraBenefit * 0.16, 0.62, 1);
  const aderenciaAtual = actualCompletionScale * 100;
  const aderenciaSimulada = simulatedCompletionScale * 100;

  return {
    params,
    totals,
    scenarioCost,
    economia,
    novoPrazo,
    aderenciaAtual,
    aderenciaSimulada,
    riskWeight,
    teamGain,
    hoursExtraPenalty,
    hoursExtraBenefit,
    actualCompletionScale,
    simulatedCompletionScale
  };
}

function updateDashboard() {
  const scenario = buildScenarioMetrics();
  const series = buildChartSeries(scenario);

  kpiCenarioAtual.textContent = formatMillions(scenario.totals.atual);
  kpiCenarioSimulado.textContent = formatMillions(scenario.scenarioCost);
  kpiEconomia.textContent = formatMillions(Math.abs(scenario.economia));
  kpiEconomia.parentElement.classList.toggle("metric-card-danger", scenario.economia < 0);
  kpiEconomia.parentElement.classList.toggle("metric-card-success", scenario.economia >= 0);

  kpiAderenciaAtual.textContent = formatPercent(scenario.aderenciaAtual);
  kpiAderenciaSimulada.textContent = formatPercent(scenario.aderenciaSimulada);

  resumoEquipes.textContent = String(scenario.params.numeroEquipes);
  resumoPrazo.textContent = `${scenario.novoPrazo} dias`;
  resumoHoras.textContent = scenario.params.horasExtras ? "Sim" : "Não";
  resumoOutorga.textContent = formatCurrency(scenario.params.outorga);
  resumoMulta.textContent = formatPercent(scenario.params.multaPercentual);
  resumoRisco.textContent = scenario.params.riscoOperacional.charAt(0).toUpperCase() + scenario.params.riscoOperacional.slice(1);
  resumoTotal.textContent = formatMillions(scenario.scenarioCost);

  renderCurvaS(series);
}

function limparMensagem(el) {
  el.className = "msg";
  el.textContent = "";
}

function payloadFromForm() {
  const data = new FormData(form);
  return {
    dataSimulacao: String(data.get("dataSimulacao") || "").trim() || undefined,
    entregavel: String(data.get("entregavel") || "").trim() || undefined,
    capexEstimadoAtual: data.get("capexEstimadoAtual") ? Number(data.get("capexEstimadoAtual")) : undefined,
    capexEstimadoSim: data.get("capexEstimadoSim") ? Number(data.get("capexEstimadoSim")) : undefined,
    anoContratualSim: String(data.get("anoContratualSim") || "").trim() || undefined,
    anoRealSim: String(data.get("anoRealSim") || "").trim() || undefined,
    pontoAtencao: String(data.get("pontoAtencao") || "").trim() || undefined,
    contexto: String(data.get("contexto") || "").trim() || undefined
  };
}

function preencherForm(registro) {
  form.dataSimulacao.value = registro.dataSimulacao || "";
  form.entregavel.value = registro.entregavel || "";
  form.capexEstimadoAtual.value = registro.capexEstimadoAtual ?? "";
  form.capexEstimadoSim.value = registro.capexEstimadoSim ?? "";
  form.anoContratualSim.value = registro.anoContratualSim || "";
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

  updateDashboard();
}

async function carregarRegistros() {
  const response = await fetch("/api/simulador/registros", {
    headers: getAuthHeaders()
  });
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
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

cenarioForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDashboard();
});

cenarioForm.addEventListener("input", () => {
  updateDashboard();
});

horasExtrasToggle.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  horasExtrasAtivo = target.dataset.value || "sim";
  Array.from(horasExtrasToggle.querySelectorAll(".segmented-btn")).forEach((button) => {
    button.classList.toggle("active", button === target);
  });
  updateDashboard();
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

    const response = await fetch(`/api/simulador/registros/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
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
      headers: getAuthHeaders(),
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
  updateDashboard();
});
