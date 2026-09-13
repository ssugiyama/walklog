import { decode, encode } from './path-encoder'

describe('path-encoder', () => {
  it('round-trips a simple path', () => {
    const path: [number, number][] = [
      [139.767125, 35.681236],
      [139.7672, 35.681301],
      [139.767318, 35.681405],
    ]

    const decoded = decode(encode(path))

    decoded.forEach(([lng, lat], i) => {
      // The format itself only carries 1e-5 precision, so allow one unit of
      // rounding slack rather than asserting exact equality.
      expect(lng).toBeCloseTo(path[i][0], 4)
      expect(lat).toBeCloseTo(path[i][1], 4)
    })
  })

  it('rounds each coordinate before taking the delta, not the other way around', () => {
    // lat0 rounds down to 35.12349 and lat1 rounds up to 35.1235 at the
    // standard 1e5 polyline precision, but their raw (unrounded) difference
    // rounds to 0. Encoding the raw delta instead of the delta between
    // rounded coordinates - the bug this guards against - would collapse
    // both points onto 35.12349, one unit short of where the second point
    // actually belongs.
    const lat0 = 35.1234949999
    const lat1 = 35.1234950001
    const lng = 139.767125

    const decoded = decode(
      encode([
        [lng, lat0],
        [lng, lat1],
      ]),
    )

    expect(decoded[0][1]).toBeCloseTo(35.12349, 5)
    expect(decoded[1][1]).toBeCloseTo(35.1235, 5)
    expect(decoded[1][1]).not.toBeCloseTo(decoded[0][1], 5)
  })
})
