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
const workspaceState = {
  obraId: null,
  anoDestino: null,
  movimento: "postergar",
  percentual: 35
};

const ADERENCIA_REFERENCE_YEAR = 2028;

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtCapex(v) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtMi(v) {
  if (!Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v / 1000000)} mi`;
}

function fmtPercent(v) {
  if (!Number.isFinite(v)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

function corrigirTextoBanco(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);
  const hasMojibake = /Ã.|Â.|â.|Ê|�/.test(text);
  if (!hasMojibake) return text;

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch (_error) {
    return text;
  }
}

function textoDisplay(value, fallback = "—") {
  const text = corrigirTextoBanco(value).trim();
  return text || fallback;
}

function textoBusca(value) {
  return corrigirTextoBanco(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugStatus(value) {
  return corrigirTextoBanco(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toYear(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getProjetoAnoBase(projeto) {
  const now = new Date().getFullYear();
  return toYear(projeto?.anoContratual, toYear(projeto?.anoReal, now));
}

function preencherSelectObras() {
  const select = document.getElementById("sim-work-obra");
  const previous = select.value;
  select.innerHTML = '<option value="">Selecione uma obra</option>';

  projetos.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = String(p.id);
    opt.textContent = textoDisplay(p.nome);
    select.appendChild(opt);
  });

  if (previous && projetos.some((p) => String(p.id) === previous)) {
    select.value = previous;
  }
}

function atualizarWorkspaceFromProjeto(projeto) {
  if (!projeto) return;

  workspaceState.obraId = projeto.id;
  workspaceState.anoDestino = getProjetoAnoBase(projeto);
  document.getElementById("sim-work-obra").value = String(projeto.id);
  document.getElementById("sim-work-ano").value = String(workspaceState.anoDestino);
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
    opt.textContent = textoDisplay(d.nome, "Diretoria");
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
    opt.textContent = textoDisplay(p.nome, "Programa");
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

  const res  = await fetch(`/api/projetos?${params}`, { headers: authHeaders() });
  const data = await res.json();
  const projetosBase = data.projetos || [];
  projetos = busca
    ? projetosBase.filter((p) => {
        const nome = textoBusca(p.nome);
        const diretoriaNome = textoBusca(p.diretoria);
        const programaNome = textoBusca(p.programa);
        const escopoNome = textoBusca(p.escopo);
        const termo = textoBusca(busca);
        return nome.includes(termo) || diretoriaNome.includes(termo) || programaNome.includes(termo) || escopoNome.includes(termo);
      })
    : projetosBase;
  preencherSelectObras();
  renderTabela();
  atualizarMatchList();

  if (projetoAtivo) {
    const refreshed = projetos.find((p) => p.id === projetoAtivo.id);
    if (refreshed) {
      selecionarProjeto(refreshed);
    }
  }
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
      <td class="sim-td-nome">${textoDisplay(p.nome)}</td>
      <td>${textoDisplay(p.diretoria)}</td>
      <td>${textoDisplay(p.programa)}</td>
      <td>${textoDisplay(p.escopo)}</td>
      <td>${fmtCapex(p.capexEstimado)}</td>
      <td>${p.anoContratual || "—"}</td>
      <td>${p.anoReal || "—"}</td>
      <td><span class="sim-status sim-status-${slugStatus(p.status || "")}">${textoDisplay(p.status)}</span></td>
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
  document.getElementById("atual-diretoria").textContent      = textoDisplay(p.diretoria);
  document.getElementById("atual-programa").textContent       = textoDisplay(p.programa);
  document.getElementById("atual-escopo").textContent         = textoDisplay(p.escopo);

  document.getElementById("btn-salvar").disabled = false;
  document.getElementById("btn-apagar").hidden   = true;

  atualizarWorkspaceFromProjeto(p);
  limparFormSim();
  renderTabela();
  aplicarCenarioSimulacao();
}

// ── Busca sidebar ─────────────────────────────────────────────────────────────
function atualizarMatchList() {
  const busca = textoBusca(document.getElementById("busca-sidebar").value.trim());
  const lista = document.getElementById("lista-matches");
  lista.innerHTML = "";

  if (!busca) { lista.hidden = true; return; }

  const matches = projetos.filter(p => textoBusca(p.nome).includes(busca)).slice(0, 8);
  if (matches.length === 0) { lista.hidden = true; return; }

  matches.forEach(p => {
    const li = document.createElement("li");
    li.className = "sim-match-item";
    li.textContent = textoDisplay(p.nome);
    li.addEventListener("click", () => {
      selecionarProjeto(p);
      document.getElementById("busca-sidebar").value = textoDisplay(p.nome);
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
  const diretoria = document.getElementById("filtro-diretoria").value;
  const programa = document.getElementById("filtro-programa").value;
  const busca = textoBusca(document.getElementById("filtro-busca").value.trim());
  const hasFilters = Boolean(diretoria || programa || busca);
  const visibleProjectIds = new Set(projetos.map((p) => p.id));
  const visibleSimulacoes = hasFilters
    ? simulacoes.filter((s) => visibleProjectIds.has(s.projetoId))
    : simulacoes;
  tbody.innerHTML = "";

  if (visibleSimulacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="sim-empty-row">Não encontramos nada para mostrar aqui</td></tr>';
    return;
  }

  visibleSimulacoes.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="sim-td-nome">${textoDisplay(s.nomeProjeto)}</td>
      <td>${textoDisplay(s.diretoria)}</td>
      <td>${textoDisplay(s.programa)}</td>
      <td>${fmtCapex(s.capexEstimadoAtual)}</td>
      <td>${fmtCapex(s.capexEstimadoSim)}</td>
      <td>${s.anoContratualAtual || "—"}</td>
      <td>${s.anoContratualSim || "—"}</td>
      <td>${s.anoRealAtual || "—"}</td>
      <td>${s.anoRealSim || "—"}</td>
      <td class="sim-td-contexto">${textoDisplay(s.contexto)}</td>
      <td>${s.dataSimulacao ? new Date(s.dataSimulacao).toLocaleDateString("pt-BR") : "—"}</td>
      <td>
        <button class="sim-btn sim-btn-sm" data-acao="editar" data-id="${s.id}">Editar</button>
        <button class="sim-btn sim-btn-danger sim-btn-sm" data-acao="excluir" data-id="${s.id}">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function distribuirCapexAnual(total, anoInicio, anoFim, profile = "balanced") {
  if (!Number.isFinite(total) || total <= 0) return new Map();

  const start = Math.min(anoInicio, anoFim);
  const end = Math.max(anoInicio, anoFim);
  const anos = [];
  for (let year = start; year <= end; year += 1) anos.push(year);

  const pesos = anos.map((_, index) => {
    const t = anos.length === 1 ? 1 : index / (anos.length - 1);

    if (profile === "front") {
      return (1.75 - t) ** 2 + 0.18;
    }

    if (profile === "back") {
      return (0.75 + t) ** 2 + 0.12;
    }

    return Math.sin(Math.PI * t) + 0.25;
  });
  const totalPeso = pesos.reduce((sum, value) => sum + value, 0);

  const distribuicao = new Map();
  anos.forEach((year, index) => {
    distribuicao.set(year, total * (pesos[index] / totalPeso));
  });

  return distribuicao;
}

function mergeDistribuicoes(...distribuicoes) {
  const merged = new Map();
  distribuicoes.forEach((mapa) => {
    mapa.forEach((valor, ano) => {
      merged.set(ano, (merged.get(ano) ?? 0) + valor);
    });
  });
  return merged;
}

function rangeAnos(minAno, maxAno) {
  const anos = [];
  for (let year = minAno; year <= maxAno; year += 1) anos.push(year);
  return anos;
}

function cumulativeSeries(anos, distribuicao) {
  let acumulado = 0;
  return anos.map((ano) => {
    acumulado += distribuicao.get(ano) ?? 0;
    return acumulado;
  });
}

function scaleSeries(values, divisor = 1) {
  return values.map((value) => value / divisor);
}

function valueAtYear(anos, series, year) {
  const index = anos.indexOf(year);
  if (index < 0) return 0;
  return series[index] ?? 0;
}

function calcularAderencia(anos, serieReal, serieContrato, anoReferencia) {
  const real = valueAtYear(anos, serieReal, anoReferencia);
  const contrato = valueAtYear(anos, serieContrato, anoReferencia);
  if (!contrato) return 0;
  return clamp((real / contrato) * 100, 0, 100);
}

function buildCurvePath(points, width, height, padding) {
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const maxY = Math.max(...yValues, 1);

  const toX = (value) => {
    const ratio = maxX === minX ? 0.5 : (value - minX) / (maxX - minX);
    return padding.left + ratio * chartW;
  };

  const toY = (value) => {
    const ratio = value / maxY;
    return height - padding.bottom - ratio * chartH;
  };

  return points.map((point, index) => `${index === 0 ? "M" : "L"}${toX(point.x).toFixed(2)} ${toY(point.y).toFixed(2)}`).join(" ");
}

function renderCurvaSvg(svgId, anos, series, yLegend, options = {}) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const width = 760;
  const height = 260;
  const padding = { top: 18, right: 14, bottom: 30, left: 42 };

  if (!anos.length) {
    svg.innerHTML = "";
    return;
  }

  const allValues = series.flatMap((item) => item.values);
  const maxY = Math.max(...allValues, 1);
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;

  const yTicks = Array.from({ length: 5 }, (_, idx) => idx / 4).map((fraction) => maxY * fraction);
  const gridLines = yTicks.map((tick) => {
    const y = (height - padding.bottom - ((tick / maxY) * chartH)).toFixed(2);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(139,163,187,0.23)" stroke-width="1" />`;
  }).join("");

  const xLabels = anos.map((ano, idx) => {
    if (idx % 2 !== 0 && idx !== anos.length - 1) return "";
    const x = padding.left + ((anos.length <= 1 ? 0 : idx / (anos.length - 1)) * chartW);
    return `<text x="${x.toFixed(2)}" y="${height - 10}" fill="var(--sim-muted)" font-size="10" text-anchor="middle">${ano}</text>`;
  }).join("");

  const yLabels = yTicks.map((tick) => {
    const y = height - padding.bottom - ((tick / maxY) * chartH);
    return `<text x="8" y="${(y + 3).toFixed(2)}" fill="var(--sim-muted)" font-size="10">${yLegend(tick)}</text>`;
  }).join("");

  const paths = series.map((serie) => {
    const points = anos.map((ano, index) => ({ x: ano, y: serie.values[index] }));
    return `<path d="${buildCurvePath(points, width, height, padding)}" stroke="${serie.color}" stroke-width="3" fill="none" ${serie.dash ? `stroke-dasharray="${serie.dash}"` : ""} />`;
  }).join("");

  const pointLabels = options.showPointLabels
    ? series.map((serie) => {
        return anos.map((ano, index) => {
          const value = serie.values[index];
          if (!Number.isFinite(value)) return "";

          const ratioX = anos.length <= 1 ? 0 : index / (anos.length - 1);
          const x = padding.left + (ratioX * chartW);
          const y = height - padding.bottom - ((value / maxY) * chartH);
          return `
            <g>
              <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.8" fill="${serie.color}" />
              <text x="${x.toFixed(2)}" y="${(y - 8).toFixed(2)}" fill="${serie.color}" font-size="9" text-anchor="middle">${value.toFixed(0)}%</text>
            </g>
          `;
        }).join("");
      }).join("")
    : "";

  const legends = series.map((serie, index) => `<text x="${padding.left + (index * 108)}" y="12" fill="${serie.color}" font-size="10">${serie.label}</text>`).join("");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
    ${gridLines}
    ${paths}
    ${pointLabels}
    ${legends}
    ${xLabels}
    ${yLabels}
  `;
}

function calcularOutorgaEMulta({ capexImpactado, anoBase, anoRealocacao, movimento, percentual }) {
  const taxaAnual = 0.1104;
  const taxaTri = 0.0265;
  const deslocamento = Math.abs(anoRealocacao - anoBase);
  const tipo = movimento === "adiantar" ? "Antecipacao" : (anoRealocacao > anoBase ? "Atraso" : "Sem alteracao");

  const anoRef = anoBase - 2020;
  const anoRealoc = anoRealocacao - 2020;
  const vpl = (tipo === "Atraso" && anoRealocacao >= anoBase)
    ? (capexImpactado / ((1 + taxaAnual) ** anoRef)) - (capexImpactado / ((1 + taxaAnual) ** anoRealoc))
    : 0;

  const acrescimoOutorga = vpl * ((1 + taxaAnual) ** anoRef);
  const periodoInicial = Math.max(1, ((anoBase + 1) - 2020) * 4);
  const periodoFinal = 155;
  const n = Math.max(1, periodoFinal - periodoInicial + 1);
  const parcelaOutorgaTri = acrescimoOutorga * (taxaTri / ((1 - ((1 + taxaTri) ** -n)) * (1 + taxaTri)));
  const indiceIRT = (1 + 0.045) ** Math.max(0, anoRef);
  const parcelaTrimestral = parcelaOutorgaTri * indiceIRT;

  const multiplicadorPorAno = {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.5,
    5: 3,
    6: 3.5,
    7: 4
  };
  const multiplicador = multiplicadorPorAno[deslocamento] ?? 1;
  const valorFinalParcelas = capexImpactado * multiplicador;

  const multaPrazo = tipo === "Atraso"
    ? capexImpactado * (0.015 * deslocamento)
    : 0;
  const creditoAntecipacao = tipo === "Antecipacao"
    ? capexImpactado * (0.006 * deslocamento)
    : 0;

  const totalOutorga = parcelaTrimestral * Math.max(0, deslocamento) * 4;
  const impactoTotal = totalOutorga + multaPrazo - creditoAntecipacao;

  return {
    tipo,
    deslocamento,
    percentual,
    anoReferencia: anoBase,
    vpl,
    acrescimoOutorga,
    parcelaOutorgaTri,
    parcelaTrimestral,
    indiceIRTBase: indiceIRT,
    totalOutorga,
    multiplicador,
    valorFinalParcelas,
    multaPrazo,
    creditoAntecipacao,
    impactoTotal
  };
}

function renderTabelaPenalidades(impacto) {
  const tbody = document.getElementById("sim-penalty-tbody");
  const linhas = [
    { item: "Tipo", valor: impacto.tipo, obs: `Movimento de ${impacto.percentual}% da obra.` },
    { item: "VPL", valor: fmtCapex(impacto.vpl), obs: "Taxa anual de 11,04%." },
    { item: "Acréscimo de Outorga", valor: fmtCapex(impacto.acrescimoOutorga), obs: "Valor presente ajustado ao ano de referência." },
    { item: "Parcela Trimestral", valor: fmtCapex(impacto.parcelaTrimestral), obs: "Taxa trimestral de 2,65% com índice IRT estimado." },
    { item: "Outorga Total", valor: fmtCapex(impacto.totalOutorga), obs: `${impacto.deslocamento} ano(s) x 4 trimestres.` },
    { item: "Multa de Prazo", valor: fmtCapex(impacto.multaPrazo), obs: "Aplicada em cenário de atraso." },
    { item: "Crédito por Antecipação", valor: fmtCapex(impacto.creditoAntecipacao), obs: "Aplicado quando há antecipação." },
    { item: "Valor Final de Parcelas", valor: fmtCapex(impacto.valorFinalParcelas), obs: `Multiplicador ${impacto.multiplicador.toFixed(1)}.` },
    { item: "Impacto Financeiro Total", valor: fmtCapex(impacto.impactoTotal), obs: "Outorga + multa - crédito." }
  ];

  tbody.innerHTML = linhas.map((linha) => `
    <tr>
      <td>${linha.item}</td>
      <td>${linha.valor}</td>
      <td>${linha.obs}</td>
    </tr>
  `).join("");
}

function renderOutorgaDetalhada(impacto) {
  const tbody = document.getElementById("sim-outorga-detalhe-tbody");
  const totalPeriodos = Math.max(1, impacto.deslocamento * 4);
  let acumulado = 0;

  const rows = Array.from({ length: totalPeriodos }, (_, index) => {
    const periodo = index + 1;
    const trimestre = ((index % 4) + 1);
    const ano = impacto.anoReferencia + Math.floor(index / 4) + 1;
    const irt = Number((impacto.indiceIRTBase * ((1 + 0.012) ** index)).toFixed(4));
    const parcelaTri = impacto.parcelaOutorgaTri;
    const parcelaAjustada = parcelaTri * irt;
    acumulado += parcelaAjustada;

    return `
      <tr>
        <td>${periodo}</td>
        <td>${ano}</td>
        <td>T${trimestre}</td>
        <td>${irt.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
        <td>${fmtCapex(parcelaTri)}</td>
        <td>${fmtCapex(parcelaAjustada)}</td>
        <td>${fmtCapex(acumulado)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join("");
}

function renderResumoAnual(anos, data) {
  const tbody = document.getElementById("sim-resumo-anual-tbody");
  tbody.innerHTML = anos.map((ano, index) => `
    <tr>
      <td>${ano}</td>
      <td>${fmtCapex(data.contractCurrent[index] ?? 0)}</td>
      <td>${fmtCapex(data.contractSim[index] ?? 0)}</td>
      <td>${fmtCapex(data.realCurrent[index] ?? 0)}</td>
      <td>${fmtCapex(data.realSim[index] ?? 0)}</td>
    </tr>
  `).join("");
}

function setCurvaTab(mode) {
  const tabPercentual = document.getElementById("tab-curva-percentual");
  const tabCapex = document.getElementById("tab-curva-capex");
  const curvaPercentual = document.getElementById("sim-curva-percentual");
  const curvaCapex = document.getElementById("sim-curva-capex");

  const showPercentual = mode !== "capex";

  tabPercentual.classList.toggle("sim-curva-tab-active", showPercentual);
  tabCapex.classList.toggle("sim-curva-tab-active", !showPercentual);
  curvaPercentual.hidden = !showPercentual;
  curvaCapex.hidden = showPercentual;
}

function aplicarCenarioSimulacao() {
  const projetoId = Number(document.getElementById("sim-work-obra").value);
  const projeto = projetos.find((p) => p.id === projetoId) ?? projetoAtivo;
  if (!projeto) return;

  const movimento = document.getElementById("sim-work-tipo").value === "adiantar" ? "adiantar" : "postergar";
  const percentual = clamp(Number(document.getElementById("sim-work-percent").value || 0), 0, 100);
  const anoBase = getProjetoAnoBase(projeto);
  const anoInput = toYear(document.getElementById("sim-work-ano").value, anoBase);

  const anoRealocacao = movimento === "postergar"
    ? Math.max(anoInput, anoBase)
    : Math.min(anoInput, anoBase);

  const capexTotal = Number(projeto.capexEstimado ?? 0);
  const capexImpactado = capexTotal * (percentual / 100);
  const capexNaoImpactado = capexTotal - capexImpactado;

  const anoContratualBase = toYear(projeto.anoContratual, anoBase);
  const anoRealBase = toYear(projeto.anoReal, anoContratualBase);
  const gapRealBase = Math.max(0, anoRealBase - anoContratualBase);
  const anoContratualSim = toYear(document.getElementById("sim-ano-contratual").value, anoRealocacao);
  const anoRealSim = toYear(document.getElementById("sim-ano-real").value, anoContratualSim + gapRealBase);

  const baseInicio = Math.min(anoContratualBase, anoRealBase) - 3;
  const simInicio = Math.min(anoContratualSim, anoRealSim) - 3;
  const simFim = Math.max(anoContratualSim, anoRealSim);

  const contractCurrentMap = distribuirCapexAnual(capexTotal, baseInicio, anoContratualBase, "front");
  const realCurrentMap = distribuirCapexAnual(capexTotal, baseInicio, anoRealBase, "back");
  const contractSimMap = mergeDistribuicoes(
    distribuirCapexAnual(capexNaoImpactado, baseInicio, anoContratualBase, "front"),
    distribuirCapexAnual(capexImpactado, simInicio, anoContratualSim, "front")
  );
  const realSimMap = mergeDistribuicoes(
    distribuirCapexAnual(capexNaoImpactado, baseInicio, anoRealBase, "back"),
    distribuirCapexAnual(capexImpactado, simInicio, anoRealSim, "back")
  );

  const minAno = Math.min(2021, baseInicio, simInicio);
  const maxAno = Math.max(2032, anoContratualBase, anoRealBase, anoContratualSim, anoRealSim);
  const anos = rangeAnos(minAno, maxAno);

  const contractCurrent = cumulativeSeries(anos, contractCurrentMap);
  const contractSim = cumulativeSeries(anos, contractSimMap);
  const realCurrent = cumulativeSeries(anos, realCurrentMap);
  const realSim = cumulativeSeries(anos, realSimMap);

  const capexSeries = [
    { label: "BL Contratual", color: "#60a5fa", values: scaleSeries(contractCurrent, 1000000) },
    { label: "BL Contratual Sim", color: "#38bdf8", values: scaleSeries(contractSim, 1000000), dash: "8 6" },
    { label: "Real/Tend", color: "#f97316", values: scaleSeries(realCurrent, 1000000) },
    { label: "Real/Tend Sim", color: "#facc15", values: scaleSeries(realSim, 1000000), dash: "10 6" }
  ];

  const percentualSeries = [
    { label: "BL Contratual", color: "#60a5fa", values: contractCurrent.map((v) => capexTotal > 0 ? (v / capexTotal) * 100 : 0) },
    { label: "BL Contratual Sim", color: "#38bdf8", values: contractSim.map((v) => capexTotal > 0 ? (v / capexTotal) * 100 : 0), dash: "8 6" },
    { label: "Real/Tend", color: "#f97316", values: realCurrent.map((v) => capexTotal > 0 ? (v / capexTotal) * 100 : 0) },
    { label: "Real/Tend Sim", color: "#facc15", values: realSim.map((v) => capexTotal > 0 ? (v / capexTotal) * 100 : 0), dash: "10 6" }
  ];

  renderCurvaSvg("sim-curva-capex", anos, capexSeries, (v) => `${v.toFixed(1)} mi`);
  renderCurvaSvg("sim-curva-percentual", anos, percentualSeries, (v) => `${v.toFixed(0)}%`, { showPointLabels: true });

  const deltaPrazo = anoRealocacao - anoBase;
  document.getElementById("kpi-capex-base").textContent = fmtMi(capexTotal);
  document.getElementById("kpi-capex-sim").textContent = fmtMi(capexNaoImpactado + capexImpactado);
  document.getElementById("kpi-delta-prazo").textContent = `${deltaPrazo >= 0 ? "+" : ""}${deltaPrazo} ano(s)`;
  document.getElementById("kpi-percentual").textContent = fmtPercent(percentual);
  const anoReferenciaAtual = Math.min(ADERENCIA_REFERENCE_YEAR, anoContratualBase);
  const anoReferenciaSim = Math.min(ADERENCIA_REFERENCE_YEAR, anoContratualSim);
  document.getElementById("kpi-aderencia-atual").textContent = fmtPercent(calcularAderencia(anos, realCurrent, contractCurrent, anoReferenciaAtual));
  document.getElementById("kpi-aderencia-sim").textContent = fmtPercent(calcularAderencia(anos, realSim, contractSim, anoReferenciaSim));

  const impacto = calcularOutorgaEMulta({
    capexImpactado,
    anoBase,
    anoRealocacao,
    movimento,
    percentual
  });

  renderTabelaPenalidades(impacto);
  renderOutorgaDetalhada(impacto);
  renderResumoAnual(anos, {
    contractCurrent: anos.map((ano) => contractCurrentMap.get(ano) ?? 0),
    contractSim: anos.map((ano) => contractSimMap.get(ano) ?? 0),
    realCurrent: anos.map((ano) => realCurrentMap.get(ano) ?? 0),
    realSim: anos.map((ano) => realSimMap.get(ano) ?? 0)
  });
  document.getElementById("sim-work-percent-label").textContent = `${Math.round(percentual)}%`;

  workspaceState.obraId = projeto.id;
  workspaceState.anoDestino = anoRealocacao;
  workspaceState.percentual = percentual;
  workspaceState.movimento = movimento;
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

  limparFormSim();
  mostrarMsgForm(simId ? "Simulação atualizada." : "Simulação salva.", "ok");
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
    limparFormSim();
    mostrarMsgForm("Simulação excluída.", "ok");
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
document.getElementById("sim-work-obra").addEventListener("change", (event) => {
  const projetoId = Number(event.target.value);
  const projeto = projetos.find((p) => p.id === projetoId);
  if (projeto) {
    selecionarProjeto(projeto);
  }
});
document.getElementById("sim-work-percent").addEventListener("input", (event) => {
  const percentual = clamp(Number(event.target.value || 0), 0, 100);
  document.getElementById("sim-work-percent-label").textContent = `${Math.round(percentual)}%`;
});
document.getElementById("btn-toggle-resumo-anual").addEventListener("click", () => {
  const wrap = document.getElementById("sim-resumo-anual-wrap");
  const hidden = wrap.hasAttribute("hidden");
  wrap.toggleAttribute("hidden");
  document.getElementById("btn-toggle-resumo-anual").textContent = hidden ? "Ocultar resumo anual" : "Ver resumo anual";
});
document.getElementById("btn-toggle-outorga-detalhe").addEventListener("click", () => {
  const wrap = document.getElementById("sim-outorga-detalhe-wrap");
  const hidden = wrap.hasAttribute("hidden");
  wrap.toggleAttribute("hidden");
  document.getElementById("btn-toggle-outorga-detalhe").textContent = hidden ? "Ocultar detalhamento" : "Ver detalhamento";
});
document.getElementById("tab-curva-percentual").addEventListener("click", () => setCurvaTab("percentual"));
document.getElementById("tab-curva-capex").addEventListener("click", () => setCurvaTab("capex"));
document.getElementById("btn-aplicar-cenario").addEventListener("click", aplicarCenarioSimulacao);
document.getElementById("sim-work-ano").addEventListener("change", aplicarCenarioSimulacao);
document.getElementById("sim-work-tipo").addEventListener("change", aplicarCenarioSimulacao);

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await carregarDiretorias();
  await carregarProgramas();
  await carregarProjetos();
  await carregarSimulacoes();

  if (!projetoAtivo && projetos.length > 0) {
    selecionarProjeto(projetos[0]);
  } else {
    aplicarCenarioSimulacao();
  }

  setCurvaTab("percentual");
})();
