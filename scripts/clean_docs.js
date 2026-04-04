import fs from 'fs';

try {
  const filesToDelete = [
    'docs/AUDIT-REPORT.md',
    'docs/PRD.md',
    'docs/SIMWORK-MASTER-PLAN.md',
    'docs/error-codes.md',
    'docs/sdd-foundation-tranche-1.md',
    'docs/sdd-website-builder-tranche-2.md',
    'docs/simwork-hard-cut-tranche-3.md',
    'docs/site-chat-spec-driven-audit.md',
    'docs/audit/quebras.md',
    'docs/audit/tabelas.md',
    'scripts/generate_colunas_md.js'
  ];

  for (const fp of filesToDelete) {
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
  }

  if (fs.existsSync('docs/auditeprdsec.md')) {
    fs.renameSync('docs/auditeprdsec.md', 'docs/SIMWORK-CANONICAL-MASTER.md');
  }

  console.log('Cleanup and Unification complete!');
} catch(e) {
  console.error("ERROR:", e);
}
