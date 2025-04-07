document.getElementById("add-premise").addEventListener("click", function() {
    const inputContainer = document.getElementById("input-container");
    const premiseBox = document.createElement("div");
    premiseBox.classList.add("input-group", "mb-2", "premise-box");
    premiseBox.innerHTML = `
        <input type="text" class="form-control premise-input" placeholder="Enter a premise">
        <button class="btn btn-danger remove-premise">X️</button>
    `;
    inputContainer.appendChild(premiseBox);
});

document.getElementById("input-container").addEventListener("click", function(event) {
    if (event.target.classList.contains("remove-premise")) {
        event.target.closest(".premise-box").remove();
    }
});

document.getElementById("submit-proof").addEventListener("click", function() {
    const premises = Array.from(document.querySelectorAll(".premise-input"))
                          .map(input => input.value.trim())
                          .filter(val => val !== "");
    const conclusion = document.getElementById("conclusion").value.trim();

    let proof = new Equation(premises, conclusion);

    document.getElementById("proof-output").textContent = proof.string();
});

let activeInput = null;

document.addEventListener("focusin", (event) => {
    if (event.target.classList.contains("premise-input") || event.target.id === "conclusion") {
        activeInput = event.target;
    }
});

document.querySelectorAll(".logic-char").forEach(button => {
    button.addEventListener("click", function() {
        if (activeInput) {
            const char = this.getAttribute("data-char");
            const cursorPos = activeInput.selectionStart;
            const textBefore = activeInput.value.substring(0, cursorPos);
            const textAfter = activeInput.value.substring(cursorPos);
            activeInput.value = textBefore + char + textAfter;
            activeInput.focus();
            activeInput.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
    });
});