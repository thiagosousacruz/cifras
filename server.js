const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

const cifrasDir = path.join(process.cwd(), 'cifras');

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const categoryPath = req.body.categoryPath || '';
        const uploadPath = path.join(cifrasDir, categoryPath);
        // Cria a pasta da categoria se não existir
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Garante que o nome do arquivo seja seguro
        const safeName = file.originalname.replace(/[^a-zA-Z0-9\.\- ]/g, '_');
        cb(null, safeName);
    }
});

const upload = multer({ storage: storage });

// Rota para a página de admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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
            .filter(Boolean);
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

// API para upload de cifras
app.post('/api/upload', upload.single('cifraFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }
    res.send(`Arquivo '${req.file.filename}' enviado com sucesso!`);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Página de admin disponível em http://localhost:3000/admin');
});