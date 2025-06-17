
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
        'nom' => ['required' => true, 'min_length' => 2, 'max_length' => 100],
        'prenom' => ['required' => true, 'min_length' => 2, 'max_length' => 100],
        'email' => ['required' => true, 'email' => true],
        'mot_de_passe' => ['required' => true, 'min_length' => 8]
    ];
    
    $errors = validateInput($_POST, $validationRules);
    
    // Validation supplémentaire du mot de passe
    $password = $_POST['mot_de_passe'] ?? '';
    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $password)) {
        $errors['mot_de_passe'] = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
    }
    
    if (!empty($errors)) {
        jsonResponse([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $errors
        ], 400);
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Vérifier si l'email existe déjà
    $checkStmt = $db->prepare("SELECT id FROM utilisateurs WHERE email = ?");
    $checkStmt->execute([sanitizeString($_POST['email'])]);
    
    if ($checkStmt->fetch()) {
        jsonResponse([
            'success' => false,
            'message' => 'Cette adresse email est déjà utilisée'
        ], 409);
    }
    
    // Hacher le mot de passe
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Générer un token de vérification d'email
    $verificationToken = bin2hex(random_bytes(32));
    
    // Insérer le nouvel utilisateur
    $insertSql = "INSERT INTO utilisateurs (
                    nom, 
                    prenom, 
                    email, 
                    mot_de_passe, 
                    telephone, 
                    ville_residence,
                    token_verification
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    $insertStmt = $db->prepare($insertSql);
    $insertStmt->execute([
        sanitizeString($_POST['nom']),
        sanitizeString($_POST['prenom']),
        sanitizeString($_POST['email']),
        $hashedPassword,
        isset($_POST['telephone']) ? sanitizeString($_POST['telephone']) : null,
        isset($_POST['ville_residence']) ? sanitizeString($_POST['ville_residence']) : null,
        $verificationToken
    ]);
    
    $userId = $db->lastInsertId();
    
    // Ajouter la ville de résidence comme ville favorite si fournie
    if (!empty($_POST['ville_residence'])) {
        $favoriteSql = "INSERT INTO utilisateurs_villes_favorites (utilisateur_id, ville) VALUES (?, ?)";
        $favoriteStmt = $db->prepare($favoriteSql);
        $favoriteStmt->execute([$userId, sanitizeString($_POST['ville_residence'])]);
    }
    
    // Logger l'inscription
    $logSql = "INSERT INTO logs_activite (utilisateur_id, action, details, ip_address, user_agent) 
               VALUES (?, 'register', ?, ?, ?)";
    $logStmt = $db->prepare($logSql);
    $logStmt->execute([
        $userId,
        json_encode([
            'registration_time' => date('Y-m-d H:i:s'),
            'ville_residence' => $_POST['ville_residence'] ?? null
        ]),
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    // TODO: Envoyer un email de vérification
    // sendVerificationEmail($_POST['email'], $verificationToken);
    
    jsonResponse([
        'success' => true,
        'message' => 'Compte créé avec succès. Un email de vérification vous a été envoyé.',
        'user_id' => $userId
    ]);
    
} catch (Exception $e) {
    logError("Erreur lors de l'inscription", [
        'error' => $e->getMessage(),
        'email' => $_POST['email'] ?? 'non fourni'
    ]);
    
    jsonResponse([
        'success' => false,
        'message' => 'Erreur lors de la création du compte'
    ], 500);
}

// Fonction pour envoyer l'email de vérification (à implémenter)
function sendVerificationEmail($email, $token) {
    // TODO: Implémenter l'envoi d'email avec PHPMailer ou autre
    $verificationUrl = APP_URL . "/verify-email.php?token=" . $token;
    
    // Log temporaire
    logError("Email de vérification à envoyer", [
        'email' => $email,
        'verification_url' => $verificationUrl
    ]);
}
?>
