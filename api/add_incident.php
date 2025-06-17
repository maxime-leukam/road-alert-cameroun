
<?php
require_once 'config.php';

try {
    // Vérifier l'authentification (optionnel pour les signalements anonymes)
    $user = getAuthenticatedUser();
    $isAnonymous = isset($_POST['anonymous']) && $_POST['anonymous'] == '1';
    
    if (!$user && !$isAnonymous) {
        jsonResponse([
            'success' => false,
            'message' => 'Authentification requise pour les signalements non anonymes'
        ], 401);
    }
    
    // Validation des données
    $validationRules = [
        'type_incident' => ['required' => true],
        'description' => ['required' => true, 'min_length' => 10, 'max_length' => 1000],
        'ville' => ['required' => true],
        'latitude' => ['required' => true],
        'longitude' => ['required' => true]
    ];
    
    $errors = validateInput($_POST, $validationRules);
    
    // Validation des coordonnées (vérifier qu'elles sont au Cameroun)
    $latitude = floatval($_POST['latitude']);
    $longitude = floatval($_POST['longitude']);
    
    if ($latitude < 1.6 || $latitude > 13.1 || $longitude < 8.3 || $longitude > 16.2) {
        $errors['coordinates'] = 'Les coordonnées ne semblent pas être au Cameroun';
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $errors
        ], 400);
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Vérifier s'il n'y a pas déjà un incident similaire dans un rayon de 100m
    $checkSql = "SELECT id FROM incidents 
                 WHERE type = ? 
                 AND ville = ? 
                 AND statut IN ('nouveau', 'en_cours')
                 AND (
                     6371 * ACOS(
                         COS(RADIANS(?)) * COS(RADIANS(latitude)) * 
                         COS(RADIANS(longitude) - RADIANS(?)) + 
                         SIN(RADIANS(?)) * SIN(RADIANS(latitude))
                     )
                 ) < 0.1
                 AND date_creation > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
                 
    $checkStmt = $db->prepare($checkSql);
    $checkStmt->execute([
        $_POST['type_incident'],
        $_POST['ville'],
        $latitude,
        $longitude,
        $latitude
    ]);
    
    $existingIncident = $checkStmt->fetch();
    
    if ($existingIncident) {
        // Incident similaire trouvé, incrémenter les signalements supplémentaires
        $updateSql = "UPDATE incidents SET signalements_supplementaires = signalements_supplementaires + 1 WHERE id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute([$existingIncident['id']]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Incident similaire déjà signalé. Votre signalement a été ajouté comme confirmation.',
            'incident_id' => $existingIncident['id']
        ]);
    }
    
    // Gérer l'upload de photo si présente
    $photoPath = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        try {
            $photoPath = uploadFile($_FILES['photo']);
        } catch (Exception $e) {
            jsonResponse([
                'success' => false,
                'message' => 'Erreur lors de l\'upload de la photo: ' . $e->getMessage()
            ], 400);
        }
    }
    
    // Insérer le nouvel incident
    $insertSql = "INSERT INTO incidents (
                    utilisateur_id, 
                    type, 
                    description, 
                    latitude, 
                    longitude, 
                    ville, 
                    quartier, 
                    gravite, 
                    photo, 
                    anonymous
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $insertStmt = $db->prepare($insertSql);
    $insertStmt->execute([
        $user ? $user['id'] : null,
        $_POST['type_incident'],
        sanitizeString($_POST['description']),
        $latitude,
        $longitude,
        sanitizeString($_POST['ville']),
        isset($_POST['quartier']) ? sanitizeString($_POST['quartier']) : null,
        isset($_POST['gravite']) ? sanitizeString($_POST['gravite']) : 'modere',
        $photoPath,
        $isAnonymous ? 1 : 0
    ]);
    
    $incidentId = $db->lastInsertId();
    
    // Envoyer des notifications aux utilisateurs qui suivent cette ville
    if (!$isAnonymous) {
        $notificationSql = "INSERT INTO notifications (utilisateur_id, type, titre, message, incident_id)
                           SELECT uvf.utilisateur_id, 'nouveau_incident', 
                                  CONCAT('Nouvel incident à ', ?),
                                  CONCAT('Un incident de type \"', ?, '\" a été signalé à ', ?, '.'),
                                  ?
                           FROM utilisateurs_villes_favorites uvf
                           WHERE uvf.ville = ? AND uvf.notifications_actives = 1 AND uvf.utilisateur_id != ?";
        
        $notificationStmt = $db->prepare($notificationSql);
        $notificationStmt->execute([
            $_POST['ville'],
            $_POST['type_incident'],
            $_POST['ville'],
            $incidentId,
            $_POST['ville'],
            $user ? $user['id'] : 0
        ]);
    }
    
    // Logger l'action
    if ($user) {
        $logSql = "INSERT INTO logs_activite (utilisateur_id, action, details, ip_address, user_agent) 
                   VALUES (?, 'incident_created', ?, ?, ?)";
        $logStmt = $db->prepare($logSql);
        $logStmt->execute([
            $user['id'],
            json_encode([
                'incident_id' => $incidentId,
                'type' => $_POST['type_incident'],
                'ville' => $_POST['ville']
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    }
    
    jsonResponse([
        'success' => true,
        'message' => 'Incident signalé avec succès',
        'incident_id' => $incidentId
    ]);
    
} catch (Exception $e) {
    logError("Erreur lors de l'ajout de l'incident", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    jsonResponse([
        'success' => false,
        'message' => 'Erreur lors du signalement de l\'incident'
    ], 500);
}
?>
