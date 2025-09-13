const maxX = 500,
    maxY = 500,
    minPoints = 10,
    maxPoints = 500000,
    incrementFactor = 2,
    numIterationPerSize = 3,
    distribution = pseudoMultivariateNormalDistribution;



function uniformDistribution(n) {
    const pts = [];
    for (let i = n; i > 0; i--)
        pts.push([Math.random() * maxX, Math.random() * maxY]);
    return pts;
}

function gridDistribution(n) {
    const pts = [];
    const numOnSide = Math.floor(Math.sqrt(n));
    const remainder = n - numOnSide * numOnSide;
    for (let i = 0; i < numOnSide; i++)
        for (let j = 0; j < numOnSide; j++)
            pts.push([i * maxX / numOnSide, j * maxY / numOnSide]);

    // Remainder
    for (let j = 0; j < remainder; j++)
        pts.push([maxX, j * maxY / n]);

    return pts;
}

function pseudoMultivariateNormalDistribution(n) {
    const pts = [];
    for (let i = n; i > 0; i--)
        pts.push([pseudoNormal(maxX), pseudoNormal(maxY / 2)]);
    return pts;
}

/**
 * Generates random points centered around 1
 */
function pseudoNormal(n) {
    return Math.min(n / 2 * ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3, n);
}

function contourDistribution(n) {
    const pts = [];
    const numOnSide = Math.floor(n - 2) / 4;
    for (let j = 0; j < numOnSide; j++) {
        pts.push([0, j * maxY / numOnSide]);
        pts.push([maxX, j * maxY / numOnSide]);
        pts.push([j * maxX / numOnSide, 0]);
        pts.push([j * maxX / numOnSide, maxY]);
    }
    return pts;
}

const libraries = {
    "faster-delaunay": {
        algorithm: require("../delaunay.js"),
        execute(pts) {
            return new this.algorithm(pts).triangulate();
        }
    },
    "delaunay-fast": {
        algorithm: require("delaunay-fast"),
        execute(pts) {
            return this.algorithm.triangulate(pts);
        }
    },
    delaunay: {
        algorithm: require("delaunay"),
        execute(pts) {
            return this.algorithm.triangulate(pts);
        }
    },
    "delaunay-triangulate": {
        algorithm: require("delaunay-triangulate"),
        execute(pts) {
            return this.algorithm(pts);
        }
    },
    "incremental-delaunay": {
        algorithm: require("incremental-delaunay"),
        execute(pts) {
            return this.algorithm(pts);
        }
    }
};

const librariesInOrder = Object.keys(libraries);
console.log("** All times in ms\n");
console.log("Number of points     " + librariesInOrder.join("     "));

for (let i = minPoints; i < maxPoints; i *= incrementFactor) {
    let result = {};
    for (let j = 0; j < numIterationPerSize; j++) {
        const pts = distribution(i);
        for (let lib in libraries) {
            if (libraries.hasOwnProperty(lib)) {
                result[lib] = result[lib] || 0;
                const start = new Date().getTime();
                libraries[lib].execute(pts);
                result[lib] += (new Date().getTime() - start) / numIterationPerSize;
            }
        }
        // Stop testing a library if it runs for more than 5s
        for (library in libraries)
            if (libraries.hasOwnProperty(library) && libraries[library] > 5000)
                delete libraries[library];


    }
    let output = i + "";
    for (let k = 0; k < librariesInOrder.length; k++) {
        const padLeft =
            ("Number of points" + librariesInOrder.slice(0, k).join()).length + (k + 1) * 5;
        output = output.padEnd(padLeft, ' ');

        // The extra '+' drops extra zeros at the end
        output += +result[librariesInOrder[k]].toFixed(4);
    }
    // Output the results
    console.log(output);
}