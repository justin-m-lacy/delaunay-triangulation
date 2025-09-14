/*
 Original: (c) 2016, Philippe Legault
 An implementation of Guibas & Stolfi's O(nlogn) Delaunay triangulation algorithm
 https://github.com/Bathlamos/delaunay-triangulation
 */

type TPoint = [number, number];

export class Delaunay {

    private points: TPoint[];

    constructor(points: TPoint[]) {
        this.points = points;
    }

    triangulate(): TPoint[] {
        const pts = this.points;

        // Initial sorting of the points
        pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

        // Remove duplicates
        for (let i = pts.length - 1; i >= 1; i--)
            if (pts[i][0] === pts[i - 1][0] && pts[i][1] === pts[i - 1][1])
                pts.splice(i, 1); // Costly operation, but there shouldn't be that many duplicates

        if (pts.length < 2) return [];

        let quadEdge: QuadEdge = delaunay(pts, 0, pts.length).le;

        //All edges marked false
        const faces: TPoint[] = [];
        let queueIndex = 0;
        const queue: QuadEdge[] = [quadEdge];

        // Mark all outer edges as visited
        while (leftOf(quadEdge.onext.to, quadEdge))
            quadEdge = quadEdge.onext;

        let curr = quadEdge;
        do {
            queue.push(curr.sym);
            curr.mark = true;
            curr = curr.lnext;
        } while (curr !== quadEdge);

        let edge: QuadEdge
        do {
            edge = queue[queueIndex++];
            if (edge.mark) continue;

            // Stores edges for a visited triangle.
            // Also pushes sym (neighbour) edges on stack to visit later.
            curr = edge;
            do {
                faces.push(curr.from!);
                if (!curr.sym.mark)
                    queue.push(curr.sym);

                curr.mark = true;
                curr = curr.lnext;
            } while (curr != edge);

        } while (queueIndex < queue.length);

        return faces;
    }

    ccw = ccw;
    rightOf = rightOf;
    leftOf = leftOf;
    inCircle = inCircle;

};

/*
Computes | a.x  a.y  1 |
         | b.x  b.y  1 | > 0
         | c.x  c.y  1 |
 */
function ccw(a: TPoint, b: TPoint, c: TPoint) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function rightOf(x: TPoint, e: QuadEdge) {
    return ccw(x, e.to, e.from!) > 0;
}

function leftOf(x: TPoint, e: QuadEdge) {
    return ccw(x, e.from!, e.to) > 0;
}

function valid(e: QuadEdge, basel: QuadEdge) {
    return ccw(e.to, basel.to, basel.from!) > 0;
}

/*
 Computes | a.x  a.y  a.x�+a.y�  1 |
          | b.x  b.y  b.x�+b.y�  1 | > 0
          | c.x  c.y  c.x�+c.y�  1 |
          | p.x  p.y  p.x�+d.y�  1 |
  Return true if p is in the circumcircle of a, b, c
 */
function inCircle(a: TPoint, b: TPoint, c: TPoint, d: TPoint) {

    if ((a[0] === d[0] && a[1] === d[1])
        || (b[0] === d[0] && b[1] === d[1])
        || (c[0] === d[0] && c[1] === d[1]))
        return false;

    const sb = b[0] * b[0] + b[1] * b[1],
        sc = c[0] * c[0] + c[1] * c[1],
        sd = d[0] * d[0] + d[1] * d[1];

    const d1 = sc - sd,
        d2 = c[1] - d[1],
        d3 = c[1] * sd - sc * d[1],
        d4 = c[0] - d[0],
        d5 = c[0] * sd - sc * d[0],
        d6 = c[0] * d[1] - c[1] * d[0];

    return a[0] * (b[1] * d1 - sb * d2 + d3)
        - a[1] * (b[0] * d1 - sb * d4 + d5)
        + (a[0] * a[0] + a[1] * a[1]) * (b[0] * d2 - b[1] * d4 + d6)
        - b[0] * d3 + b[1] * d5 - sb * d6 > 1; // We have an issue here with number accuracy
}

class QuadEdge {

    // neighbor edge.
    get sym() { return this.rot.rot; }
    get to() { return this.sym.from!; }

    get rotSym() { return this.rot.sym; }
    get oprev() { return this.rot.onext.rot; }
    get dprev() { return this.rotSym.onext.rotSym; }
    get lnext() { return this.rotSym.onext.rot; }
    get lprev() { return this.onext.sym; }
    get rprev() { return this.sym.onext; }

    from: TPoint | null;
    mark: boolean = false;

    // can only be set after creation.
    rot!: QuadEdge;
    onext!: QuadEdge;

    constructor(orig: TPoint | null) {
        this.from = orig;   // point
    }


}

function makeEdge(from: TPoint, to: TPoint) {
    const q0 = new QuadEdge(from),
        q1 = new QuadEdge(null),
        q2 = new QuadEdge(to),
        q3 = new QuadEdge(null);

    // create the segment
    q0.onext = q0; q2.onext = q2; // lonely segment: no "next" quadedge
    q1.onext = q3; q3.onext = q1; // in the dual: 2 communicating facets

    // dual switch
    q0.rot = q1; q1.rot = q2;
    q2.rot = q3; q3.rot = q0;
    return q0;
}

/**
 * Attach/detach the two edges = combine/split the two rings in the dual space
 *
 * @param a the first QuadEdge to attach/detach
 * @param b the second QuadEdge to attach/detach
 */
function splice(a: QuadEdge, b: QuadEdge) {
    const alpha = a.onext.rot,
        beta = b.onext.rot;

    let temp = a.onext;
    //  t4 = alpha.onext;

    a.onext = b.onext;
    b.onext = temp;

    temp = beta.onext;
    beta.onext = alpha.onext;
    alpha.onext = temp;
    // beta.onext = t4;
}

/**
 * Create QuadEdge by connecting 2 QuadEdges
 *
 * @param a the first QuadEdges to connect
 * @param b the second QuadEdges to connect
 * @return the created QuadEdge
 */
function connect(a: QuadEdge, b: QuadEdge) {
    const q = makeEdge(a.to, b.from!);
    splice(q, a.lnext);
    splice(q.sym, b);
    return q;
}

function deleteEdge(q: QuadEdge) {
    splice(q, q.oprev);
    splice(q.sym, q.sym.oprev);
}

/**
 * 
 * @param s 
 * @param low - inclusive low point to process.
 * @param high - exclusive limit of delaunay points to process. 
 * @returns 
 */
export function delaunay(s: TPoint[], low: number = 0, high: number): { le: QuadEdge, re: QuadEdge } {

    if (high - low === 2) {
        const a = makeEdge(s[low], s[low + 1]);
        return {
            le: a,
            re: a.sym
        }
    } else if (high - low === 3) {
        const a = makeEdge(s[low], s[low + 1]);
        const b = makeEdge(s[low + 1], s[low + 2]);
        splice(a.sym, b);

        const orient = ccw(s[low], s[low + 1], s[low + 2]);
        //const orient = orient2d(s[0][0], s[0][1], s[1][0], s[1][1], s[2][0], s[2][1]);

        if (orient > 0) {
            connect(b, a);
            return {
                le: a,
                re: b.sym
            }
        } else if (orient < 0) {
            const c = connect(b, a);
            return {
                le: c.sym,
                re: c
            }
        } else {
            // points colinear
            return {
                le: a,
                re: b.sym
            }
        }
    }

    // |S| >= 4
    const halfLen = Math.ceil((high + low) / 2);
    let { le: ldo, re: ldi } = delaunay(s, low, halfLen);
    let { le: rdi, re: rdo, } = delaunay(s, halfLen, high);

    // Compute the lower common tangent of L and R
    do {
        if (leftOf(rdi.from!, ldi))
            ldi = ldi.lnext;
        else if (rightOf(ldi.from!, rdi))
            rdi = rdi.rprev;
        else
            break;
    } while (true);

    let basel = connect(rdi.sym, ldi);
    if (ldi.from === ldo.from)
        ldo = basel.sym;
    if (rdi.from === rdo.from)
        rdo = basel;

    // This is the merge loop.
    do {
        // Locate the first L point (lcand.Dest) to be encountered by the rising bubble,
        // and delete L edges out of base1.Dest that fail the circle test.
        let t: QuadEdge | null;
        let lcand = basel.sym.onext;
        if (valid(lcand, basel)) {

            while (inCircle(basel.to, basel.from!, lcand.to, lcand.onext.to)) {
                t = lcand.onext;
                deleteEdge(lcand);
                lcand = t;
            }
        }

        //Symmetrically, locate the first R point to be hit, and delete R edges
        let rcand = basel.oprev;
        if (valid(rcand, basel)) {
            while (inCircle(basel.to, basel.from!, rcand.to, rcand.oprev.to)) {
                t = rcand.oprev;
                deleteEdge(rcand);
                rcand = t;
            }
        }

        // If both lcand and rcand are invalid, then basel is the upper common tangent
        if (!valid(lcand, basel) && !valid(rcand, basel))
            break;

        // The next cross edge is to be connected to either lcand.Dest or rcand.Dest
        // If both are valid, then choose the appropriate one using the InCircle test
        if (!valid(lcand, basel) || (valid(rcand, basel) &&
            inCircle(lcand.to, lcand.from!, rcand.from!, rcand.to)))
            // Add cross edge basel from rcand.Dest to basel.Dest
            basel = connect(rcand, basel.sym);
        else
            // Add cross edge base1 from basel.Org to lcand. Dest
            basel = connect(basel.sym, lcand.sym);
    } while (true);

    return {
        le: ldo,
        re: rdo
    }

}


/**
 * Sort points by distance via an array of point indices and an array of calculated distances.
 *
 * @param ids
 * @param dists
 * @param left
 * @param right
 */
function quicksort(ids: Uint32Array, dists: Float64Array, left: number, right: number) {
    if (right - left <= 20) {
        for (let i = left + 1; i <= right; i++) {
            const temp = ids[i];
            const tempDist = dists[temp];
            let j = i - 1;
            while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
            ids[j + 1] = temp;
        }
    } else {
        const median = (left + right) >> 1;
        let i = left + 1;
        let j = right;
        swap(ids, median, i);
        if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
        if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
        if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);

        const temp = ids[i];
        const tempDist = dists[temp];
        while (true) {
            do i++; while (dists[ids[i]] < tempDist);
            do j--; while (dists[ids[j]] > tempDist);
            if (j < i) break;
            swap(ids, i, j);
        }
        ids[left + 1] = ids[j];
        ids[j] = temp;

        if (right - i + 1 >= j - left) {
            quicksort(ids, dists, i, right);
            quicksort(ids, dists, left, j - 1);
        } else {
            quicksort(ids, dists, left, j - 1);
            quicksort(ids, dists, i, right);
        }
    }
}

/**
 * swap indices
 */
function swap(a: Uint32Array, i: number, j: number) {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
}