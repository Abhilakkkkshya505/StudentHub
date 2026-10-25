/**
 * StudentHub — High-Quality PDF Generator
 * Converts TEAM-WALKTHROUGH.md into an executive, publication-grade PDF report
 * using native Chrome headless rendering and print CSS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const MD_PATH = path.join(PROJECT_ROOT, 'TEAM-WALKTHROUGH.md');
const HTML_OUTPUT = path.join(PROJECT_ROOT, 'TEAM-WALKTHROUGH.html');
const PDF_OUTPUT = path.join(PROJECT_ROOT, 'TEAM-WALKTHROUGH.pdf');
const PDF_SUBDIR_OUTPUT = path.join(PROJECT_ROOT, 'studenthub', 'TEAM-WALKTHROUGH.pdf');

console.log('1. Reading TEAM-WALKTHROUGH.md...');
let mdContent = fs.readFileSync(MD_PATH, 'utf-8');

// Convert LaTeX mathematical notations into clean, beautifully styled mathematical HTML
function formatMathInMarkdown(content) {
  // Replace display math $$ ... $$
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    let clean = formula.trim()
      .replace(/\\lceil\s*/g, '⌈')
      .replace(/\\rceil\s*/g, '⌉')
      .replace(/\\lfloor\s*/g, '⌊')
      .replace(/\\rfloor\s*/g, '⌋')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\ge/g, '≥')
      .replace(/\\le/g, '≤')
      .replace(/\\cdot/g, '·')
      .replace(/\\Delta\s*/g, 'Δ')
      .replace(/\\pmod\{([^}]+)\}/g, 'mod $1')
      .replace(/\\sum/g, '∑')
      .replace(/\\times/g, '×');
    return `<div class="math-block"><span class="math-formula">${clean}</span></div>`;
  });

  // Replace inline math $ ... $
  content = content.replace(/\$([^\$\n]+)\$/g, (match, formula) => {
    let clean = formula.trim()
      .replace(/\\lceil\s*/g, '⌈')
      .replace(/\\rceil\s*/g, '⌉')
      .replace(/\\lfloor\s*/g, '⌊')
      .replace(/\\rfloor\s*/g, '⌋')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\ge/g, '≥')
      .replace(/\\le/g, '≤')
      .replace(/\\cdot/g, '·')
      .replace(/\\Delta\s*/g, 'Δ')
      .replace(/\\pmod\{([^}]+)\}/g, 'mod $1')
      .replace(/\\times/g, '×');
    return `<span class="math-inline">${clean}</span>`;
  });

  return content;
}

const preparedMd = formatMathInMarkdown(mdContent);
const tempMdPath = path.join(PROJECT_ROOT, 'temp_prepared.md');
fs.writeFileSync(tempMdPath, preparedMd, 'utf-8');

console.log('2. Converting Markdown to HTML via marked...');
const markedHtmlPath = path.join(PROJECT_ROOT, 'temp_marked.html');
execSync(`npx -y marked -i "${tempMdPath}" -o "${markedHtmlPath}"`);
const rawHtml = fs.readFileSync(markedHtmlPath, 'utf-8');

console.log('3. Assembling publication-grade HTML report layout...');
const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudentHub — Architecture & Team Walkthrough Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Document Header Banner */
    .report-cover {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 10px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(49, 46, 129, 0.15);
      page-break-inside: avoid;
    }

    .report-cover h1 {
      font-family: 'Poppins', sans-serif;
      font-size: 20pt;
      font-weight: 800;
      color: #ffffff !important;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }

    .report-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 9pt;
      color: #c7d2fe;
      margin-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 10px;
    }

    .report-meta-item strong {
      color: #ffffff;
    }

    /* Headings */
    h1, h2, h3, h4, h5 {
      font-family: 'Poppins', sans-serif;
      color: #0f172a;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 {
      font-size: 16pt;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
    }

    h2 {
      font-size: 13pt;
      border-bottom: 1.5px solid #f1f5f9;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
      color: #312e81;
    }

    h3 {
      font-size: 11pt;
      margin-top: 16px;
      margin-bottom: 6px;
      color: #1e293b;
    }

    h4 {
      font-size: 10pt;
      margin-top: 12px;
      margin-bottom: 4px;
      color: #475569;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
    }

    /* Blockquotes & Callouts */
    blockquote {
      margin: 14px 0;
      padding: 10px 14px;
      background-color: #f8fafc;
      border-left: 4px solid #4f46e5;
      color: #334155;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 9.5pt;
    }

    blockquote p {
      margin: 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 8.8pt;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #ffffff;
    }

    th, td {
      padding: 7px 9px;
      text-align: left;
      vertical-align: top;
      border: 1px solid #cbd5e1;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
      font-size: 8.5pt;
      letter-spacing: 0.3px;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* Code blocks */
    pre {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      padding: 12px 14px;
      border-radius: 6px;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 8.2pt;
      line-height: 1.45;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 12px 0;
      border: 1px solid #1e293b;
    }

    code {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 8.5pt;
      color: #4338ca;
      background-color: #e0e7ff;
      padding: 1px 4px;
      border-radius: 4px;
    }

    pre code {
      background: transparent !important;
      color: #e2e8f0 !important;
      padding: 0;
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: 10px;
      padding-left: 22px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Mathematics styling */
    .math-block {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 8px 14px;
      margin: 10px 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .math-formula {
      font-family: 'Fira Code', monospace;
      font-size: 10pt;
      font-weight: 600;
      color: #312e81;
    }

    .math-inline {
      font-family: 'Fira Code', monospace;
      font-size: 8.8pt;
      font-weight: 600;
      color: #3730a3;
      background: #eef2ff;
      padding: 1px 4px;
      border-radius: 4px;
    }

    /* Section Horizontal Rules */
    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }

    /* Avoid breaks inside specific list or card sections */
    li > strong {
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="report-cover">
    <h1>🎓 StudentHub — Engineering Report</h1>
    <p style="margin: 0; font-size: 10.5pt; color: #e0e7ff;">
      Complete Codebase Architecture, Mathematical Algorithms & Team Presentation Guide
    </p>
    <div class="report-meta">
      <div class="report-meta-item"><strong>Course:</strong> 1st Year B.Tech Web Development</div>
      <div class="report-meta-item"><strong>Platform:</strong> StudentHub (Offline-First)</div>
      <div class="report-meta-item"><strong>Stack:</strong> Semantic HTML5, Vanilla CSS3, JavaScript ES6+</div>
      <div class="report-meta-item"><strong>Storage:</strong> HTML5 localStorage + Native Node.js Server</div>
    </div>
  </div>

  <div class="report-body">
    ${rawHtml}
  </div>
</body>
</html>`;

fs.writeFileSync(HTML_OUTPUT, styledHtml, 'utf-8');
console.log(`Saved styled HTML to ${HTML_OUTPUT}`);

// Clean up temporary files
if (fs.existsSync(tempMdPath)) fs.unlinkSync(tempMdPath);
if (fs.existsSync(markedHtmlPath)) fs.unlinkSync(markedHtmlPath);

console.log('4. Launching Chrome headless to render publication PDF...');
const { spawnSync } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.env.TEMP || 'C:\\temp', 'chrome_pdf_render_profile');

const chromeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-pdf-header-footer',
  `--user-data-dir=${userDataDir}`,
  `--print-to-pdf=${PDF_OUTPUT}`,
  HTML_OUTPUT
];

const result = spawnSync(chromePath, chromeArgs, { stdio: 'inherit' });
if (result.error) {
  console.error('Chrome spawn error:', result.error);
}

if (fs.existsSync(PDF_OUTPUT)) {
  const stats = fs.statSync(PDF_OUTPUT);
  console.log(`✅ Success! Generated PDF: ${PDF_OUTPUT} (${Math.round(stats.size / 1024)} KB)`);

  // Also copy to studenthub directory
  fs.copyFileSync(PDF_OUTPUT, PDF_SUBDIR_OUTPUT);
  console.log(`✅ Copied to: ${PDF_SUBDIR_OUTPUT}`);
} else {
  console.error('❌ Failed to generate PDF.');
  process.exit(1);
}
