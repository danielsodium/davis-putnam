// premises stuff
document.getElementById("add-premise").addEventListener("click", function() {
    const inputContainer = document.getElementById("premises-container");
    const premiseBox = document.createElement("div");
    premiseBox.classList.add("input-group", "mb-2", "premise-box");
    premiseBox.innerHTML = `
        <input type="text" class="form-control premise-input" placeholder="Enter a premise">
                        <button class="btn btn-outline-secondary remove-premise" aria-label="Remove premise">
                            <i class="bi bi-x"></i>
                        </button>
    `;
    premiseBox.addEventListener("input", replaceSymbols);
    inputContainer.appendChild(premiseBox);
});

document.getElementById("premises-container").addEventListener("click", function(event) {
    if (event.target.classList.contains("remove-premise")) {
        event.target.closest(".premise-box").remove();
    }
});

// submit proof
document.getElementById('proof-form').addEventListener('submit', e => {
    e.preventDefault();
    const premises = Array.from(document.querySelectorAll(".premise-input"))
                          .map(input => input.value.trim())
                          .filter(val => val !== "");
    const conclusion = document.getElementById("conclusion").value.trim();

    let proof = new Equation(premises, conclusion);

    let output = proof.data();
    document.getElementById("proof-output").innerHTML = output.proof; 
    document.getElementById("clauses-output").innerHTML = output.clauses; 
    document.getElementById("tree-output").innerHTML = output.tree; 
    document.getElementById("cnf-output").innerHTML = output.cnf; 
    document.getElementById("solution-output").innerHTML = output.solution; 

    // Show stuff
    document.getElementById('proof-output-container').style.display = 'block';
    document.getElementById('proof-output-container').scrollIntoView({ behavior: 'smooth' });
});

// symbol buttons
let activeInput = null;
document.addEventListener("focusin", (event) => {
    if (event.target.classList.contains("premise-input") || event.target.id === "conclusion") {
        activeInput = event.target;
    }
});
document.querySelectorAll(".logic-operator").forEach(button => {
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

// keyboard shortcuts
function replaceSymbols(event) {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    const originalLength = input.value.length;

    input.value = input.value.replace(/\|/g, "∨");
    input.value = input.value.replace(/\&/g, "∧");
    input.value = input.value.replace(/\~/g, "¬");
    input.value = input.value.replace(/\$/g, "→");
    input.value = input.value.replace(/\%/g, "↔");

    const newLength = input.value.length;
    const offset = newLength - originalLength;
    input.setSelectionRange(cursorPosition + offset, cursorPosition + offset);
}

document.getElementById("first-premise").addEventListener("input", replaceSymbols);