
// Variables pour le profil
let currentUser = null;
let activeTab = 'overview';

// Initialiser la page de profil
document.addEventListener('DOMContentLoaded', function() {
    checkAuthenticationAndLoadProfile();
    setupProfileEventListeners();
});

// Vérifier l'authentification et charger le profil
function checkAuthenticationAndLoadProfile() {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
        // Rediriger vers la page de connexion
        window.location.href = 'connexion.html?return=profil.html';
        return;
    }
    
    // Vérifier la validité du token et charger les données utilisateur
    fetch('api/verify_token.php', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            loadUserProfile();
        } else {
            localStorage.removeItem('userToken');
            window.location.href = 'connexion.html?return=profil.html';
        }
    })
    .catch(error => {
        console.error('Erreur de vérification du token:', error);
        localStorage.removeItem('userToken');
        window.location.href = 'connexion.html?return=profil.html';
    });
}

// Charger le profil utilisateur
function loadUserProfile() {
    // Mettre à jour les informations de base
    document.getElementById('profile-name').textContent = `${currentUser.prenom} ${currentUser.nom}`;
    document.getElementById('profile-email').textContent = currentUser.email;
    
    // Charger les statistiques utilisateur
    loadUserStats();
    
    // Charger le contenu de l'onglet actif
    loadTabContent(activeTab);
}

// Charger les statistiques utilisateur
function loadUserStats() {
    fetch('api/get_user_stats.php', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const stats = data.stats;
            
            // Mettre à jour les statistiques dans la sidebar
            document.getElementById('user-incidents').textContent = stats.total_incidents || 0;
            document.getElementById('user-contributions').textContent = stats.total_contributions || 0;
            
            // Mettre à jour les statistiques dans la vue d'ensemble
            document.getElementById('overview-incidents').textContent = stats.total_incidents || 0;
            document.getElementById('overview-resolved').textContent = stats.resolved_incidents || 0;
            document.getElementById('overview-score').textContent = stats.contribution_score || 0;
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement des statistiques:', error);
        setFallbackStats();
    });
}

// Configurer les écouteurs d'événements
function setupProfileEventListeners() {
    // Navigation entre les onglets
    document.querySelectorAll('.profile-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Formulaires
    setupFormEventListeners();
}

// Changer d'onglet
function switchTab(tab) {
    // Mettre à jour la navigation
    document.querySelectorAll('.profile-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Masquer tous les onglets
    document.querySelectorAll('.profile-tab').forEach(tabContent => {
        tabContent.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    activeTab = tab;
    
    // Charger le contenu de l'onglet
    loadTabContent(tab);
}

// Charger le contenu d'un onglet
function loadTabContent(tab) {
    switch(tab) {
        case 'overview':
            loadOverviewContent();
            break;
        case 'incidents':
            loadUserIncidents();
            break;
        case 'favorites':
            loadFavoriteCities();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'settings':
            loadUserSettings();
            break;
        case 'support':
            // Le contenu est déjà statique
            break;
    }
}

// Charger le contenu de la vue d'ensemble
function loadOverviewContent() {
    fetch('api/get_user_activity.php', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayRecentActivity(data.activities);
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement de l\'activité:', error);
        displayFallbackActivity();
    });
}

// Afficher l'activité récente
function displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity-list');
    
    if (activities.length === 0) {
        container.innerHTML = '<p>Aucune activité récente.</p>';
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        const icon = getActivityIcon(activity.action);
        const description = getActivityDescription(activity);
        
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${description}</p>
                    <span class="activity-time">${formatDate(activity.date_creation)}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Charger les incidents de l'utilisateur
function loadUserIncidents() {
    const status = document.getElementById('incidents-filter-status')?.value || 'all';
    const type = document.getElementById('incidents-filter-type')?.value || 'all';
    
    let url = 'api/get_user_incidents.php';
    const params = new URLSearchParams();
    
    if (status !== 'all') params.append('status', status);
    if (type !== 'all') params.append('type', type);
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayUserIncidents(data.incidents);
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement des incidents:', error);
        displayFallbackIncidents();
    });
}

// Afficher les incidents de l'utilisateur
function displayUserIncidents(incidents) {
    const container = document.getElementById('user-incidents-list');
    
    if (incidents.length === 0) {
        container.innerHTML = '<p>Aucun incident trouvé.</p>';
        return;
    }
    
    let html = '';
    incidents.forEach(incident => {
        html += `
            <div class="incident-item">
                <div class="incident-header">
                    <h4>${getIncidentTypeLabel(incident.type)}</h4>
                    <span class="status ${incident.statut}">${getStatusLabel(incident.statut)}</span>
                </div>
                <p class="incident-description">${incident.description}</p>
                <div class="incident-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${incident.ville}</span>
                    <span><i class="fas fa-clock"></i> ${formatDate(incident.date_creation)}</span>
                    ${incident.signalements_supplementaires > 0 ? 
                        `<span><i class="fas fa-users"></i> +${incident.signalements_supplementaires} signalement(s)</span>` : ''}
                </div>
                <div class="incident-actions">
                    <button class="btn btn-sm btn-secondary" onclick="viewIncidentOnMap(${incident.latitude}, ${incident.longitude})">
                        <i class="fas fa-map"></i> Voir sur la carte
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Charger les villes favorites
function loadFavoriteCities() {
    fetch('api/get_user_favorites.php', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayFavoriteCities(data.favorites);
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement des villes favorites:', error);
        displayFallbackFavorites();
    });
}

// Afficher les villes favorites
function displayFavoriteCities(favorites) {
    const container = document.getElementById('favorite-cities-list');
    
    if (favorites.length === 0) {
        container.innerHTML = '<p>Aucune ville favorite configurée.</p>';
        return;
    }
    
    let html = '';
    favorites.forEach(favorite => {
        html += `
            <div class="favorite-item">
                <div class="favorite-info">
                    <h4>${favorite.ville}</h4>
                    <p>Notifications: ${favorite.notifications_actives ? 'Activées' : 'Désactivées'}</p>
                </div>
                <div class="favorite-actions">
                    <button class="btn btn-sm ${favorite.notifications_actives ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleFavoriteNotifications(${favorite.id}, ${!favorite.notifications_actives})">
                        <i class="fas fa-${favorite.notifications_actives ? 'bell-slash' : 'bell'}"></i>
                        ${favorite.notifications_actives ? 'Désactiver' : 'Activer'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeFavoriteCity(${favorite.id})">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Charger les notifications
function loadNotifications() {
    fetch('api/get_user_notifications.php', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayNotifications(data.notifications);
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement des notifications:', error);
        displayFallbackNotifications();
    });
}

// Afficher les notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p>Aucune notification.</p>';
        return;
    }
    
    let html = '';
    notifications.forEach(notification => {
        html += `
            <div class="notification-item ${notification.lue ? '' : 'unread'}">
                <div class="notification-icon">
                    <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notification.titre}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${formatDate(notification.date_creation)}</span>
                </div>
                ${!notification.lue ? `
                    <button class="btn btn-sm btn-secondary" onclick="markNotificationAsRead(${notification.id})">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Charger les paramètres utilisateur
function loadUserSettings() {
    if (currentUser) {
        document.getElementById('settings-nom').value = currentUser.nom || '';
        document.getElementById('settings-prenom').value = currentUser.prenom || '';
        document.getElementById('settings-email').value = currentUser.email || '';
        document.getElementById('settings-telephone').value = currentUser.telephone || '';
        document.getElementById('settings-ville').value = currentUser.ville_residence || '';
    }
}

// Configuration des écouteurs d'événements pour les formulaires
function setupFormEventListeners() {
    // Formulaire d'ajout de ville favorite
    const addFavoriteForm = document.getElementById('add-favorite-form');
    if (addFavoriteForm) {
        addFavoriteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addFavoriteCity();
        });
    }
    
    // Formulaire de paramètres de notification
    const notificationForm = document.getElementById('notification-settings-form');
    if (notificationForm) {
        notificationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNotificationSettings();
        });
    }
    
    // Formulaire de paramètres du profil
    const profileForm = document.getElementById('profile-settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfileSettings();
        });
    }
    
    // Formulaire de changement de mot de passe
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
    
    // Formulaire de contact
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendContactMessage();
        });
    }
    
    // Filtres des incidents
    const statusFilter = document.getElementById('incidents-filter-status');
    const typeFilter = document.getElementById('incidents-filter-type');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', loadUserIncidents);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', loadUserIncidents);
    }
}

// Ajouter une ville favorite
function addFavoriteCity() {
    const city = document.getElementById('favorite-city').value;
    
    if (!city) {
        showAlert('Veuillez sélectionner une ville', 'warning');
        return;
    }
    
    fetch('api/add_favorite_city.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify({ ville: city })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Ville ajoutée aux favoris', 'success');
            document.getElementById('favorite-city').value = '';
            loadFavoriteCities();
        } else {
            showAlert(data.message || 'Erreur lors de l\'ajout', 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion', 'error');
    });
}

// Fonctions utilitaires
function getActivityIcon(action) {
    const icons = {
        'incident_created': 'exclamation-triangle',
        'incident_updated': 'edit',
        'login': 'sign-in-alt',
        'profile_updated': 'user-edit'
    };
    return icons[action] || 'circle';
}

function getActivityDescription(activity) {
    const descriptions = {
        'incident_created': 'Incident signalé',
        'incident_updated': 'Incident mis à jour',
        'login': 'Connexion',
        'profile_updated': 'Profil mis à jour'
    };
    return descriptions[activity.action] || activity.action;
}

function getNotificationIcon(type) {
    const icons = {
        'nouveau_incident': 'exclamation-triangle',
        'incident_resolu': 'check-circle',
        'actualite': 'newspaper',
        'systeme': 'cog'
    };
    return icons[type] || 'bell';
}

function viewIncidentOnMap(latitude, longitude) {
    // Rediriger vers la page d'accueil avec les coordonnées
    window.location.href = `index.html#map?lat=${latitude}&lng=${longitude}`;
}

function toggleFavoriteNotifications(favoriteId, enable) {
    fetch('api/toggle_favorite_notifications.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify({ 
            favorite_id: favoriteId, 
            notifications_actives: enable 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Paramètres mis à jour', 'success');
            loadFavoriteCities();
        } else {
            showAlert('Erreur lors de la mise à jour', 'error');
        }
    });
}

function removeFavoriteCity(favoriteId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ville de vos favoris ?')) {
        fetch('api/remove_favorite_city.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('userToken')
            },
            body: JSON.stringify({ favorite_id: favoriteId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Ville supprimée des favoris', 'success');
                loadFavoriteCities();
            } else {
                showAlert('Erreur lors de la suppression', 'error');
            }
        });
    }
}

function markNotificationAsRead(notificationId) {
    fetch('api/mark_notification_read.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify({ notification_id: notificationId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotifications();
        }
    });
}

function showChangePasswordModal() {
    document.getElementById('change-password-modal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('change-password-modal').style.display = 'none';
    document.getElementById('change-password-form').reset();
}

function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    
    if (newPassword !== confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    fetch('api/change_password.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Mot de passe modifié avec succès', 'success');
            closeChangePasswordModal();
        } else {
            showAlert(data.message || 'Erreur lors du changement de mot de passe', 'error');
        }
    });
}

function saveProfileSettings() {
    const formData = {
        nom: document.getElementById('settings-nom').value,
        prenom: document.getElementById('settings-prenom').value,
        email: document.getElementById('settings-email').value,
        telephone: document.getElementById('settings-telephone').value,
        ville_residence: document.getElementById('settings-ville').value
    };
    
    fetch('api/update_profile.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Profil mis à jour avec succès', 'success');
            currentUser = { ...currentUser, ...formData };
            document.getElementById('profile-name').textContent = `${formData.prenom} ${formData.nom}`;
            document.getElementById('profile-email').textContent = formData.email;
        } else {
            showAlert(data.message || 'Erreur lors de la mise à jour', 'error');
        }
    });
}

function saveNotificationSettings() {
    const settings = {
        email_notifications: document.getElementById('email-notifications').checked,
        browser_notifications: document.getElementById('browser-notifications').checked,
        incident_notifications: document.getElementById('incident-notifications').checked
    };
    
    fetch('api/update_notification_settings.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Paramètres de notification mis à jour', 'success');
        } else {
            showAlert('Erreur lors de la mise à jour', 'error');
        }
    });
}

function sendContactMessage() {
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;
    
    fetch('api/send_contact_message.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        },
        body: JSON.stringify({
            subject: subject,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Message envoyé avec succès', 'success');
            document.getElementById('contact-form').reset();
        } else {
            showAlert('Erreur lors de l\'envoi du message', 'error');
        }
    });
}

function editAvatar() {
    // TODO: Implémenter l'upload d'avatar
    showAlert('Fonctionnalité à venir', 'info');
}

// Données de fallback
function setFallbackStats() {
    document.getElementById('user-incidents').textContent = '0';
    document.getElementById('user-contributions').textContent = '0';
    document.getElementById('overview-incidents').textContent = '0';
    document.getElementById('overview-resolved').textContent = '0';
    document.getElementById('overview-score').textContent = '0';
}

function displayFallbackActivity() {
    document.getElementById('recent-activity-list').innerHTML = '<p>Aucune activité récente disponible.</p>';
}

function displayFallbackIncidents() {
    document.getElementById('user-incidents-list').innerHTML = '<p>Aucun incident trouvé.</p>';
}

function displayFallbackFavorites() {
    document.getElementById('favorite-cities-list').innerHTML = '<p>Aucune ville favorite configurée.</p>';
}

function displayFallbackNotifications() {
    document.getElementById('notifications-list').innerHTML = '<p>Aucune notification.</p>';
}

console.log('Script de profil chargé avec succès');
