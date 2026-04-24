function printHtml(htmlContent: string, title: string) {
  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print { .no-print { display: none; } }
          body { font-family: system-ui, sans-serif; padding: 20px; }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `);
  
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}
