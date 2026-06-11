import PDFDocument from 'pdfkit';
import type { Quote } from '@/lib/types';

/**
 * Génération du PDF officiel de devis (pdfkit, sans navigateur headless).
 * Page 1 : en-tête Au Format, infos client, lignes, totaux. Page 2 : conditions.
 */

const VERT = '#2C5F2D';
const NOIR = '#2B2B2B';
const GRIS = '#777777';

const ATELIER = {
  nom: 'Au Format',
  tagline: 'Agencement & menuiserie sur mesure',
  adresse1: '88 Imp. de la Briqueterie, 59830 Cysoing',
  adresse2: '1056 Rue de Montreuil, 62170 La Calotterie',
  tel: '07 88 91 60 68',
  email: 'contact@auformat.fr',
  site: 'auformat.com',
};

const CONDITIONS = [
  ['Validité', "Le présent devis est valable 30 jours à compter de sa date d'émission, sauf mention contraire."],
  ['Commande', "La commande devient ferme à réception du devis signé avec la mention « bon pour accord », accompagné d'un acompte de 30 % du montant TTC."],
  ['Délais', "Les délais de fabrication et de pose sont communiqués à la commande et s'entendent à titre indicatif. Ils courent à compter de la validation des plans et de l'encaissement de l'acompte."],
  ['Prise de mesures', "Les dimensions du présent devis sont établies à partir des éléments fournis par le client. Une prise de mesures sur site par l'atelier est réalisée avant fabrication et peut faire l'objet d'un avenant."],
  ['Paiement', 'Solde à la livraison/pose. Paiement par virement bancaire, chèque ou espèces. Échéancier possible pour les projets importants.'],
  ['Garantie', "Travaux garantis 2 ans, pièces et main-d'œuvre, dans le cadre d'une utilisation normale. Garanties légales de conformité et des vices cachés applicables."],
  ['Matériaux', 'Le bois est un matériau vivant : variations de teinte et de veinage possibles par rapport aux échantillons et visuels.'],
  ['Rétractation', "Pour les contrats conclus hors établissement, le client particulier dispose d'un délai de rétractation de 14 jours (art. L221-18 du Code de la consommation), sauf travaux sur mesure expressément commandés."],
  ['CGV', `Les conditions générales de vente complètes sont disponibles sur ${ATELIER.site}/cgv et fournies sur demande.`],
];

const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function generateQuotePdf(quote: Quote): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Devis ${quote.quoteNumber} — Au Format` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // largeur utile

    /* ── En-tête ── */
    doc.fillColor(VERT).font('Helvetica-Bold').fontSize(24).text(ATELIER.nom, 50, 50);
    doc.fillColor(GRIS).font('Helvetica').fontSize(9).text(ATELIER.tagline, 50, 78);
    doc.text(`${ATELIER.adresse1}  ·  ${ATELIER.adresse2}`, 50, 92);
    doc.text(`${ATELIER.tel}  ·  ${ATELIER.email}  ·  ${ATELIER.site}`, 50, 104);

    doc.fillColor(NOIR).font('Helvetica-Bold').fontSize(16).text(`DEVIS ${quote.quoteNumber}`, 50, 50, { width: W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GRIS);
    doc.text(`Émis le ${new Date(quote.sentAt || quote.updatedAt || quote.createdAt).toLocaleDateString('fr-FR')}`, 50, 72, { width: W, align: 'right' });
    const validite = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('fr-FR')
      : new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('fr-FR');
    doc.text(`Valable jusqu'au ${validite}`, 50, 85, { width: W, align: 'right' });

    doc.moveTo(50, 125).lineTo(545, 125).strokeColor(VERT).lineWidth(2).stroke();

    /* ── Client + objet ── */
    let y = 142;
    doc.fillColor(GRIS).fontSize(8).text('CLIENT', 50, y);
    doc.fillColor(NOIR).font('Helvetica-Bold').fontSize(11).text(quote.clientName || 'Client', 50, y + 12);
    doc.font('Helvetica').fontSize(9).fillColor(NOIR);
    if (quote.clientEmail) doc.text(quote.clientEmail, 50, y + 27);
    if (quote.clientPhone) doc.text(quote.clientPhone, 50, y + 39);

    doc.fillColor(GRIS).fontSize(8).text('OBJET', 320, y);
    doc.fillColor(NOIR).font('Helvetica-Bold').fontSize(11).text(quote.title || 'Agencement sur mesure', 320, y + 12, { width: 225 });

    y = 215;

    /* ── Tableau des lignes ── */
    const col = { desc: 50, qty: 380, pu: 425, total: 485 };
    doc.rect(50, y, W, 20).fill(VERT);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('Désignation', col.desc + 6, y + 6);
    doc.text('Qté', col.qty, y + 6, { width: 35, align: 'center' });
    doc.text('PU HT', col.pu, y + 6, { width: 50, align: 'right' });
    doc.text('Total HT', col.total, y + 6, { width: 60, align: 'right' });
    y += 26;

    doc.font('Helvetica').fontSize(9).fillColor(NOIR);
    for (const item of quote.items || []) {
      const descH = doc.heightOfString(item.description, { width: col.qty - col.desc - 12 });
      const rowH = Math.max(descH, 11) + 8;
      if (y + rowH > 760) {
        doc.addPage();
        y = 60;
      }
      doc.fillColor(NOIR).text(item.description, col.desc + 6, y, { width: col.qty - col.desc - 12 });
      doc.text(String(item.quantity), col.qty, y, { width: 35, align: 'center' });
      doc.text(eur(item.unitPrice), col.pu, y, { width: 50, align: 'right' });
      doc.text(eur(item.total), col.total, y, { width: 60, align: 'right' });
      y += rowH;
      doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor('#e5e0d5').lineWidth(0.5).stroke();
    }

    /* ── Totaux ── */
    if (y > 680) { doc.addPage(); y = 60; }
    y += 10;
    doc.font('Helvetica').fontSize(10).fillColor(NOIR);
    doc.text('Total HT', 380, y, { width: 100, align: 'right' });
    doc.text(eur(quote.subtotalHt), 485, y, { width: 60, align: 'right' });
    y += 16;
    doc.text(`TVA ${Math.round((quote.taxRate ?? 20))} %`, 380, y, { width: 100, align: 'right' });
    doc.text(eur(quote.taxAmount), 485, y, { width: 60, align: 'right' });
    y += 18;
    doc.rect(360, y - 4, 185, 24).fill('#F5F1E8');
    doc.fillColor(VERT).font('Helvetica-Bold').fontSize(12);
    doc.text('Total TTC', 370, y + 2, { width: 110, align: 'right' });
    doc.text(eur(quote.totalTtc), 485, y + 2, { width: 60, align: 'right' });

    /* ── Bon pour accord ── */
    y += 50;
    if (y > 660) { doc.addPage(); y = 60; }
    doc.rect(50, y, W, 80).strokeColor('#cfc8b8').lineWidth(1).stroke();
    doc.fillColor(NOIR).font('Helvetica-Bold').fontSize(10).text('Bon pour accord', 60, y + 10);
    doc.font('Helvetica').fontSize(8).fillColor(GRIS);
    doc.text('Date :', 60, y + 30);
    doc.text('Signature (précédée de la mention « bon pour accord ») :', 60, y + 48);
    doc.text(`Acompte de 30 % à la commande : ${eur(Math.round(quote.totalTtc * 0.3 * 100) / 100)}`, 320, y + 30, { width: 215 });

    /* ── Page conditions ── */
    doc.addPage();
    doc.fillColor(VERT).font('Helvetica-Bold').fontSize(14).text('Conditions du devis', 50, 50);
    let cy = 80;
    for (const [titre, texte] of CONDITIONS) {
      doc.fillColor(NOIR).font('Helvetica-Bold').fontSize(9).text(titre, 50, cy);
      const h = doc.heightOfString(texte, { width: W - 110 });
      doc.font('Helvetica').fontSize(9).fillColor('#444444').text(texte, 160, cy, { width: W - 110 });
      cy += Math.max(h, 11) + 10;
    }
    doc.fillColor(GRIS).fontSize(7).text(
      `${ATELIER.nom} — ${ATELIER.adresse1} — ${ATELIER.tel} — ${ATELIER.email}. Document généré le ${new Date().toLocaleDateString('fr-FR')}.`,
      50, 790, { width: W, align: 'center' }
    );

    doc.end();
  });
}
