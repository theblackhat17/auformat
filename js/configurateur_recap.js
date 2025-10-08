window.addEventListener("DOMContentLoaded", () => {
  const config = JSON.parse(localStorage.getItem('clientConfig'));
  const recapList = document.getElementById('recap-list');

  if (!config) {
    recapList.innerHTML = "<li>Aucune configuration trouvée.</li>";
    return;
  }

  recapList.innerHTML = `
    <li><strong>Matériau :</strong> ${config.material}</li>
    <li><strong>Finition :</strong> ${config.finish}</li>
    <li><strong>Forme :</strong> ${config.shape}</li>
    <li><strong>Épaisseur :</strong> ${config.thickness} mm</li>
    <li><strong>Dimensions :</strong> ${config.length} x ${config.width} mm</li>
    <li><strong>Quantité :</strong> ${config.quantity}</li>
    <li><strong>Prix total :</strong> ${config.totalPrice}</li>
  `;

  // Création d’un mini schéma
  const canvas = document.getElementById('recap-schema');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#D4A574';
  ctx.fillRect(50, 50, 300, 150);
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, 300, 150);

  // Bouton PDF
  document.getElementById('downloadPDF').addEventListener('click', () => generatePDF(config, canvas));
});

async function generatePDF(config, canvas) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  pdf.setFont("helvetica", "normal");
  pdf.setFillColor(44, 95, 45);
  pdf.rect(0, 0, 210, 25, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text("Devis - Au Format", 15, 15);

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.text("Résumé de votre configuration :", 15, 35);

  let y = 45;
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object') continue;
    pdf.text(`${key} : ${value}`, 15, y);
    y += 8;
  }

  // Image du schéma
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 15, y + 10, 180, 100);

  pdf.save("devis_auformat.pdf");
}
