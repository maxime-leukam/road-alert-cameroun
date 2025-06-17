
<?php
require_once 'config.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Paramètres de filtrage
    $ville = isset($_GET['ville']) ? sanitizeString($_GET['ville']) : '';
    $type = isset($_GET['type']) ? sanitizeString($_GET['type']) : '';
    $statut = isset($_GET['statut']) ? sanitizeString($_GET['statut']) : '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    // Construction de la requête
    $sql = "SELECT 
                i.id,
                i.type,
                i.description,
                i.latitude,
                i.longitude,
                i.ville,
                i.quartier,
                i.gravite,
                i.statut,
                i.photo,
                i.signalements_supplementaires,
                i.date_creation,
                i.date_modification,
                CASE 
                    WHEN i.anonymous = 1 THEN 'Anonyme'
                    ELSE CONCAT(u.prenom, ' ', LEFT(u.nom, 1), '.')
                END as utilisateur_nom
            FROM incidents i
            LEFT JOIN utilisateurs u ON i.utilisateur_id = u.id
            WHERE 1=1";
    
    $params = [];
    
    // Filtres
    if (!empty($ville)) {
        $sql .= " AND i.ville = ?";
        $params[] = $ville;
    }
    
    if (!empty($type)) {
        $sql .= " AND i.type = ?";
        $params[] = $type;
    }
    
    if (!empty($statut)) {
        $sql .= " AND i.statut = ?";
        $params[] = $statut;
    }
    
    // Trier par date de création décroissante
    $sql .= " ORDER BY i.date_creation DESC";
    
    // Limite et offset
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $incidents = $stmt->fetchAll();
    
    // Formater les données pour la réponse
    $incidentsFormatted = [];
    foreach ($incidents as $incident) {
        $incidentsFormatted[] = [
            'id' => intval($incident['id']),
            'type' => $incident['type'],
            'description' => $incident['description'],
            'latitude' => floatval($incident['latitude']),
            'longitude' => floatval($incident['longitude']),
            'ville' => $incident['ville'],
            'quartier' => $incident['quartier'],
            'gravite' => $incident['gravite'],
            'statut' => $incident['statut'],
            'photo' => $incident['photo'] ? APP_URL . '/' . $incident['photo'] : null,
            'signalements_supplementaires' => intval($incident['signalements_supplementaires']),
            'utilisateur_nom' => $incident['utilisateur_nom'],
            'date_creation' => $incident['date_creation'],
            'date_modification' => $incident['date_modification'],
            'time_ago' => calculateTimeAgo($incident['date_creation'])
        ];
    }
    
    // Compter le total pour la pagination
    $countSql = "SELECT COUNT(*) as total FROM incidents i WHERE 1=1";
    $countParams = [];
    
    if (!empty($ville)) {
        $countSql .= " AND i.ville = ?";
        $countParams[] = $ville;
    }
    
    if (!empty($type)) {
        $countSql .= " AND i.type = ?";
        $countParams[] = $type;
    }
    
    if (!empty($statut)) {
        $countSql .= " AND i.statut = ?";
        $countParams[] = $statut;
    }
    
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($countParams);
    $total = $countStmt->fetchColumn();
    
    jsonResponse([
        'success' => true,
        'incidents' => $incidentsFormatted,
        'pagination' => [
            'total' => intval($total),
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
    
} catch (Exception $e) {
    logError("Erreur lors de la récupération des incidents", ['error' => $e->getMessage()]);
    jsonResponse([
        'success' => false,
        'message' => 'Erreur lors de la récupération des incidents'
    ], 500);
}

function calculateTimeAgo($datetime) {
    $time = time() - strtotime($datetime);
    
    if ($time < 60) {
        return 'À l\'instant';
    } elseif ($time < 3600) {
        $minutes = floor($time / 60);
        return $minutes . ' minute' . ($minutes > 1 ? 's' : '');
    } elseif ($time < 86400) {
        $hours = floor($time / 3600);
        return $hours . ' heure' . ($hours > 1 ? 's' : '');
    } elseif ($time < 2592000) {
        $days = floor($time / 86400);
        return $days . ' jour' . ($days > 1 ? 's' : '');
    } else {
        return date('d/m/Y', strtotime($datetime));
    }
}
?>
