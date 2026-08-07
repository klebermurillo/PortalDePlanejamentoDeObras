type GraficoInput = {
  titulo?: string;
  valores?: number[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function gerarGraficoBase64(input: GraficoInput): string {
  const valores = Array.isArray(input.valores) && input.valores.length > 0
    ? input.valores
    : [10, 18, 14, 22, 25, 21];

  const width = 960;
  const height = 320;
  const padding = 40;
  const minValue = Math.min(...valores);
  const maxValue = Math.max(...valores);
  const range = Math.max(1, maxValue - minValue);

  const points = valores.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, valores.length - 1);
    const normalized = (value - minValue) / range;
    const y = padding + (1 - normalized) * (height - padding * 2);
    return `${clamp(x, 0, width)},${clamp(y, 0, height)}`;
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5f7fa" />
      <stop offset="100%" stop-color="#e4ecf5" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" />
  <text x="${padding}" y="28" font-size="20" font-family="Segoe UI, sans-serif" fill="#1f2937">${input.titulo ?? "Grafico"}</text>
  <polyline fill="none" stroke="#0f62fe" stroke-width="4" points="${points.join(" ")}" />
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
