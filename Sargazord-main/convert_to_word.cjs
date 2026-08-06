const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '../documentacion_tesis_sargazo.md');
const docPath = path.join(__dirname, '../documentacion_tesis_sargazo.doc');

if (!fs.existsSync(mdPath)) {
  console.error("No se encontró el archivo markdown.");
  process.exit(1);
}

let md = fs.readFileSync(mdPath, 'utf8');

// Reemplazar notación matemática simple para Word HTML
md = md.replace(/\$H_2S\$/g, 'H<sub>2</sub>S');
md = md.replace(/\$NH_3\$/g, 'NH<sub>3</sub>');
md = md.replace(/\$\\text\{PO\}_4\$/g, 'PO<sub>4</sub>');
md = md.replace(/\$\\text\{SST\\_anomalía\}\$/g, 'SST Anomalía');
md = md.replace(/\$U_o\$/g, 'U<sub>o</sub>');
md = md.replace(/\$V_o\$/g, 'V<sub>o</sub>');

// Reemplazar fórmulas de bloque
md = md.replace(/\$\$z = -2\.2470 \+ 0\.2751 \\cdot \\text\{sst\\_anom\}_\{\\text\{scaled\}\} \+ 2\.3539 \\cdot \\text\{salinidad\}_\{\\text\{scaled\}\} - 1\.5732 \\cdot \\text\{po4\}_\{\\text\{scaled\}\} \+ 0\.5788 \\cdot \\text\{fe\}_\{\\text\{scaled\}\} \+ 1\.7560 \\cdot \\text\{uo\}_\{\\text\{scaled\}\} \+ 0\.5574 \\cdot \\text\{vo\}_\{\\text\{scaled\}\}\$\$/g,
  '<p class="equation">z = -2.2470 + 0.2751 &bull; sst_anom<sub>scaled</sub> + 2.3539 &bull; salinity<sub>scaled</sub> - 1.5732 &bull; po4<sub>scaled</sub> + 0.5788 &bull; fe<sub>scaled</sub> + 1.7560 &bull; uo<sub>scaled</sub> + 0.5574 &bull; vo<sub>scaled</sub></p>');

md = md.replace(/\$\$\\text\{Probabilidad de Arribazón\} \(p\) = \\frac\{1\}\{1 \+ e\^\{-z\}\}\$\$/g,
  '<p class="equation">Probabilidad de Arribazón (p) = 1 / (1 + e<sup>-z</sup>)</p>');

// Convertir Markdown a HTML básico
let lines = md.split('\n');
let html = '';
let inList = false;
let inMermaid = false;

for (let line of lines) {
  let trimmed = line.trim();
  
  // Ignorar bloques Mermaid en Word
  if (trimmed.startsWith('```mermaid')) {
    inMermaid = true;
    html += '<p style="color: #666; font-style: italic;">[Diagrama de Flujo del Proceso]</p>';
    continue;
  }
  if (inMermaid && trimmed.startsWith('```')) {
    inMermaid = false;
    continue;
  }
  if (inMermaid) {
    continue;
  }

  // Cerrar lista si no empieza con asterisco
  if (inList && !trimmed.startsWith('*') && trimmed !== '') {
    html += '</ul>\n';
    inList = false;
  }

  // Encabezados
  if (trimmed.startsWith('# ')) {
    html += `<h1>${trimmed.substring(2)}</h1>\n`;
  } else if (trimmed.startsWith('## ')) {
    html += `<h2>${trimmed.substring(3)}</h2>\n`;
  } else if (trimmed.startsWith('### ')) {
    html += `<h3>${trimmed.substring(4)}</h3>\n`;
  } 
  // Listas
  else if (trimmed.startsWith('* ')) {
    if (!inList) {
      html += '<ul>\n';
      inList = true;
    }
    // Formatear negritas dentro de la lista
    let itemText = trimmed.substring(2);
    itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html += `  <li>${itemText}</li>\n`;
  } 
  // Líneas horizontales
  else if (trimmed === '---') {
    html += '<hr />\n';
  } 
  // Párrafos y texto normal
  else if (trimmed !== '') {
    if (trimmed.startsWith('<p') || trimmed.startsWith('<div')) {
      html += trimmed + '\n';
    } else {
      let para = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      para = para.replace(/\[(.*?)\]\(file:\/\/\/(.*?)\)/g, '<strong>$1</strong>');
      html += `<p>${para}</p>\n`;
    }
  }
}

if (inList) {
  html += '</ul>\n';
}

const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Documentación Tesis</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 40px;
    }
    h1 {
      font-family: 'Garamond', 'Georgia', serif;
      color: #1b365d;
      font-size: 24pt;
      border-bottom: 2px solid #1b365d;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    h2 {
      font-family: 'Garamond', 'Georgia', serif;
      color: #2e5b88;
      font-size: 18pt;
      margin-top: 25px;
    }
    h3 {
      font-family: 'Calibri', sans-serif;
      color: #555555;
      font-size: 14pt;
      margin-top: 20px;
    }
    p {
      font-size: 11pt;
      text-align: justify;
      margin-bottom: 12px;
    }
    ul {
      margin-bottom: 12px;
    }
    li {
      font-size: 11pt;
      margin-bottom: 6px;
    }
    .equation {
      background-color: #f5f7fa;
      border-left: 4px solid #1b365d;
      padding: 10px 15px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-weight: bold;
      text-align: center;
      margin: 20px auto;
      max-width: 90%;
    }
    hr {
      border: 0;
      border-top: 1px solid #dddddd;
      margin: 35px 0;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
`;

fs.writeFileSync(docPath, template, 'utf8');
console.log(`Documento Word (HTML .doc) creado exitosamente en: ${docPath}`);
