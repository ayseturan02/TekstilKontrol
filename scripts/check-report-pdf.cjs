const fs=require('node:fs/promises');
const {renderReportPdf}=require('../server/pdf');
const {createInitial}=require('../shared/reportTemplate');
(async()=>{
 const report=createInitial();Object.assign(report,{customer:'PDF Kontrol - \u0130nternet Tekstil',manufacturer:'\u0130malat\u00e7\u0131',controller:'Kontrolc\u00fc',notes:'T\u00fcrk\u00e7e kontrol: \u0131 \u0130 \u015f \u015e \u011f \u011e \u00fc \u00dc \u00f6 \u00d6 \u00e7 \u00c7',result:'Onay'});
 const pdf=await renderReportPdf(report);if(pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF');
 await fs.writeFile('artifacts/kontrol-raporu-pdf-test.pdf',pdf);console.log('PASS: real A4 PDF generated ('+pdf.length+' bytes)');
})().catch(error=>{console.error(error);process.exitCode=1;});
