document.addEventListener('DOMContentLoaded', () => {
    const listaCifrasContainer = document.getElementById('lista-cifras-container');
    const cifraViewContainer = document.getElementById('cifra-view-container');
    const listaCifrasDiv = document.getElementById('lista-cifras');
    const cifraContentEl = document.getElementById('cifra-content');
    const searchInput = document.getElementById('search-input');
    const homeThemeToggleBtn = document.getElementById('home-theme-toggle-btn');

    const backBtn = document.getElementById('back-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const fontDecreaseBtn = document.getElementById('font-decrease-btn');
    const fontIncreaseBtn = document.getElementById('font-increase-btn');
    const scrollToggleBtn = document.getElementById('scroll-toggle-btn');
    const scrollSpeedSlider = document.getElementById('scroll-speed-slider');

    let scrollInterval = null;
    let currentFontSize = 16;
    let allCifrasData = []; // Cache para a busca

    // --- Preferências do Usuário ---
    const applyPreferences = () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            currentFontSize = parseInt(savedFontSize, 10);
            cifraContentEl.style.fontSize = `${currentFontSize}px`;
        }
    };

    const saveThemePreference = (theme) => localStorage.setItem('theme', theme);
    const saveFontSizePreference = (size) => localStorage.setItem('fontSize', size);

    // --- Funções da Aplicação ---

    const fetchAndDisplayCifras = async () => {
        try {
            const response = await fetch('/api/cifras');
            allCifrasData = await response.json();
            listaCifrasDiv.innerHTML = '';
            renderCifras(allCifrasData, listaCifrasDiv);
        } catch (error) {
            console.error('Erro ao buscar cifras:', error);
            listaCifrasDiv.innerHTML = '<p>Não foi possível carregar as cifras.</p>';
        }
    };

    const renderCifras = (items, container) => {
        items.forEach(item => {
            if (item.type === 'category') {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category';

                const categoryName = document.createElement('div');
                categoryName.className = 'category-name';
                // Remove o ícone do texto para não ser copiado
                const categoryText = document.createElement('span');
                categoryText.textContent = item.name.replace(/_/g, ' ');
                categoryName.appendChild(categoryText);
                
                categoryName.addEventListener('click', () => {
                    categoryDiv.classList.toggle('collapsed');
                });

                categoryDiv.appendChild(categoryName);
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'category-children';
                renderCifras(item.children, childrenContainer);
                categoryDiv.appendChild(childrenContainer);
                
                container.appendChild(categoryDiv);
            } else if (item.type === 'cifra') {
                const cifraItem = document.createElement('a');
                cifraItem.className = 'cifra-item';
                cifraItem.textContent = item.name;
                cifraItem.href = '#';
                cifraItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    openCifra(item.path);
                });
                container.appendChild(cifraItem);
            }
        });
    };

    const openCifra = async (path) => {
        try {
            const response = await fetch(`/api/cifra?path=${encodeURIComponent(path)}`);
            const content = await response.text();
            cifraContentEl.textContent = content;
            listaCifrasContainer.classList.add('hidden');
            cifraViewContainer.classList.remove('hidden');
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Erro ao carregar cifra:', error);
            alert('Não foi possível carregar a cifra.');
        }
    };

    const goBackToList = () => {
        stopScrolling();
        cifraViewContainer.classList.add('hidden');
        listaCifrasContainer.classList.remove('hidden');
    };

    const toggleTheme = () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        saveThemePreference(isDarkMode ? 'dark' : 'light');
    };

    const changeFontSize = (amount) => {
        currentFontSize += amount;
        cifraContentEl.style.fontSize = `${currentFontSize}px`;
        saveFontSizePreference(currentFontSize);
    };

    const startScrolling = () => {
        const speed = scrollSpeedSlider.value;
        const interval = 110 - (speed * 10);
        scrollInterval = setInterval(() => window.scrollBy(0, 1), interval);
        scrollToggleBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
        scrollToggleBtn.title = 'Pausar Rolagem';
    };

    const stopScrolling = () => {
        clearInterval(scrollInterval);
        scrollInterval = null;
        scrollToggleBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        scrollToggleBtn.title = 'Iniciar Rolagem';
    };

    const toggleScrolling = () => {
        if (scrollInterval) stopScrolling();
        else startScrolling();
    };

    const filterCifras = () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        const filterItems = (items) => {
            return items.map(item => {
                if (item.type === 'cifra') {
                    return item.name.toLowerCase().includes(searchTerm) ? item : null;
                }
                if (item.type === 'category') {
                    const filteredChildren = filterItems(item.children);
                    if (filteredChildren.some(child => child !== null)) {
                        return { ...item, children: filteredChildren.filter(Boolean) };
                    }
                    return null;
                }
            }).filter(Boolean);
        };

        const filteredData = filterItems(allCifrasData);
        listaCifrasDiv.innerHTML = '';
        renderCifras(filteredData, listaCifrasDiv);
    };

    // --- Event Listeners ---
    backBtn.addEventListener('click', goBackToList);
    themeToggleBtn.addEventListener('click', toggleTheme);
    homeThemeToggleBtn.addEventListener('click', toggleTheme);
    fontDecreaseBtn.addEventListener('click', () => changeFontSize(-1));
    fontIncreaseBtn.addEventListener('click', () => changeFontSize(1));
    scrollToggleBtn.addEventListener('click', toggleScrolling);
    scrollSpeedSlider.addEventListener('input', () => {
        if (scrollInterval) {
            stopScrolling();
            startScrolling();
        }
    });
    searchInput.addEventListener('input', filterCifras);

    // --- Inicialização ---
    applyPreferences();
    fetchAndDisplayCifras();
});