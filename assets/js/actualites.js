
// Variables pour les actualités
let currentPage = 1;
let currentCategory = 'all';
let isLoading = false;

// Initialiser la page des actualités
document.addEventListener('DOMContentLoaded', function() {
    initializeNewsPage();
    setupEventListeners();
});

// Initialiser la page
function initializeNewsPage() {
    loadFeaturedArticles();
    loadLatestNews();
    loadDailyStats();
    loadImportantAlerts();
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Filtres par catégorie
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            switchCategory(category);
        });
    });
    
    // Bouton "Charger plus"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }
}

// Changer de catégorie
function switchCategory(category) {
    // Mettre à jour l'interface
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Réinitialiser et recharger
    currentCategory = category;
    currentPage = 1;
    document.getElementById('news-grid').innerHTML = '';
    
    loadLatestNews();
}

// Charger les articles à la une
function loadFeaturedArticles() {
    fetch('api/get_actualites.php?featured=1&limit=3')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayFeaturedArticles(data.articles);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des articles à la une:', error);
            displayFeaturedArticlesFallback();
        });
}

// Afficher les articles à la une
function displayFeaturedArticles(articles) {
    const container = document.getElementById('featured-articles');
    
    if (articles.length === 0) {
        container.innerHTML = '<p>Aucun article à la une pour le moment.</p>';
        return;
    }
    
    let html = '';
    articles.forEach((article, index) => {
        const isMainArticle = index === 0;
        html += `
            <article class="featured-article ${isMainArticle ? 'main-featured' : ''}">
                ${article.image ? `<img src="${article.image}" alt="${article.titre}" class="article-image">` : ''}
                <div class="article-content">
                    <div class="article-meta">
                        <span class="article-category ${article.categorie}">${getCategoryLabel(article.categorie)}</span>
                        <span class="article-date">${formatDate(article.date_publication)}</span>
                    </div>
                    <h3 class="article-title">${article.titre}</h3>
                    <p class="article-excerpt">${getExcerpt(article.contenu, 150)}</p>
                    <div class="article-actions">
                        <button class="btn btn-primary btn-sm" onclick="openArticle(${article.id})">
                            <i class="fas fa-eye"></i> Lire la suite
                        </button>
                        <span class="article-views">
                            <i class="fas fa-eye"></i> ${article.vues} vues
                        </span>
                    </div>
                </div>
            </article>
        `;
    });
    
    container.innerHTML = html;
}

// Charger les dernières actualités
function loadLatestNews() {
    if (isLoading) return;
    
    isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
    }
    
    let url = `api/get_actualites.php?page=${currentPage}&limit=6`;
    if (currentCategory !== 'all') {
        url += `&category=${currentCategory}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayLatestNews(data.articles, currentPage === 1);
                
                // Mettre à jour le bouton "Charger plus"
                if (loadMoreBtn) {
                    if (data.pagination.has_more) {
                        loadMoreBtn.style.display = 'block';
                        loadMoreBtn.disabled = false;
                        loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Charger plus d\'articles';
                    } else {
                        loadMoreBtn.style.display = 'none';
                    }
                }
                
                currentPage++;
            } else {
                showAlert('Erreur lors du chargement des actualités', 'error');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des actualités:', error);
            if (currentPage === 1) {
                displayLatestNewsFallback();
            }
        })
        .finally(() => {
            isLoading = false;
        });
}

// Afficher les dernières actualités
function displayLatestNews(articles, replace = false) {
    const container = document.getElementById('news-grid');
    
    if (replace) {
        container.innerHTML = '';
    }
    
    if (articles.length === 0 && replace) {
        container.innerHTML = '<p class="no-articles">Aucune actualité trouvée pour cette catégorie.</p>';
        return;
    }
    
    articles.forEach(article => {
        const articleElement = document.createElement('article');
        articleElement.className = 'news-article';
        articleElement.innerHTML = `
            ${article.image ? `<img src="${article.image}" alt="${article.titre}" class="article-image">` : ''}
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category ${article.categorie}">${getCategoryLabel(article.categorie)}</span>
                    <span class="article-date">${formatDate(article.date_publication)}</span>
                </div>
                <h3 class="article-title">${article.titre}</h3>
                <p class="article-excerpt">${getExcerpt(article.contenu, 100)}</p>
                <div class="article-actions">
                    <button class="btn btn-primary btn-sm" onclick="openArticle(${article.id})">
                        <i class="fas fa-eye"></i> Lire
                    </button>
                    <span class="article-views">
                        <i class="fas fa-eye"></i> ${article.vues}
                    </span>
                </div>
            </div>
        `;
        
        container.appendChild(articleElement);
    });
}

// Charger plus d'actualités
function loadMoreNews() {
    loadLatestNews();
}

// Charger les statistiques du jour
function loadDailyStats() {
    fetch('api/get_daily_stats.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDailyStats(data.stats);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des statistiques:', error);
            displayDailyStatsFallback();
        });
}

// Mettre à jour les statistiques du jour
function updateDailyStats(stats) {
    document.getElementById('daily-incidents').textContent = stats.daily_incidents || 0;
    document.getElementById('daily-resolved').textContent = stats.daily_resolved || 0;
    document.getElementById('avg-resolution').textContent = (stats.avg_resolution || 0) + 'h';
}

// Charger les alertes importantes
function loadImportantAlerts() {
    fetch('api/get_important_alerts.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayImportantAlerts(data.alerts);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des alertes:', error);
            displayImportantAlertsFallback();
        });
}

// Afficher les alertes importantes
function displayImportantAlerts(alerts) {
    const container = document.getElementById('important-alerts');
    
    if (alerts.length === 0) {
        container.innerHTML = '<p>Aucune alerte importante pour le moment.</p>';
        return;
    }
    
    let html = '';
    alerts.forEach(alert => {
        html += `
            <div class="alert-item ${alert.type}">
                <div class="alert-icon">
                    <i class="fas fa-${getAlertIcon(alert.type)}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.titre}</h4>
                    <p>${alert.message}</p>
                    <span class="alert-time">${formatDate(alert.date_creation)}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Ouvrir un article dans la modal
function openArticle(articleId) {
    fetch(`api/get_article.php?id=${articleId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayArticleModal(data.article);
                
                // Incrémenter le nombre de vues
                incrementArticleViews(articleId);
            } else {
                showAlert('Erreur lors du chargement de l\'article', 'error');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            showAlert('Erreur lors du chargement de l\'article', 'error');
        });
}

// Afficher l'article dans la modal
function displayArticleModal(article) {
    document.getElementById('modal-article-title').textContent = article.titre;
    
    const content = `
        <div class="article-full">
            <div class="article-meta-full">
                <span class="article-category ${article.categorie}">${getCategoryLabel(article.categorie)}</span>
                <span class="article-date">${formatDate(article.date_publication)}</span>
                <span class="article-author">Par ${article.auteur_nom}</span>
                <span class="article-views"><i class="fas fa-eye"></i> ${article.vues} vues</span>
            </div>
            
            ${article.image ? `<img src="${article.image}" alt="${article.titre}" class="article-image-full">` : ''}
            
            <div class="article-content-full">
                ${article.contenu.replace(/\n/g, '<br>')}
            </div>
            
            <div class="article-actions-full">
                <button class="btn btn-secondary" onclick="shareArticle(${article.id})">
                    <i class="fas fa-share"></i> Partager
                </button>
                <button class="btn btn-secondary" onclick="printArticle()">
                    <i class="fas fa-print"></i> Imprimer
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('modal-article-content').innerHTML = content;
    document.getElementById('article-modal').style.display = 'flex';
}

// Fermer la modal d'article
function closeArticleModal() {
    document.getElementById('article-modal').style.display = 'none';
}

// Incrémenter le nombre de vues d'un article
function incrementArticleViews(articleId) {
    fetch('api/increment_article_views.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ article_id: articleId })
    }).catch(error => {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
    });
}

// Fonctions utilitaires
function getCategoryLabel(category) {
    const labels = {
        'securite': 'Sécurité',
        'circulation': 'Circulation',
        'meteo': 'Météo',
        'interventions': 'Interventions',
        'generale': 'Général'
    };
    return labels[category] || category;
}

function getExcerpt(content, maxLength) {
    if (content.length <= maxLength) return content;
    return content.substr(0, maxLength) + '...';
}

function getAlertIcon(type) {
    const icons = {
        'urgence': 'exclamation-triangle',
        'info': 'info-circle',
        'warning': 'exclamation-circle',
        'success': 'check-circle'
    };
    return icons[type] || 'bell';
}

function shareArticle(articleId) {
    const url = `${window.location.origin}/article.php?id=${articleId}`;
    
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('modal-article-title').textContent,
            url: url
        });
    } else {
        // Fallback: copier l'URL dans le presse-papiers
        navigator.clipboard.writeText(url).then(() => {
            showAlert('Lien copié dans le presse-papiers', 'success');
        });
    }
}

function printArticle() {
    window.print();
}

// Données de fallback en cas d'erreur de chargement
function displayFeaturedArticlesFallback() {
    const container = document.getElementById('featured-articles');
    container.innerHTML = `
        <article class="featured-article main-featured">
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category securite">Sécurité</span>
                    <span class="article-date">15 janvier 2024</span>
                </div>
                <h3 class="article-title">Nouvelle campagne de sécurité routière au Cameroun</h3>
                <p class="article-excerpt">Le gouvernement lance une nouvelle campagne de sensibilisation à la sécurité routière dans toutes les régions du pays...</p>
                <div class="article-actions">
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i> Lire la suite
                    </button>
                    <span class="article-views">
                        <i class="fas fa-eye"></i> 1250 vues
                    </span>
                </div>
            </div>
        </article>
    `;
}

function displayLatestNewsFallback() {
    const container = document.getElementById('news-grid');
    container.innerHTML = `
        <article class="news-article">
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category circulation">Circulation</span>
                    <span class="article-date">14 janvier 2024</span>
                </div>
                <h3 class="article-title">Travaux sur l'autoroute Yaoundé-Douala</h3>
                <p class="article-excerpt">Des travaux de rénovation vont débuter la semaine prochaine...</p>
                <div class="article-actions">
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i> Lire
                    </button>
                    <span class="article-views">
                        <i class="fas fa-eye"></i> 856
                    </span>
                </div>
            </div>
        </article>
        <article class="news-article">
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category meteo">Météo</span>
                    <span class="article-date">13 janvier 2024</span>
                </div>
                <h3 class="article-title">Prévisions météorologiques : Fortes pluies attendues</h3>
                <p class="article-excerpt">Météo Cameroun annonce de fortes pluies dans plusieurs régions...</p>
                <div class="article-actions">
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-eye"></i> Lire
                    </button>
                    <span class="article-views">
                        <i class="fas fa-eye"></i> 642
                    </span>
                </div>
            </div>
        </article>
    `;
}

function displayDailyStatsFallback() {
    document.getElementById('daily-incidents').textContent = '12';
    document.getElementById('daily-resolved').textContent = '8';
    document.getElementById('avg-resolution').textContent = '2.5h';
}

function displayImportantAlertsFallback() {
    const container = document.getElementById('important-alerts');
    container.innerHTML = `
        <div class="alert-item warning">
            <div class="alert-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <h4>Route fermée</h4>
                <p>L'autoroute Yaoundé-Douala est fermée pour travaux entre 22h et 6h.</p>
                <span class="alert-time">Il y a 2 heures</span>
            </div>
        </div>
    `;
}

// Fermer la modal en cliquant à l'extérieur
window.addEventListener('click', function(event) {
    const modal = document.getElementById('article-modal');
    if (event.target === modal) {
        closeArticleModal();
    }
});

console.log('Script des actualités chargé avec succès');
