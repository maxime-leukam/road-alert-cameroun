
<?php
// Configuration de la base de données
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'routealert_cameroun');
define('DB_CHARSET', 'utf8mb4');

// Configuration de l'application
define('APP_NAME', 'RouteAlert Cameroun');
define('APP_URL', 'http://localhost');
define('UPLOAD_DIR', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB

// Configuration JWT
define('JWT_SECRET', 'votre_cle_secrete_jwt_tres_longue_et_complexe_2024');
define('JWT_EXPIRATION', 24 * 60 * 60); // 24 heures

// Configuration email
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'votre_email@gmail.com');
define('SMTP_PASSWORD', 'votre_mot_de_passe_app');

// En-têtes CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Gestion des requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Classe de connexion à la base de données
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Erreur de connexion à la base de données: " . $e->getMessage());
            throw new Exception("Erreur de connexion à la base de données");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// Fonctions utilitaires
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function logError($message, $context = []) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if (!empty($context)) {
        $logMessage .= " - Context: " . json_encode($context);
    }
    error_log($logMessage);
}

function validateInput($data, $rules) {
    $errors = [];
    
    foreach ($rules as $field => $rule) {
        $value = isset($data[$field]) ? trim($data[$field]) : '';
        
        // Champ requis
        if (isset($rule['required']) && $rule['required'] && empty($value)) {
            $errors[$field] = "Le champ {$field} est requis";
            continue;
        }
        
        // Validation email
        if (isset($rule['email']) && $rule['email'] && !empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $errors[$field] = "Format d'email invalide";
        }
        
        // Longueur minimum
        if (isset($rule['min_length']) && !empty($value) && strlen($value) < $rule['min_length']) {
            $errors[$field] = "Le champ {$field} doit contenir au moins {$rule['min_length']} caractères";
        }
        
        // Longueur maximum
        if (isset($rule['max_length']) && !empty($value) && strlen($value) > $rule['max_length']) {
            $errors[$field] = "Le champ {$field} ne peut pas dépasser {$rule['max_length']} caractères";
        }
    }
    
    return $errors;
}

function generateToken($userId) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $userId,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRATION
    ]);
    
    $headerEncoded = base64url_encode($header);
    $payloadEncoded = base64url_encode($payload);
    
    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    $signatureEncoded = base64url_encode($signature);
    
    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}

function verifyToken($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        $header = base64url_decode($parts[0]);
        $payload = base64url_decode($parts[1]);
        $signature = base64url_decode($parts[2]);
        
        $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], JWT_SECRET, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }
        
        $payloadData = json_decode($payload, true);
        
        if ($payloadData['exp'] < time()) {
            return false;
        }
        
        return $payloadData;
    } catch (Exception $e) {
        return false;
    }
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

function getAuthenticatedUser() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    
    $token = $matches[1];
    $payload = verifyToken($token);
    
    if (!$payload) {
        return null;
    }
    
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT id, nom, prenom, email, ville_residence FROM utilisateurs WHERE id = ? AND actif = 1");
        $stmt->execute([$payload['user_id']]);
        
        return $stmt->fetch();
    } catch (Exception $e) {
        logError("Erreur lors de la récupération de l'utilisateur authentifié", ['error' => $e->getMessage()]);
        return null;
    }
}

function sanitizeString($string) {
    return htmlspecialchars(strip_tags(trim($string)), ENT_QUOTES, 'UTF-8');
}

function uploadFile($file, $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']) {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("Erreur lors de l'upload du fichier");
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception("Le fichier est trop volumineux (max 5MB)");
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception("Type de fichier non autorisé");
    }
    
    $uploadDir = UPLOAD_DIR . 'incidents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $destination = $uploadDir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new Exception("Erreur lors de la sauvegarde du fichier");
    }
    
    return 'uploads/incidents/' . $filename;
}

?>
