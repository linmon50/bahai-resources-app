import fs from 'fs';
import path from 'path';

function searchTabEvents(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                searchTabEvents(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (
                    line.includes('visibility') ||
                    line.includes('storage') ||
                    line.includes('addEventListener') ||
                    line.includes('onAuthStateChange') ||
                    line.includes('activeCommunityId') ||
                    line.includes('localStorage')
                ) {
                    console.log(`${path.relative('C:\\bahai-resources-app', fullPath)}:${index + 1}: ${line.trim()}`);
                }
            });
        }
    }
}

searchTabEvents('C:\\bahai-resources-app\\src');
