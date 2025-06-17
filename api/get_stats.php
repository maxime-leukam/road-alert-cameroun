
<?php
require_once 'config.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Statistiques générales
    $stats = [];
    
    // Total des incidents
    $totalIncidentsStmt = $db->query("SELECT COUNT(*) as total FROM incidents");
    $stats['total_incidents'] = $totalIncidentsStmt->fetchColumn();
    
    // Incidents résolus
    $resolvedIncidentsStmt = $db->query("SELECT COUNT(*) as total FROM incidents WHERE statut = 'resolu'");
    $stats['resolved_incidents'] = $resolvedIncidentsStmt->fetchColumn();
    
    // Total des utilisateurs actifs
    $totalUsersStmt = $db->query("SELECT COUNT(*) as total FROM utilisateurs WHERE actif = 1");
    $stats['total_users'] = $totalUsersStmt->fetchColumn();
    
    // Incidents par type (derniers 30 jours)
    $incidentsByTypeStmt = $db->query("
        SELECT type, COUNT(*) as count 
        FROM incidents 
        WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY type
        ORDER BY count DESC
    ");
    $stats['incidents_by_type'] = $incidentsByTypeStmt->fetchAll();
    
    // Incidents par ville (derniers 30 jours)
    $incidentsByCityStmt = $db->query("
        SELECT ville, COUNT(*) as count 
        FROM incidents 
        WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY ville
        ORDER BY count DESC
        LIMIT 10
    ");
    $stats['incidents_by_city'] = $incidentsByCityStmt->fetchAll();
    
    // Incidents par statut
    $incidentsByStatusStmt = $db->query("
        SELECT statut, COUNT(*) as count 
        FROM incidents 
        GROUP BY statut
    ");
    $stats['incidents_by_status'] = $incidentsByStatusStmt->fetchAll();
    
    // Évolution des incidents sur les 7 derniers jours
    $weeklyEvolutionStmt = $db->query("
        SELECT 
            DATE(date_creation) as date,
            COUNT(*) as count
        FROM incidents 
        WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(date_creation)
        ORDER BY date
    ");
    $stats['weekly_evolution'] = $weeklyEvolutionStmt->fetchAll();
    
    // Incidents aujourd'hui
    $todayIncidentsStmt = $db->query("
        SELECT COUNT(*) as total 
        FROM incidents 
        WHERE DATE(date_creation) = CURDATE()
    ");
    $stats['incidents_today'] = $todayIncidentsStmt->fetchColumn();
    
    // Incidents cette semaine
    $weekIncidentsStmt = $db->query("
        SELECT COUNT(*) as total 
        FROM incidents 
        WHERE YEAR(date_creation) = YEAR(NOW()) 
        AND WEEK(date_creation) = WEEK(NOW())
    ");
    $stats['incidents_this_week'] = $weekIncidentsStmt->fetchColumn();
    
    // Temps moyen de résolution (en heures)
    $avgResolutionStmt = $db->query("
        SELECT AVG(TIMESTAMPDIFF(HOUR, date_creation, date_resolution)) as avg_hours
        FROM incidents 
        WHERE statut = 'resolu' 
        AND date_resolution IS NOT NULL
        AND date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $avgResolution = $avgResolutionStmt->fetchColumn();
    $stats['avg_resolution_hours'] = $avgResolution ? round($avgResolution, 1) : 0;
    
    // Top 5 des utilisateurs les plus actifs (signalements)
    $topUsersStmt = $db->query("
        SELECT 
            CONCAT(u.prenom, ' ', LEFT(u.nom, 1), '.') as nom,
            COUNT(i.id) as incidents_count
        FROM utilisateurs u
        INNER JOIN incidents i ON u.id = i.utilisateur_id
        WHERE i.anonymous = 0
        AND i.date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.id
        ORDER BY incidents_count DESC
        LIMIT 5
    ");
    $stats['top_users'] = $topUsersStmt->fetchAll();
    
    jsonResponse([
        'success' => true,
        'stats' => $stats
    ]);
    
} catch (Exception $e) {
    logError("Erreur lors de la récupération des statistiques", ['error' => $e->getMessage()]);
    jsonResponse([
        'success' => false,
        'message' => 'Erreur lors de la récupération des statistiques'
    ], 500);
}
?>
