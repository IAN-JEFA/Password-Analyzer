function generatePassword() {

    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');

    if (checkboxes.length < 3) {
        alert("Please select at least 3 questions.");
        return;
    }

    let answers = [];

    checkboxes.forEach(box => {
        const input = document.getElementById(box.value);
        const value = input.value.trim();

        if (!value) {
            alert("Please answer all selected questions.");
            answers = [];
            return;
        }

        // Clean input (letters only)
        const cleaned = value.replace(/[^a-zA-Z]/g, '');

        if (cleaned.length < 2) {
            alert("Answers must contain at least 2 letters.");
            answers = [];
            return;
        }

        // Capitalize for readability
        const formatted =
            cleaned.charAt(0).toUpperCase() +
            cleaned.slice(1).toLowerCase();

        answers.push(formatted);
    });

    if (answers.length < 3) return;

    // Secure randomness
    function secureRandomNumber(max) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
    }

    const symbols = "!@#$%&*";
    const randomSymbol = symbols[secureRandomNumber(symbols.length)];
    const randomNumber = secureRandomNumber(90) + 10;

    // Join selected answers with separator
    let password = answers.join("-") + randomSymbol + randomNumber;

    // Ensure minimum 14 characters
    while (password.length < 14) {
        password += secureRandomNumber(9);
    }

    document.getElementById("password-output").textContent = password;
}
