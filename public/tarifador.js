const form = document.getElementById("tarifador-form");
const output = document.getElementById("tarifa-resultado");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const custoBase = Number(document.getElementById("custoBase").value || 0);
  const margem = Number(document.getElementById("margem").value || 0);
  const fatorRisco = Number(document.getElementById("fatorRisco").value || 1);

  const tarifa = custoBase * (1 + margem / 100) * fatorRisco;
  output.className = "msg ok";
  output.textContent = `Tarifa simulada: R$ ${tarifa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
});