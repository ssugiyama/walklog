'use strict';

function encode_float(f) {
    var n = Math.round(f*100000);
    n <<= 1;
    if (n < 0) n = -n-1; 
    var ar = [];
    do {
	var k = n & 0x1F;
	n >>= 5
	ar.push(k);
    } while( n > 0 );
    for (var i = 0; i < ar.length; i++) {
	if (i < ar.length -1) ar[i] |= 0x20;
	ar[i] += 63
    }
    return ar;
}

exports.encode = function (path) {
    var prevx = 0;
    var prevy = 0;
    return path.map(function (point, i) {
        var ar = encode_float(point[1]-prevy).concat(encode_float(point[0]-prevx));
        prevx = point[0];
        prevy = point[1];
        return new Buffer(ar).toString('ascii');
    }).join('');
};

exports.decode = function (str) {
    var fs = []
    var buf = new Buffer(str, 'ascii');
    var n = 0, j = 0;
    for (var i = 0; i < buf.length; i++ ) {
	var k = buf[i] - 63;
	var is_last = ((k & 0x20) === 0);
	k &= 0x1f;
	n |= (k << (j*5));
	if (is_last) {
	    fs.push(((n >> 1)*(1 - 2*(n & 1)) - (n & 1))/100000.0);
            n = j = 0;
	} else {
            j += 1;
	}
    }
    var points = [];
    var p1 = 0, p2 = 0;
    var f1, f2;
    while ((f1 = fs.shift()) !== undefined) {
	f2 = fs.shift();
	p1 += f1;
	p2 += f2;
	points.push([p2, p1]);
    }
    return points;
};
