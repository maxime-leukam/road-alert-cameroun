
// Variables globales
let map;
let incidents = [];
let currentUser = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Fonction d'initialisation principale
function initializeApp() {
    // Vérifier l'authentification
    checkAuthentication();
    
    // Initialiser la carte si elle existe sur la page
    if (document.getElementById('leaflet-map')) {
        initializeMap();
        loadIncidents();
    }
    
    // Charger les statistiques
    loadStats();
    
    // Initialiser les événements
    initializeEvents();
    
    // Vérifier la géolocalisation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            console.log('Position obtenue:', position.coords);
        });
    }
}

// Fonction pour vérifier l'authentification
function checkAuthentication() {
    const token = localStorage.getItem('userToken');
    if (token) {
        // Vérifier la validité du token
        fetch('api/verify_token.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                updateUIForLoggedUser();
            } else {
                localStorage.removeItem('userToken');
            }
        })
        .catch(error => {
            console.error('Erreur de vérification du token:', error);
        });
    }
}

// Mettre à jour l'interface pour un utilisateur connecté
function updateUIForLoggedUser() {
    const connexionLink = document.querySelector('a[href="connexion.html"]');
    if (connexionLink && currentUser) {
        connexionLink.textContent = currentUser.nom;
        connexionLink.href = 'profil.html';
    }
}

// Initialisation de la carte Leaflet
function initializeMap() {
    // Coordonnées du Cameroun (Yaoundé)
    const cameroonCenter = [3.848, 11.502];
    
    // Initialiser la carte
    map = L.map('leaflet-map').setView(cameroonCenter, 7);
    
    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Définir les icônes personnalisées pour les incidents
    window.incidentIcons = {
        accident: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #e74c3c; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-car-crash" style="font-size: 12px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        embouteillage: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #f39c12; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-traffic-light" style="font-size: 12px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        obstacle: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #9b59b6; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-exclamation-triangle" style="font-size: 12px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        route_fermee: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #34495e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-ban" style="font-size: 12px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    };
    
    // Ajouter un contrôle de géolocalisation
    L.control.locate({
        position: 'topright',
        strings: {
            title: "Me localiser"
        }
    }).addTo(map);
    
    console.log('Carte initialisée avec succès');
}

// Charger les incidents depuis l'API
function loadIncidents() {
    fetch('api/get_incidents.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                incidents = data.incidents;
                displayIncidentsOnMap();
            } else {
                console.error('Erreur lors du chargement des incidents:', data.message);
            }
        })
        .catch(error => {
            console.error('Erreur réseau:', error);
            // Charger des données de test en cas d'erreur
            loadTestIncidents();
        });
}

// Charger des incidents de test pour la démonstration
function loadTestIncidents() {
    const testIncidents = [
        {
            id: 1,
            type: 'accident',
            latitude: 3.8480,
            longitude: 11.5021,
            description: 'Accident entre deux véhicules sur l\'Avenue Kennedy',
            ville: 'Yaoundé',
            statut: 'nouveau',
            date_creation: '2024-01-15 10:30:00'
        },
        {
            id: 2,
            type: 'embouteillage',
            latitude: 4.0511,
            longitude: 9.7679,
            description: 'Embouteillage important sur le Boulevard de la Liberté',
            ville: 'Douala',
            statut: 'en_cours',
            date_creation: '2024-01-15 09:15:00'
        },
        {
            id: 3,
            type: 'obstacle',
            latitude: 3.8600,
            longitude: 11.5200,
            description: 'Arbre tombé sur la chaussée Route de Nsimalen',
            ville: 'Yaoundé',
            statut: 'nouveau',
            date_creation: '2024-01-15 08:45:00'
        },
        {
            id: 4,
            type: 'route_fermee',
            latitude: 4.0400,
            longitude: 9.7500,
            description: 'Route fermée pour travaux d\'aménagement',
            ville: 'Douala',
            statut: 'en_cours',
            date_creation: '2024-01-14 16:20:00'
        }
    ];
    
    incidents = testIncidents;
    displayIncidentsOnMap();
}

// Afficher les incidents sur la carte
function displayIncidentsOnMap() {
    if (!map || !incidents) return;
    
    // Supprimer les marqueurs existants
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Ajouter les nouveaux marqueurs
    incidents.forEach(incident => {
        const icon = window.incidentIcons[incident.type] || window.incidentIcons.accident;
        
        const marker = L.marker([incident.latitude, incident.longitude], {
            icon: icon
        }).addTo(map);
        
        // Créer le contenu du popup
        const popupContent = `
            <div class="incident-popup">
                <h3>${getIncidentTypeLabel(incident.type)}</h3>
                <p><strong>Description:</strong> ${incident.description}</p>
                <p><strong>Ville:</strong> ${incident.ville}</p>
                <p><strong>Statut:</strong> <span class="status ${incident.statut}">${getStatusLabel(incident.statut)}</span></p>
                <p><strong>Signalé le:</strong> ${formatDate(incident.date_creation)}</p>
                <div class="popup-actions">
                    <button onclick="showIncidentDetails(${incident.id})" class="btn btn-sm btn-primary">
                        <i class="fas fa-eye"></i> Détails
                    </button>
                    ${currentUser ? `<button onclick="reportUpdate(${incident.id})" class="btn btn-sm btn-secondary">
                        <i class="fas fa-flag"></i> Signaler
                    </button>` : ''}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    });
    
    console.log(`${incidents.length} incidents affichés sur la carte`);
}

// Obtenir le libellé du type d'incident
function getIncidentTypeLabel(type) {
    const labels = {
        'accident': 'Accident',
        'embouteillage': 'Embouteillage',
        'obstacle': 'Obstacle',
        'route_fermee': 'Route fermée'
    };
    return labels[type] || type;
}

// Obtenir le libellé du statut
function getStatusLabel(statut) {
    const labels = {
        'nouveau': 'Nouveau',
        'en_cours': 'En cours',
        'resolu': 'Résolu'
    };
    return labels[statut] || statut;
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Charger les statistiques
function loadStats() {
    fetch('api/get_stats.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateStatsDisplay(data.stats);
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des statistiques:', error);
            // Afficher des statistiques de test
            updateStatsDisplay({
                total_incidents: 156,
                resolved_incidents: 89,
                total_users: 1250
            });
        });
}

// Mettre à jour l'affichage des statistiques
function updateStatsDisplay(stats) {
    const totalElement = document.getElementById('totalIncidents');
    const resolvedElement = document.getElementById('resolvedIncidents');
    const usersElement = document.getElementById('totalUsers');
    
    if (totalElement) animateCounter(totalElement, 0, stats.total_incidents, 2000);
    if (resolvedElement) animateCounter(resolvedElement, 0, stats.resolved_incidents, 2000);
    if (usersElement) animateCounter(usersElement, 0, stats.total_users, 2000);
}

// Animation des compteurs
function animateCounter(element, start, end, duration) {
    const startTime = performance.now();
    const startVal = start;
    const endVal = end;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentVal = Math.floor(startVal + (endVal - startVal) * progress);
        element.textContent = currentVal.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Initialiser les événements
function initializeEvents() {
    // Menu mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }
    
    // Formulaires
    initializeForms();
    
    // Notifications
    initializeNotifications();
}

// Initialiser les formulaires
function initializeForms() {
    // Formulaire de signalement
    const signalementForm = document.getElementById('signalement-form');
    if (signalementForm) {
        signalementForm.addEventListener('submit', handleSignalementSubmit);
    }
    
    // Formulaire de connexion
    const connexionForm = document.getElementById('connexion-form');
    if (connexionForm) {
        connexionForm.addEventListener('submit', handleConnexionSubmit);
    }
    
    // Formulaire d'inscription
    const inscriptionForm = document.getElementById('inscription-form');
    if (inscriptionForm) {
        inscriptionForm.addEventListener('submit', handleInscriptionSubmit);
    }
}

// Gérer la soumission du formulaire de signalement
function handleSignalementSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Ajouter la géolocalisation si disponible
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            formData.append('latitude', position.coords.latitude);
            formData.append('longitude', position.coords.longitude);
            submitSignalement(formData);
        }, function(error) {
            console.error('Erreur de géolocalisation:', error);
            submitSignalement(formData);
        });
    } else {
        submitSignalement(formData);
    }
}

// Soumettre le signalement
function submitSignalement(formData) {
    fetch('api/add_incident.php', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('userToken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Incident signalé avec succès!', 'success');
            document.getElementById('signalement-form').reset();
            
            // Recharger la carte si elle existe
            if (map) {
                loadIncidents();
            }
        } else {
            showAlert('Erreur lors du signalement: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    });
}

// Gérer la connexion
function handleConnexionSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    fetch('api/login.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('userToken', data.token);
            currentUser = data.user;
            showAlert('Connexion réussie!', 'success');
            
            // Rediriger vers le profil
            setTimeout(() => {
                window.location.href = 'profil.html';
            }, 1500);
        } else {
            showAlert('Erreur de connexion: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    });
}

// Gérer l'inscription
function handleInscriptionSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Vérifier que les mots de passe correspondent
    if (formData.get('mot_de_passe') !== formData.get('confirmer_mot_de_passe')) {
        showAlert('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    fetch('api/register.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Inscription réussie! Vous pouvez maintenant vous connecter.', 'success');
            
            // Rediriger vers la page de connexion
            setTimeout(() => {
                window.location.href = 'connexion.html';
            }, 2000);
        } else {
            showAlert('Erreur lors de l\'inscription: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    });
}

// Afficher une alerte
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        ${message}
        <button onclick="this.parentElement.remove()" class="alert-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Ajouter au début du body ou dans un conteneur spécifique
    const container = document.querySelector('.alert-container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Obtenir l'icône pour l'alerte
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Initialiser les notifications
function initializeNotifications() {
    if (currentUser && 'Notification' in window) {
        Notification.requestPermission();
    }
}

// Fonctions utilitaires globales
window.toggleMenu = function() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('active');
};

window.showIncidentDetails = function(incidentId) {
    // Ouvrir une modal avec les détails de l'incident
    const incident = incidents.find(i => i.id == incidentId);
    if (incident) {
        alert(`Détails de l'incident:\n\nType: ${getIncidentTypeLabel(incident.type)}\nDescription: ${incident.description}\nVille: ${incident.ville}\nStatut: ${getStatusLabel(incident.statut)}`);
    }
};

window.reportUpdate = function(incidentId) {
    // Permettre à l'utilisateur de signaler une mise à jour
    const update = prompt('Que voulez-vous signaler à propos de cet incident?');
    if (update) {
        fetch('api/add_incident_update.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('userToken')
            },
            body: JSON.stringify({
                incident_id: incidentId,
                update: update
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Mise à jour signalée avec succès!', 'success');
            } else {
                showAlert('Erreur lors du signalement de la mise à jour', 'error');
            }
        });
    }
};

// Déconnexion
window.logout = function() {
    localStorage.removeItem('userToken');
    currentUser = null;
    showAlert('Déconnexion réussie', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
};

// Fonction pour rafraîchir les données
window.refreshData = function() {
    if (map) {
        loadIncidents();
    }
    loadStats();
    showAlert('Données actualisées', 'success');
};

console.log('Script principal chargé avec succès');
