document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // For demo purposes, check against localStorage
    const storedUser = localStorage.getItem('mempass_user');
    
    if (!storedUser) {
        showAlert('No account found. Please sign up first.', 'error');
        return;
    }
    
    const userData = JSON.parse(storedUser);
    
    // Check if identifier matches email or username
    if ((identifier !== userData.email && identifier !== userData.username) || 
        password !== userData.password) {
        showAlert('Invalid email/username or password', 'error');
        return;
    }
    
    // Successful login
    showAlert('Login successful!', 'success');
    
    // Store session (in a real app, this would be a proper session token)
    sessionStorage.setItem('mempass_logged_in', 'true');
    sessionStorage.setItem('mempass_user_email', userData.email);
    
    // Remember me functionality
    if (document.getElementById('rememberMe').checked) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        localStorage.setItem('mempass_remember', expiry.toISOString());
    }
    
    // Redirect to dashboard/home
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

function showPasswordHint() {
    const hintDiv = document.getElementById('passwordHint');
    const hintList = document.getElementById('hintList');
    
    const storedUser = localStorage.getItem('mempass_user');
    
    if (!storedUser) {
        showAlert('No account found. Please sign up first.', 'error');
        return;
    }
    
    const userData = JSON.parse(storedUser);
    
    hintList.innerHTML = `
        <li>Question 1: ${document.querySelector(`#q1 option[value="${userData.answers.q1.type}"]`)?.textContent || 'Unknown question'}</li>
        <li>Question 2: ${document.querySelector(`#q2 option[value="${userData.answers.q2.type}"]`)?.textContent || 'Unknown question'}</li>
        <li>Password contains: Uppercase letters, lowercase letters, numbers, and symbols</li>
        <li>Password length: ${userData.password.length} characters</li>
    `;
    
    hintDiv.style.display = 'block';
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

// Check for remembered login
window.addEventListener('DOMContentLoaded', () => {
    const rememberExpiry = localStorage.getItem('mempass_remember');
    
    if (rememberExpiry) {
        const expiryDate = new Date(rememberExpiry);
        const now = new Date();
        
        if (now < expiryDate) {
            const storedUser = localStorage.getItem('mempass_user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                document.getElementById('loginEmail').value = userData.email;
                document.getElementById('rememberMe').checked = true;
            }
        } else {
            localStorage.removeItem('mempass_remember');
        }
    }
});