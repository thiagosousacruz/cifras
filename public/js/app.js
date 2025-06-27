// Aplicação Cifras para Músicos
class CifrasApp {
    constructor() {
        this.currentView = 'home';
        this.currentCifra = null;
        this.currentPlaylist = null;
        this.currentSongIndex = 0;
        this.isAutoScrolling = false;
        this.autoScrollInterval = null;
        this.settings = {
            fontSize: 16,
            scrollSpeed: 1,
            darkMode: false,
            autoScroll: false
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
        await this.loadCifras();
        await this.loadCategories();
        await this.loadPlaylists();
        this.applyTheme();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleMenu());
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchView(e.target.closest('.nav-item').dataset.view));
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearch());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('clearSearch').addEventListener('click', () => this.clearSearch());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Upload
        document.getElementById('singleFileInput').addEventListener('change', (e) => this.handleSingleFileSelect(e));
        document.getElementById('multipleFileInput').addEventListener('change', (e) => this.handleMultipleFileSelect(e));
        document.getElementById('uploadSingleBtn').addEventListener('click', () => this.uploadSingle());
        document.getElementById('uploadMultipleBtn').addEventListener('click', () => this.uploadMultiple());

        // Settings
        document.getElementById('fontSizeRange').addEventListener('input', (e) => this.updateFontSize(e.target.value));
        document.getElementById('scrollSpeedRange').addEventListener('input', (e) => this.updateScrollSpeed(e.target.value));
        document.getElementById('darkModeToggle').addEventListener('change', (e) => this.toggleTheme(e.target.checked));
        document.getElementById('autoScrollToggle').addEventListener('change', (e) => this.toggleAutoScroll(e.target.checked));
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Cifra Viewer
        document.getElementById('backBtn').addEventListener('click', () => this.closeCifraViewer());
        document.getElementById('playPauseBtn').addEventListener('click', () => this.toggleAutoScroll());
        document.getElementById('prevSongBtn').addEventListener('click', () => this.previousSong());
        document.getElementById('nextSongBtn').addEventListener('click', () => this.nextSong());

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                this.closeModal();
            }
        });

        // Add buttons
        document.getElementById('addCifraBtn').addEventListener('click', () => this.switchView('upload'));
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.showAddCategoryModal());
        document.getElementById('addPlaylistBtn').addEventListener('click', () => this.showAddPlaylistModal());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // Navigation
    toggleMenu() {
        const menu = document.getElementById('navMenu');
        menu.classList.toggle('hidden');
    }

    switchView(viewName) {
        // Hide current view
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        // Show new view
        document.getElementById(`${viewName}View`).classList.add('active');
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        this.currentView = viewName;
        this.toggleMenu(); // Close menu on mobile
    }

    // Search
    toggleSearch() {
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        
        searchBar.classList.toggle('hidden');
        
        if (!searchBar.classList.contains('hidden')) {
            setTimeout(() => searchInput.focus(), 300);
        } else {
            this.clearSearch();
        }
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.showCifrasList();
            return;
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showToast('Erro ao buscar cifras', 'error');
        }
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        const cifrasList = document.getElementById('cifrasList');
        
        cifrasList.classList.add('hidden');
        searchResults.classList.remove('hidden');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="text-center text-muted">Nenhuma cifra encontrada</p>';
            return;
        }

        searchResults.innerHTML = results.map(cifra => this.createCifraCard(cifra)).join('');
        this.attachCifraCardEvents();
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.showCifrasList();
    }

    showCifrasList() {
        document.getElementById('cifrasList').classList.remove('hidden');
        document.getElementById('searchResults').classList.add('hidden');
    }

    // Theme
    toggleTheme(force = null) {
        const isDark = force !== null ? force : !document.body.hasAttribute('data-theme');
        
        if (isDark) {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.removeAttribute('data-theme');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        this.settings.darkMode = isDark;
        document.getElementById('darkModeToggle').checked = isDark;
    }

    applyTheme() {
        this.toggleTheme(this.settings.darkMode);
    }

    // Cifras
    async loadCifras() {
        try {
            this.showLoading();
            const response = await fetch('/api/cifras');
            const cifras = await response.json();
            this.displayCifras(cifras);
        } catch (error) {
            console.error('Erro ao carregar cifras:', error);
            this.showToast('Erro ao carregar cifras', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayCifras(cifras) {
        const container = document.getElementById('cifrasList');
        
        if (cifras.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nenhuma cifra encontrada. Faça upload de suas primeiras cifras!</p>';
            return;
        }

        container.innerHTML = cifras.map(cifra => this.createCifraCard(cifra)).join('');
        this.attachCifraCardEvents();
    }

    createCifraCard(cifra) {
        return `
            <div class="cifra-card" data-filename="${cifra.filename}">
                <div class="cifra-artist">${cifra.artist}</div>
                <div class="cifra-song">${cifra.song}</div>
                <div class="cifra-actions">
                    <button class="action-btn play-btn" title="Tocar">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn add-playlist-btn" title="Adicionar à playlist">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn delete delete-btn" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachCifraCardEvents() {
        document.querySelectorAll('.cifra-card').forEach(card => {
            const filename = card.dataset.filename;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.cifra-actions')) {
                    this.openCifra(filename);
                }
            });

            card.querySelector('.play-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCifra(filename);
            });

            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCifra(filename);
            });

            card.querySelector('.add-playlist-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddToPlaylistModal(filename);
            });
        });
    }

    async openCifra(filename) {
        try {
            this.showLoading();
            const response = await fetch(`/api/cifras/${filename}`);
            const data = await response.json();
            
            this.currentCifra = data;
            this.showCifraViewer(data);
        } catch (error) {
            console.error('Erro ao carregar cifra:', error);
            this.showToast('Erro ao carregar cifra', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showCifraViewer(cifra) {
        const viewer = document.getElementById('cifraViewer');
        const title = document.getElementById('cifraTitle');
        const content = document.getElementById('cifraContent');
        
        title.textContent = cifra.filename.replace('.txt', '');
        content.textContent = cifra.content;
        content.style.fontSize = `${this.settings.fontSize}px`;
        
        viewer.classList.remove('hidden');
        
        if (this.settings.autoScroll) {
            this.startAutoScroll();
        }
    }

    closeCifraViewer() {
        document.getElementById('cifraViewer').classList.add('hidden');
        this.stopAutoScroll();
        this.currentCifra = null;
    }

    async deleteCifra(filename) {
        if (!confirm(`Tem certeza que deseja excluir "${filename}"?`)) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/cifras/${filename}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Cifra excluída com sucesso!', 'success');
                await this.loadCifras();
            } else {
                throw new Error('Erro ao excluir cifra');
            }
        } catch (error) {
            console.error('Erro ao excluir cifra:', error);
            this.showToast('Erro ao excluir cifra', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Upload
    handleSingleFileSelect(event) {
        const file = event.target.files[0];
        const button = document.getElementById('uploadSingleBtn');
        
        button.disabled = !file;
        
        if (file) {
            button.innerHTML = `<i class="fas fa-upload"></i> Enviar "${file.name}"`;
        } else {
            button.innerHTML = '<i class="fas fa-upload"></i> Enviar';
        }
    }

    handleMultipleFileSelect(event) {
        const files = Array.from(event.target.files);
        const button = document.getElementById('uploadMultipleBtn');
        const filesList = document.getElementById('filesList');
        
        button.disabled = files.length === 0;
        
        if (files.length > 0) {
            button.innerHTML = `<i class="fas fa-upload"></i> Enviar ${files.length} arquivo(s)`;
            
            filesList.innerHTML = files.map(file => `
                <div class="file-item">
                    <span>${file.name}</span>
                    <span class="text-muted">${this.formatFileSize(file.size)}</span>
                </div>
            `).join('');
        } else {
            button.innerHTML = '<i class="fas fa-upload"></i> Enviar Todos';
            filesList.innerHTML = '';
        }
    }

    async uploadSingle() {
        const fileInput = document.getElementById('singleFileInput');
        const file = fileInput.files[0];
        
        if (!file) return;

        const formData = new FormData();
        formData.append('cifra', file);

        try {
            this.showLoading();
            const response = await fetch('/api/cifras/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Cifra enviada com sucesso!', 'success');
                fileInput.value = '';
                document.getElementById('uploadSingleBtn').disabled = true;
                document.getElementById('uploadSingleBtn').innerHTML = '<i class="fas fa-upload"></i> Enviar';
                await this.loadCifras();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showToast('Erro ao enviar cifra', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async uploadMultiple() {
        const fileInput = document.getElementById('multipleFileInput');
        const files = fileInput.files;
        
        if (files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('cifras', file);
        });

        try {
            this.showLoading();
            const response = await fetch('/api/cifras/upload-multiple', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast(`${files.length} cifra(s) enviada(s) com sucesso!`, 'success');
                fileInput.value = '';
                document.getElementById('uploadMultipleBtn').disabled = true;
                document.getElementById('uploadMultipleBtn').innerHTML = '<i class="fas fa-upload"></i> Enviar Todos';
                document.getElementById('filesList').innerHTML = '';
                await this.loadCifras();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showToast('Erro ao enviar cifras', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Settings
    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            this.settings = { ...this.settings, ...data.settings };
            this.applySettings();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    applySettings() {
        document.getElementById('fontSizeRange').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = `${this.settings.fontSize}px`;
        
        document.getElementById('scrollSpeedRange').value = this.settings.scrollSpeed;
        document.getElementById('scrollSpeedValue').textContent = `${this.settings.scrollSpeed}x`;
        
        document.getElementById('darkModeToggle').checked = this.settings.darkMode;
        document.getElementById('autoScrollToggle').checked = this.settings.autoScroll;
    }

    updateFontSize(value) {
        this.settings.fontSize = parseInt(value);
        document.getElementById('fontSizeValue').textContent = `${value}px`;
        
        const content = document.getElementById('cifraContent');
        if (content) {
            content.style.fontSize = `${value}px`;
        }
    }

    updateScrollSpeed(value) {
        this.settings.scrollSpeed = parseFloat(value);
        document.getElementById('scrollSpeedValue').textContent = `${value}x`;
        
        if (this.isAutoScrolling) {
            this.stopAutoScroll();
            this.startAutoScroll();
        }
    }

    toggleAutoScroll(force = null) {
        const isEnabled = force !== null ? force : !this.settings.autoScroll;
        this.settings.autoScroll = isEnabled;
        
        if (this.currentCifra) {
            if (isEnabled) {
                this.startAutoScroll();
            } else {
                this.stopAutoScroll();
            }
        }
        
        const playPauseBtn = document.getElementById('playPauseBtn');
        playPauseBtn.innerHTML = isEnabled ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    startAutoScroll() {
        if (this.autoScrollInterval) return;
        
        const content = document.getElementById('cifraContent');
        const container = content.parentElement;
        
        this.isAutoScrolling = true;
        
        const scrollStep = () => {
            if (!this.isAutoScrolling) return;
            
            const scrollAmount = this.settings.scrollSpeed * 0.5;
            container.scrollTop += scrollAmount;
            
            // Se chegou ao final, para o scroll
            if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
                this.stopAutoScroll();
                return;
            }
            
            this.autoScrollInterval = requestAnimationFrame(scrollStep);
        };
        
        this.autoScrollInterval = requestAnimationFrame(scrollStep);
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }

    stopAutoScroll() {
        this.isAutoScrolling = false;
        if (this.autoScrollInterval) {
            cancelAnimationFrame(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    }

    async saveSettings() {
        try {
            this.showLoading();
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.settings)
            });

            if (response.ok) {
                this.showToast('Configurações salvas!', 'success');
            } else {
                throw new Error('Erro ao salvar configurações');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showToast('Erro ao salvar configurações', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Categories
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            this.displayCategories(data.categories);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    displayCategories(categories) {
        const container = document.getElementById('categoriesList');
        
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nenhuma categoria criada ainda.</p>';
            return;
        }

        container.innerHTML = Object.entries(categories).map(([category, subcategories]) => `
            <div class="category-group">
                <h3>${category}</h3>
                ${Object.entries(subcategories).map(([sub, songs]) => `
                    <div class="subcategory">
                        <h4>${sub} (${songs.length})</h4>
                        ${songs.length > 0 ? `
                            <div class="category-songs">
                                ${songs.map(song => `<span class="song-tag">${song.replace('.txt', '')}</span>`).join('')}
                            </div>
                        ` : '<p class="text-muted">Nenhuma música nesta categoria</p>'}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // Playlists
    async loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            const data = await response.json();
            this.displayPlaylists(data.playlists);
        } catch (error) {
            console.error('Erro ao carregar playlists:', error);
        }
    }

    displayPlaylists(playlists) {
        const container = document.getElementById('playlistsList');
        
        if (playlists.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nenhuma playlist criada ainda.</p>';
            return;
        }

        container.innerHTML = playlists.map(playlist => `
            <div class="playlist-card" data-id="${playlist.id}">
                <div class="playlist-header">
                    <h3>${playlist.name}</h3>
                    <div class="playlist-actions">
                        <button class="action-btn play-playlist-btn" title="Tocar playlist">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn delete delete-playlist-btn" title="Excluir playlist">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="playlist-info">
                    <span class="text-muted">${playlist.songs.length} música(s)</span>
                    <span class="text-muted">Criada em ${playlist.created}</span>
                </div>
                ${playlist.songs.length > 0 ? `
                    <div class="playlist-songs">
                        ${playlist.songs.map(song => `<span class="song-tag">${song.replace('.txt', '')}</span>`).join('')}
                    </div>
                ` : '<p class="text-muted">Playlist vazia</p>'}
            </div>
        `).join('');

        this.attachPlaylistEvents();
    }

    attachPlaylistEvents() {
        document.querySelectorAll('.play-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const playlistId = e.target.closest('.playlist-card').dataset.id;
                this.playPlaylist(playlistId);
            });
        });

        document.querySelectorAll('.delete-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const playlistId = e.target.closest('.playlist-card').dataset.id;
                this.deletePlaylist(playlistId);
            });
        });
    }

    async playPlaylist(playlistId) {
        try {
            const response = await fetch('/api/playlists');
            const data = await response.json();
            const playlist = data.playlists.find(p => p.id === playlistId);
            
            if (playlist && playlist.songs.length > 0) {
                this.currentPlaylist = playlist;
                this.currentSongIndex = 0;
                await this.openCifra(playlist.songs[0]);
            }
        } catch (error) {
            console.error('Erro ao tocar playlist:', error);
            this.showToast('Erro ao tocar playlist', 'error');
        }
    }

    async deletePlaylist(playlistId) {
        if (!confirm('Tem certeza que deseja excluir esta playlist?')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Playlist excluída com sucesso!', 'success');
                await this.loadPlaylists();
            } else {
                throw new Error('Erro ao excluir playlist');
            }
        } catch (error) {
            console.error('Erro ao excluir playlist:', error);
            this.showToast('Erro ao excluir playlist', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Playlist Navigation
    async previousSong() {
        if (!this.currentPlaylist || this.currentSongIndex <= 0) return;
        
        this.currentSongIndex--;
        await this.openCifra(this.currentPlaylist.songs[this.currentSongIndex]);
    }

    async nextSong() {
        if (!this.currentPlaylist || this.currentSongIndex >= this.currentPlaylist.songs.length - 1) return;
        
        this.currentSongIndex++;
        await this.openCifra(this.currentPlaylist.songs[this.currentSongIndex]);
    }

    // Modals
    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
    }

    showAddCategoryModal() {
        const content = `
            <form id="addCategoryForm">
                <div class="mb-2">
                    <label for="categoryName">Nome da Categoria</label>
                    <input type="text" id="categoryName" class="form-input" required>
                </div>
                <div class="mb-2">
                    <label for="subcategoryName">Nome da Subcategoria</label>
                    <input type="text" id="subcategoryName" class="form-input" required>
                </div>
                <button type="submit" class="btn-primary">Criar Categoria</button>
            </form>
        `;
        
        this.showModal('Nova Categoria', content);
        
        document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createCategory();
        });
    }

    showAddPlaylistModal() {
        const content = `
            <form id="addPlaylistForm">
                <div class="mb-2">
                    <label for="playlistName">Nome da Playlist</label>
                    <input type="text" id="playlistName" class="form-input" required>
                </div>
                <button type="submit" class="btn-primary">Criar Playlist</button>
            </form>
        `;
        
        this.showModal('Nova Playlist', content);
        
        document.getElementById('addPlaylistForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createPlaylist();
        });
    }

    async createCategory() {
        const category = document.getElementById('categoryName').value;
        const subcategory = document.getElementById('subcategoryName').value;

        try {
            this.showLoading();
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, subcategory })
            });

            if (response.ok) {
                this.showToast('Categoria criada com sucesso!', 'success');
                this.closeModal();
                await this.loadCategories();
            } else {
                throw new Error('Erro ao criar categoria');
            }
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            this.showToast('Erro ao criar categoria', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async createPlaylist() {
        const name = document.getElementById('playlistName').value;

        try {
            this.showLoading();
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                this.showToast('Playlist criada com sucesso!', 'success');
                this.closeModal();
                await this.loadPlaylists();
            } else {
                throw new Error('Erro ao criar playlist');
            }
        } catch (error) {
            console.error('Erro ao criar playlist:', error);
            this.showToast('Erro ao criar playlist', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Keyboard shortcuts
    handleKeyboard(event) {
        if (event.target.tagName === 'INPUT') return;

        switch (event.key) {
            case 'Escape':
                if (!document.getElementById('cifraViewer').classList.contains('hidden')) {
                    this.closeCifraViewer();
                } else if (!document.getElementById('modalOverlay').classList.contains('hidden')) {
                    this.closeModal();
                }
                break;
            case ' ':
                if (!document.getElementById('cifraViewer').classList.contains('hidden')) {
                    event.preventDefault();
                    this.toggleAutoScroll();
                }
                break;
            case 'ArrowLeft':
                if (!document.getElementById('cifraViewer').classList.contains('hidden')) {
                    event.preventDefault();
                    this.previousSong();
                }
                break;
            case 'ArrowRight':
                if (!document.getElementById('cifraViewer').classList.contains('hidden')) {
                    event.preventDefault();
                    this.nextSong();
                }
                break;
        }
    }

    // Utility functions
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CifrasApp();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

