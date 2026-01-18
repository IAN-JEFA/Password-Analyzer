// Authentication utilities for the MemPass system

class AuthUtils {
    // Validate password against OWASP guidelines
    static validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
        };
        
        const metRequirements = Object.values(requirements).filter(Boolean).length;
        
        return {
            isValid: password.length >= 8 && metRequirements >= 3,
            requirements,
            score: metRequirements,
            strength: this.getPasswordStrength(password, metRequirements)
        };
    }
    
    static getPasswordStrength(password, metRequirements) {
        if (password.length >= 12 && metRequirements >= 4) return 'strong';
        if (password.length >= 10 && metRequirements >= 3) return 'fair';
        return 'weak';
    }
    
    // Sanitize user input
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>"'`;=]/g, '')
            .trim()
            .substring(0, 100); // Limit length
    }
    
    // Generate secure password hint (not revealing actual answers)
    static generateHint(answers) {
        const hints = [];
        
        Object.values(answers).forEach(answerObj => {
            const answer = answerObj.answer;
            if (answer.length > 2) {
                // Show first and last character with asterisks in between
                const hint = answer.charAt(0) + '*'.repeat(Math.max(0, answer.length - 2)) + answer.charAt(answer.length - 1);
                hints.push(hint);
            }
        });
        
        return hints;
    }
    
    // Check if password is compromised (simplified version)
    static async checkPasswordStrength(password) {
        // In a real implementation, this would check against known breaches
        // For now, we'll use a simple entropy calculation
        
        const entropy = this.calculateEntropy(password);
        
        if (entropy < 40) return { strength: 'weak', message: 'Password is too predictable' };
        if (entropy < 60) return { strength: 'fair', message: 'Password could be stronger' };
        return { strength: 'strong', message: 'Password is strong' };
    }
    
    static calculateEntropy(password) {
        const charsetSize = this.getCharsetSize(password);
        return Math.log2(Math.pow(charsetSize, password.length));
    }
    
    static getCharsetSize(password) {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/\d/.test(password)) size += 10;
        if (/[^a-zA-Z0-9]/.test(password)) size += 32;
        return size;
    }
    
    // Session management
    static setSession(userData) {
        const sessionData = {
            userId: this.generateId(),
            email: userData.email,
            username: userData.username,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        
        sessionStorage.setItem('mempass_session', JSON.stringify(sessionData));
        return sessionData;
    }
    
    static getSession() {
        const session = sessionStorage.getItem('mempass_session');
        if (!session) return null;
        
        const sessionData = JSON.parse(session);
        if (new Date(sessionData.expiresAt) < new Date()) {
            this.clearSession();
            return null;
        }
        
        return sessionData;
    }
    
    static clearSession() {
        sessionStorage.removeItem('mempass_session');
    }
    
    // Generate unique ID
    static generateId() {
        return 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Rate limiting for login attempts
    static checkRateLimit(identifier) {
        const key = `rate_limit_${identifier}`;
        const attempts = localStorage.getItem(key);
        
        if (!attempts) {
            localStorage.setItem(key, JSON.stringify({
                count: 1,
                firstAttempt: Date.now()
            }));
            return { allowed: true, remaining: 4 };
        }
        
        const data = JSON.parse(attempts);
        const now = Date.now();
        const timeWindow = 15 * 60 * 1000; // 15 minutes
        
        if (now - data.firstAttempt > timeWindow) {
            // Reset counter
            localStorage.setItem(key, JSON.stringify({
                count: 1,
                firstAttempt: now
            }));
            return { allowed: true, remaining: 4 };
        }
        
        if (data.count >= 5) {
            return { allowed: false, remaining: 0 };
        }
        
        data.count++;
        localStorage.setItem(key, JSON.stringify(data));
        
        return { allowed: true, remaining: 5 - data.count };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUtils;
}