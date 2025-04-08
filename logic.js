function showErrorModal(message) {
    document.getElementById("errorModalMessage").textContent = message;
    let errorModal = new bootstrap.Modal(document.getElementById("errorModal"));
    errorModal.show();
}

class Constant {
    constructor(char) {
        this.char = char;
        this.constant = true;
    }

    string() {
        return this.char;
    }

    negate() {
        return new Expression([new Constant(this.char)], "¬");
    }

    simplify() {
        return this;
    }

    toCNF() {
        return this;
    }
}

class Expression {  
    constructor(constants, predicate) {
        // Not necessarily constants, could be an expression
        this.constants = constants;
        this.predicate = predicate;
        this.constant = false;
    }

    string() {
        if (this.predicate == "¬") {
            return this.predicate + this.constants[0].string();
        }
        let str = "(";
        for (var i = 0; i < this.constants.length; i++) {
            str += this.constants[i].string();
            if (i != this.constants.length - 1)
                str += " " + this.predicate + " ";
        }
        str += ")";
        return str;
    }

    negate() {
        switch (this.predicate) {
            case "¬":
                return this.constants[0];

            case "∨":
                for (var i = 0; i < this.constants.length; i++) {
                    this.constants[i] = this.constants[i].negate();
                }
                this.predicate = "∧";
                return this;

            case "∧":
                for (var i = 0; i < this.constants.length; i++) {
                    this.constants[i] = this.constants[i].negate();
                }
                this.predicate = "∨";
                return this;
            
            case "→":
                // ~(P -> Q) = P & ~Q
                this.constants[1] = this.constants[1].negate();
                this.predicate = "∧";
                return this;
            
            case "↔":
                // ~(P <-> Q) = (P & ~Q) | (~P & Q)
                let p = this.constants[0];
                let q = this.constants[1];
                let c1 = new Expression([p, q.negate()], "∧")
                let c2 = new Expression([q, p.negate()], "∧")
                this.constants = [c1, c2];
                this.predicate = "∨"
                return this;
        }
    }

    simplify() {
        switch(this.predicate) {
            case "¬":
                this.constants[0] = this.constants[0].simplify();
                this.constants[0] = this.constants[0].negate();
                return this.constants[0];

            case "→":
                // P -> Q = ~P | Q
                this.constants[0] = this.constants[0].negate();
                this.predicate = "∨";
                this.constants[0] = this.constants[0].simplify();
                this.constants[1] = this.constants[1].simplify();
                return this;
            
            case "↔":
                // ~(P <-> Q) = (P & ~Q) | (~P & Q)
                let p = this.constants[0];
                let q = this.constants[1];
                let c1 = new Expression([p, q.negate()], "∨")
                let c2 = new Expression([q, p.negate()], "∨")
                this.constants = [c1, c2];
                this.predicate = "∧"

                for (var i = 0; i < this.constants[i]; i++)
                    this.constants[i] = this.constants[i].simplify();

                return this;

            default:
                for (var i = 0; i < this.constants.length; i++)
                    this.constants[i] = this.constants[i].simplify();
                return this;
        }
    }

    toCNF() {
        // First simplify the expression to remove implications and equivalences
        let simplified = this.simplify();
        
        // If it's already a constant, just return it
        if (simplified.constant) {
            return simplified;
        }
        
        // For negation
        if (simplified.predicate === "¬") {
            // If negating a constant, return as is
            if (simplified.constants[0].constant) {
                return simplified;
            }
            // Otherwise, the negation should have been handled by simplify()
            return simplified.constants[0].toCNF();
        }
        
        // Convert each sub-expression to CNF first
        for (let i = 0; i < simplified.constants.length; i++) {
            simplified.constants[i] = simplified.constants[i].toCNF();
        }
        
        // Flatten nested ANDs - (A ∧ (B ∧ C)) becomes (A ∧ B ∧ C)
        if (simplified.predicate === "∧") {
            let flattenedConstants = [];
            for (let i = 0; i < simplified.constants.length; i++) {
                if (!simplified.constants[i].constant && simplified.constants[i].predicate === "∧") {
                    // Add all the inner AND's constants to our flattened list
                    flattenedConstants = flattenedConstants.concat(simplified.constants[i].constants);
                } else {
                    flattenedConstants.push(simplified.constants[i]);
                }
            }
            simplified.constants = flattenedConstants;
            return simplified;
        }
        
        // Flatten nested ORs - (A ∨ (B ∨ C)) becomes (A ∨ B ∨ C)
        if (simplified.predicate === "∨") {
            let flattenedConstants = [];
            for (let i = 0; i < simplified.constants.length; i++) {
                if (!simplified.constants[i].constant && simplified.constants[i].predicate === "∨") {
                    // Add all the inner OR's constants to our flattened list
                    flattenedConstants = flattenedConstants.concat(simplified.constants[i].constants);
                } else {
                    flattenedConstants.push(simplified.constants[i]);
                }
            }
            simplified.constants = flattenedConstants;
            
            // Check if we need to distribute OR over AND
            let andIndex = -1;
            for (let i = 0; i < simplified.constants.length; i++) {
                if (!simplified.constants[i].constant && simplified.constants[i].predicate === "∧") {
                    andIndex = i;
                    break;
                }
            }
            
            if (andIndex !== -1) {
                // Create new OR expressions, distributing over the AND
                let andExpr = simplified.constants[andIndex];
                let otherExprs = simplified.constants.filter((_, idx) => idx !== andIndex);
                
                let newAndExprs = [];
                for (let i = 0; i < andExpr.constants.length; i++) {
                    let newOrExprs = [...otherExprs, andExpr.constants[i]];
                    let newOrExpr = new Expression(newOrExprs, "∨");
                    newAndExprs.push(newOrExpr); // Will be converted to CNF after
                }
                
                // Create a new AND expression with the distributed OR expressions
                let result = new Expression(newAndExprs, "∧");
                // Recursively call toCNF to handle any further distributions needed
                return result.toCNF();
            }
            
            return simplified;
        }
        
        // If we reach here, the expression should have been simplified already
        return simplified;
    }
}

function parseExpression(input) {
    // Remove spaces and standardize input
    input = input.replace(/\s+/g, '');

    // If the input is a single character, treat it as a Constant
    if (input.length === 1 && /[A-Z]/.test(input)) {
        return new Constant(input);
    }

    // Find the main operator
    let depth = 0, mainOpIndex = -1;
    let mainOp = null;
    for (let i = 0; i < input.length; i++) {
        let char = input[i];

        if (char === "(") depth++;
        else if (char === ")") depth--;

        if (depth === 0 && "∧∨→↔".includes(char)) {
            mainOpIndex = i;
            mainOp = char;
        }
    }

    // If a main operator was found, split and recurse
    if (mainOpIndex !== -1) {
        let left = parseExpression(input.substring(0, mainOpIndex));
        let right = parseExpression(input.substring(mainOpIndex + 1));
        return new Expression([left, right], mainOp);
    }

    // Handle parentheses recursively
    if (input.startsWith("(") && input.endsWith(")")) {
        return parseExpression(input.substring(1, input.length - 1));
    }

    // Handle negation
    if (input.startsWith("¬")) {
        return new Expression([parseExpression(input.substring(1))], "¬");
    }

    throw new Error("Invalid expression: " + input);
}

function printClause(clauses) {
    let str = ""
    for (var i = 0; i < clauses.length; i++) {
        str += "{"
        for (var j = 0; j < clauses[i].length; j++) {
            str += clauses[i][j];
            if (j != clauses[i].length - 1) str += ",";
        }
        str += "}\n"
    }
    return str;
}

class Equation {
    constructor(premises, conclusion) {
        this.premises = [];
        this.consts = [];
        this.clauses = [];

        // Parse the premises
        try {
            for (var i = 0; i < premises.length; i++) {
                this.premises.push(parseExpression(premises[i]));
            }
            this.conclusion = parseExpression(conclusion);
        } catch (e) {
            showErrorModal(e.message);
            return null;
        }
        this.conclusion = this.conclusion.negate();
    }

    solve(clauses, consts) {
        for (var i = 0; i < clauses.length; i++) {
            if (clauses[i].length == 0) {
                return "{}\nX\n";
            }
        }
        // Check if need to end
        if (consts.length == 0) {
            let str = "";
            str += printClause(clauses);
            str += "O\n"
            return str;
        }
        let solutions = "";
        let branch = consts[0];

        consts.shift();
        // positive
        let cc = clauses.map(subArray => [...subArray]);
        for (var i = cc.length - 1; i >= 0; i--) {
            let neg = cc[i].indexOf("¬" + branch);
            if (cc[i].indexOf(branch) != -1) {
                cc.splice(i, 1);
            }
            else if (neg != -1) {
                cc[i].splice(neg, 1);
            }
        }
        solutions += printClause(clauses);
        solutions += "----- " + branch + "\n";
        solutions += this.solve(cc, consts);
        solutions += "---------\n"

        // negative
        cc = clauses.map(subArray => [...subArray]);
        for (var i = cc.length - 1; i >= 0; i--) {
            let neg = cc[i].indexOf("¬" + branch);
            if (cc[i].indexOf(branch) != -1) {
                cc.splice(i, 1);
            }
            else if (neg != -1) {
                cc[i].splice(neg, 1);
            }
        }
        solutions += printClause(clauses);
        solutions += "------ ¬" + branch + "\n";
        solutions += this.solve(cc, consts);

        return solutions;
    }

    string() {
        let str = "Premises:\n";

        let cnfs = [];
        for (var i = 0; i < this.premises.length; i++) {
            str += this.premises[i].string() + "\n";
            cnfs.push(this.premises[i].toCNF());
        }

        if (this.conclusion) {
            str += "\nConclusion:\n" + this.conclusion.string();
            str += "\nSimplified:\n" + this.conclusion.toCNF().string();
            cnfs.push(this.conclusion.toCNF());
        }

        str += "\n\nCNFS:\n";
        for (var i = 0; i < cnfs.length; i++) {
            str += cnfs[i].string() + "\n";
        }

        // CONVERT INTO CLAUSES
        let clauses = [];
        for (var i = 0; i < cnfs.length; i++) {
            if (cnfs[i].constant) {
                clauses.push([cnfs[i].char]);
                continue;
            }
            else if (cnfs[i].predicate == "¬") {
                clauses.push(["¬" + cnfs[i].constants[0].char]);
                continue;
            }
            else if (cnfs[i].predicate == "∨") {
                let c = [];
                for (var k = 0; k < cnfs[i].constants.length; k++) {
                    if (cnfs[i].constants[k].constant)
                        c.push(cnfs[i].constants[k].char);
                    else 
                        c.push("¬" + cnfs[i].constants[k].constants[0].char);
                }
                clauses.push(c);
                continue;
            }
            // Has at least one AND
            for (var j = 0; j < cnfs[i].constants.length; j++) {
                if (cnfs[i].constants[j].constant) {
                    clauses.push([cnfs[i].constants[j].char]);
                    continue;
                }
                else if (cnfs[i].constants[j].predicate == "¬") {
                    clauses.push(["¬" + cnfs[i].constants[j].constants[0].char]);
                    continue;
                }
                let c = [];
                for (var k = 0; k < cnfs[i].constants[j].constants.length; k++) {
                    if (cnfs[i].constants[j].constants[k].constant)
                        c.push(cnfs[i].constants[j].constants[k].char);
                    else 
                        c.push("¬" + cnfs[i].constants[j].constants[k].constants[0].char);
                }
                clauses.push(c);
            }
        }


        str += "\nClauses: \n";
        for (var i = 0; i < clauses.length; i++) {
            str += "{"
            for (var j = 0; j < clauses[i].length; j++) {
                str += clauses[i][j];
                if (j != clauses[i].length -1) str += ",";
            }
            str += "}\n"
        }

        str += "\nConstants:\n"
        let consts = [];
        for (var i = 0; i < clauses.length; i++) {
            for (var j = 0; j < clauses[i].length; j++) {
                let char = clauses[i][j];
                if (clauses[i][j].length != 1) 
                    char = clauses[i][j][1];
                consts.push(char);
            }
        }

        // Filter dups
        consts = [...new Set(consts)];

        for (var i = 0; i < consts.length; i++) {
            str += consts[i] 
            if (i != consts.length -1) str += ",";
        }
        this.consts = consts;
        this.clauses = clauses;

        let solutions = this.solve(this.clauses, this.consts);

        str += "\n\nSOLUTIONS:\n" + solutions; 

        return str;
    }
}
