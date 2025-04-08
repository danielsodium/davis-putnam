
class Tree {
    constructor() {
        this.branches = {};
        this.data = {};
    }

    addBranch(location, name, data) {
        let current = this.branches;
        for (var i = 0; i < location.length; i++) {
            current = current[location[i]];
        }
        current[name] = NULL;
    }
    print() {

    }
}