import * as fs from 'fs';
import t from 'tape';
import { Delaunay } from '../index.ts';

t('ccw left turn with left-handed system', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.ccw([0, 0], [-1, 0], [0, -1]) > 0, true);
    t.end();
});

t('ccw left turn with colinear points', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.ccw([0, 0], [0, 1], [0, 2]) > 0, false);
    t.end();
});

t('ccw left turn with right-handed system', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.ccw([0, 0], [0, 1], [0, 2]) > 0, false);
    t.end();
});

t('leftOf function', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.leftOf([0, 0], { from: [-1, 0], to: [0, -1] }), true);
    t.same(triangulator.leftOf([0, 0], { from: [0, 1], to: [0, 2] }), false);
    t.end();
});

t('rightOf function', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.rightOf([0, 0], { from: [-1, 0], to: [0, -1] }), false);
    t.same(triangulator.rightOf([0, 0], { from: [0, 1], to: [0, 2] }), false); // Colinear
    t.same(triangulator.rightOf([-1, 0], { from: [0, 1], to: [0, 2] }), false);
    t.end();
});

t('inCircle infinite circle', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.inCircle([0, 0], [-1, 0], [1, 0], [1, 1]), false);
    t.end();
});

t('inCircle close point outside', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.inCircle([455.92018420781744, 248.96081128188553],
        [342.30806318880326, 338.21910826748257],
        [309.54136543023935, 164.19953352250644],
        [334.260775171976, 342.3228053742814]), false);
    t.end();
});

t('inCircle very large circle', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.inCircle([-999999, 1], [-1, 0], [1, 0], [1, 1]), true);
    t.end();
});

t('inCircle on circle\'s edge', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.inCircle([0, 1], [-1, 0], [1, 0], [-1, 0]), false);
    t.same(triangulator.inCircle([309.54136543023935, 164.19953352250644],
        [455.92018420781744, 248.96081128188553],
        [334.260775171976, 342.3228053742814],
        [455.92018420781744, 248.96081128188553]), false);
    t.same(triangulator.inCircle([-459519037000000000, 86437251528200000],
        [-636579428518000000, 187621503144000000],
        [-607069363265000000, 170757461208000000],
        [-459519037000000000, 86437251528200000]), false);
    t.end();
});

t('inCircle outside the circle', function (t) {
    const triangulator = new Delaunay();
    t.same(triangulator.inCircle([0, 1], [-1, 0], [1, 0], [-1, -1]), false);
    t.end();
});

t('Examples data', function (t) {
    ['4', 'dots', 'flag', 'grid', 'ladder', 'spiral', 'tri'].forEach(function (fileName) {
        const pts = readPointsFromFile('test/data/' + fileName + '.node');

        console.time(fileName);
        const d = new Delaunay(pts);
        const faces = d.triangulate();

        console.timeEnd(fileName);

        // Check all the circumcircles and all the points
        for (let i = 0; i < faces.length; i += 3)
            for (let j = 0; j < pts.length; j++) {
                if (d.inCircle(faces[i], faces[i + 1], faces[i + 2], pts[j]))
                    t.fail('Algorithm fails for file ' + fileName + ': point (' + pts[j] +
                        ') is in the circumcircle delimited by (' + faces[i] + '), (' + faces[i + 1] +
                        '), (' + faces[i + 2] + ').');
            }

    });

    t.end();
});

function readPointsFromFile(filename) {
    const result = [];
    fs.readFileSync(filename).toString().split('\n').slice(1).forEach(function (line) {
        const coordinates = line.split(/\s+/);
        result.push([parseFloat(coordinates[1]), parseFloat(coordinates[2])]);
    });
    return result;
}