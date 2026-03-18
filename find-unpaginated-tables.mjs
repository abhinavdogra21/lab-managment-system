import fs from 'fs';
import path from 'path';

function searchDir(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, files);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allTsxFiles = searchDir('./app');

const findings = [];

for (const file of allTsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  const hasTable = content.includes('<Table') || content.includes('<table');
  const hasMapInsideTableContext = content.match(/<TableBody[^>]*>[\s\S]*?\.map\(/) || content.match(/<tbody[^>]*>[\s\S]*?\.map\(/);
  
  if (hasTable && hasMapInsideTableContext) {
    // Check if it has state for pagination like "currentPage" or "pageIndex"
    const hasPagination = content.includes('currentPage') || content.includes('setPage') || content.includes('paginate') || content.includes('itemsPerPage') || content.includes('<Pagination');
    
    if (!hasPagination) {
      findings.push(file);
    }
  }
}

console.log("Unpaginated files rendering lists:");
findings.forEach(f => console.log(f));
