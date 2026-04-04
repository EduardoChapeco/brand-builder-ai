import fs from 'fs';

try {
  let mainBody = '';
  if (fs.existsSync('docs/auditeprdsec.md')) {
    mainBody = fs.readFileSync('docs/auditeprdsec.md', 'utf8');
  }

  const filesToMerge = [
    'docs/AUDIT-REPORT.md',
    'docs/PRD.md',
    'docs/SIMWORK-MASTER-PLAN.md',
    'docs/error-codes.md',
    'docs/sdd-foundation-tranche-1.md',
    'docs/sdd-website-builder-tranche-2.md',
    'docs/simwork-hard-cut-tranche-3.md',
    'docs/site-chat-spec-driven-audit.md'
  ];

  let finalAppend = '\n\n---\n\n## APÊNDICE OMEGA — LEGADOS E OUTROS MÓDULOS\n\n> Documentação legada unificada para referência e retenção de detalhes perdidos.\n\n';
  let addedAny = false;

  for (const fp of filesToMerge) {
    if (fs.existsSync(fp)) {
      const text = fs.readFileSync(fp, 'utf8');
      
      const lines = text.split('\n').filter(l => l.trim().length > 30);
      let overlapCount = 0;
      
      for (const line of lines) {
        if (mainBody.includes(line.substring(0, 50))) {
          overlapCount++;
        }
      }
      
      const overlapRatio = lines.length > 0 ? overlapCount / lines.length : 1;
      
      // If it overlaps less than 50%, append it
      if (overlapRatio < 0.5) {
         finalAppend += '\n\n### Documento Analisado e Unificado: ' + fp + '\n\n' + text + '\n\n';
         addedAny = true;
      }
      
      fs.unlinkSync(fp); // Delete the old scattered file
    }
  }

  let newContent = mainBody;
  if (addedAny) {
     newContent += finalAppend;
  }

  fs.writeFileSync('docs/SIMWORK-CANONICAL-MASTER.md', newContent);
  if (fs.existsSync('docs/auditeprdsec.md')) {
    fs.unlinkSync('docs/auditeprdsec.md');
  }
  
  if (fs.existsSync('docs/audit')) {
     const auditFiles = fs.readdirSync('docs/audit');
     for(const af of auditFiles) {
        fs.unlinkSync(`docs/audit/${af}`);
     }
  }

  console.log('Unification complete!');
} catch(e) {
  console.error("ERROR:", e);
}
