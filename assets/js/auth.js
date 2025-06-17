
// Script pour la gestion de l'authentification

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthForms();
    setupPasswordStrengthChecker();
});

// Initialiser les formulaires d'authentification
function initializeAuthForms() {
    // Formulaire de connexion
    const connexionForm = document.getElementById('connexion-form');
    if (connexionForm) {
        connexionForm.addEventListener('submit', handleConnexion);
    }
    
    // Formulaire d'inscription
    const inscriptionForm = document.getElementById('inscription-form');
    if (inscriptionForm) {
        inscriptionForm.addEventListener('submit', handleInscription);
    }
    
    // Formulaire de mot de passe oublié
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
}

// Changer d'onglet (connexion/inscription)
function showTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Basculer la visibilité du mot de passe
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Gérer la connexion
function handleConnexion(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Désactiver le bouton
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    
    fetch('api/login.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Stocker le token
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            showAlert('Connexion réussie! Bienvenue ' + data.user.prenom, 'success');
            
            // Se souvenir de l'utilisateur si demandé
            if (formData.get('se_souvenir')) {
                localStorage.setItem('rememberUser', 'true');
            }
            
            // Rediriger vers le profil ou la page demandée
            setTimeout(() => {
                const returnUrl = new URLSearchParams(window.location.search).get('return') || 'profil.html';
                window.location.href = returnUrl;
            }, 1500);
            
        } else {
            showAlert('Erreur de connexion: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Gérer l'inscription
function handleInscription(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Vérifications côté client
    if (!validateInscriptionForm(formData)) {
        return;
    }
    
    // Désactiver le bouton
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création du compte...';
    
    fetch('api/register.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Compte créé avec succès! Vous pouvez maintenant vous connecter.', 'success');
            
            // Passer à l'onglet de connexion
            setTimeout(() => {
                showTab('connexion');
                
                // Pré-remplir l'email de connexion
                document.getElementById('email_connexion').value = formData.get('email');
            }, 2000);
            
        } else {
            showAlert('Erreur lors de l\'inscription: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Valider le formulaire d'inscription
function validateInscriptionForm(formData) {
    const password = formData.get('mot_de_passe');
    const confirmPassword = formData.get('confirmer_mot_de_passe');
    
    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
        showAlert('Les mots de passe ne correspondent pas', 'error');
        return false;
    }
    
    // Vérifier la force du mot de passe
    if (!isPasswordStrong(password)) {
        showAlert('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre', 'error');
        return false;
    }
    
    // Vérifier l'acceptation des conditions
    if (!formData.get('accepter_conditions')) {
        showAlert('Vous devez accepter les conditions d\'utilisation', 'error');
        return false;
    }
    
    return true;
}

// Vérifier la force du mot de passe
function isPasswordStrong(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}

// Configurer le vérificateur de force du mot de passe
function setupPasswordStrengthChecker() {
    const passwordInput = document.getElementById('mot_de_passe_inscription');
    const strengthIndicator = document.getElementById('password-strength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrengthDisplay(strengthIndicator, strength);
        });
    }
}

// Calculer la force du mot de passe
function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 8) score += 25;
    else feedback.push('Au moins 8 caractères');
    
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('Une lettre minuscule');
    
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('Une lettre majuscule');
    
    if (/\d/.test(password)) score += 25;
    else feedback.push('Un chiffre');
    
    // Bonus pour caractères spéciaux
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    return {
        score: Math.min(score, 100),
        feedback: feedback
    };
}

// Mettre à jour l'affichage de la force du mot de passe
function updatePasswordStrengthDisplay(indicator, strength) {
    const { score, feedback } = strength;
    
    let strengthText = '';
    let strengthClass = '';
    
    if (score < 25) {
        strengthText = 'Très faible';
        strengthClass = 'very-weak';
    } else if (score < 50) {
        strengthText = 'Faible';
        strengthClass = 'weak';
    } else if (score < 75) {
        strengthText = 'Moyen';
        strengthClass = 'medium';
    } else if (score < 100) {
        strengthText = 'Fort';
        strengthClass = 'strong';
    } else {
        strengthText = 'Très fort';
        strengthClass = 'very-strong';
    }
    
    indicator.innerHTML = `
        <div class="strength-bar">
            <div class="strength-fill ${strengthClass}" style="width: ${score}%"></div>
        </div>
        <div class="strength-text">Force: ${strengthText}</div>
        ${feedback.length > 0 ? `<div class="strength-feedback">Manque: ${feedback.join(', ')}</div>` : ''}
    `;
}

// Afficher le modal de mot de passe oublié
function showForgotPassword() {
    document.getElementById('forgot-password-modal').style.display = 'flex';
}

// Fermer le modal de mot de passe oublié
function closeForgotPassword() {
    document.getElementById('forgot-password-modal').style.display = 'none';
}

// Gérer le mot de passe oublié
function handleForgotPassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    
    fetch('api/forgot_password.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Un email de réinitialisation a été envoyé à votre adresse', 'success');
            closeForgotPassword();
        } else {
            showAlert('Erreur: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Fermer le modal en cliquant à l'extérieur
window.addEventListener('click', function(event) {
    const modal = document.getElementById('forgot-password-modal');
    if (event.target === modal) {
        closeForgotPassword();
    }
});

// Vérifier si l'utilisateur est déjà connecté
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');
    if (token) {
        // Vérifier la validité du token
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
                // L'utilisateur est déjà connecté, rediriger
                showAlert('Vous êtes déjà connecté', 'info');
                setTimeout(() => {
                    window.location.href = 'profil.html';
                }, 1500);
            }
        })
        .catch(error => {
            console.log('Token invalide ou expiré');
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
        });
    }
});

console.log('Script d\'authentification chargé avec succès');
