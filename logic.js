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

function printClause(clause) {
    let str = "{"
    for (var i = 0; i < clause.length; i++) {
        str += clause[i];
        if (i != clause.length - 1) str += ",";
    }
    str += "}";
    return str;
}

function printBranch(clauses, level) {
    let str = `<p style="margin-left: ${level*20}px">`
    for (var i = 0; i < clauses.length; i++) {
        str += (" ").repeat(level*2) + "{"
        for (var j = 0; j < clauses[i].length; j++) {
            str += clauses[i][j];
            if (j != clauses[i].length - 1) str += ",";
        }
        str += "}"
    }
    str += "</p>";
    return str;
}



class Equation {
    constructor(premises, conclusion) {
        this.premises = [];
        this.consts = [];
        this.clauses = [];
        this.solutions = [];

        try {
            for (var i = 0; i < premises.length; i++) {
                this.premises.push(parseExpression(premises[i]));
            }
            if (conclusion) this.conclusion = parseExpression(conclusion);
        } catch (e) {
            showErrorModal(e.message);
            return null;
        }
        if (this.conclusion) this.conclusion = this.conclusion.negate();
    }

    tree(clauses, consts, level, path) {
        // base cases
        for (let i = 0; i < clauses.length; i++) {
            if (clauses[i].length === 0) {
                return `${' '.repeat(level*2)}X`;
            }
        }
        if (consts.length === 0) {
            this.solutions.push(path.slice());
            return `${' '.repeat(level*2)}O`;
        }
    
        // prepare ascii prefixes
        const pad = ' '.repeat(level * 2);
        const branch = consts.shift();
        let treeLines = [];
    
        // helper to format a branch
        const branchLine = (lbl, isLast) =>
            `${pad}${isLast ? '└─' : '├─'} ${lbl}`;
    
        // two subtrees: positive then negative
        const makeSubtree = (lit, filteredClauses, isLast) => {
            // record resolution step
            path.push(lit);
    
            // branch header
            treeLines.push(branchLine(lit + ' branch', isLast));
            
            // show current resolved clauses at this point
            const clauseStr = filteredClauses
                .map(c => '[' + c.join(', ') + ']')
                .join(', ');
            treeLines.push(`${pad}  Clauses: ${clauseStr}`);
    
            // recurse deeper
            const sub = this.tree(
                filteredClauses,
                [...consts],
                level + 1,
                path
            );
            const inner = sub.replace(/^<\/?pre>/g, '')
                             .split('\n')
                             .filter(l => l.length)
                             .map(l => pad + '  ' + l)
                             .join('\n');
            treeLines.push(inner);
    
            path.pop();
        };
    
        // build positive clauses
        let posClauses = clauses.map(c => [...c]);
        for (let i = posClauses.length - 1; i >= 0; i--) {
            const negIdx = posClauses[i].indexOf('¬' + branch);
            if (posClauses[i].includes(branch))        posClauses.splice(i, 1);
            else if (negIdx !== -1)                    posClauses[i].splice(negIdx, 1);
        }
        makeSubtree(branch, posClauses, false);
    
        // build negative clauses
        let negClauses = clauses.map(c => [...c]);
        for (let i = negClauses.length - 1; i >= 0; i--) {
            const posIdx = negClauses[i].indexOf(branch);
            if (negClauses[i].includes('¬' + branch))   negClauses.splice(i, 1);
            else if (posIdx !== -1)                    negClauses[i].splice(posIdx, 1);
        }
        makeSubtree('¬' + branch, negClauses, true);
    
        // restore constant for sibling branches
        consts.unshift(branch);
    
        return treeLines.join('\n');
    }

    generateClauses(cnfs) {
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
        this.clauses = clauses;
    }
    
    prove() {
        let step_num = 1;
        let steps = [];

        // Given
        for (var i = 0; i < this.clauses.length; i++) {
            steps.push({
                step: step_num++, 
                clause: this.clauses[i],
                justification: "Given"
            })
        }

        // Main loop
        const clauseExists = (clause) => {
            return steps.some(obj => 
              Array.isArray(obj.clause) &&
              obj.clause.length === clause.length &&
              obj.clause.every((val, idx) => val === clause[idx])
            );
        };

        let changed = false;
        for (var i = 0; i < steps.length; i++) {
            // Resolve over any 1 size
            if (steps[i].clause.length == 1) {

                const constant = steps[i].clause[0];
                const negation = constant.startsWith("¬") ? constant.slice(1) : "¬" + constant;

                // Check if we can resolve it with any other step
                for (var j = 0; j < steps.length; j++) {
                    if (i == j) continue;

                    if (steps[j].clause.includes(negation)) {
                        const resolventNeg = steps[j].clause.filter(lit => lit !== negation);
                        if (!clauseExists(resolventNeg)) {
                            steps.push({
                                step: step_num++,
                                clause: resolventNeg,
                                justification: `Resolution ${i+1}, ${j+1}`
                            });
                            changed = true;
                        }
                    }
                }
            }
            if (changed) {
                changed = false;
                i = -1;
            }
        }

        return steps;
    }
    
    string() {

        let cnfs = [];
        for (var i = 0; i < this.premises.length; i++) {
            cnfs.push(this.premises[i].toCNF());
        }

        if (this.conclusion) {
            cnfs.push(this.conclusion.toCNF());
        }

        let cnf_str = "";
        for (var i = 0; i < cnfs.length; i++) {
            cnf_str += "<p>" + cnfs[i].string() + "</p>";
        }

        // CONVERT INTO CLAUSES
        this.generateClauses(cnfs); 

        let clause_str = "";
        for (var i = 0; i < this.clauses.length; i++) {
            clause_str += "<p>{"
            for (var j = 0; j < this.clauses[i].length; j++) {
                clause_str += this.clauses[i][j];
                if (j != this.clauses[i].length -1) clause_str += ",";
            }
            clause_str += "}</p>"
        }

        let consts = [];
        for (var i = 0; i < this.clauses.length; i++) {
            for (var j = 0; j < this.clauses[i].length; j++) {
                let char = this.clauses[i][j];
                if (this.clauses[i][j].length != 1) 
                    char = this.clauses[i][j][1];
                consts.push(char);
            }
        }
        this.consts = [... new Set(consts)];
        var tree_str = this.tree(this.clauses, this.consts, 0, []);

        let solution_str = "";
        for (var i = 0; i < this.solutions.length; i++) {
            solution_str += "<p>{"
            for (var j = 0; j < this.solutions[i].length; j++) {
                solution_str += this.solutions[i][j];
                if (j != this.solutions[i].length-1) solution_str  += ", ";
            }
            solution_str += "}</p>"
        }

        let proof = this.prove();
        let proof_str = "";
        for (var i = 0; i < proof.length; i++) {
            proof_str += `<tr><td>${proof[i].step}</td><td>${printClause(proof[i].clause)}</td><td>${proof[i].justification}</td></tr>`
        }

        return {
            "cnf": cnf_str ,
            "clauses": clause_str,
            "proof": proof_str,
            "tree": tree_str,
            "solution":  solution_str
        };
    }
}
