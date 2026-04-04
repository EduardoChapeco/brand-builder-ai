import fs from 'fs';
import path from 'path';

try {
  if (!fs.existsSync('docs/audit')) {
    fs.mkdirSync('docs/audit');
  }

  const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

  // SW-001 - Rotas
  const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([^>]+)\s*\/>/g;
  let routesMd = '# MAPA DE ROTAS — SW-001\n\n| Rota | Componente Declarado | Componente Existe? | Observação |\n|---|---|---|---|\n';

  let match;
  while ((match = routeRegex.exec(appTsx)) !== null) {
    const route = match[1];
    const comp = match[2].split(' ')[0]; // Em caso de props como `<DashboardPage prop="x"`
    
    // Procura onde o componente foi importado para saber o caminho físico
    const importRegex = new RegExp(`import\\s+${comp}\\s+from\\s+['"]([^'"]+)['"]`);
    const importMatch = appTsx.match(importRegex);
    
    let compExists = 'NÃO';
    let obs = 'Import não localizado';
    
    if (importMatch) {
       let relPath = importMatch[1].replace('@/', 'src/');
       if (!relPath.endsWith('.tsx') && !relPath.endsWith('.ts')) relPath += '.tsx';
       if (!fs.existsSync(relPath)) {
          // pode ser index.tsx
          relPath = importMatch[1].replace('@/', 'src/') + '/index.tsx';
       }
       if (fs.existsSync(relPath)) {
          compExists = 'SIM';
          obs = 'OK';
       } else {
          obs = 'Arquivo não encontrado no bundle';
       }
    } else {
       if (comp === 'Navigate') {
          compExists = 'SIM (nativo)';
          obs = 'Redirecionamento nativo React Router';
       }
    }
    
    routesMd += `| \`${route}\` | \`${comp}\` | ${compExists} | ${obs} |\n`;
  }

  fs.writeFileSync('docs/audit/rotas.md', routesMd);
  console.log('SW-001 Rotas completo.');

} catch(e) {
  console.error(e);
}
