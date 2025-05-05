document.addEventListener('DOMContentLoaded', () => {
    // --- Configuração ---
    const apiKey = '72c510d429567c89261f7a37b8ef9a0b';
    const apiUrlBase = 'https://api.themoviedb.org/3';
    const imageUrlBase = 'https://image.tmdb.org/t/p/w500';
    const placeholderImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22750%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20500%20750%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_17c11f80668%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A25pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_17c11f80668%22%3E%3Crect%20width%3D%22500%22%20height%3D%22750%22%20fill%3D%22%23333%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22185.125%22%20y%3D%22386.4%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';

    // --- Seletores do DOM ---
    // Gerais
    const userStatusDiv = document.getElementById('user-status');
    // Index page
    const itemsContainer = document.getElementById('items-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const mainSectionTitle = document.getElementById('main-section-title');
    // Modal (pode estar em index ou profile)
    const modal = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalButton = modal?.querySelector('.close-button');
    const ratingSection = document.getElementById('rating-section');
    const starsContainer = ratingSection?.querySelector('.stars');
    const ratingMessage = document.getElementById('rating-message');
    const removeRatingButton = document.getElementById('remove-rating-button');
    // Auth pages
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const registerMessage = document.getElementById('register-message');
    const loginMessage = document.getElementById('login-message');
    // Profile page
    const profileTitle = document.getElementById('profile-title');
    const ratedItemsContainer = document.getElementById('rated-items-container');

    // Estado do Modal
    let currentModalItemId = null;
    let currentModalItemType = null;

    // --- Funções Auxiliares localStorage ---
    const getLocalStorageItem = (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            const parsed = JSON.parse(item);
            if (defaultValue !== null && typeof defaultValue === 'object' && (typeof parsed !== 'object' || parsed === null)) {
                return defaultValue;
            }
            return parsed;
        } catch (error) {
            console.error(`Erro ao ler localStorage key "${key}":`, error);
            return defaultValue;
        }
    };
    const setLocalStorageItem = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar localStorage key "${key}":`, error);
            return false;
        }
    };

    // --- Funções da API TMDB ---
    async function fetchTMDB(endpoint, params = {}) {
        const url = new URL(`${apiUrlBase}${endpoint}`);
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('language', 'pt-BR');
        Object.entries(params).forEach(([key, value]) => {
             if (value !== undefined && value !== null && value !== '') url.searchParams.append(key, value);
        });
        try {
            const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Erro API TMDB (${response.status}): ${response.statusText}`, errorData);
                throw new Error(`Erro na API: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Falha ao buscar dados da TMDB:', error);
            // Feedback visual de erro, dependendo da página
            if (itemsContainer) itemsContainer.innerHTML = '<p>Erro ao carregar dados. Tente novamente mais tarde.</p>';
            else if (ratedItemsContainer) ratedItemsContainer.innerHTML = '<p>Erro ao carregar detalhes dos itens. Tente recarregar a página.</p>';
            else if (modalBody && modal?.style.display === 'block') modalBody.innerHTML = '<p>Erro ao carregar detalhes.</p>';
            return null;
        }
    }

    // --- Funções de Exibição (Index) ---
    function displayItems(items) {
        if (!itemsContainer) return;
        itemsContainer.innerHTML = '';
        if (!items || items.length === 0) {
            itemsContainer.innerHTML = '<p>Nenhum item encontrado.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            if (!item.poster_path || !(item.title || item.name)) return;
            const itemType = item.media_type || (item.title ? 'movie' : 'tv');
            const title = item.title || item.name;
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            const posterUrl = item.poster_path ? `${imageUrlBase}${item.poster_path}` : placeholderImage;
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = item.id;
            card.dataset.type = itemType;
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Ver detalhes de ${title}`);
            card.innerHTML = `
                <img src="${posterUrl}" alt="Poster de ${title}" loading="lazy" onerror="this.onerror=null;this.src='${placeholderImage}';">
                <div class="info">
                    <div>
                        <h3>${title}</h3>
                        <p class="item-type">${itemType === 'movie' ? 'Filme' : 'Série/TV'}</p>
                    </div>
                    <span class="rating" aria-label="Nota média ${rating} de 10">
                        <i class="fas fa-star" aria-hidden="true"></i> ${rating} / 10
                    </span>
                </div>
            `;
            const openModalAction = () => showDetailsModal(item.id, itemType);
            card.addEventListener('click', openModalAction);
            card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModalAction(); } });
            fragment.appendChild(card);
        });
        itemsContainer.appendChild(fragment);
    }

    // --- Modal ---
    async function showDetailsModal(itemId, itemType) {
        if (!modal || !modalBody) {
             console.warn("Modal não encontrado no DOM para exibir detalhes.");
             // Poderia redirecionar para uma página de detalhes dedicada se o modal não existir
             // window.location.href = `details.html?type=${itemType}&id=${itemId}`;
             return;
        }
        console.log(`Abrindo modal para ${itemType} ID: ${itemId}`);
        modalBody.innerHTML = '<p>Carregando detalhes...</p>';
        if (ratingSection) ratingSection.style.display = 'none'; // Esconde rating enquanto carrega
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        currentModalItemId = itemId;
        currentModalItemType = itemType;

        const itemDetails = await fetchTMDB(`/${itemType}/${itemId}`, { append_to_response: 'credits' });

        if (!itemDetails) {
            modalBody.innerHTML = '<p>Não foi possível carregar os detalhes. Tente novamente.</p>';
            // Não fechar o modal automaticamente, permitir que o usuário o feche
            return;
        }

        const title = itemDetails.title || itemDetails.name || 'Título Indisponível';
        const overview = itemDetails.overview || 'Sem sinopse disponível.';
        const releaseDate = itemDetails.release_date || itemDetails.first_air_date || 'N/A';
        const genres = itemDetails.genres?.map(g => g.name).join(', ') || 'N/A';
        const rating = itemDetails.vote_average ? itemDetails.vote_average.toFixed(1) : 'N/A';
        const posterPath = itemDetails.poster_path ? `${imageUrlBase}${itemDetails.poster_path}` : placeholderImage;
        const cast = itemDetails.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || 'N/A';
        const status = itemDetails.status || 'N/A';
        const runtime = itemDetails.runtime ? `${itemDetails.runtime} min` : (itemDetails.episode_run_time?.[0] ? `${itemDetails.episode_run_time[0]} min/ep` : 'N/A');

        modalBody.innerHTML = `
            <img src="${posterPath}" alt="Poster de ${title}" onerror="this.onerror=null;this.src='${placeholderImage}';">
            <div class="details">
                <h2>${title}</h2>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Data:</strong> ${releaseDate}</p>
                <p><strong>Duração:</strong> ${runtime}</p>
                <p><strong>Gêneros:</strong> ${genres}</p>
                <p><strong>Nota Média TMDB:</strong> ${rating} / 10</p>
                <p><strong>Elenco Principal:</strong> ${cast}</p>
                <p><strong>Sinopse:</strong> ${overview}</p>
            </div>
        `;

        if (isLoggedIn() && ratingSection) {
            setupRatingStars();
            displayUserRating();
            ratingSection.style.display = 'block';
        } else if (ratingSection) {
             ratingSection.style.display = 'none';
        }
        closeModalButton?.focus();
    }
    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            modalBody.innerHTML = '';
            document.body.style.overflow = '';
            currentModalItemId = null;
            currentModalItemType = null;
            if(starsContainer) starsContainer.querySelectorAll('i').forEach(star => star.className = 'far fa-star');
            if(ratingMessage) ratingMessage.textContent = '';
            if(removeRatingButton) removeRatingButton.style.display = 'none';
        }
    }

    // --- Funções de Autenticação ---
    const getUsers = () => getLocalStorageItem('users', {});
    function registerUser(username, password) {
        if (!registerMessage) return;
        const users = getUsers();
        if (users[username]) {
            registerMessage.textContent = 'Erro: Nome de usuário já existe!';
            registerMessage.className = 'message error';
            return false;
        }
        // **INSEGURO!**
        users[username] = password;
        if (setLocalStorageItem('users', users)) {
            registerMessage.textContent = 'Cadastro realizado! Redirecionando...';
            registerMessage.className = 'message success';
            setTimeout(() => { if (registerForm) registerForm.reset(); window.location.href = 'login.html'; }, 1500);
            return true;
        } else {
            registerMessage.textContent = 'Erro interno ao salvar cadastro.';
            registerMessage.className = 'message error';
            return false;
        }
    }
    function loginUser(username, password) {
        if (!loginMessage) { console.error("#login-message não encontrado!"); return; }
        const users = getUsers();
        // **INSEGURO!**
        if (users[username] && users[username] === password) {
            if (setLocalStorageItem('currentUser', username)) {
                loginMessage.textContent = 'Login bem-sucedido! Redirecionando...';
                loginMessage.className = 'message success';
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                return true;
            } else {
                 loginMessage.textContent = 'Erro interno ao iniciar sessão.';
                 loginMessage.className = 'message error'; return false;
            }
        } else {
            loginMessage.textContent = 'Erro: Usuário ou senha inválidos!';
            loginMessage.className = 'message error';
            localStorage.removeItem('currentUser');
            return false;
        }
    }
    function logoutUser() {
        localStorage.removeItem('currentUser');
        updateUserStatus();
        if (modal?.style.display === 'block' && ratingSection) { ratingSection.style.display = 'none'; displayUserRating(); }
        // Se estiver na página de perfil, redireciona para o início
        if (window.location.pathname.endsWith('profile.html')) {
            window.location.href = 'index.html';
        }
    }
    const getCurrentUser = () => getLocalStorageItem('currentUser', null);
    const isLoggedIn = () => !!getCurrentUser();

    // *** ATUALIZADA PARA INCLUIR LINK DO PERFIL ***
    function updateUserStatus() {
        if (!userStatusDiv) return;
        const currentUser = getCurrentUser();
        if (currentUser) {
            userStatusDiv.innerHTML = `
                <span>Bem-vindo, ${currentUser}!</span> |
                <a href="profile.html" class="profile-link">Meu Perfil</a> |
                <button id="logout-button" type="button">Logout</button>
            `;
            const logoutButton = document.getElementById('logout-button');
            logoutButton?.addEventListener('click', logoutUser);
        } else {
            userStatusDiv.innerHTML = `
                <a href="login.html">Login</a> | <a href="register.html">Cadastro</a>
            `;
        }
    }

    // --- Funções de Avaliação ---
    const getAllRatings = () => getLocalStorageItem('ratings', {});
    const getUserRatings = (username) => {
        if (!username) return {};
        return getAllRatings()[username] || {};
    };
    function saveRating(username, itemType, itemId, ratingValue) {
        if (!username || !itemType || !itemId || ratingValue < 1 || ratingValue > 10) return false;
        const allRatings = getAllRatings();
        if (!allRatings[username]) allRatings[username] = {};
        const itemKey = `${itemType}-${itemId}`;
        allRatings[username][itemKey] = ratingValue;
        if (setLocalStorageItem('ratings', allRatings)) {
             console.log(`Avaliação salva: User ${username}, Item ${itemKey}, Nota ${ratingValue}`); return true;
        } else {
             if(ratingMessage) { ratingMessage.textContent = "Erro ao salvar avaliação."; ratingMessage.className = 'message error'; }
            return false;
        }
    }
    function removeRating(username, itemType, itemId) {
        if (!username || !itemType || !itemId) return false;
        const allRatings = getAllRatings();
        const itemKey = `${itemType}-${itemId}`;
        let ratingRemoved = false;
        if (allRatings[username]?.[itemKey]) {
            delete allRatings[username][itemKey];
            if (Object.keys(allRatings[username]).length === 0) delete allRatings[username];
            ratingRemoved = true;
        }
        if (ratingRemoved) {
            if (setLocalStorageItem('ratings', allRatings)) { console.log(`Avaliação removida: User ${username}, Item ${itemKey}`); return true; }
            else { if(ratingMessage) { ratingMessage.textContent = "Erro ao remover avaliação."; ratingMessage.className = 'message error'; } return false; }
        } return false;
    }
    function setupRatingStars() {
        if (!starsContainer) return;
        const stars = starsContainer.querySelectorAll('i');
        stars.forEach(star => { star.parentNode.replaceChild(star.cloneNode(true), star); }); // Limpa listeners
        const newStars = starsContainer.querySelectorAll('i');
        newStars.forEach(star => {
            star.addEventListener('mouseover', handleStarHover);
            star.addEventListener('mouseout', displayUserRating);
            star.addEventListener('click', handleStarClick);
            star.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStarClick(e); } });
        });
    }
    function handleStarHover(event) {
        if (!starsContainer) return;
        const hoverValue = parseInt(event.target.dataset.value);
        starsContainer.querySelectorAll('i').forEach(star => {
            star.className = parseInt(star.dataset.value) <= hoverValue ? 'fas fa-star' : 'far fa-star';
        });
    }
    function handleStarClick(event) {
        if(!ratingMessage) return;
        const ratingValue = parseInt(event.target.dataset.value);
        const currentUser = getCurrentUser();
        if (!currentUser) { ratingMessage.textContent = 'Faça login para avaliar.'; ratingMessage.className = 'message error'; return; }
        if (!currentModalItemId || !currentModalItemType) return;
        if (saveRating(currentUser, currentModalItemType, currentModalItemId, ratingValue)) {
            ratingMessage.textContent = `Sua avaliação (${ratingValue}/10) foi salva!`; ratingMessage.className = 'message success';
            displayUserRating();
        }
    }
    function displayUserRating() {
        if (!starsContainer || !currentModalItemId || !currentModalItemType) return;
        const currentUser = getCurrentUser();
        let userRating = 0;
        if (currentUser) {
            const itemKey = `${currentModalItemType}-${currentModalItemId}`;
            userRating = getUserRatings(currentUser)[itemKey] || 0;
        }
        starsContainer.querySelectorAll('i').forEach(star => {
            const starValue = parseInt(star.dataset.value);
            star.className = starValue <= userRating ? 'fas fa-star' : 'far fa-star';
            star.setAttribute('aria-checked', starValue === userRating ? 'true' : 'false');
        });
        if (ratingMessage) ratingMessage.textContent = '';
        if (removeRatingButton) removeRatingButton.style.display = (userRating > 0 && isLoggedIn()) ? 'inline-block' : 'none';
    }
    function handleRemoveRating() {
        const currentUser = getCurrentUser();
        if (!currentUser || !currentModalItemId || !currentModalItemType || !removeRatingButton || !ratingMessage) return;
        if (removeRating(currentUser, currentModalItemType, currentModalItemId)) {
            ratingMessage.textContent = 'Sua avaliação foi removida.'; ratingMessage.className = 'message success';
            displayUserRating();
        }
    }

    // --- Carregamento de Itens (Index) ---
    async function loadItems(query = '') {
        if (!itemsContainer) return;
        itemsContainer.innerHTML = '<p>Carregando...</p>';
        let data = null;
        if (query) {
            if (mainSectionTitle) mainSectionTitle.textContent = `Resultados para "${query}"`;
            data = await fetchTMDB('/search/multi', { query: query, include_adult: 'false' });
            if (data?.results) data.results = data.results.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
        } else {
            if (mainSectionTitle) mainSectionTitle.textContent = 'Populares';
            const [moviesData, tvData] = await Promise.all([fetchTMDB('/movie/popular'), fetchTMDB('/tv/popular')]);
            const popularMovies = moviesData?.results?.map(m => ({...m, media_type: 'movie'})) || [];
            const popularTV = tvData?.results?.map(t => ({...t, media_type: 'tv'})) || [];
            let combinedResults = [];
            const maxLength = Math.max(popularMovies.length, popularTV.length);
            for(let i=0; i<maxLength; i++) { if(popularMovies[i]) combinedResults.push(popularMovies[i]); if(popularTV[i]) combinedResults.push(popularTV[i]); }
            data = { results: combinedResults };
        }
        if (data?.results) displayItems(data.results);
        else if (!query) itemsContainer.innerHTML = '<p>Não foi possível carregar itens populares.</p>';
    }

    // --- *** LÓGICA DA PÁGINA DE PERFIL *** ---
    async function loadProfilePage() {
        // 1. Verificar se está logado
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.log("Usuário não logado, redirecionando para login.");
            window.location.href = 'login.html'; // Redireciona se não estiver logado
            return;
        }

        // 2. Atualizar título da página
        if (profileTitle) {
            profileTitle.textContent = `Perfil de ${currentUser}`;
        } else {
            console.error("Elemento #profile-title não encontrado.");
            return; // Não pode continuar sem o título
        }
        if (!ratedItemsContainer) {
            console.error("Elemento #rated-items-container não encontrado.");
            return; // Não pode continuar sem o container
        }
        ratedItemsContainer.innerHTML = '<p>Carregando suas avaliações...</p>'; // Feedback

        // 3. Obter avaliações do usuário
        const userRatings = getUserRatings(currentUser);
        const ratedItemKeys = Object.keys(userRatings); // ['movie-123', 'tv-456', ...]

        if (ratedItemKeys.length === 0) {
            ratedItemsContainer.innerHTML = '<p>Você ainda não avaliou nenhum item.</p>';
            return;
        }

        // 4. Buscar detalhes de cada item avaliado na API TMDB
        const detailPromises = ratedItemKeys.map(itemKey => {
            const [itemType, itemId] = itemKey.split('-'); // 'movie', '123'
            if (!itemType || !itemId) return Promise.resolve(null); // Ignora chave inválida
            return fetchTMDB(`/${itemType}/${itemId}`);
        });

        try {
            const itemDetailsArray = await Promise.all(detailPromises);

            // 5. Exibir os itens avaliados
            ratedItemsContainer.innerHTML = ''; // Limpa o carregando
            const fragment = document.createDocumentFragment();

            itemDetailsArray.forEach((details, index) => {
                if (!details) return; // Pula se a busca falhou para este item

                const itemKey = ratedItemKeys[index];
                const userRatingValue = userRatings[itemKey];
                const title = details.title || details.name || 'Título Indisponível';
                const posterUrl = details.poster_path ? `${imageUrlBase}${details.poster_path}` : placeholderImage;
                const itemType = itemKey.startsWith('movie') ? 'movie' : 'tv'; // Redetermina o tipo pela chave

                const card = document.createElement('div');
                // Usar uma classe diferente ou adicional para estilização específica do perfil
                card.className = 'item-card rated-item-card';
                card.dataset.id = details.id;
                card.dataset.type = itemType;
                // Opcional: tornar clicável para abrir modal (requer modal em profile.html)
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', `Ver detalhes de ${title}, sua nota ${userRatingValue}`);

                card.innerHTML = `
                    <img src="${posterUrl}" alt="Poster de ${title}" loading="lazy" onerror="this.onerror=null;this.src='${placeholderImage}';">
                    <div class="info">
                        <h3>${title}</h3>
                        <p class="user-rating">Sua Nota: ${userRatingValue} / 10</p>
                         </div>
                `;

                 // Opcional: Listener para abrir modal se o modal existir nesta página
                if (modal) {
                    const openModalAction = () => showDetailsModal(details.id, itemType);
                    card.addEventListener('click', openModalAction);
                    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModalAction(); } });
                }

                fragment.appendChild(card);
            });

            if (fragment.childElementCount === 0 && ratedItemKeys.length > 0) {
                 ratedItemsContainer.innerHTML = '<p>Não foi possível carregar os detalhes dos itens avaliados.</p>';
            } else if(fragment.childElementCount > 0) {
                 ratedItemsContainer.appendChild(fragment);
            } else {
                 // Caso raro: Nenhuma promessa retornou detalhes válidos
                  ratedItemsContainer.innerHTML = '<p>Erro ao buscar detalhes das suas avaliações.</p>';
            }


        } catch (error) {
            console.error("Erro ao buscar detalhes dos itens avaliados:", error);
            ratedItemsContainer.innerHTML = '<p>Ocorreu um erro ao carregar suas avaliações. Tente recarregar.</p>';
        }
    }


    // --- Inicialização e Event Listeners Globais ---
    updateUserStatus(); // Sempre atualiza o header

    // Carrega conteúdo específico da página
    if (itemsContainer) loadItems(); // Página Index
    if (ratedItemsContainer) loadProfilePage(); // Página Perfil

    // Listeners de UI (Busca, Modal, Forms)
    if (searchButton && searchInput) {
        const performSearch = () => loadItems(searchInput.value.trim());
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    }
    if (modal && closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
        modal.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
    }
    if (removeRatingButton) removeRatingButton.addEventListener('click', handleRemoveRating);
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = loginForm.querySelector('#username')?.value.trim();
            const p = loginForm.querySelector('#password')?.value;
            if (u && p) loginUser(u, p);
            else if(loginMessage) { loginMessage.textContent = 'Preencha usuário e senha.'; loginMessage.className = 'message error'; }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = registerForm.querySelector('#username')?.value.trim();
            const p = registerForm.querySelector('#password')?.value;
            if (u && p) {
                if (p.length < 6) { if(registerMessage) { registerMessage.textContent = 'Senha muito curta (mínimo 6 caracteres).'; registerMessage.className = 'message error'; } return; }
                registerUser(u, p);
            } else { if(registerMessage) { registerMessage.textContent = 'Preencha usuário e senha.'; registerMessage.className = 'message error'; }}
        });
    }

}); // Fim do DOMContentLoaded