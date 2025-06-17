
-- Base de données RouteAlert Cameroun
-- Version: 1.0
-- Date: 2024-01-15

CREATE DATABASE IF NOT EXISTS routealert_cameroun 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE routealert_cameroun;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    ville_residence VARCHAR(100),
    photo_profil VARCHAR(255),
    role ENUM('utilisateur', 'administrateur', 'moderateur') DEFAULT 'utilisateur',
    actif BOOLEAN DEFAULT TRUE,
    email_verifie BOOLEAN DEFAULT FALSE,
    token_verification VARCHAR(255),
    token_reset_password VARCHAR(255),
    derniere_connexion TIMESTAMP NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_ville (ville_residence),
    INDEX idx_actif (actif)
) ENGINE=InnoDB;

-- Table des incidents
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT,
    type ENUM('accident', 'embouteillage', 'obstacle', 'route_fermee', 'travaux', 'autre') NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    quartier VARCHAR(100),
    gravite ENUM('faible', 'modere', 'eleve', 'critique') DEFAULT 'modere',
    statut ENUM('nouveau', 'en_cours', 'resolu', 'ferme') DEFAULT 'nouveau',
    photo VARCHAR(255),
    anonymous BOOLEAN DEFAULT FALSE,
    signalements_supplementaires INT DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    date_resolution TIMESTAMP NULL,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_ville (ville),
    INDEX idx_statut (statut),
    INDEX idx_date_creation (date_creation),
    INDEX idx_location (latitude, longitude),
    INDEX idx_gravite (gravite)
) ENGINE=InnoDB;

-- Table des mises à jour d'incidents
CREATE TABLE IF NOT EXISTS incidents_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    utilisateur_id INT,
    type_update ENUM('confirmation', 'resolution', 'commentaire', 'photo') NOT NULL,
    contenu TEXT,
    photo VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    INDEX idx_incident (incident_id),
    INDEX idx_date (date_creation)
) ENGINE=InnoDB;

-- Table des villes favorites des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs_villes_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    ville VARCHAR(100) NOT NULL,
    notifications_actives BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_city (utilisateur_id, ville),
    INDEX idx_utilisateur (utilisateur_id)
) ENGINE=InnoDB;

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    type ENUM('nouveau_incident', 'incident_resolu', 'actualite', 'systeme') NOT NULL,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    incident_id INT NULL,
    lue BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
    INDEX idx_utilisateur (utilisateur_id),
    INDEX idx_lue (lue),
    INDEX idx_date (date_creation)
) ENGINE=InnoDB;

-- Table des actualités
CREATE TABLE IF NOT EXISTS actualites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auteur_id INT NOT NULL,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    image VARCHAR(255),
    categorie ENUM('securite', 'circulation', 'meteo', 'interventions', 'generale') NOT NULL,
    statut ENUM('brouillon', 'publie', 'archive') DEFAULT 'brouillon',
    featured BOOLEAN DEFAULT FALSE,
    vues INT DEFAULT 0,
    date_publication TIMESTAMP NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_statut (statut),
    INDEX idx_categorie (categorie),
    INDEX idx_featured (featured),
    INDEX idx_date_publication (date_publication)
) ENGINE=InnoDB;

-- Table des services d'intervention
CREATE TABLE IF NOT EXISTS services_intervention (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    type_service ENUM('police', 'pompiers', 'samu', 'depanneuse', 'voirie') NOT NULL,
    statut ENUM('demande', 'envoye', 'sur_place', 'termine') DEFAULT 'demande',
    description TEXT,
    contact VARCHAR(100),
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_arrivee TIMESTAMP NULL,
    date_fin TIMESTAMP NULL,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    INDEX idx_incident (incident_id),
    INDEX idx_statut (statut),
    INDEX idx_type_service (type_service)
) ENGINE=InnoDB;

-- Table des statistiques journalières
CREATE TABLE IF NOT EXISTS statistiques_journalieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_stat DATE NOT NULL,
    total_incidents INT DEFAULT 0,
    incidents_resolus INT DEFAULT 0,
    nouveaux_utilisateurs INT DEFAULT 0,
    incidents_par_type JSON,
    incidents_par_ville JSON,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_date (date_stat),
    INDEX idx_date (date_stat)
) ENGINE=InnoDB;

-- Table des sessions utilisateurs (pour la gestion des tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_utilisateur (utilisateur_id),
    INDEX idx_actif (actif),
    INDEX idx_expiration (date_expiration)
) ENGINE=InnoDB;

-- Table des logs d'activité
CREATE TABLE IF NOT EXISTS logs_activite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    INDEX idx_utilisateur (utilisateur_id),
    INDEX idx_action (action),
    INDEX idx_date (date_creation)
) ENGINE=InnoDB;

-- Insertion des données de test

-- Administrateur par défaut
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, actif, email_verifie) VALUES
('Admin', 'RouteAlert', 'admin@routealert.cm', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrateur', TRUE, TRUE);

-- Utilisateurs de test
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, ville_residence, actif, email_verifie) VALUES
('Dupont', 'Jean', 'jean.dupont@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Yaoundé', TRUE, TRUE),
('Kameni', 'Marie', 'marie.kameni@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Douala', TRUE, TRUE),
('Mballa', 'Paul', 'paul.mballa@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Garoua', TRUE, TRUE);

-- Incidents de test
INSERT INTO incidents (utilisateur_id, type, description, latitude, longitude, ville, quartier, gravite, statut) VALUES
(2, 'accident', 'Collision entre deux véhicules sur l\'Avenue Kennedy à la hauteur du carrefour Elig-Edzoa', 3.8480, 11.5021, 'Yaoundé', 'Centre-ville', 'eleve', 'nouveau'),
(3, 'embouteillage', 'Embouteillage important sur le Boulevard de la Liberté causé par des travaux routiers', 4.0511, 9.7679, 'Douala', 'Akwa', 'modere', 'en_cours'),
(4, 'obstacle', 'Arbre tombé sur la chaussée après les pluies, bloquant partiellement la circulation', 3.8600, 11.5200, 'Yaoundé', 'Nsimalen', 'eleve', 'nouveau'),
(2, 'route_fermee', 'Route fermée pour travaux d\'aménagement et de réfection de la chaussée', 4.0400, 9.7500, 'Douala', 'Bonanjo', 'critique', 'en_cours');

-- Villes favorites de test
INSERT INTO utilisateurs_villes_favorites (utilisateur_id, ville) VALUES
(2, 'Yaoundé'),
(2, 'Douala'),
(3, 'Douala'),
(3, 'Bafoussam'),
(4, 'Garoua'),
(4, 'Ngaoundéré');

-- Actualités de test
INSERT INTO actualites (auteur_id, titre, contenu, categorie, statut, date_publication) VALUES
(1, 'Nouvelle campagne de sécurité routière au Cameroun', 'Le gouvernement lance une nouvelle campagne de sensibilisation à la sécurité routière dans toutes les régions du pays...', 'securite', 'publie', NOW()),
(1, 'Travaux sur l\'autoroute Yaoundé-Douala', 'Des travaux de rénovation de l\'autoroute Yaoundé-Douala vont débuter la semaine prochaine...', 'circulation', 'publie', NOW()),
(1, 'Prévisions météorologiques : Fortes pluies attendues', 'Météo Cameroun annonce de fortes pluies dans plusieurs régions du pays...', 'meteo', 'publie', NOW());

-- Statistiques de test pour aujourd'hui
INSERT INTO statistiques_journalieres (date_stat, total_incidents, incidents_resolus, nouveaux_utilisateurs, incidents_par_type, incidents_par_ville) VALUES
(CURDATE(), 4, 0, 3, 
'{"accident": 1, "embouteillage": 1, "obstacle": 1, "route_fermee": 1}',
'{"Yaoundé": 2, "Douala": 2, "Garoua": 0}');

-- Création d'index pour optimiser les performances
CREATE INDEX idx_incidents_recent ON incidents (date_creation DESC, statut);
CREATE INDEX idx_utilisateurs_actifs ON utilisateurs (actif, date_creation);
CREATE INDEX idx_notifications_non_lues ON notifications (utilisateur_id, lue, date_creation DESC);

-- Vue pour les statistiques rapides
CREATE VIEW vue_statistiques_rapides AS
SELECT 
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN statut = 'nouveau' THEN 1 END) as incidents_nouveaux,
    COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) as incidents_en_cours,
    COUNT(CASE WHEN statut = 'resolu' THEN 1 END) as incidents_resolus,
    COUNT(CASE WHEN DATE(date_creation) = CURDATE() THEN 1 END) as incidents_aujourd_hui,
    COUNT(DISTINCT utilisateur_id) as utilisateurs_actifs
FROM incidents 
WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Procédure stockée pour nettoyer les anciennes sessions
DELIMITER $$
CREATE PROCEDURE CleanExpiredSessions()
BEGIN
    DELETE FROM sessions WHERE date_expiration < NOW();
END$$
DELIMITER ;

-- Trigger pour mettre à jour les statistiques lors de l'ajout d'un incident
DELIMITER $$
CREATE TRIGGER update_stats_after_incident_insert
AFTER INSERT ON incidents
FOR EACH ROW
BEGIN
    INSERT INTO statistiques_journalieres (date_stat, total_incidents, incidents_par_type, incidents_par_ville)
    VALUES (DATE(NEW.date_creation), 1, JSON_OBJECT(NEW.type, 1), JSON_OBJECT(NEW.ville, 1))
    ON DUPLICATE KEY UPDATE
        total_incidents = total_incidents + 1,
        incidents_par_type = JSON_SET(
            COALESCE(incidents_par_type, JSON_OBJECT()),
            CONCAT('$.', NEW.type),
            COALESCE(JSON_EXTRACT(incidents_par_type, CONCAT('$.', NEW.type)), 0) + 1
        ),
        incidents_par_ville = JSON_SET(
            COALESCE(incidents_par_ville, JSON_OBJECT()),
            CONCAT('$.', NEW.ville),
            COALESCE(JSON_EXTRACT(incidents_par_ville, CONCAT('$.', NEW.ville)), 0) + 1
        );
END$$
DELIMITER ;

-- Trigger pour mettre à jour les statistiques lors de la résolution d'un incident
DELIMITER $$
CREATE TRIGGER update_stats_after_incident_resolve
AFTER UPDATE ON incidents
FOR EACH ROW
BEGIN
    IF OLD.statut != 'resolu' AND NEW.statut = 'resolu' THEN
        UPDATE statistiques_journalieres 
        SET incidents_resolus = incidents_resolus + 1
        WHERE date_stat = DATE(NEW.date_modification);
    END IF;
END$$
DELIMITER ;

-- Insertion de quelques notifications de test
INSERT INTO notifications (utilisateur_id, type, titre, message, incident_id) VALUES
(2, 'nouveau_incident', 'Nouvel incident dans votre zone', 'Un nouvel accident a été signalé sur l\'Avenue Kennedy', 1),
(3, 'nouveau_incident', 'Embouteillage signalé', 'Un embouteillage a été signalé sur le Boulevard de la Liberté', 2);

COMMIT;
