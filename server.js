const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'cifras/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .txt são permitidos!'), false);
    }
  }
});

// Rotas da API

// Listar todas as cifras
app.get('/api/cifras', async (req, res) => {
  try {
    const cifrasDir = path.join(__dirname, 'cifras');
    const files = await fs.readdir(cifrasDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    const cifras = txtFiles.map(file => {
      const [artist, song] = file.replace('.txt', '').split(' - ');
      return {
        filename: file,
        artist: artist || 'Desconhecido',
        song: song || file.replace('.txt', ''),
        fullName: file.replace('.txt', '')
      };
    });
    
    res.json(cifras);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cifras' });
  }
});

// Obter conteúdo de uma cifra específica
app.get('/api/cifras/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'cifras', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Cifra não encontrada' });
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ filename, content });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler cifra' });
  }
});

// Upload de cifra única
app.post('/api/cifras/upload', upload.single('cifra'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    res.json({ 
      message: 'Cifra enviada com sucesso!',
      filename: req.file.filename 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload da cifra' });
  }
});

// Upload de múltiplas cifras
app.post('/api/cifras/upload-multiple', upload.array('cifras', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const uploadedFiles = req.files.map(file => file.filename);
    
    res.json({ 
      message: `${uploadedFiles.length} cifra(s) enviada(s) com sucesso!`,
      files: uploadedFiles 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload das cifras' });
  }
});

// Excluir cifra
app.delete('/api/cifras/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'cifras', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Cifra não encontrada' });
    }
    
    await fs.remove(filePath);
    res.json({ message: 'Cifra excluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cifra' });
  }
});

// Gerenciamento de categorias
app.get('/api/categories', async (req, res) => {
  try {
    const categoriesPath = path.join(__dirname, 'data', 'categories.json');
    const categories = await fs.readJson(categoriesPath);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar categorias' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const categoriesPath = path.join(__dirname, 'data', 'categories.json');
    const categories = await fs.readJson(categoriesPath);
    
    const { category, subcategory } = req.body;
    
    if (!categories.categories[category]) {
      categories.categories[category] = {};
    }
    
    if (subcategory && !categories.categories[category][subcategory]) {
      categories.categories[category][subcategory] = [];
    }
    
    await fs.writeJson(categoriesPath, categories, { spaces: 2 });
    res.json({ message: 'Categoria criada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Adicionar cifra a categoria
app.post('/api/categories/add-song', async (req, res) => {
  try {
    const categoriesPath = path.join(__dirname, 'data', 'categories.json');
    const categories = await fs.readJson(categoriesPath);
    
    const { category, subcategory, filename } = req.body;
    
    if (categories.categories[category] && categories.categories[category][subcategory]) {
      if (!categories.categories[category][subcategory].includes(filename)) {
        categories.categories[category][subcategory].push(filename);
      }
    }
    
    await fs.writeJson(categoriesPath, categories, { spaces: 2 });
    res.json({ message: 'Cifra adicionada à categoria com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar cifra à categoria' });
  }
});

// Gerenciamento de playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
    const playlists = await fs.readJson(playlistsPath);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar playlists' });
  }
});

app.post('/api/playlists', async (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
    const playlists = await fs.readJson(playlistsPath);
    
    const { name, songs } = req.body;
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      songs: songs || [],
      created: new Date().toISOString().split('T')[0]
    };
    
    playlists.playlists.push(newPlaylist);
    
    await fs.writeJson(playlistsPath, playlists, { spaces: 2 });
    res.json({ message: 'Playlist criada com sucesso!', playlist: newPlaylist });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar playlist' });
  }
});

app.put('/api/playlists/:id', async (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
    const playlists = await fs.readJson(playlistsPath);
    
    const playlistId = req.params.id;
    const { name, songs } = req.body;
    
    const playlistIndex = playlists.playlists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      return res.status(404).json({ error: 'Playlist não encontrada' });
    }
    
    if (name) playlists.playlists[playlistIndex].name = name;
    if (songs) playlists.playlists[playlistIndex].songs = songs;
    
    await fs.writeJson(playlistsPath, playlists, { spaces: 2 });
    res.json({ message: 'Playlist atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar playlist' });
  }
});

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const playlistsPath = path.join(__dirname, 'data', 'playlists.json');
    const playlists = await fs.readJson(playlistsPath);
    
    const playlistId = req.params.id;
    playlists.playlists = playlists.playlists.filter(p => p.id !== playlistId);
    
    await fs.writeJson(playlistsPath, playlists, { spaces: 2 });
    res.json({ message: 'Playlist excluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir playlist' });
  }
});

// Configurações
app.get('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    const settings = await fs.readJson(settingsPath);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    const currentSettings = await fs.readJson(settingsPath);
    
    const updatedSettings = {
      ...currentSettings,
      settings: {
        ...currentSettings.settings,
        ...req.body
      }
    };
    
    await fs.writeJson(settingsPath, updatedSettings, { spaces: 2 });
    res.json({ message: 'Configurações salvas com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Busca
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query) {
      return res.json([]);
    }
    
    const cifrasDir = path.join(__dirname, 'cifras');
    const files = await fs.readdir(cifrasDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    const results = txtFiles.filter(file => {
      const filename = file.toLowerCase();
      return filename.includes(query);
    }).map(file => {
      const [artist, song] = file.replace('.txt', '').split(' - ');
      return {
        filename: file,
        artist: artist || 'Desconhecido',
        song: song || file.replace('.txt', ''),
        fullName: file.replace('.txt', '')
      };
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erro na busca' });
  }
});

// Rota principal - servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;

