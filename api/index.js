
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const cifrasDir = path.join(process.cwd(), 'cifras');

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// API para listar as cifras
app.get('/api/cifras', (req, res) => {
    const getCifrasRecursive = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = entries
            .map((entry) => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    return {
                        name: entry.name,
                        type: 'category',
                        children: getCifrasRecursive(fullPath)
                    };
                } else if (entry.isFile() && path.extname(entry.name) === '.txt') {
                    const relativePath = path.relative(cifrasDir, fullPath);
                    return {
                        name: path.basename(entry.name, '.txt'),
                        type: 'cifra',
                        path: relativePath
                    };
                }
                return null;
            })
            .filter(Boolean); // Remove null entries
        return files;
    };

    try {
        const cifras = getCifrasRecursive(cifrasDir);
        res.json(cifras);
    } catch (error) {
        console.error("Erro ao ler o diretório de cifras:", error);
        res.status(500).send('Erro ao processar as cifras.');
    }
});

// API para obter o conteúdo de uma cifra específica
app.get('/api/cifra', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
        return res.status(400).send('Caminho do arquivo não especificado.');
    }

    const fullPath = path.join(cifrasDir, filePath);

    // Validação de segurança simples para evitar Path Traversal
    if (path.relative(cifrasDir, fullPath).startsWith('..')) {
        return res.status(403).send('Acesso negado.');
    }

    fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Erro ao ler o arquivo: ${fullPath}`, err);
            return res.status(404).send('Arquivo não encontrado.');
        }
        res.send(data);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
