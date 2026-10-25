import { FileText, Lock, ArrowLeftRight, Server, Globe, Network, Cable } from 'lucide-react';
import type { OsiLayer } from '../types';

// Addresses used consistently across the whole explorer:
//   Your Computer   192.168.1.50  (MAC aa:bb:cc:dd:ee:ff)
//   Home router     192.168.1.1 LAN / 203.0.113.5 WAN (public)
//   App edge        104.16.123.96 (anycast, Frankfurt PoP ~12 ms away)
//   App server pod  10.0.5.22:8443 in us-east-1 (~80 ms RTT from the edge)

export const OSI_LAYERS: OsiLayer[] = [
  {
    id: 'L7',
    name: 'Application',
    proto: 'HTTP/2, HTTP/3, DNS, gRPC, OIDC/JWT',
    icon: FileText,
    tone: 'emerald',
    pdu: 'Data (message)',
    summary:
      'The meaning of the request: which resource, which method, who is asking, and what the answer is. Everything below exists to carry this layer safely.',
    devices: ['Browser / client app', 'DNS resolver', 'Edge WAF / CDN', 'Envoy sidecar', 'Your Application Server'],
    examples: [
      {
        label: 'HTTP/2 request',
        code: `:method: POST
:scheme: https
:authority: api.enterprise.com
:path: /api/v1/query
authorization: Bearer eyJraWQiOiI4ZjJhIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOi...
content-type: application/json
accept-encoding: gzip, br
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

{"query": "revenue_by_region", "range": "30d", "limit": 100}`,
        caption:
          'HTTP/2 replaces the "POST /path HTTP/1.1" request line with pseudo-headers (:method, :path, :authority) and compresses all headers with HPACK. This is the decoded view; on the wire it is binary frames.',
      },
      {
        label: 'HTTP/2 response',
        code: `:status: 200
content-type: application/json
content-encoding: br
cache-control: private, no-store
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-request-id: 7c1e9a52-0f3b-4d6e-9a1c-2b8f5d3e4a10
server-timing: db;dur=12.4, app;dur=23.9

{"rows": [{"region": "EMEA", "revenue": 1284500}, {"region": "NA", "revenue": 2210380}], "next": null}`,
        caption:
          'server-timing exposes backend timings to the browser DevTools. cache-control: no-store keeps per-user data out of shared caches. HSTS tells the browser to never try plain HTTP for this host again.',
      },
      {
        label: 'DNS lookup',
        code: `$ dig api.enterprise.com A +noall +answer +stats
api.enterprise.com.                       60   IN  CNAME  api.enterprise.com.edge.example-cdn.net.
api.enterprise.com.edge.example-cdn.net.  300  IN  A      104.16.123.96
;; Query time: 23 msec
;; SERVER: 192.168.1.1#53(192.168.1.1) (UDP)`,
        caption:
          'DNS is an application-layer protocol too, and it runs before anything else. The CNAME hands the name to the CDN, which answers with an anycast IP. 60 and 300 are TTLs: how many seconds resolvers may cache the answer.',
      },
      {
        label: 'HTTP/1.1 (for comparison)',
        code: `POST /api/v1/query HTTP/1.1
Host: api.enterprise.com
Authorization: Bearer eyJraWQiOiI4ZjJhIiwiYWxnIjoiUlMyNTYifQ...
Content-Type: application/json
Content-Length: 61
Connection: keep-alive

{"query": "revenue_by_region", "range": "30d", "limit": 100}`,
        caption:
          'Plain text, one request at a time per connection. Browsers open up to 6 connections per host to work around this; HTTP/2 multiplexes everything over one.',
      },
    ],
    fields: {
      title: 'Headers that matter on this path',
      columns: ['Header', 'Set by', 'Example', 'Why it matters'],
      rows: [
        { name: ':authority / Host', size: 'Client', example: 'api.enterprise.com', meaning: 'Which virtual host to route to. Edges and load balancers route on it.' },
        { name: 'Authorization', size: 'Client', example: 'Bearer eyJ...', meaning: 'Carries the Okta-issued access token (JWT). Anyone holding it can use it, so it must only travel over TLS.' },
        { name: 'Cookie / Set-Cookie', size: 'Both', example: '__Host-session=...; Secure; HttpOnly', meaning: 'Browser session. HttpOnly blocks JavaScript access, Secure forces HTTPS, SameSite limits cross-site sends.' },
        { name: 'X-Forwarded-For', size: 'Proxies', example: '203.0.113.5, 104.16.123.96', meaning: 'Original client IP, appended by each proxy. Only trust the entries added by your own infrastructure.' },
        { name: 'traceparent', size: 'Client / mesh', example: '00-4bf92f35...-01', meaning: 'W3C Trace Context. Lets one trace follow the request through edge, mesh and app.' },
        { name: 'Cache-Control', size: 'Server', example: 'private, no-store', meaning: 'Controls whether the CDN and browser may cache the response.' },
        { name: 'Strict-Transport-Security', size: 'Server', example: 'max-age=63072000; preload', meaning: 'Forces HTTPS for this host from now on and blocks SSL-stripping attacks.' },
      ],
    },
    explanation: [
      'Layer 7 carries the meaning of the exchange between Your Computer and Your Application Server: the method (GET/POST), the resource (/api/v1/query), the identity of the caller and the response body. HTTP/1.1 is plain text, HTTP/2 multiplexes binary frames over one TCP connection, and HTTP/3 runs the same semantics over QUIC (UDP) to avoid TCP head-of-line blocking.',
      'Identity is decided here. With OpenID Connect, Okta issues a signed JSON Web Token (JWT). Your Application Server checks its signature against Okta\'s published public keys (JWKS), then checks the issuer, audience, expiry and scopes before running any business logic.',
      'Bearer tokens work like cash: whoever holds one can spend it. L7 depends on L6 (TLS) to keep tokens from being read or replayed on the wire, and on short expiry times to limit the damage if one leaks.',
      'In real deployments, several boxes along the path also speak L7: the CDN/WAF inspects requests for attacks, the load balancer routes by Host and path, and the service-mesh sidecar enforces timeouts and retries. Each one terminates and re-originates HTTP, which is why headers like X-Forwarded-For and traceparent exist.',
    ],
    commands: [
      {
        cmd: 'curl -v https://api.enterprise.com/health',
        purpose: 'See the whole exchange: DNS result, TLS negotiation, ALPN, request and response headers.',
        output: `*   Trying 104.16.123.96:443...
* Connected to api.enterprise.com (104.16.123.96) port 443
* ALPN: curl offers h2,http/1.1
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / X25519
* ALPN: server accepted h2
> GET /health HTTP/2
> Host: api.enterprise.com
> user-agent: curl/8.7.1
>
< HTTP/2 200
< content-type: application/json
< server-timing: app;dur=0.4
<
{"status":"ok"}`,
      },
      {
        cmd: 'curl -o /dev/null -s -w "dns:%{time_namelookup} tcp:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer} total:%{time_total}\\n" https://api.enterprise.com/api/v1/query',
        purpose: 'Break one request into phases (seconds, cumulative). These numbers match the Request Timeline tab.',
        output: `dns:0.023 tcp:0.035 tls:0.047 ttfb:0.167 total:0.179`,
      },
    ],
    risks: [
      { name: 'Broken JWT validation', detail: 'Accepting alg "none", skipping the audience check, or ignoring exp lets attackers forge or reuse tokens.', mitigation: 'Use a vetted library, pin algorithms to RS256/ES256, and validate iss, aud, exp and nbf on every request.' },
      { name: 'Injection (SQLi, SSRF, command)', detail: 'User input reaches a SQL query, a URL fetcher or a shell without sanitizing.', mitigation: 'Parameterized queries, egress allowlists for outbound fetches, WAF rules at the edge as a second line of defense.' },
      { name: 'Token theft via XSS', detail: 'Tokens kept in localStorage can be read by any injected script.', mitigation: 'Keep tokens server-side (BFF pattern) or in HttpOnly cookies, and set a strict Content-Security-Policy.' },
      { name: 'Application-layer DDoS', detail: 'HTTP floods and protocol abuse such as HTTP/2 Rapid Reset (CVE-2023-44487) exhaust servers with cheap requests.', mitigation: 'Rate limiting and bot management at the edge, patched proxies, per-connection stream limits.' },
    ],
    troubleshooting: [
      { symptom: '401 Unauthorized', cause: 'No token, expired token, or signature/issuer/audience check failed. Decode the JWT and compare exp and aud.' },
      { symptom: '403 Forbidden', cause: 'Token is valid but lacks the required scope or role, or a WAF rule blocked the request.' },
      { symptom: '502 Bad Gateway', cause: 'A proxy got an invalid response or a reset from upstream. Often keep-alive timeout mismatch between the load balancer and the app.' },
      { symptom: '504 Gateway Timeout', cause: 'Upstream did not answer within the proxy timeout (here Envoy\'s 15 s route timeout). Look for slow DB queries.' },
      { symptom: 'NXDOMAIN / SERVFAIL', cause: 'The name does not exist, or resolution failed (DNSSEC validation error, broken authoritative server).' },
    ],
  },
  {
    id: 'L6',
    name: 'Presentation',
    proto: 'TLS 1.3, X.509, JSON / Protobuf, gzip / brotli',
    icon: Lock,
    tone: 'sky',
    pdu: 'TLS record',
    summary:
      'How data is represented and protected: encryption and authentication (TLS), serialization (JSON, Protobuf) and compression (gzip, brotli).',
    devices: ['Client TLS stack (BoringSSL, OpenSSL, SChannel)', 'Edge WAF / CDN (terminates TLS)', 'Envoy sidecar (mTLS)', 'Your Application Server'],
    examples: [
      {
        label: 'TLS 1.3 handshake',
        code: `Client                                               Server
ClientHello
  + supported_versions: TLS 1.3
  + server_name (SNI): api.enterprise.com
  + ALPN: h2, http/1.1
  + key_share: X25519 (32-byte ephemeral public key)
  + cipher_suites: TLS_AES_128_GCM_SHA256,
                   TLS_AES_256_GCM_SHA384,
                   TLS_CHACHA20_POLY1305_SHA256
                       -------->
                                                  ServerHello
                                                    + key_share: X25519
                                                    + cipher: TLS_AES_256_GCM_SHA384
                                      {EncryptedExtensions (ALPN: h2)}
                                      {Certificate: leaf + intermediate}
                                      {CertificateVerify: ecdsa_secp256r1_sha256}
                       <--------      {Finished}
{Finished}
[Application Data]     <------->      [Application Data]

{ } encrypted with handshake keys    [ ] encrypted with traffic keys`,
        caption:
          'One round trip (1-RTT). Both sides derive the same secret from their X25519 key shares (ephemeral Diffie-Hellman), so even a later theft of the server\'s private key cannot decrypt this session: that property is called forward secrecy.',
      },
      {
        label: 'Certificate chain',
        code: `Certificate chain
 0 s:CN = api.enterprise.com
   i:O = Enterprise Trust, CN = Enterprise Issuing CA G2
   a:PKEY: EC, (prime256v1); sigalg: ecdsa-with-SHA384
   v:NotBefore: Sep  1 00:00:00 2026 GMT; NotAfter: Nov 30 23:59:59 2026 GMT
 1 s:O = Enterprise Trust, CN = Enterprise Issuing CA G2
   i:O = Enterprise Trust, CN = Enterprise Root CA
---
X509v3 Subject Alternative Name:
    DNS:api.enterprise.com, DNS:*.api.enterprise.com
X509v3 Extended Key Usage:
    TLS Web Server Authentication
X509v3 CRL Distribution Points:
    URI:http://crl.enterprise-trust.example/g2.crl
CT Precertificate SCTs: 2 SCTs (logged in public Certificate Transparency logs)`,
        caption:
          'The server sends the leaf and intermediate; the root is already in the OS/browser trust store. The client checks every signature up to the root, that the name matches a SAN entry, that the dates are valid, and that the certificate was logged in Certificate Transparency.',
      },
      {
        label: 'TLS record on the wire',
        code: `TLS Record Layer
  Content Type:    Application Data (23)
  Legacy Version:  TLS 1.2 (0x0303)     <- always 0x0303 in TLS 1.3, for middlebox compatibility
  Length:          1440
  Encrypted Record:
    8f3a1c9e04b7d2...  [encrypted: HTTP/2 frames + real content type (1 byte)]
    ...4d21aa07e9c3f1  [16-byte AES-GCM authentication tag]`,
        caption:
          'Every record is encrypted and authenticated with AEAD (AES-GCM or ChaCha20-Poly1305). Flip one bit in transit and the tag check fails, so the connection is torn down.',
      },
      {
        label: 'Serialization: JSON vs Protobuf',
        code: `JSON (52 bytes, human-readable)
{"region":"EMEA","revenue":1284500,"currency":"EUR"}

Protobuf (15 bytes, schema-driven binary)
0a 04 45 4d 45 41  10 94 b3 4e  1a 03 45 55 52
|  field 1 "EMEA"  | field 2 varint | field 3 "EUR"

message RegionRevenue { string region = 1; int64 revenue = 2; string currency = 3; }`,
        caption:
          'Translating data into a shared format is the "presentation" job in the original OSI model. gRPC uses Protobuf over HTTP/2; browsers mostly use JSON, compressed with brotli or gzip.',
      },
    ],
    fields: {
      title: 'TLS record header',
      rows: [
        { name: 'Content Type', size: '1 byte', example: '23 (application_data)', meaning: '22 = handshake, 21 = alert, 23 = application data. In TLS 1.3 the real type is hidden inside the encrypted part.' },
        { name: 'Legacy Version', size: '2 bytes', example: '0x0303', meaning: 'Frozen at TLS 1.2 so old middleboxes do not drop TLS 1.3 traffic. The real version is negotiated in the supported_versions extension.' },
        { name: 'Length', size: '2 bytes', example: '1440', meaning: 'Length of the encrypted payload. A record is at most 16 KB of plaintext plus overhead.' },
        { name: 'Encrypted payload', size: 'variable', example: 'HTTP/2 frames', meaning: 'Ciphertext of application data plus a 1-byte inner content type and optional padding.' },
        { name: 'AEAD tag', size: '16 bytes', example: 'AES-GCM tag', meaning: 'Integrity check. Tampering is detected before any data reaches the application.' },
      ],
    },
    explanation: [
      'Layer 6 is about representation. In the TCP/IP world that mostly means TLS, which protects everything between Your Computer and the first box that terminates it (usually the edge/CDN, then again with mTLS hop by hop inside the cloud). Serialization formats (JSON, Protobuf) and compression (brotli, gzip) live here conceptually too.',
      'TLS 1.3 finishes in one round trip: the client guesses the key exchange (X25519) and sends its key share in the ClientHello. Ephemeral keys give forward secrecy. Legacy options like RSA key exchange, CBC ciphers and SHA-1 are gone from the protocol entirely.',
      'Certificate validation is where most real-world failures happen. The client must build a chain to a trusted root, match the hostname against Subject Alternative Names, check the validity dates and check revocation. Revocation is moving away from OCSP: Let\'s Encrypt, for example, has dropped OCSP in favor of CRLs, and certificate lifetimes are getting shorter (the CA/Browser Forum is phasing them down toward 47 days) so a leaked key stays useful for less time.',
      'A compromised CA can break the whole model. In 2011 the Dutch CA DigiNotar was hacked and fraudulent *.google.com certificates were used to intercept Gmail users in Iran. Browsers removed DigiNotar entirely. Certificate Transparency logs exist so that domain owners can now spot certificates they did not request.',
    ],
    commands: [
      {
        cmd: 'openssl s_client -connect api.enterprise.com:443 -servername api.enterprise.com -alpn h2 </dev/null',
        purpose: 'Run a TLS handshake by hand and see the chain, protocol, cipher and ALPN result.',
        output: `CONNECTED(00000003)
depth=2 O = Enterprise Trust, CN = Enterprise Root CA
verify return:1
depth=1 O = Enterprise Trust, CN = Enterprise Issuing CA G2
verify return:1
depth=0 CN = api.enterprise.com
verify return:1
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Peer signature type: ECDSA
Server Temp Key: X25519, 253 bits
ALPN protocol: h2
Verify return code: 0 (ok)`,
      },
      {
        cmd: 'echo | openssl s_client -connect api.enterprise.com:443 -servername api.enterprise.com 2>/dev/null | openssl x509 -noout -dates -ext subjectAltName',
        purpose: 'Check when the certificate expires and which names it covers.',
        output: `notBefore=Sep  1 00:00:00 2026 GMT
notAfter=Nov 30 23:59:59 2026 GMT
X509v3 Subject Alternative Name:
    DNS:api.enterprise.com, DNS:*.api.enterprise.com`,
      },
      {
        cmd: 'nmap --script ssl-enum-ciphers -p 443 api.enterprise.com',
        purpose: 'List every protocol version and cipher the server accepts. Anything below TLS 1.2 should be gone.',
        output: `443/tcp open  https
| ssl-enum-ciphers:
|   TLSv1.2:
|     ciphers:
|       TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 (ecdh_x25519) - A
|       TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 (ecdh_x25519) - A
|   TLSv1.3:
|     ciphers:
|       TLS_AES_128_GCM_SHA256 (ecdh_x25519) - A
|       TLS_AES_256_GCM_SHA384 (ecdh_x25519) - A
|       TLS_CHACHA20_POLY1305_SHA256 (ecdh_x25519) - A
|_  least strength: A`,
      },
    ],
    risks: [
      { name: 'Expired certificate outage', detail: 'One of the most common causes of full outages. Clients refuse to connect the moment notAfter passes.', mitigation: 'Automate issuance and renewal with ACME, alert at 30/14/7 days, and monitor the certificate actually served, not just the one in your secret store.' },
      { name: 'Compromised or misissuing CA', detail: 'A CA issues a valid certificate for your domain to someone else (the DigiNotar case).', mitigation: 'Monitor Certificate Transparency logs for your domains, publish CAA DNS records to restrict which CAs may issue, prefer short-lived certificates.' },
      { name: 'Protocol downgrade', detail: 'Old protocol versions (SSLv3, TLS 1.0/1.1) had attacks like POODLE and BEAST.', mitigation: 'TLS 1.2 minimum, prefer 1.3, HSTS with preload so browsers never fall back to HTTP.' },
      { name: 'TLS interception', detail: 'Corporate proxies or malware install their own root CA and re-sign traffic, seeing everything in clear text.', mitigation: 'mTLS between services, certificate pinning in mobile apps where it is operationally safe, endpoint management of trust stores.' },
    ],
    troubleshooting: [
      { symptom: 'certificate has expired / NET::ERR_CERT_DATE_INVALID', cause: 'The leaf (or an intermediate) is past notAfter, or the client\'s clock is wrong.' },
      { symptom: 'unable to get local issuer certificate', cause: 'The server is not sending its intermediate certificate, so the client cannot build a chain to the root.' },
      { symptom: 'hostname mismatch / ERR_CERT_COMMON_NAME_INVALID', cause: 'The load balancer serves a certificate whose SANs do not include this hostname (wrong SNI mapping).' },
      { symptom: 'handshake failure / no shared cipher', cause: 'Client and server have no protocol version or cipher in common, typically a very old client hitting a modern policy.' },
    ],
  },
  {
    id: 'L5',
    name: 'Session',
    proto: 'TLS resumption, HTTP/2 streams, QUIC connection IDs, cookies',
    icon: ArrowLeftRight,
    tone: 'fuchsia',
    pdu: 'Session state (no dedicated header in TCP/IP)',
    summary:
      'Keeping a logical conversation alive and organized: resuming encrypted sessions, multiplexing many requests over one connection, and remembering who is logged in.',
    devices: ['Client TLS stack', 'Browser cookie jar', 'Edge (session tickets)', 'App session store (e.g. Redis)'],
    examples: [
      {
        label: 'TLS session resumption',
        code: `[First connection, after the handshake]
Server -> Client: NewSessionTicket
  ticket_lifetime: 7200 s
  ticket_age_add:  0x5a1c39e2
  ticket:          0x8A92B4...  (opaque, encrypted with the server's ticket key)

[Reconnect after switching from Wi-Fi to 5G: new IP, new TCP connection]
ClientHello
  + pre_shared_key: identity=0x8A92B4..., binder=HMAC(...)
  + psk_key_exchange_modes: psk_dhe_ke
  + early_data                 <- 0-RTT: the GET goes out in the first flight
ServerHello
  + pre_shared_key: selected_identity=0   (resumed, no certificate exchange)`,
        caption:
          'Resumption skips the certificate exchange and, with 0-RTT, lets the client send data immediately. 0-RTT data can be replayed by an attacker, so servers only accept it for safe, idempotent requests.',
      },
      {
        label: 'HTTP/2 multiplexing',
        code: `TCP connection #1  (one TLS session to api.enterprise.com)
 |- Stream 1:  GET  /api/v1/profile        HEADERS -> DATA      (done)
 |- Stream 3:  POST /api/v1/query          HEADERS -> DATA ...  (in flight)
 |- Stream 5:  GET  /static/app.js         HEADERS -> DATA ...  (in flight)
 '- Stream 7:  GET  /api/v1/notifications  HEADERS              (waiting)

SETTINGS: MAX_CONCURRENT_STREAMS=100, INITIAL_WINDOW_SIZE=65535`,
        caption:
          'Many logical request/response pairs share one connection. Client streams use odd IDs. One lost TCP packet still stalls all streams (head-of-line blocking), which is what HTTP/3 over QUIC fixes.',
      },
      {
        label: 'App login session',
        code: `HTTP/2 302
location: /dashboard
set-cookie: __Host-session=s%3A9f8c1e...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800

Redis> GET sess:9f8c1e...
{"sub": "00u1a2b3c4EXAMPLE", "email": "you@enterprise.com", "roles": ["analyst"], "exp": 1792949400}`,
        caption:
          'The application keeps its own session on top of everything else: an opaque cookie that points at server-side state. The __Host- prefix forces Secure, Path=/ and no Domain attribute, so subdomains cannot overwrite it.',
      },
      {
        label: 'QUIC connection migration',
        code: `Wi-Fi:  192.168.1.50:58211 -> 104.16.123.96:443   DCID 0x8394c8f03e515708
        ... Wi-Fi drops, phone moves to 5G ...
5G:     100.72.14.9:40112  -> 104.16.123.96:443   DCID 0x8394c8f03e515708 (same)
        PATH_CHALLENGE / PATH_RESPONSE  -> path validated, streams continue`,
        caption:
          'TCP identifies a connection by IP and port, so a network change kills it. QUIC identifies it by a connection ID, so the same session (and its in-flight requests) survives the switch.',
      },
    ],
    explanation: [
      'The TCP/IP model has no separate session layer, so session duties are spread across other protocols. TLS keeps cryptographic sessions (and can resume them), HTTP/2 and HTTP/3 multiplex many streams over one connection, and the application keeps login state with cookies and a session store.',
      'When Your Computer switches from Wi-Fi to cellular, the L4 TCP connection breaks because the source IP changes. A TLS session ticket allows a fast resumed handshake on the new connection, and with 0-RTT the first request can go out right away. QUIC goes further: its connection IDs let the same connection migrate to the new network path.',
      'Remote procedure call frameworks such as gRPC add their own session concepts: deadlines that propagate across services, cancellation, and long-lived bidirectional streams, all multiplexed over HTTP/2.',
    ],
    commands: [
      {
        cmd: 'openssl s_client -connect api.enterprise.com:443 -sess_out /tmp/s.pem </dev/null; openssl s_client -connect api.enterprise.com:443 -sess_in /tmp/s.pem </dev/null | grep -E "^(New|Reused)"',
        purpose: 'Save a TLS session, then reconnect with it to confirm the server supports resumption.',
        output: `New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Reused, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384`,
      },
      {
        cmd: 'curl -sv --http2 -o /dev/null https://api.enterprise.com/health -o /dev/null https://api.enterprise.com/health 2>&1 | grep -iE "re-using|stream"',
        purpose: 'Two requests in one curl call: the second rides the same connection on a new HTTP/2 stream.',
        output: `* [HTTP/2] [1] OPENED stream for https://api.enterprise.com/health
* Re-using existing connection with host api.enterprise.com
* [HTTP/2] [3] OPENED stream for https://api.enterprise.com/health`,
      },
    ],
    risks: [
      { name: '0-RTT replay', detail: 'An attacker who captures early data can resend it, repeating a non-idempotent action such as a payment.', mitigation: 'Only allow 0-RTT for idempotent GETs; reject early data for anything that changes state.' },
      { name: 'Session hijacking and fixation', detail: 'A stolen or attacker-chosen session cookie gives full access to the account.', mitigation: 'Rotate the session ID at login, use HttpOnly + Secure + SameSite, keep sessions short and revoke them on logout.' },
      { name: 'Ticket key compromise', detail: 'If the key that encrypts session tickets leaks, recorded resumed sessions can be decrypted.', mitigation: 'Rotate ticket encryption keys every few hours and share them across load balancer nodes only through a secure channel.' },
    ],
    troubleshooting: [
      { symptom: 'Users randomly logged out', cause: 'Session state lives in one pod\'s memory and the next request hits a different pod. Use a shared store or sticky sessions.' },
      { symptom: 'Low TLS resumption rate', cause: 'Ticket keys are not shared across edge nodes, so a ticket from node A is useless on node B.' },
      { symptom: 'Requests stall together on a lossy network', cause: 'TCP head-of-line blocking under HTTP/2. HTTP/3 (QUIC) handles loss per stream.' },
    ],
  },
  {
    id: 'L4',
    name: 'Transport',
    proto: 'TCP, UDP, QUIC',
    icon: Server,
    tone: 'violet',
    pdu: 'Segment (TCP) / Datagram (UDP)',
    summary:
      'End-to-end delivery between two processes, identified by port numbers. TCP adds reliability, ordering, flow control and congestion control; UDP adds almost nothing.',
    devices: ['OS kernel TCP/IP stack', 'Stateful firewalls / security groups', 'NAT devices (rewrite ports)', 'L4 load balancers (NLB)'],
    examples: [
      {
        label: 'Handshake (tcpdump)',
        code: `$ sudo tcpdump -ni en0 'tcp port 443 and host 104.16.123.96'
10:42:01.023000 IP 192.168.1.50.49152 > 104.16.123.96.443: Flags [S], seq 1048575, win 65535,
    options [mss 1460,nop,wscale 6,nop,nop,TS val 1 ecr 0,sackOK,eol], length 0
10:42:01.035120 IP 104.16.123.96.443 > 192.168.1.50.49152: Flags [S.], seq 2047, ack 1048576, win 65535,
    options [mss 1400,sackOK,TS val 9 ecr 1,nop,wscale 13], length 0
10:42:01.035188 IP 192.168.1.50.49152 > 104.16.123.96.443: Flags [.], ack 1, win 4096, length 0
10:42:01.035502 IP 192.168.1.50.49152 > 104.16.123.96.443: Flags [P.], seq 1:518, ack 1, win 4096, length 517
                                                                          ^ TLS ClientHello`,
        caption:
          'SYN, SYN-ACK, ACK: one round trip (12 ms here) before any data. Both sides announce their maximum segment size (MSS) and window scaling. tcpdump switches to relative sequence numbers after the handshake.',
      },
      {
        label: 'TCP segment header',
        code: `Source Port:       49152   (ephemeral, picked by your OS)
Destination Port:  443     (HTTPS)
Sequence Number:   1048576
Ack Number:        2048
Data Offset:       8 (32 bytes: 20 fixed + 12 options)
Flags:             [PSH, ACK]
Window:            4096 x 2^6 (wscale 6) = 262144 bytes
Checksum:          0x3c1a
Options:           [NOP, NOP, Timestamps val 104 ecr 9]
Congestion ctrl:   CUBIC (Linux/macOS default) or BBR (kernel setting, not on the wire)`,
      },
      {
        label: 'QUIC over UDP',
        code: `UDP 192.168.1.50:58211 > 104.16.123.96:443  length 1252
QUIC Long Header: Initial
  Version:                    0x00000001 (QUIC v1, RFC 9000)
  Destination Connection ID:  0x8394c8f03e515708
  Source Connection ID:       0x1f2e
  Packet Number:              0
  CRYPTO frame:               TLS 1.3 ClientHello (ALPN: h3)
  PADDING                     (to at least 1200 bytes, anti-amplification)`,
        caption:
          'QUIC moves reliability and congestion control into user space and builds TLS 1.3 in, so transport + crypto setup takes a single round trip. Browsers use it for HTTP/3 when the server advertises it.',
      },
      {
        label: 'TCP state machine',
        code: `CLIENT                         SERVER
CLOSED                         LISTEN
SYN_SENT     --- SYN --->      SYN_RECEIVED
ESTABLISHED  <-- SYN/ACK --
ESTABLISHED  --- ACK --->      ESTABLISHED
  ... data ...
FIN_WAIT_1   --- FIN --->      CLOSE_WAIT
FIN_WAIT_2   <-- ACK ---
TIME_WAIT    <-- FIN ---       LAST_ACK
             --- ACK --->      CLOSED
(TIME_WAIT lasts 2 x MSL, typically 30-120 s, so late packets cannot confuse a new connection)`,
      },
    ],
    fields: {
      title: 'TCP header (20 bytes + options)',
      rows: [
        { name: 'Source port', size: '16 bits', example: '49152', meaning: 'Ephemeral port chosen by the client OS (macOS 49152-65535, Linux 32768-60999).' },
        { name: 'Destination port', size: '16 bits', example: '443', meaning: 'Service on the server. 443 = HTTPS, 53 = DNS, 5432 = PostgreSQL.' },
        { name: 'Sequence number', size: '32 bits', example: '1048576', meaning: 'Byte offset of this segment\'s first byte. Starts at a random value to resist spoofing.' },
        { name: 'Acknowledgment', size: '32 bits', example: '2048', meaning: 'Next byte expected from the other side. Everything before it arrived.' },
        { name: 'Data offset', size: '4 bits', example: '8', meaning: 'Header length in 32-bit words (5 = 20 bytes, 8 = 32 bytes with timestamps).' },
        { name: 'Flags', size: '8 bits', example: 'SYN, ACK, PSH, FIN, RST', meaning: 'SYN opens, FIN closes gracefully, RST aborts, ACK acknowledges, PSH pushes data to the app. CWR/ECE carry congestion signals (ECN).' },
        { name: 'Window', size: '16 bits', example: '4096 (x64)', meaning: 'Receive buffer space left (flow control). Multiplied by 2^wscale from the handshake.' },
        { name: 'Checksum', size: '16 bits', example: '0x3c1a', meaning: 'Covers header, data and a pseudo-header of the IP addresses.' },
        { name: 'Options', size: '0-40 bytes', example: 'MSS, SACK, TS, wscale', meaning: 'Negotiated features: max segment size, selective ACK, timestamps for RTT measurement.' },
      ],
    },
    explanation: [
      'Layer 4 connects a process on Your Computer (browser, port 49152) to a process on Your Application Server (port 443/8443). TCP turns the unreliable packet network into a reliable, ordered byte stream using sequence numbers, acknowledgments and retransmission.',
      'Flow control protects the receiver: the window field says how many bytes it can still buffer. Congestion control protects the network: the sender starts with a small congestion window (typically 10 segments, about 14 KB) and grows it as ACKs arrive. CUBIC reacts to packet loss; BBR models bandwidth and RTT and avoids filling router buffers (bufferbloat).',
      'Because new connections start slow, connection reuse matters a lot. A fresh connection to a server 12 ms away needs 1 RTT for TCP, 1 for TLS, then a few more RTTs to ramp up throughput. Keep-alive, HTTP/2 multiplexing and connection pools in your app all exist to avoid paying that again.',
      'Middleboxes care about L4 too: NAT rewrites ports, stateful firewalls track connection state, and L4 load balancers spread connections by the 5-tuple (protocol, source IP, source port, destination IP, destination port) without looking at HTTP.',
    ],
    commands: [
      {
        cmd: 'ss -tni dst 104.16.123.96',
        purpose: 'Linux: inspect live TCP internals: RTT, congestion window, MSS, retransmits.',
        output: `State  Recv-Q Send-Q  Local Address:Port    Peer Address:Port
ESTAB  0      0       192.168.1.50:49152    104.16.123.96:443
	 cubic wscale:13,6 rto:212 rtt:12.3/1.1 mss:1388 cwnd:10 bytes_acked:4821
	 bytes_received:31244 segs_out:18 segs_in:29 send 9.0Mbps delivery_rate 8.4Mbps retrans:0/0`,
      },
      {
        cmd: 'netstat -an -p tcp | grep 443',
        purpose: 'macOS: list TCP connections and their state.',
        output: `tcp4  0  0  192.168.1.50.49152  104.16.123.96.443  ESTABLISHED
tcp4  0  0  192.168.1.50.49188  140.82.112.25.443  TIME_WAIT`,
      },
      {
        cmd: 'nc -vz api.enterprise.com 443',
        purpose: 'Is the port reachable? Separates "firewall drops it" from "app is broken".',
        output: `Connection to api.enterprise.com port 443 [tcp/https] succeeded!`,
      },
    ],
    risks: [
      { name: 'SYN flood', detail: 'Millions of spoofed SYNs fill the server\'s half-open connection table.', mitigation: 'SYN cookies (on by default in Linux), edge DDoS scrubbing, and only exposing ports through the edge.' },
      { name: 'Port scanning', detail: 'Attackers sweep IP ranges looking for exposed databases, SSH and admin panels.', mitigation: 'Expose only 443 publicly, default-deny security groups, private subnets for everything else.' },
      { name: 'Port / conntrack exhaustion', detail: 'Busy NAT gateways or proxies run out of ephemeral ports or connection-tracking entries; new connections fail.', mitigation: 'Connection pooling and keep-alive, more NAT IPs, larger ephemeral ranges, tuned conntrack limits.' },
    ],
    troubleshooting: [
      { symptom: 'Connection refused', cause: 'The host answered with RST: it is reachable but nothing is listening on that port.' },
      { symptom: 'Connection timed out', cause: 'SYNs got no answer at all: a firewall or security group is dropping them silently.' },
      { symptom: 'Throughput far below link speed', cause: 'Small receive window, packet loss or high RTT. Check retransmits with ss -ti or netstat -s.' },
      { symptom: 'Thousands of TIME_WAIT sockets', cause: 'Many short-lived connections. Reuse connections (keep-alive, pooling) instead of opening new ones.' },
    ],
  },
  {
    id: 'L3',
    name: 'Network',
    proto: 'IPv4, IPv6, ICMP, BGP',
    icon: Globe,
    tone: 'orange',
    pdu: 'Packet',
    summary:
      'Global addressing and routing. Every router along the path reads the destination IP, picks the next hop from its routing table and decrements the TTL.',
    devices: ['Home router', 'ISP BNG and core routers', 'IXP / transit routers', 'Cloud VPC router', 'Kubernetes CNI'],
    examples: [
      {
        label: 'IPv4 header',
        code: `Version: 4  |  IHL: 5 (20 bytes)  |  DSCP: CS0  |  ECN: 0
Total Length:   1500
Identification: 0x4f2a  |  Flags: DF (Don't Fragment)  |  Fragment Offset: 0
TTL:            58      (started at 64, 6 routers so far)
Protocol:       6 (TCP)
Header Checksum: 0xb1e6 (recomputed at every hop because TTL changes)
Source IP:      192.168.1.50   -> [SNAT at home router] -> 203.0.113.5
Destination IP: 104.16.123.96  -> [edge terminates, new connection] -> 10.0.5.22`,
      },
      {
        label: 'traceroute',
        code: `$ traceroute -n api.enterprise.com
traceroute to api.enterprise.com (104.16.123.96), 64 hops max, 52 byte packets
 1  192.168.1.1      1.8 ms   1.6 ms   1.7 ms    home router
 2  203.0.113.1      4.9 ms   5.2 ms   4.8 ms    ISP BNG (your default gateway on the WAN)
 3  10.250.12.1      6.1 ms   5.9 ms   6.4 ms    ISP aggregation (private addressing inside ISP)
 4  192.0.2.254      9.3 ms   9.0 ms   9.5 ms    ISP core
 5  198.51.100.17   11.0 ms  11.2 ms  10.8 ms    IXP peering LAN
 6  104.16.123.96   12.6 ms  12.4 ms  12.9 ms    your app's edge (anycast, Frankfurt)`,
        caption:
          'traceroute sends packets with TTL 1, 2, 3... Each router that drops a packet at TTL 0 replies with ICMP "Time Exceeded", revealing itself. Hops that show * * * just do not answer ICMP; they still forward traffic.',
      },
      {
        label: 'Routing table',
        code: `$ netstat -rn -f inet        (macOS)
Destination        Gateway            Flags     Netif
default            192.168.1.1        UGScg     en0
127                127.0.0.1          UCS       lo0
192.168.1          link#11            UCS       en0
192.168.1.1/32     link#11            UCS       en0

Longest prefix match: 104.16.123.96 matches only "default" -> send to 192.168.1.1
                      192.168.1.77  matches 192.168.1/24  -> deliver directly on en0`,
      },
      {
        label: 'IPv6 header',
        code: `Version: 6  |  Traffic Class: 0x00  |  Flow Label: 0x3a1f2
Payload Length: 1240
Next Header:    6 (TCP)
Hop Limit:      58
Source:         2001:db8:4a2c:100::50       (global address, no NAT needed)
Destination:    2001:db8:ffff:1::60

Fixed 40-byte header, no header checksum, routers never fragment.`,
        caption:
          'IPv6 has enough addresses for every device to be reachable directly, so home routers just route and firewall instead of NATing. Dual-stack clients try IPv6 first and fall back to IPv4 within ~250 ms ("Happy Eyeballs").',
      },
    ],
    fields: {
      title: 'IPv4 header (20 bytes)',
      rows: [
        { name: 'Version / IHL', size: '4 + 4 bits', example: '4 / 5', meaning: 'IP version and header length in 32-bit words (5 = 20 bytes, no options).' },
        { name: 'DSCP / ECN', size: '6 + 2 bits', example: 'CS0 / 0', meaning: 'Quality-of-service class and explicit congestion notification. Usually reset at ISP boundaries.' },
        { name: 'Total length', size: '16 bits', example: '1500', meaning: 'Header plus payload in bytes. Limited by the link MTU.' },
        { name: 'Identification / Flags / Offset', size: '16 + 3 + 13 bits', example: '0x4f2a / DF / 0', meaning: 'Fragmentation fields. DF set means "drop rather than fragment" and enables Path MTU Discovery.' },
        { name: 'TTL', size: '8 bits', example: '58', meaning: 'Decremented by every router; the packet is dropped at 0. Prevents routing loops from living forever.' },
        { name: 'Protocol', size: '8 bits', example: '6', meaning: 'Next header: 6 = TCP, 17 = UDP (and QUIC), 1 = ICMP.' },
        { name: 'Header checksum', size: '16 bits', example: '0xb1e6', meaning: 'Covers the header only. Recomputed at every hop because TTL changes.' },
        { name: 'Source / Destination', size: '32 + 32 bits', example: '203.0.113.5 / 104.16.123.96', meaning: 'Endpoint addresses. NAT rewrites these; routers only read the destination.' },
      ],
    },
    natTable: [
      {
        title: 'Your home router (SNAT / masquerade)',
        original: 'Src: 192.168.1.50:49152 (Your Computer, private)\nDst: 104.16.123.96:443',
        translated: 'Src: 203.0.113.5:12055 (router WAN, public)\nDst: 104.16.123.96:443',
      },
      {
        title: 'Cloud load balancer (DNAT to pod)',
        original: 'Src: edge 172.70.8.14:41822\nDst: 10.0.1.40:443 (ALB node in public subnet)',
        translated: 'Src: 10.0.1.40:51310 (ALB node)\nDst: 10.0.5.22:8443 (Your App Server pod IP)',
      },
    ],
    explanation: [
      'Layer 3 moves packets from Your Computer to Your Application Server across dozens of independent networks. Every router does the same thing: look up the destination in its routing table, pick the most specific matching prefix (longest prefix match), forward the packet and decrement the TTL.',
      'Private address ranges (RFC 1918: 10/8, 172.16/12, 192.168/16) are not routable on the internet. Your home router uses Source NAT to share one public IP among all your devices. Some ISPs add a second layer, Carrier-Grade NAT, using the 100.64.0.0/10 range. In the cloud, load balancers do the reverse: they translate a public address to private pod IPs.',
      'Between networks, BGP decides the path. Each autonomous system (ISP, cloud, CDN) announces which prefixes it can reach; routers choose by policy and AS-path length. Anycast uses this on purpose: the same IP (104.16.123.96) is announced from many cities and BGP delivers you to the nearest one.',
      'MTU is the largest packet a link can carry (1500 bytes on Ethernet). Packets with the DF bit set that are too big for a link get dropped, and the router sends back ICMP "Fragmentation Needed". If a firewall blocks that ICMP, small requests work but big ones hang: a classic "PMTU black hole".',
    ],
    commands: [
      {
        cmd: 'ping -c 3 api.enterprise.com',
        purpose: 'Reachability and round-trip time. TTL 58 hints the server started at 64 and is 6 hops away.',
        output: `PING api.enterprise.com (104.16.123.96): 56 data bytes
64 bytes from 104.16.123.96: icmp_seq=0 ttl=58 time=12.6 ms
64 bytes from 104.16.123.96: icmp_seq=1 ttl=58 time=12.3 ms
64 bytes from 104.16.123.96: icmp_seq=2 ttl=58 time=12.9 ms
--- api.enterprise.com ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 12.3/12.6/12.9/0.2 ms`,
      },
      {
        cmd: 'mtr -rwc 50 api.enterprise.com',
        purpose: 'traceroute + ping combined over many samples: shows where loss and latency start.',
        output: `HOST: laptop                        Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 192.168.1.1                   0.0%    50    1.7   1.8   1.5   3.9   0.4
  2.|-- 203.0.113.1                   0.0%    50    4.9   5.1   4.6   9.8   0.8
  3.|-- 10.250.12.1                   0.0%    50    6.0   6.2   5.8   8.1   0.4
  4.|-- 192.0.2.254                   0.0%    50    9.2   9.3   8.9  12.0   0.5
  5.|-- 198.51.100.17                 0.0%    50   11.1  11.0  10.6  13.4   0.5
  6.|-- 104.16.123.96                 0.0%    50   12.5  12.6  12.1  15.2   0.5`,
      },
      {
        cmd: 'ping -D -s 1472 -c 2 api.enterprise.com',
        purpose: 'macOS: test path MTU. 1472 bytes of data + 8 ICMP + 20 IP = 1500 with Don\'t Fragment set (Linux: ping -M do -s 1472).',
        output: `PING api.enterprise.com (104.16.123.96): 1472 data bytes
1480 bytes from 104.16.123.96: icmp_seq=0 ttl=58 time=13.1 ms
1480 bytes from 104.16.123.96: icmp_seq=1 ttl=58 time=12.9 ms

(over a PPPoE link you would instead see: "frag needed and DF set (MTU 1492)")`,
      },
    ],
    risks: [
      { name: 'BGP hijacking and route leaks', detail: 'A network announces prefixes it does not own. In 2008 Pakistan Telecom\'s announcement of YouTube\'s prefix took YouTube offline worldwide for about two hours.', mitigation: 'RPKI Route Origin Validation, strict prefix filters with peers, MANRS practices.' },
      { name: 'IP spoofing', detail: 'Forged source addresses power reflection/amplification DDoS attacks.', mitigation: 'ISPs filter packets whose source does not belong to the customer (BCP 38 / uRPF).' },
      { name: 'Blocked ICMP breaks PMTUD', detail: 'Overzealous firewalls drop all ICMP, including "Fragmentation Needed", causing hangs on large transfers.', mitigation: 'Allow ICMP type 3 code 4 (and ICMPv6 Packet Too Big); clamp TCP MSS on tunnels.' },
    ],
    troubleshooting: [
      { symptom: 'ping: Request timeout', cause: 'Not proof the host is down: many hosts and clouds drop ICMP. Test the real port with nc or curl.' },
      { symptom: 'Small requests work, large uploads hang', cause: 'PMTU black hole: big packets with DF set are dropped and the ICMP error never arrives.' },
      { symptom: 'No route to host', cause: 'No matching route, or the gateway cannot ARP for the destination. Check the routing table and the default gateway.' },
      { symptom: 'Latency jumps at one traceroute hop and stays high', cause: 'The real path gets longer there (ocean crossing, congested link). A spike at one hop that disappears later is just ICMP deprioritization.' },
    ],
  },
  {
    id: 'L2',
    name: 'Data Link',
    proto: 'Ethernet, 802.11 Wi-Fi, ARP, VLAN (802.1Q)',
    icon: Network,
    tone: 'amber',
    pdu: 'Frame',
    summary:
      'Delivery between neighbors on the same link, using MAC addresses. Frames are rebuilt at every routed hop; only the IP packet inside travels end to end.',
    devices: ['Your NIC / Wi-Fi radio', 'Wi-Fi access point', 'Ethernet switches', 'Router interfaces'],
    examples: [
      {
        label: 'Ethernet II frame',
        code: `Dst MAC:   00:1a:2b:3c:4d:5e   (home router, the next hop, found via ARP)
Src MAC:   aa:bb:cc:dd:ee:ff   (Your Computer's NIC)
802.1Q:    VLAN 40, priority 0 (only on tagged trunk links, e.g. office switch uplinks)
EtherType: 0x0800 (IPv4)       (0x86DD = IPv6, 0x0806 = ARP)
Payload:   1500 bytes          (the IP packet)
FCS:       0x8a3c9100          (CRC-32, checked by every receiver; bad frames are dropped)`,
      },
      {
        label: 'ARP',
        code: `$ sudo tcpdump -ni en0 arp
10:41:59.998 ARP, Request who-has 192.168.1.1 tell 192.168.1.50, length 28
10:41:59.999 ARP, Reply 192.168.1.1 is-at 00:1a:2b:3c:4d:5e, length 46

$ arp -a
? (192.168.1.1) at 0:1a:2b:3c:4d:5e on en0 ifscope [ethernet]`,
        caption:
          'Your Computer knows the gateway\'s IP from DHCP but needs its MAC to build a frame. ARP broadcasts the question; the router answers. IPv6 does the same job with Neighbor Discovery (ICMPv6).',
      },
      {
        label: 'Wi-Fi 802.11 frame',
        code: `802.11 QoS Data frame
  Frame Control:  ToDS=1 FromDS=0  Protected=1  (WPA3-Personal, SAE + CCMP-128)
  Address 1 (Receiver / BSSID): 00:1a:2b:3c:4d:60   <- access point radio
  Address 2 (Transmitter):      aa:bb:cc:dd:ee:ff   <- your computer
  Address 3 (Destination):      00:1a:2b:3c:4d:5e   <- router (gateway)
  QoS Control:    TID 0 (Best Effort)
  CCMP header (8 bytes) + encrypted [LLC/SNAP + IP packet] + MIC (8 bytes)`,
        caption:
          'Wi-Fi frames carry three or four addresses because the radio receiving the frame (the AP) is not always its final L2 destination. The AP converts it into an Ethernet frame for the wired side.',
      },
      {
        label: 'Switch MAC table',
        code: `office-sw1# show mac address-table dynamic vlan 40
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  40    aabb.ccdd.eeff    DYNAMIC     Gi1/0/12   <- your desk port
  40    001a.2b3c.4d5e    DYNAMIC     Gi1/0/48   <- uplink to router
Total Mac Addresses for this criterion: 2`,
        caption:
          'Switches learn which MAC lives behind which port from source addresses, then forward frames only where needed. Unknown destinations are flooded to all ports in the VLAN.',
      },
    ],
    fields: {
      title: 'Ethernet frame layout',
      rows: [
        { name: 'Preamble + SFD', size: '8 bytes', example: '0x55 x7, 0xD5', meaning: 'Clock sync pattern, technically part of L1. Never seen by software.' },
        { name: 'Destination MAC', size: '6 bytes', example: '00:1a:2b:3c:4d:5e', meaning: 'Next hop on this link, not the final server. ff:ff:ff:ff:ff:ff = broadcast.' },
        { name: 'Source MAC', size: '6 bytes', example: 'aa:bb:cc:dd:ee:ff', meaning: 'Sender\'s interface. Modern OSes randomize it per Wi-Fi network for privacy.' },
        { name: '802.1Q tag', size: '4 bytes (optional)', example: 'VLAN 40', meaning: 'Virtual LAN ID (12 bits, up to 4094 VLANs) and priority. Separates traffic on shared switches.' },
        { name: 'EtherType', size: '2 bytes', example: '0x0800', meaning: 'What is inside: IPv4, IPv6 (0x86DD), ARP (0x0806).' },
        { name: 'Payload', size: '46-1500 bytes', example: 'IP packet', meaning: 'Padded to 46 bytes minimum; 1500 maximum is the standard MTU. Datacenters often use 9000-byte jumbo frames.' },
        { name: 'FCS', size: '4 bytes', example: 'CRC-32', meaning: 'Error detection. Corrupted frames are silently dropped; TCP retransmits.' },
      ],
    },
    explanation: [
      'Layer 2 only cares about the next hop. From Your Computer the destination MAC is always the local gateway (your router), even though the destination IP is a server on another continent. Every router strips the incoming frame and builds a new one for the next link, so MAC addresses change at every hop while the IP packet inside stays the same (apart from TTL and NAT).',
      'Switches forward frames by MAC address and learn the topology automatically. VLANs split one physical switch into several isolated broadcast domains, which is how offices separate staff, guest and voice networks. In cloud VPCs this layer is virtualized entirely: AWS does not even run real ARP; the hypervisor answers.',
      'On Wi-Fi, L2 also handles shared-medium access and encryption. WPA3 encrypts each station\'s traffic with its own keys, and the access point bridges between the radio and the wired Ethernet.',
    ],
    commands: [
      {
        cmd: 'arp -a',
        purpose: 'See which IP-to-MAC mappings your machine has learned on the local network.',
        output: `? (192.168.1.1) at 0:1a:2b:3c:4d:5e on en0 ifscope [ethernet]
? (192.168.1.23) at 3c:22:fb:9a:10:4e on en0 ifscope [ethernet]
? (224.0.0.251) at 1:0:5e:0:0:fb on en0 ifscope permanent [ethernet]`,
      },
      {
        cmd: 'ifconfig en0 | grep -E "ether|mtu"',
        purpose: 'macOS: your interface MAC address and MTU (Linux: ip link show).',
        output: `en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether aa:bb:cc:dd:ee:ff`,
      },
    ],
    risks: [
      { name: 'ARP spoofing (man-in-the-middle)', detail: 'An attacker on the LAN answers ARP requests for the gateway with their own MAC and receives all traffic.', mitigation: 'Dynamic ARP Inspection and DHCP snooping on switches; TLS so intercepted traffic stays unreadable.' },
      { name: 'MAC flooding', detail: 'Thousands of fake MACs overflow the switch table, turning it into a hub that floods all traffic.', mitigation: 'Port security limiting MACs per port.' },
      { name: 'VLAN hopping', detail: 'Double-tagged frames or switch spoofing let an attacker reach another VLAN.', mitigation: 'Disable auto-trunking (DTP), never use the native VLAN for user traffic.' },
      { name: 'Evil twin access point', detail: 'A rogue AP with the same SSID captures logins.', mitigation: 'WPA3-Enterprise with 802.1X and strict server-certificate validation.' },
    ],
    troubleshooting: [
      { symptom: 'Duplicate IP address detected', cause: 'Two devices answer ARP for the same IP: static IP inside the DHCP pool, or a misconfigured device.' },
      { symptom: 'CRC / FCS errors increasing on a port', cause: 'Damaged cable, bad connector or a duplex mismatch between two ends.' },
      { symptom: 'Can ping by IP on LAN but not the gateway', cause: 'Wrong VLAN on the switch port, or ARP to the gateway failing.' },
    ],
  },
  {
    id: 'L1',
    name: 'Physical',
    proto: 'Copper, fiber, radio (Wi-Fi, 5G)',
    icon: Cable,
    tone: 'rose',
    pdu: 'Bits / symbols',
    summary:
      'Turning bits into something that travels: voltages on copper, light pulses in fiber, or radio waves. Speed, distance and noise limits all come from here.',
    devices: ['NIC PHY and Wi-Fi radio', 'Cables and patch panels', 'Fiber optics (SFP transceivers)', 'GPON ONT / OLT optics', 'Cell towers'],
    examples: [
      {
        label: 'Media on this path',
        code: `Hop                         Medium                       Signal
Laptop -> access point      Wi-Fi 6 (802.11ax), 5 GHz    1024-QAM OFDMA, 80 MHz channel
Access point -> router      Cat6 copper                  1000BASE-T, PAM-5 on 4 pairs
Router -> ONT               Cat6 copper                  1000BASE-T
ONT -> OLT                  Single-mode fiber, 3.4 km    GPON: 1490 nm down / 1310 nm up
OLT -> ISP core             Single-mode fiber            100GBASE-LR4, 4 lambdas
Across the ocean            Submarine fiber              DWDM, dozens of 100-400G channels per fiber pair

Preamble on Ethernet: 10101010 10101010 ... 10101011 (SFD)`,
      },
      {
        label: 'Wi-Fi link quality',
        code: `$ sudo wdutil info        (macOS, abridged)
    SSID              : Enterprise-Corp
    PHY Mode          : 11ax
    Channel           : 5g36/80
    RSSI              : -54 dBm
    Noise             : -92 dBm
    SNR               : 38 dB
    Tx Rate           : 1201.0 Mbps
    MCS Index         : 11
    NSS               : 2`,
        caption:
          'MCS 11 = 1024-QAM (10 bits per symbol), 2 spatial streams, 80 MHz: 1201 Mbps link rate. Real throughput is roughly half because Wi-Fi is half-duplex and shared. Below about -70 dBm RSSI, rates and reliability drop fast.',
      },
      {
        label: 'Fiber optical levels',
        code: `GPON ONT optical status
  Rx optical power : -19.8 dBm    (class B+ window: -8 to -28 dBm)
  Tx optical power :  +2.1 dBm
  Wavelengths      : 1310 nm upstream / 1490 nm downstream
  Distance to OLT  :  3.42 km
  Temperature      :  48 C`,
        caption:
          'Fiber loses about 0.35 dB per km at 1310 nm, plus losses at each splitter and connector. A dirty connector can cost several dB and push the link out of its working window.',
      },
      {
        label: 'Ethernet link',
        code: `$ ethtool eth0      (Linux)
Settings for eth0:
	Supported link modes:   1000baseT/Full 2500baseT/Full
	Speed: 1000Mb/s
	Duplex: Full
	Auto-negotiation: on
	Port: Twisted Pair
	Link detected: yes`,
      },
    ],
    fields: {
      title: 'Common media compared',
      columns: ['Medium', 'Max speed', 'Reach', 'Notes'],
      rows: [
        { name: 'Cat5e copper', size: '1-2.5 Gb/s', example: '100 m', meaning: 'Still the most common office cabling. Supports PoE for phones and APs.' },
        { name: 'Cat6A copper', size: '10 Gb/s', example: '100 m', meaning: 'Shielding and tighter twists reduce crosstalk at higher frequencies.' },
        { name: 'Multimode fiber (OM4)', size: '100 Gb/s+', example: '~150 m at 100G', meaning: 'Cheap optics, short runs inside buildings and datacenters.' },
        { name: 'Single-mode fiber', size: '400 Gb/s+ per wavelength', example: '10-80 km, thousands with amplifiers', meaning: 'Metro, long-haul and submarine links. DWDM puts dozens of wavelengths on one fiber.' },
        { name: 'Wi-Fi 6 / 6E (802.11ax)', size: '9.6 Gb/s (theoretical)', example: '~30 m indoors', meaning: 'Shared, half-duplex radio. Real per-client throughput is a few hundred Mb/s.' },
        { name: 'Wi-Fi 7 (802.11be)', size: '46 Gb/s (theoretical)', example: '~30 m indoors', meaning: '320 MHz channels, 4096-QAM, multi-link operation.' },
        { name: '5G NR', size: '1-4 Gb/s typical peak', example: 'km (sub-6), 100s of m (mmWave)', meaning: 'Latency depends heavily on the carrier core network, not just the radio.' },
      ],
    },
    explanation: [
      'Layer 1 starts at Your Computer\'s network interface, which turns frames into signals: voltage levels on copper, light pulses in fiber, or modulated radio waves on Wi-Fi. Modern links pack many bits into each symbol (QAM, PAM4) to squeeze more throughput out of the same bandwidth.',
      'Physics sets hard limits. Shannon\'s law caps how many bits per second a channel can carry for a given bandwidth and signal-to-noise ratio, which is why weak Wi-Fi signal means slow Wi-Fi. Light in fiber travels at about 200,000 km/s, about 5 microseconds per km, so a Frankfurt-to-Virginia round trip can never be faster than about 65 ms no matter how good the equipment is.',
      'Most "network is slow" complaints that are not congestion are L1: poor Wi-Fi signal, interference from neighboring networks, damaged cables, or dirty fiber connectors. Error counters and signal levels are the first things to check.',
    ],
    commands: [
      {
        cmd: 'system_profiler SPAirPortDataType | grep -E "PHY Mode|Channel|Signal|Transmit Rate"',
        purpose: 'macOS: current Wi-Fi standard, channel, signal/noise and link rate without admin rights.',
        output: `          PHY Mode: 802.11ax
          Channel: 36 (5GHz, 80MHz)
          Signal / Noise: -54 dBm / -92 dBm
          Transmit Rate: 1201`,
      },
      {
        cmd: 'ethtool -S eth0 | grep -iE "crc|err|drop"',
        purpose: 'Linux: NIC error counters. Growing CRC errors point to a bad cable or port.',
        output: `     rx_crc_errors: 0
     rx_errors: 0
     tx_errors: 0
     rx_dropped: 0`,
      },
    ],
    risks: [
      { name: 'Physical tapping', detail: 'Fiber can be tapped by bending it and copper can be tapped inline, usually undetected.', mitigation: 'Encrypt above L1: MACsec on links, TLS end to end. Assume the wire is hostile.' },
      { name: 'RF jamming and deauth floods', detail: 'Radio interference or forged deauthentication frames knock clients off Wi-Fi.', mitigation: 'Protected Management Frames (required in WPA3), wired links for critical devices.' },
      { name: 'Cable cuts', detail: 'Construction, anchors and earthquakes cut fiber, both on land and undersea.', mitigation: 'Physically diverse paths and providers; ISPs and clouds reroute via BGP.' },
    ],
    troubleshooting: [
      { symptom: 'Wi-Fi RSSI worse than -70 dBm', cause: 'Too far from the access point or too many walls. Move closer, add an AP, or use 5/6 GHz near the AP.' },
      { symptom: 'Link negotiates at 100 Mb/s instead of 1 Gb/s', cause: 'A broken pair in the cable or a bad patch: 1000BASE-T needs all four pairs.' },
      { symptom: 'ONT Rx power below -27 dBm', cause: 'Dirty or damaged fiber connector or a bent fiber; call the ISP.' },
    ],
  },
];
