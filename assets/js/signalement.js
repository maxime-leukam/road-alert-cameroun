
// Variables pour la carte de signalement
let miniMap;
let selectedMarker;
let userLocationMarker;

// Initialiser la page de signalement
document.addEventListener('DOMContentLoaded', function() {
    initializeMiniMap();
    initializeSignalementEvents();
    loadRecentIncidents();
});

// Initialiser la mini-carte
function initializeMiniMap() {
    // Centrer sur Yaoundé par défaut
    const cameroonCenter = [3.848, 11.502];
    
    miniMap = L.map('mini-map').setView(cameroonCenter, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(miniMap);
    
    // Ajouter un événement de clic sur la carte
    miniMap.on('click', function(e) {
        setLocationOnMap(e.latlng.lat, e.latlng.lng);
    });
    
    console.log('Mini-carte initialisée');
}

// Définir la localisation sur la carte
function setLocationOnMap(lat, lng) {
    // Supprimer le marqueur existant
    if (selectedMarker) {
        miniMap.removeLayer(selectedMarker);
    }
    
    // Ajouter un nouveau marqueur
    selectedMarker = L.marker([lat, lng], {
        draggable: true
    }).addTo(miniMap);
    
    // Permettre de déplacer le marqueur
    selectedMarker.on('dragend', function(e) {
        const position = e.target.getLatLng();
        updateCoordinatesInputs(position.lat, position.lng);
    });
    
    // Mettre à jour les champs de coordonnées
    updateCoordinatesInputs(lat, lng);
    
    // Centrer la carte sur la nouvelle position
    miniMap.setView([lat, lng], 15);
}

// Mettre à jour les champs de coordonnées
function updateCoordinatesInputs(lat, lng) {
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
}

// Initialiser les événements de signalement
function initializeSignalementEvents() {
    // Bouton pour obtenir la position actuelle
    const getLocationBtn = document.getElementById('get-location');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Bouton pour sélectionner sur la carte
    const selectMapBtn = document.getElementById('select-on-map');
    if (selectMapBtn) {
        selectMapBtn.addEventListener('click', function() {
            showAlert('Cliquez sur la carte pour sélectionner la position de l\'incident', 'info');
        });
    }
    
    // Changer de ville met à jour la carte
    const villeSelect = document.getElementById('ville');
    if (villeSelect) {
        villeSelect.addEventListener('change', function() {
            centerMapOnCity(this.value);
        });
    }
    
    // Prévisualisation de l'image
    const photoInput = document.getElementById('photo');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoPreview);
    }
    
    // Validation du formulaire
    const form = document.getElementById('signalement-form');
    if (form) {
        form.addEventListener('submit', validateSignalementForm);
    }
}

// Obtenir la position actuelle de l'utilisateur
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showAlert('La géolocalisation n\'est pas supportée par votre navigateur', 'error');
        return;
    }
    
    showAlert('Recherche de votre position...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            setLocationOnMap(lat, lng);
            
            // Ajouter un marqueur pour la position de l'utilisateur
            if (userLocationMarker) {
                miniMap.removeLayer(userLocationMarker);
            }
            
            userLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location-icon',
                    html: '<div style="background-color: #3498db; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-user" style="font-size: 10px;"></i></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(miniMap);
            
            showAlert('Position obtenue avec succès!', 'success');
        },
        function(error) {
            let errorMessage = 'Erreur de géolocalisation: ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Permission refusée';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Position non disponible';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Délai dépassé';
                    break;
                default:
                    errorMessage += 'Erreur inconnue';
                    break;
            }
            showAlert(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Centrer la carte sur une ville
function centerMapOnCity(cityName) {
    const cityCoordinates = {
        'Yaoundé': [3.848, 11.502],
        'Douala': [4.0511, 9.7679],
        'Garoua': [9.3265, 13.3935],
        'Bamenda': [5.9631, 10.1591],
        'Maroua': [10.5913, 14.3152],
        'Bafoussam': [5.4825, 10.4173],
        'Ngaoundéré': [7.3167, 13.5833],
        'Bertoua': [4.5833, 13.6833],
        'Ebolowa': [2.9167, 11.15],
        'Kribi': [2.9333, 9.9167],
        'Limbe': [4.0186, 9.2145],
        'Buea': [4.1549, 9.2615]
    };
    
    if (cityCoordinates[cityName]) {
        const coords = cityCoordinates[cityName];
        miniMap.setView(coords, 13);
    }
}

// Gérer la prévisualisation de la photo
function handlePhotoPreview(event) {
    const file = event.target.files[0];
    if (file) {
        // Vérifier la taille du fichier (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('La taille du fichier ne doit pas dépasser 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            showAlert('Veuillez sélectionner un fichier image valide', 'error');
            event.target.value = '';
            return;
        }
        
        // Créer une prévisualisation
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.remove();
            }
            
            const previewDiv = document.createElement('div');
            previewDiv.id = 'photo-preview';
            previewDiv.innerHTML = `
                <div style="margin-top: 1rem; text-align: center;">
                    <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="margin-top: 0.5rem; color: #666;">Prévisualisation de l'image</p>
                </div>
            `;
            
            event.target.parentElement.parentElement.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
        
        showAlert('Image sélectionnée avec succès', 'success');
    }
}

// Valider le formulaire de signalement
function validateSignalementForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Vérifications personnalisées
    const latitude = formData.get('latitude');
    const longitude = formData.get('longitude');
    
    if (!latitude || !longitude) {
        showAlert('Veuillez sélectionner une position sur la carte', 'error');
        return false;
    }
    
    // Vérifier que les coordonnées sont au Cameroun (approximativement)
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (lat < 1.6 || lat > 13.1 || lng < 8.3 || lng > 16.2) {
        showAlert('La position sélectionnée ne semble pas être au Cameroun. Veuillez vérifier.', 'warning');
        return false;
    }
    
    // Si tout est valide, soumettre le formulaire
    submitSignalementForm(formData);
    return false;
}

// Soumettre le formulaire de signalement
function submitSignalementForm(formData) {
    const submitBtn = document.querySelector('#signalement-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Désactiver le bouton et montrer un indicateur de chargement
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    // Ajouter un horodatage
    formData.append('timestamp', new Date().toISOString());
    
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
            showAlert('Incident signalé avec succès! Merci pour votre contribution.', 'success');
            
            // Réinitialiser le formulaire
            document.getElementById('signalement-form').reset();
            
            // Supprimer les marqueurs
            if (selectedMarker) {
                miniMap.removeLayer(selectedMarker);
                selectedMarker = null;
            }
            
            // Supprimer la prévisualisation de l'image
            const preview = document.getElementById('photo-preview');
            if (preview) {
                preview.remove();
            }
            
            // Recharger les incidents récents
            loadRecentIncidents();
            
            // Rediriger vers la page d'accueil après 3 secondes
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            
        } else {
            showAlert('Erreur lors du signalement: ' + (data.message || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur. Veuillez réessayer.', 'error');
    })
    .finally(() => {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Charger les incidents récents
function loadRecentIncidents() {
    fetch('api/get_recent_incidents.php?limit=5')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('recent-incidents');
            
            if (data.success && data.incidents.length > 0) {
                let html = '';
                data.incidents.forEach(incident => {
                    const timeAgo = getTimeAgo(incident.date_creation);
                    html += `
                        <div class="recent-incident">
                            <div class="incident-type">
                                ${getIncidentIcon(incident.type)} ${getIncidentTypeLabel(incident.type)}
                            </div>
                            <div class="incident-location">
                                <i class="fas fa-map-marker-alt"></i> ${incident.ville}
                            </div>
                            <div class="incident-time">
                                <i class="fas fa-clock"></i> ${timeAgo}
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = '<p>Aucun incident récent</p>';
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des incidents récents:', error);
            document.getElementById('recent-incidents').innerHTML = '<p>Erreur de chargement</p>';
        });
}

// Obtenir l'icône pour un type d'incident
function getIncidentIcon(type) {
    const icons = {
        'accident': '🚗',
        'embouteillage': '🚦',
        'obstacle': '⚠️',
        'route_fermee': '🚧',
        'travaux': '🔨',
        'autre': '❓'
    };
    return icons[type] || '❓';
}

// Calculer le temps écoulé
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Il y a moins d\'une minute';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
}

console.log('Script de signalement chargé avec succès');
