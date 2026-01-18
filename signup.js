// OWASP compliant password generation
const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const DEFAULT_SYMBOLS = ["@", "#", "$", "!"];

let currentPassword = "";
let userAnswers = {};

function updateQuestionInputs() {
    const q1 = document.getElementById('q1').value;
    const container = document.getElementById('questionInputs');
    
    if (!q1) {
        container.innerHTML = '';
        return;
    }
    
    const questionText = document.querySelector(`#q1 option[value="${q1}"]`).textContent;
    
    container.innerHTML = `
        <div class="form-group">
            <label for="answer1">${questionText}</label>
            <input type="text" id="answer1" name="answer1" required 
                   oninput="validateAnswers()"
                   placeholder="Enter your answer">
        </div>
        
        <div class="form-group">
            <label for="q2">Select your second question:</label>
            <select id="q2" name="q2" required onchange="addSecondQuestion()">
                <option value="">Choose another question...</option>
                ${getRemainingQuestions(q1)}
            </select>
        </div>
        
        <div id="secondQuestion"></div>
    `;
}

function getRemainingQuestions(exclude) {
    const questions = [
        {value: 'pet', text: 'What was the name of your first pet?'},
        {value: 'mother', text: 'What is your mother\'s maiden name?'},
        {value: 'city', text: 'In what city were you born?'},
        {value: 'car', text: 'What was the make and model of your first car?'},
        {value: 'school', text: 'What high school did you attend?'},
        {value: 'movie', text: 'What is your favorite movie?'},
        {value: 'food', text: 'What is your favorite food?'}
    ];
    
    return questions
        .filter(q => q.value !== exclude)
        .map(q => `<option value="${q.value}">${q.text}</option>`)
        .join('');
}

function addSecondQuestion() {
    const q2 = document.getElementById('q2').value;
    const container = document.getElementById('secondQuestion');
    
    if (!q2) {
        container.innerHTML = '';
        return;
    }
    
    const questionText = document.querySelector(`#q2 option[value="${q2}"]`).textContent;
    
    container.innerHTML = `
        <div class="form-group">
            <label for="answer2">${questionText}</label>
            <input type="text" id="answer2" name="answer2" required 
                   oninput="validateAnswers()"
                   placeholder="Enter your answer">
        </div>
    `;
}

function validateAnswers() {
    const answer1 = document.getElementById('answer1')?.value.trim();
    const answer2 = document.getElementById('answer2')?.value.trim();
    
    if (answer1 && answer2) {
        userAnswers = {
            q1: { answer: answer1, type: document.getElementById('q1').value },
            q2: { answer: answer2, type: document.getElementById('q2').value }
        };
        return true;
    }
    return false;
}

function generatePassword() {
    if (!validateAnswers()) {
        showAlert('Please answer both security questions', 'error');
        return;
    }
    
    const extraChars = document.getElementById('extraChars').value;
    
    // Generate password based on OWASP guidelines
    let password = '';
    
    // Start with first answer (modified)
    const answer1 = userAnswers.q1.answer;
    password += transformAnswer(answer1, userAnswers.q1.type);
    
    // Add separator
    password += DEFAULT_SYMBOLS[Math.floor(Math.random() * DEFAULT_SYMBOLS.length)];
    
    // Add second answer (modified)
    const answer2 = userAnswers.q2.answer;
    password += transformAnswer(answer2, userAnswers.q2.type);
    
    // Add numbers (year or random)
    const year = new Date().getFullYear().toString();
    password += year.substring(year.length - 2);
    
    // Add extra characters if provided
    if (extraChars) {
        password += extraChars.substring(0, 3);
    }
    
    // Ensure minimum length of 12 characters
    while (password.length < 12) {
        password += Math.floor(Math.random() * 10);
    }
    
    // Ensure complexity requirements
    password = ensureComplexity(password);
    
    currentPassword = password;
    
    // Display password
    document.getElementById('generatedPassword').textContent = password;
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('confirmPassword').disabled = false;
    document.getElementById('signupBtn').disabled = false;
    
    // Update strength indicator
    updateStrengthIndicator(password);
    
    showAlert('Password generated successfully! Please confirm it below.', 'success');
}

function transformAnswer(answer, type) {
    let transformed = answer;
    
    // Apply different transformations based on question type
    switch(type) {
        case 'pet':
        case 'mother':
        case 'city':
        case 'school':
            // Capitalize first letter, lowercase rest
            transformed = answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase();
            break;
        case 'car':
            // Extract make and model, capitalize first letters
            const parts = answer.split(' ');
            transformed = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
            break;
        case 'movie':
        case 'food':
            // Capitalize each word
            transformed = answer.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
            break;
    }
    
    // Replace some characters
    transformed = transformed.replace(/a/gi, '@');
    transformed = transformed.replace(/s/gi, '$');
    transformed = transformed.replace(/i/gi, '!');
    transformed = transformed.replace(/o/gi, '0');
    transformed = transformed.replace(/e/gi, '3');
    
    return transformed;
}

function ensureComplexity(password) {
    let result = password;
    
    // Check and add missing character types
    if (!/[A-Z]/.test(result)) {
        result = 'A' + result.substring(1);
    }
    
    if (!/[a-z]/.test(result)) {
        result = result.substring(0, result.length - 1) + 'a';
    }
    
    if (!/\d/.test(result)) {
        result += Math.floor(Math.random() * 10);
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(result)) {
        result += DEFAULT_SYMBOLS[Math.floor(Math.random() * DEFAULT_SYMBOLS.length)];
    }
    
    return result;
}

function updateStrengthIndicator(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    let score = 0;
    
    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;
    
    // Determine strength
    if (score >= 6) {
        strengthFill.className = 'strength-fill strong';
        strengthText.textContent = 'Strong Password';
    } else if (score >= 4) {
        strengthFill.className = 'strength-fill fair';
        strengthText.textContent = 'Fair Password';
    } else {
        strengthFill.className = 'strength-fill weak';
        strengthText.textContent = 'Weak Password';
    }
}

function copyPassword() {
    if (!currentPassword) return;
    
    navigator.clipboard.writeText(currentPassword).then(() => {
        showAlert('Password copied to clipboard!', 'success');
        document.getElementById('confirmPassword').focus();
    }).catch(err => {
        showAlert('Failed to copy password', 'error');
    });
}

function showAlert(message, type) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Form submission
document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate confirmation
    if (confirmPassword !== currentPassword) {
        showAlert('Passwords do not match. Please copy and paste the generated password.', 'error');
        return;
    }
    
    // Save user data (in a real app, this would go to a server)
    const userData = {
        email,
        username,
        password: currentPassword, // In real app, this should be hashed
        answers: userAnswers,
        createdAt: new Date().toISOString()
    };
    
    // Store in localStorage (for demo purposes only)
    localStorage.setItem('mempass_user', JSON.stringify(userData));
    localStorage.setItem('mempass_' + email, currentPassword);
    
    showAlert('Account created successfully! Redirecting to login...', 'success');
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
});