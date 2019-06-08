'use strict';

function encodeFloat(f) {
    let n = Math.round(f*100000);
    n <<= 1;
    if (n < 0) n = -n-1;
    const ar = [];
    do {
        const k = n & 0x1F;
        n >>= 5;
        ar.push(k);
    } while( n > 0 );
    for (let i = 0; i < ar.length; i++) {
        if (i < ar.length -1) ar[i] |= 0x20;
        ar[i] += 63;
    }
    return ar;
}

exports.encode = function (path) {
    let prevx = 0;
    let prevy = 0;
    return path.map(function (point) {
        const ar = encodeFloat(point[1]-prevy).concat(encodeFloat(point[0]-prevx));
        prevx = point[0];
        prevy = point[1];
        return Buffer.from(ar).toString('ascii');
    }).join('');
};

exports.decode = function (str) {
    const fs = [];
    const buf = Buffer.from(str, 'ascii');
    let n = 0, j = 0;
    for (let i = 0; i < buf.length; i++ ) {
        let k = buf[i] - 63;
        let isLast = ((k & 0x20) === 0);
        k &= 0x1f;
        n |= (k << (j*5));
        if (isLast) {
            fs.push(((n >> 1)*(1 - 2*(n & 1)) - (n & 1))/100000.0);
            n = j = 0;
        } else {
            j += 1;
        }
    }
    const points = [];
    let p1 = 0, p2 = 0;
    let f1, f2;
    while ((f1 = fs.shift()) !== undefined) {
        f2 = fs.shift();
        p1 += f1;
        p2 += f2;
        points.push([p2, p1]);
    }
    return points;
};
