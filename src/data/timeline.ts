import type { FieldTable, Scenario } from '../types';

// Timings line up with the rest of the explorer: 12 ms RTT from Your Computer
// to the Frankfurt edge, ~80 ms RTT from the edge to the origin in us-east-1,
// 24 ms of server time of which 12.4 ms is the database query.
export const SCENARIOS: Scenario[] = [
  {
    id: 'cold',
    label: 'Cold: first visit',
    description: 'Nothing cached. DNS lookup, new TCP connection and full TLS handshake to the edge, then the request crosses the ocean to the origin.',
    phases: [
      { label: 'DNS lookup', start: 0, duration: 23, tone: 'lime', where: 'Client', layer: 'L7', detail: 'Resolver cache miss: the recursive resolver walks root, .com and enterprise.com\'s authoritative servers, then follows the CNAME to the CDN.' },
      { label: 'TCP handshake', start: 23, duration: 12, tone: 'violet', where: 'Network', layer: 'L4', detail: 'SYN, SYN-ACK, ACK with the Frankfurt edge: exactly one round trip (12 ms).' },
      { label: 'TLS 1.3 handshake', start: 35, duration: 12, tone: 'sky', where: 'Network', layer: 'L6', detail: 'ClientHello with key share, server answers with certificate and Finished: one more round trip. The browser verifies the certificate chain in well under a millisecond.' },
      { label: 'Request to edge', start: 47, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'Half a round trip for the request to reach the edge.' },
      { label: 'Edge: WAF + routing', start: 53, duration: 2, tone: 'rose', where: 'Edge', layer: 'L7', detail: 'TLS decrypt, WAF rules, bot score, rate limits, cache lookup (miss: this is a per-user API call).' },
      { label: 'Edge to origin', start: 55, duration: 40, tone: 'orange', where: 'Network', layer: 'L3', detail: 'One-way trip across the Atlantic to us-east-1 on an already-open mTLS connection, so no handshake is needed here.' },
      { label: 'ALB + Envoy sidecar', start: 95, duration: 2, tone: 'violet', where: 'Origin', layer: 'L4-L7', detail: 'ALB terminates TLS and picks a healthy pod; the Envoy sidecar applies the route timeout and forwards to the app on localhost.' },
      { label: 'JWT verification', start: 97, duration: 0.2, tone: 'amber', where: 'Origin', layer: 'L7', detail: 'RS256 signature check with the cached Okta JWKS plus claim checks. No call to Okta.' },
      { label: 'Database query', start: 97.2, duration: 12.4, tone: 'yellow', where: 'Origin', layer: 'L7', detail: 'Pooled connection, index scan over 48k rows, hash aggregate. The largest single chunk of server time.' },
      { label: 'Business logic + serialize', start: 109.6, duration: 11.4, tone: 'emerald', where: 'Origin', layer: 'L7', detail: 'Authorization checks, shaping the result, JSON serialization and brotli compression.' },
      { label: 'Origin to edge', start: 121, duration: 40, tone: 'orange', where: 'Network', layer: 'L3', detail: 'The response crosses the Atlantic back to Frankfurt.' },
      { label: 'Edge to you (first byte)', start: 161, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'First response bytes reach your browser at 167 ms: this is TTFB.' },
      { label: 'Content download', start: 167, duration: 12, tone: 'blue', where: 'Network', layer: 'L4', detail: 'The 31 KB response is bigger than a new connection\'s initial congestion window (~14 KB), so TCP slow start needs one extra round trip.' },
    ],
  },
  {
    id: 'warm',
    label: 'Warm: reused connection',
    description: 'DNS cached and the HTTP/2 connection to the edge already open. Only the actual request and the ocean crossing remain.',
    phases: [
      { label: 'Request to edge', start: 0, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'Sent immediately on the existing HTTP/2 connection as a new stream. No DNS, TCP or TLS.' },
      { label: 'Edge: WAF + routing', start: 6, duration: 2, tone: 'rose', where: 'Edge', layer: 'L7', detail: 'Same inspection as before.' },
      { label: 'Edge to origin', start: 8, duration: 40, tone: 'orange', where: 'Network', layer: 'L3', detail: 'The ocean crossing does not go away. Only moving the origin closer, or caching, removes it.' },
      { label: 'ALB + Envoy sidecar', start: 48, duration: 2, tone: 'violet', where: 'Origin', layer: 'L4-L7', detail: 'Load balancing and sidecar policy.' },
      { label: 'JWT verification', start: 50, duration: 0.2, tone: 'amber', where: 'Origin', layer: 'L7', detail: 'Cached keys, local verification.' },
      { label: 'Database query', start: 50.2, duration: 12.4, tone: 'yellow', where: 'Origin', layer: 'L7', detail: 'Same query, same cost.' },
      { label: 'Business logic + serialize', start: 62.6, duration: 11.4, tone: 'emerald', where: 'Origin', layer: 'L7', detail: 'Same processing.' },
      { label: 'Origin to edge', start: 74, duration: 40, tone: 'orange', where: 'Network', layer: 'L3', detail: 'Back across the Atlantic.' },
      { label: 'Edge to you (first byte)', start: 114, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'TTFB at 120 ms.' },
      { label: 'Content download', start: 120, duration: 1, tone: 'blue', where: 'Network', layer: 'L4', detail: 'The connection\'s congestion window has already grown, so the whole response arrives in one flight.' },
    ],
  },
  {
    id: 'cache',
    label: 'Edge cache hit',
    description: 'A cacheable resource such as /static/app.js, already in the Frankfurt edge cache. The origin is never contacted.',
    phases: [
      { label: 'Request to edge', start: 0, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'On the existing connection.' },
      { label: 'Edge cache lookup', start: 6, duration: 1, tone: 'rose', where: 'Edge', layer: 'L7', detail: 'Cache key matches a fresh object (Cache-Control: public, max-age=31536000, immutable for fingerprinted assets).' },
      { label: 'Edge to you (first byte)', start: 7, duration: 6, tone: 'cyan', where: 'Network', layer: 'L3', detail: 'Served straight from the PoP: TTFB at 13 ms.' },
      { label: 'Content download', start: 13, duration: 1, tone: 'blue', where: 'Network', layer: 'L4', detail: 'Warm connection, so the whole file arrives in one flight.' },
    ],
  },
];

export const LATENCY_REFERENCE: FieldTable = {
  title: 'Latency reference numbers',
  columns: ['What', 'Typical', 'Why', 'Notes'],
  rows: [
    { name: 'Light in fiber', size: '~5 us / km', example: '~200,000 km/s', meaning: 'Glass slows light to about 2/3 of its speed in vacuum. Rule of thumb: 1 ms of RTT per 100 km of fiber.' },
    { name: 'Frankfurt <-> Virginia', size: '~85-90 ms RTT', example: '~6,500 km', meaning: 'Theoretical minimum ~65 ms; real cables do not follow the great circle and add equipment delay.' },
    { name: 'Same metro / datacenter', size: '0.1-2 ms RTT', example: 'short fiber', meaning: 'Why databases sit in the same region (ideally same AZ) as the app.' },
    { name: 'Wi-Fi first hop', size: '1-5 ms', example: 'shared radio', meaning: 'Can spike to 10-50+ ms with interference, many clients or weak signal.' },
    { name: '4G LTE / 5G', size: '30-50 / 10-30 ms', example: 'radio + carrier core', meaning: 'Highly variable; the carrier core network often adds more than the radio.' },
    { name: 'GEO / LEO satellite', size: '~600 / 25-60 ms', example: '36,000 km / ~550 km orbit', meaning: 'Geostationary satellites are far away; low-earth-orbit constellations like Starlink are close.' },
    { name: 'TCP handshake', size: '1 RTT', example: 'SYN / SYN-ACK / ACK', meaning: 'Paid on every new connection, before TLS can start.' },
    { name: 'TLS 1.3 / TLS 1.2', size: '1 RTT / 2 RTT', example: 'full handshake', meaning: 'TLS 1.3 resumption with 0-RTT can send data in the first flight.' },
    { name: 'QUIC (HTTP/3)', size: '1 RTT (0 resumed)', example: 'transport + TLS combined', meaning: 'Saves one round trip compared with TCP + TLS 1.3.' },
  ],
};

export const TAKEAWAYS: string[] = [
  'Distance dominates. The two 40 ms ocean crossings are 80 of the 179 ms; no code optimization can remove them. Deploying the origin in Europe, or caching, can.',
  'Handshakes are paid per new connection: DNS + TCP + TLS cost 47 ms here. Connection reuse (keep-alive, HTTP/2, connection pools) takes that to zero.',
  'Terminating TCP and TLS at a nearby edge turns 90 ms handshake round trips into 12 ms ones, and the edge keeps warm connections to the origin.',
  'Server time is only 24 ms, and half of it is one database query. Indexes and query design matter more than micro-optimizing application code.',
  'Edge caching changes everything for cacheable content: 14 ms instead of 121 ms for the same warm connection.',
];
