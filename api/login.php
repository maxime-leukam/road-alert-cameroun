
<?php
require_once 'config.php';

try {
    // Vérifier que la méthode est POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse([
            'success' => false,
            'message' => 'Méthode non autorisée'
        ], 405);
    }
    
    // Validation des données
    $validationRules = [
        'email' => ['required' => true, 'email' => true],
        'mot_de_passe' => ['required' => true, 'min_length' => 1]
    ];
    
    $errors = validateInput($_POST, $validationRules);
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $errors
        ], 400);
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Rechercher l'utilisateur par email
    $stmt = $db->prepare("SELECT id, nom, prenom, email, mot_de_passe, role, actif, email_verifie 
                         FROM utilisateurs 
                         WHERE email = ?");
    $stmt->execute([sanitizeString($_POST['email'])]);
    $user = $stmt->fetch();
    
    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    if (!$user || !password_verify($_POST['mot_de_passe'], $user['mot_de_passe'])) {
        // Attendre un peu pour éviter les attaques par force brute
        sleep(1);
        
        jsonResponse([
            'success' => false,
            'message' => 'Email ou mot de passe incorrect'
        ], 401);
    }
    
    // Vérifier si le compte est actif
    if (!$user['actif']) {
        jsonResponse([
            'success' => false,
            'message' => 'Votre compte a été désactivé. Contactez l\'administration.'
        ], 403);
    }
    
    // Générer un token JWT
    $token = generateToken($user['id']);
    
    // Enregistrer la session en base
    $sessionSql = "INSERT INTO sessions (utilisateur_id, token_hash, ip_address, user_agent, date_expiration)
                   VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))";
    $sessionStmt = $db->prepare($sessionSql);
    $sessionStmt->execute([
        $user['id'],
        hash('sha256', $token),
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        JWT_EXPIRATION
    ]);
    
    // Mettre à jour la dernière connexion
    $updateSql = "UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?";
    $updateStmt = $db->prepare($updateSql);
    $updateStmt->execute([$user['id']]);
    
    // Logger la connexion
    $logSql = "INSERT INTO logs_activite (utilisateur_id, action, details, ip_address, user_agent) 
               VALUES (?, 'login', ?, ?, ?)";
    $logStmt = $db->prepare($logSql);
    $logStmt->execute([
        $user['id'],
        json_encode(['login_time' => date('Y-m-d H:i:s')]),
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    // Préparer les données utilisateur à renvoyer (sans le mot de passe)
    $userData = [
        'id' => $user['id'],
        'nom' => $user['nom'],
        'prenom' => $user['prenom'],
        'email' => $user['email'],
        'role' => $user['role'],
        'email_verifie' => $user['email_verifie']
    ];
    
    jsonResponse([
        'success' => true,
        'message' => 'Connexion réussie',
        'token' => $token,
        'user' => $userData
    ]);
    
} catch (Exception $e) {
    logError("Erreur lors de la connexion", [
        'error' => $e->getMessage(),
        'email' => $_POST['email'] ?? 'non fourni'
    ]);
    
    jsonResponse([
        'success' => false,
        'message' => 'Erreur interne du serveur'
    ], 500);
}
?>
