import { createTicketNumbers, normalizeTemplate } from "./ticketModel";
import { getTextPrintStyle } from "./textStyles";

const pageWidthMm = 281;
const pageHeightMm = 194;
const ticketGapMm = 6;
const defaultTicketsPerFile = 600;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolvePrintLayout(template, perPage) {
  const ticketWidthMm = template.canvas.widthCm * 10;
  const ticketHeightMm = template.canvas.heightCm * 10;
  const maxColumns = Math.max(1, Math.floor((pageWidthMm + ticketGapMm) / (ticketWidthMm + ticketGapMm)));
  let columns = Math.min(perPage, maxColumns);

  while (columns > 1) {
    const rows = Math.ceil(perPage / columns);
    const totalHeight = rows * ticketHeightMm + Math.max(0, rows - 1) * ticketGapMm;

    if (totalHeight <= pageHeightMm) break;
    columns -= 1;
  }

  return {
    columns,
    ticketHeightMm,
    ticketWidthMm,
  };
}

function renderCanvasObject(object, ticket, scale) {
  const baseStyle = `
    position:absolute;
    left:${object.x * scale}mm;
    top:${object.y * scale}mm;
  `;

  if (object.type === "image") {
    return `
      <img
        src="${escapeHtml(object.src)}"
        alt=""
        style="${baseStyle}width:${(object.width || 80) * scale}mm;height:${(object.height || 80) * scale}mm;object-fit:contain;"
      >
    `;
  }

  if (object.type === "line") {
    const [x1 = 0, y1 = 0, x2 = 120, y2 = 0] = object.points || [];
    const width = Math.max(1, Math.abs(x2 - x1)) * scale;
    const height = Math.max(1, Math.abs(y2 - y1)) * scale;
    const isVertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);

    return `
      <div
        style="${baseStyle}width:${isVertical ? (object.strokeWidth || 2) * 0.22 : width}mm;height:${isVertical ? height : (object.strokeWidth || 2) * 0.22}mm;border-top:${isVertical ? 0 : (object.strokeWidth || 2) * 0.22}mm ${object.dash ? "dashed" : "solid"} ${escapeHtml(object.stroke || "#111827")};border-left:${isVertical ? (object.strokeWidth || 2) * 0.22 : 0}mm ${object.dash ? "dashed" : "solid"} ${escapeHtml(object.stroke || "#111827")};transform:rotate(${Number(object.rotation || 0)}deg);transform-origin:0 0;"
      ></div>
    `;
  }

  const text = object.type === "number" ? ticket.label : object.text;
  const textPrintStyle = getTextPrintStyle(object, scale);

  return `
    <div
      style="${baseStyle}width:${(object.width || 220) * scale}mm;color:${escapeHtml(object.fill || "#111827")};font-family:${escapeHtml(textPrintStyle.fontFamily)};font-size:${(object.fontSize || 24) * scale * 0.72}mm;font-weight:${object.fontVariant === "bold" ? "800" : "400"};font-style:${object.fontStyle === "italic" ? "italic" : "normal"};text-align:${escapeHtml(object.align || "left")};line-height:1.05;-webkit-text-stroke:${escapeHtml(textPrintStyle.stroke)};paint-order:stroke fill;text-shadow:${escapeHtml(textPrintStyle.textShadow)};"
    >${escapeHtml(text)}</div>
  `;
}

function renderTicket(template, ticket) {
  const scale = (template.canvas.widthCm * 10) / template.canvas.width;

  return `
    <article class="print-ticket" style="width:${template.canvas.widthCm * 10}mm;height:${template.canvas.heightCm * 10}mm;background-color:${escapeHtml(template.canvas.backgroundColor || "#ffffff")};">
      ${template.canvas.objects.map((object) => renderCanvasObject(object, ticket, scale)).join("")}
    </article>
  `;
}

function renderPage(tickets, template, layout) {
  return `
    <section class="print-page" style="grid-template-columns:repeat(${layout.columns}, ${layout.ticketWidthMm}mm);grid-auto-rows:${layout.ticketHeightMm}mm;">
      ${tickets.map((ticket) => renderTicket(template, ticket)).join("")}
    </section>
  `;
}

function buildTicketsPrintHtml({ template, quantity, startNumber, autoPrint = true }) {
  const currentTemplate = normalizeTemplate(template);
  const tickets = createTicketNumbers(startNumber, quantity, currentTemplate.numberingDigits);
  const perPage = Math.max(1, Number(currentTemplate.ticketsPerPage) || 4);
  const layout = resolvePrintLayout(currentTemplate, perPage);
  const pages = [];

  for (let index = 0; index < tickets.length; index += perPage) {
    pages.push(tickets.slice(index, index + perPage));
  }

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(currentTemplate.name)} - tickets</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #050816; font-family: Arial, sans-serif; background: #fff; }
          .print-page {
            break-after: page;
            width: ${pageWidthMm}mm;
            min-height: ${pageHeightMm}mm;
            display: grid;
            gap: ${ticketGapMm}mm;
            align-content: start;
            justify-content: start;
          }
          .print-page:last-child { break-after: auto; }
          .print-ticket {
            position: relative;
            border: 1px dashed #111;
            background:
              linear-gradient(#d8d8d8 1px, transparent 1px) 0 0 / 100% 10mm,
              linear-gradient(90deg, #ededed 1px, transparent 1px) 0 0 / 18mm 100%,
              #fff;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        ${pages.map((page) => renderPage(page, currentTemplate, layout)).join("")}
        ${
          autoPrint
            ? `<script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>`
            : ""
        }
      </body>
    </html>
  `;
}

export function createTicketPrintChunks({ quantity, startNumber, ticketsPerFile = defaultTicketsPerFile }) {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const safeStartNumber = Math.max(1, Number(startNumber) || 1);
  const safeTicketsPerFile = Math.max(1, Number(ticketsPerFile) || defaultTicketsPerFile);
  const chunks = [];

  for (let offset = 0; offset < safeQuantity; offset += safeTicketsPerFile) {
    const chunkQuantity = Math.min(safeTicketsPerFile, safeQuantity - offset);
    const chunkStart = safeStartNumber + offset;

    chunks.push({
      index: chunks.length + 1,
      quantity: chunkQuantity,
      startNumber: chunkStart,
      endNumber: chunkStart + chunkQuantity - 1,
    });
  }

  return chunks;
}

export function openTicketsPrintWindow({ printableWindow, template, quantity, startNumber }) {
  const printable = printableWindow || window.open("", "_blank");

  if (!printable) {
    throw new Error("La fenêtre d'impression a été bloquée par le navigateur.");
  }

  printable.document.write(buildTicketsPrintHtml({ template, quantity, startNumber }));
  printable.document.close();
}

export function openTicketsPrintCenter({ printableWindow, template, quantity, startNumber, ticketsPerFile }) {
  const printable = printableWindow || window.open("", "_blank");

  if (!printable) {
    throw new Error("La fenêtre d'impression a été bloquée par le navigateur.");
  }

  const currentTemplate = normalizeTemplate(template);
  const chunks = createTicketPrintChunks({ quantity, startNumber, ticketsPerFile });
  const serializedTemplate = JSON.stringify(currentTemplate).replaceAll("<", "\\u003c");
  const serializedChunks = JSON.stringify(chunks).replaceAll("<", "\\u003c");

  printable.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(currentTemplate.name)} - génération par fichiers</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #050816;
            font-family: Arial, sans-serif;
            background: #f5f8fb;
          }
          main {
            max-width: 920px;
            margin: 0 auto;
            padding: 34px 22px;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 30px;
          }
          p {
            margin: 0 0 22px;
            color: #53627a;
            line-height: 1.5;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 22px;
          }
          .summary div,
          .chunk {
            border: 1px solid #dbe3ee;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
          }
          .summary div {
            padding: 16px;
          }
          span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          strong {
            display: block;
            margin-top: 5px;
            font-size: 22px;
          }
          .chunks {
            display: grid;
            gap: 12px;
          }
          .chunk {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 16px;
          }
          button {
            min-height: 42px;
            border: 0;
            border-radius: 999px;
            padding: 0 18px;
            color: #fff;
            background: linear-gradient(135deg, #0f5f7c, #118977);
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          }
          button:disabled {
            opacity: 0.55;
            cursor: wait;
          }
          @media (max-width: 720px) {
            .summary {
              grid-template-columns: 1fr;
            }
            .chunk {
              align-items: stretch;
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Generation par fichiers PDF</h1>
          <p>Chaque bouton ouvre uniquement la plage indiquée. Imprime ou enregistre le PDF, puis passe au fichier suivant.</p>
          <section class="summary">
            <div><span>Total</span><strong>${Number(quantity)} tickets</strong></div>
            <div><span>Fichiers</span><strong>${chunks.length}</strong></div>
            <div><span>Modèle</span><strong>${escapeHtml(currentTemplate.name)}</strong></div>
          </section>
          <section class="chunks">
            ${chunks
              .map(
                (chunk) => `
                  <article class="chunk">
                    <div>
                      <span>Fichier ${chunk.index}</span>
                      <strong>N°${String(chunk.startNumber).padStart(currentTemplate.numberingDigits, "0")} a N°${String(chunk.endNumber).padStart(currentTemplate.numberingDigits, "0")}</strong>
                      <p>${chunk.quantity} tickets</p>
                    </div>
                    <button data-index="${chunk.index - 1}">Ouvrir ce PDF</button>
                  </article>
                `
              )
              .join("")}
          </section>
        </main>
        <script>
          const template = ${serializedTemplate};
          const chunks = ${serializedChunks};
          const pageWidthMm = ${pageWidthMm};
          const pageHeightMm = ${pageHeightMm};
          const ticketGapMm = ${ticketGapMm};

          function escapeHtml(value) {
            return String(value ?? "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#039;");
          }

          function formatTicketNumber(value, digits) {
            return "N°" + String(value).padStart(Number(digits) || 4, "0");
          }

          function createTicketNumbers(startNumber, quantity, digits) {
            return Array.from({ length: Number(quantity) || 0 }, (_, index) => {
              const value = Number(startNumber) + index;
              return { value, label: formatTicketNumber(value, digits) };
            });
          }

          function resolvePrintLayout(perPage) {
            const ticketWidthMm = template.canvas.widthCm * 10;
            const ticketHeightMm = template.canvas.heightCm * 10;
            const maxColumns = Math.max(1, Math.floor((pageWidthMm + ticketGapMm) / (ticketWidthMm + ticketGapMm)));
            let columns = Math.min(perPage, maxColumns);

            while (columns > 1) {
              const rows = Math.ceil(perPage / columns);
              const totalHeight = rows * ticketHeightMm + Math.max(0, rows - 1) * ticketGapMm;
              if (totalHeight <= pageHeightMm) break;
              columns -= 1;
            }

            return { columns, ticketHeightMm, ticketWidthMm };
          }

          function renderCanvasObject(object, ticket, scale) {
            const baseStyle = "position:absolute;left:" + object.x * scale + "mm;top:" + object.y * scale + "mm;";

            if (object.type === "image") {
              return '<img src="' + escapeHtml(object.src) + '" alt="" style="' + baseStyle + "width:" + (object.width || 80) * scale + "mm;height:" + (object.height || 80) * scale + 'mm;object-fit:contain;">';
            }

            if (object.type === "line") {
              const points = object.points || [0, 0, 120, 0];
              const width = Math.max(1, Math.abs(points[2] - points[0])) * scale;
              const height = Math.max(1, Math.abs(points[3] - points[1])) * scale;
              const isVertical = Math.abs(points[3] - points[1]) > Math.abs(points[2] - points[0]);
              const strokeSize = (object.strokeWidth || 2) * 0.22;
              const style = baseStyle +
                "width:" + (isVertical ? strokeSize : width) + "mm;" +
                "height:" + (isVertical ? height : strokeSize) + "mm;" +
                "border-top:" + (isVertical ? 0 : strokeSize) + "mm " + (object.dash ? "dashed" : "solid") + " " + escapeHtml(object.stroke || "#111827") + ";" +
                "border-left:" + (isVertical ? strokeSize : 0) + "mm " + (object.dash ? "dashed" : "solid") + " " + escapeHtml(object.stroke || "#111827") + ";" +
                "transform:rotate(" + Number(object.rotation || 0) + "deg);transform-origin:0 0;";
              return '<div style="' + style + '"></div>';
            }

            const text = object.type === "number" ? ticket.label : object.text;
            const rawShadowBlur = Number(object.shadowBlur || 0);
            const hasManualHalo = rawShadowBlur > 0 && Boolean(object.shadowColor);
            const shadowOpacity = hasManualHalo && Number(object.shadowOpacity || 0) <= 0 ? 0.85 : Number(object.shadowOpacity || 0);
            const shadowBlur = rawShadowBlur * scale * 0.28;
            const shadowOffsetX = Number(object.shadowOffsetX || 0) * scale * 0.28;
            const shadowOffsetY = Number(object.shadowOffsetY || 0) * scale * 0.28;
            const strokeWidth = Number(object.strokeWidth || 0) * scale * 0.22;
            const textStroke = object.stroke && strokeWidth ? strokeWidth + "mm " + object.stroke : "";
            const textShadow = shadowOpacity > 0 ? shadowOffsetX + "mm " + shadowOffsetY + "mm " + shadowBlur + "mm " + (object.shadowColor || "transparent") : "";
            const style = baseStyle +
              "width:" + (object.width || 220) * scale + "mm;" +
              "color:" + escapeHtml(object.fill || "#111827") + ";" +
              "font-family:" + escapeHtml(object.fontFamily || "Inter, Arial, sans-serif") + ";" +
              "font-size:" + (object.fontSize || 24) * scale * 0.72 + "mm;" +
              "font-weight:" + (object.fontVariant === "bold" ? "800" : "400") + ";" +
              "font-style:" + (object.fontStyle === "italic" ? "italic" : "normal") + ";" +
              "text-align:" + escapeHtml(object.align || "left") + ";line-height:1.05;" +
              "-webkit-text-stroke:" + escapeHtml(textStroke) + ";paint-order:stroke fill;text-shadow:" + escapeHtml(textShadow) + ";";
            return '<div style="' + style + '">' + escapeHtml(text) + '</div>';
          }

          function renderTicket(ticket) {
            const scale = (template.canvas.widthCm * 10) / template.canvas.width;
            return '<article class="print-ticket" style="width:' + template.canvas.widthCm * 10 + "mm;height:" + template.canvas.heightCm * 10 + "mm;background-color:" + escapeHtml(template.canvas.backgroundColor || "#ffffff") + ';">' +
              template.canvas.objects.map((object) => renderCanvasObject(object, ticket, scale)).join("") +
              "</article>";
          }

          function renderPage(tickets, layout) {
            return '<section class="print-page" style="grid-template-columns:repeat(' + layout.columns + ", " + layout.ticketWidthMm + "mm);grid-auto-rows:" + layout.ticketHeightMm + 'mm;">' +
              tickets.map(renderTicket).join("") +
              "</section>";
          }

          function buildPrintHtml(chunk) {
            const tickets = createTicketNumbers(chunk.startNumber, chunk.quantity, template.numberingDigits);
            const perPage = Math.max(1, Number(template.ticketsPerPage) || 4);
            const layout = resolvePrintLayout(perPage);
            const pages = [];

            for (let index = 0; index < tickets.length; index += perPage) {
              pages.push(tickets.slice(index, index + perPage));
            }

            return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' +
              escapeHtml(template.name) + " - N°" + String(chunk.startNumber).padStart(template.numberingDigits, "0") + "-N°" + String(chunk.endNumber).padStart(template.numberingDigits, "0") +
              '</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;color:#050816;font-family:Arial,sans-serif;background:#fff}.print-page{break-after:page;width:' + pageWidthMm + "mm;min-height:" + pageHeightMm + "mm;display:grid;gap:" + ticketGapMm + "mm;align-content:start;justify-content:start}.print-page:last-child{break-after:auto}.print-ticket{position:relative;border:1px dashed #111;background:linear-gradient(#d8d8d8 1px,transparent 1px) 0 0/100% 10mm,linear-gradient(90deg,#ededed 1px,transparent 1px) 0 0/18mm 100%,#fff;overflow:hidden}</style></head><body>" +
              pages.map((page) => renderPage(page, layout)).join("") +
              '<script>window.addEventListener("load",()=>{window.focus();window.print();});<' + "/script></body></html>";
          }

          function printChunk(index, button) {
            const chunk = chunks[index];
            const printWindow = window.open("", "_blank");
            if (!printWindow) {
              alert("La fenêtre d'impression a été bloquée par le navigateur.");
              return;
            }

            button.disabled = true;
            button.textContent = "Ouverture...";
            printWindow.document.write(buildPrintHtml(chunk));
            printWindow.document.close();
            window.setTimeout(() => {
              button.disabled = false;
              button.textContent = "Ouvrir ce PDF";
            }, 1200);
          }

          document.querySelectorAll("button[data-index]").forEach((button) => {
            button.addEventListener("click", () => printChunk(Number(button.dataset.index), button));
          });
        </script>
      </body>
    </html>
  `);
  printable.document.close();
}
