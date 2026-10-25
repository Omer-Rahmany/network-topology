import type { IdStep, Risk } from '../types';

export const ACTORS = [
  { id: 'browser', label: 'Your Browser' },
  { id: 'app', label: 'Your App Server' },
  { id: 'okta', label: 'Okta (IdP)' },
] as const;

// Authorization Code flow with PKCE, as used by a server-side web app
// (or a backend-for-frontend). Example values come from RFC 6749 / RFC 7636.
export const ID_STEPS: IdStep[] = [
  {
    step: 1,
    title: 'Unauthenticated request',
    summary:
      'You open the app without a session. Your App Server creates a one-time login transaction and redirects your browser to Okta.',
    messages: [
      { from: 'browser', to: 'app', label: 'GET /dashboard (no session cookie)' },
      { from: 'app', to: 'browser', label: '302 Location: okta.com/authorize?...' },
    ],
    details: [
      'Your App Server sees no valid session cookie, so it starts an OpenID Connect login. It generates three random values and stores them in a short-lived, encrypted cookie: state (ties the response to this browser, preventing CSRF), nonce (ties the ID token to this login, preventing replay) and a PKCE code_verifier.',
      'It then redirects the browser to Okta\'s /authorize endpoint. Nothing secret is in the URL: only the client ID, requested scopes, where to come back to, and a SHA-256 hash of the code_verifier (the code_challenge).',
    ],
    examples: [
      {
        label: 'HTTP exchange',
        code: `GET /dashboard HTTP/2
Host: api.enterprise.com
Cookie: (none)

HTTP/2 302
location: https://company.okta.com/oauth2/default/v1/authorize
  ?client_id=0oa1b2c3d4EXAMPLE
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &redirect_uri=https%3A%2F%2Fapi.enterprise.com%2Fcallback
  &state=af0ifjsldkj
  &nonce=n-0S6_WzA2Mj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
set-cookie: __Host-oidc_tx=eyJzdGF0ZSI6...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`,
        caption: 'The Location URL is shown on several lines for readability; it is one line on the wire. The __Host-oidc_tx cookie holds state, nonce and code_verifier, encrypted by the app.',
      },
      {
        label: 'PKCE values',
        code: `code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk        (random, kept secret by the app)
code_challenge = BASE64URL(SHA256(code_verifier))
               = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM       (sent to Okta now)

Later, only someone who knows the verifier can redeem the authorization code.`,
      },
    ],
    checks: [
      'state, nonce and code_verifier are cryptographically random and single-use',
      'The transaction cookie is HttpOnly, Secure and short-lived (minutes)',
      'Use PKCE even for confidential server-side clients (OAuth 2.0 Security BCP, RFC 9700)',
    ],
  },
  {
    step: 2,
    title: 'Authorize at Okta',
    summary:
      'Okta validates the request. If you already have an Okta session, this is where single sign-on happens and you skip the login screen.',
    messages: [
      { from: 'browser', to: 'okta', label: 'GET /oauth2/default/v1/authorize?...' },
      { from: 'okta', to: 'okta', label: 'Check client, redirect_uri, existing Okta session' },
    ],
    details: [
      'Okta checks that client_id is a registered application and that redirect_uri exactly matches one of its registered callback URLs. An exact match matters: loose matching has historically let attackers steal authorization codes by redirecting them to their own pages.',
      'Okta then looks for its own session cookie on the okta.com domain. If you logged into any Okta-connected app recently, the session is still valid, and Okta skips straight to step 4. That reuse of one IdP session across many apps is what "single sign-on" means. Policies can still require fresh MFA for sensitive apps.',
    ],
    examples: [
      {
        label: 'Parameters explained',
        code: `GET https://company.okta.com/oauth2/default/v1/authorize
  client_id             = 0oa1b2c3d4EXAMPLE      which application is asking
  response_type         = code                   authorization code flow (no tokens in the URL)
  scope                 = openid profile email   "openid" makes it OIDC and requests an ID token
                          offline_access         also requests a refresh token
  redirect_uri          = https://api.enterprise.com/callback   must exactly match registration
  state                 = af0ifjsldkj            echoed back unchanged; CSRF protection
  nonce                 = n-0S6_WzA2Mj           copied into the ID token; replay protection
  code_challenge        = E9Melhoa2Ow...         PKCE: hash of the app's secret verifier
  code_challenge_method = S256`,
      },
      {
        label: 'OIDC discovery',
        code: `$ curl -s https://company.okta.com/oauth2/default/.well-known/openid-configuration | jq
{
  "issuer": "https://company.okta.com/oauth2/default",
  "authorization_endpoint": "https://company.okta.com/oauth2/default/v1/authorize",
  "token_endpoint": "https://company.okta.com/oauth2/default/v1/token",
  "jwks_uri": "https://company.okta.com/oauth2/default/v1/keys",
  "end_session_endpoint": "https://company.okta.com/oauth2/default/v1/logout",
  "response_types_supported": ["code", "id_token", "code id_token", ...],
  "code_challenge_methods_supported": ["S256"],
  "id_token_signing_alg_values_supported": ["RS256"]
}`,
        caption: 'OIDC libraries read this document to find every endpoint and the signing keys, so the app only needs to be configured with the issuer URL.',
      },
    ],
    checks: [
      'Register exact redirect URIs; no wildcards',
      'Request only the scopes you need',
      'Okta session lifetime and MFA re-prompt rules are set by policy per app',
    ],
  },
  {
    step: 3,
    title: 'Authentication & MFA',
    summary:
      'You prove who you are to Okta, never to the app. The app never sees your password.',
    messages: [
      { from: 'okta', to: 'browser', label: 'Sign-in page (or FastPass device check)' },
      { from: 'browser', to: 'okta', label: 'Password + MFA (push / passkey)' },
    ],
    details: [
      'Okta evaluates a sign-on policy: who you are, which device, from which network and IP reputation. It then asks for the factors that policy requires. Phishing-resistant factors such as Okta FastPass or WebAuthn passkeys are bound to the real okta.com origin, so a fake login page cannot relay them.',
      'Push notifications are convenient but can be abused through "MFA fatigue": in the 2022 Uber breach, the attacker spammed push requests until an employee approved one. Number matching (typing a number shown on screen into the phone) defeats blind approvals.',
      'Every attempt lands in the Okta System Log, which security teams feed into their SIEM to detect impossible travel, brute force and suspicious factor resets.',
    ],
    examples: [
      {
        label: 'Okta System Log event',
        code: `{
  "eventType": "user.authentication.auth_via_mfa",
  "displayMessage": "Authentication of user via MFA",
  "outcome": { "result": "SUCCESS" },
  "actor": { "alternateId": "you@enterprise.com", "type": "User" },
  "client": {
    "ipAddress": "203.0.113.5",
    "userAgent": { "browser": "CHROME", "os": "Mac OS X" },
    "geographicalContext": { "city": "Frankfurt", "country": "Germany" }
  },
  "debugContext": {
    "debugData": {
      "factor": "OKTA_VERIFY_PUSH",
      "behaviors": "{New Geo-Location=NEGATIVE, New Device=NEGATIVE, New IP=NEGATIVE}"
    }
  }
}`,
        caption: 'The client IP is your router\'s public address, 203.0.113.5, after SNAT. Okta never sees 192.168.1.50.',
      },
      {
        label: 'Factor strength',
        code: `Factor                           Phishing-resistant   Notes
WebAuthn / passkey (FIDO2)       yes                  bound to origin; private key never leaves device
Okta FastPass                    yes                  device-bound, can check device posture
Okta Verify push + number match  partly               user must type the number shown on screen
Okta Verify push (plain)         no                   vulnerable to MFA fatigue
TOTP code (authenticator app)    no                   can be relayed by a real-time phishing proxy
SMS / voice code                 no                   SIM swap and interception risk`,
      },
    ],
    checks: [
      'Prefer phishing-resistant factors (FastPass, passkeys) for admins and sensitive apps',
      'Enable number matching for push',
      'Rate-limit and alert on repeated failed MFA attempts',
    ],
  },
  {
    step: 4,
    title: 'Code returned via redirect',
    summary:
      'Okta redirects your browser back to the app with a one-time authorization code. No tokens travel through the browser.',
    messages: [
      { from: 'okta', to: 'browser', label: '302 Location: /callback?code=...&state=...' },
      { from: 'browser', to: 'app', label: 'GET /callback?code=SplxlOBe...&state=af0ifjsldkj' },
    ],
    details: [
      'The authorization code is short-lived and can only be used once. On its own it is useless to an attacker: redeeming it requires the PKCE code_verifier that only Your App Server knows (and, for a confidential client, the client secret).',
      'The app first compares the returned state with the one saved in its transaction cookie. A mismatch means the response was not started by this browser (login CSRF) and the request is rejected.',
      'This is why the older "implicit flow", which put access tokens directly in the URL fragment, is deprecated: URLs end up in browser history, logs and Referer headers.',
    ],
    examples: [
      {
        label: 'Redirect back',
        code: `HTTP/2 302   (from company.okta.com)
location: https://api.enterprise.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj

GET /callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj HTTP/2
Host: api.enterprise.com
Cookie: __Host-oidc_tx=eyJzdGF0ZSI6...`,
      },
      {
        label: 'Error response',
        code: `If the user cancels or policy denies access:

location: https://api.enterprise.com/callback
  ?error=access_denied
  &error_description=User+is+not+assigned+to+the+client+application.
  &state=af0ifjsldkj`,
      },
    ],
    checks: [
      'Reject the callback if state does not match the transaction cookie',
      'Never log full callback URLs (they contain the code)',
      'Clear the transaction cookie once used',
    ],
  },
  {
    step: 5,
    title: 'Token exchange (back channel)',
    summary:
      'Your App Server trades the code for tokens in a direct, server-to-server TLS call to Okta. The browser is not involved.',
    messages: [
      { from: 'app', to: 'okta', label: 'POST /v1/token (code + code_verifier + client auth)' },
      { from: 'okta', to: 'app', label: '200 { id_token, access_token, refresh_token }' },
    ],
    details: [
      'The app sends the code, the same redirect_uri, the PKCE code_verifier, and authenticates itself to Okta (client secret, or better, a private_key_jwt client assertion). Okta hashes the verifier and checks it matches the code_challenge from step 1, so a stolen code cannot be redeemed by anyone else.',
      'Okta responds with three tokens. The ID token (a JWT) says who you are, for the app. The access token (also a JWT with Okta\'s custom authorization servers) is what you present to APIs. The refresh token lets the app get new access tokens without sending you back through login.',
    ],
    examples: [
      {
        label: 'Token request & response',
        code: `POST /oauth2/default/v1/token HTTP/1.1
Host: company.okta.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapi.enterprise.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJraWQiOiI4ZjJhIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6...",
  "id_token": "eyJraWQiOiI4ZjJhIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwMHUxYTJi...",
  "refresh_token": "8xLOxBtZp8...",
  "scope": "openid profile email offline_access"
}`,
      },
      {
        label: 'ID token vs access token',
        code: `                 ID token                          Access token
Audience (aud)   your app (client_id)              your API ("api://enterprise")
Purpose          tell the app who logged in        authorize calls to APIs
Read by          the client app only               the API (resource server)
Contains         identity: sub, email, name, amr   permissions: scp (scopes), groups
Send to APIs?    no                                yes, as "Authorization: Bearer ..."`,
      },
    ],
    checks: [
      'Call the token endpoint from the server, never from browser JavaScript with a client secret',
      'Prefer private_key_jwt over a shared client secret',
      'Store refresh tokens encrypted, server-side',
    ],
  },
  {
    step: 6,
    title: 'Verify JWT with JWKS',
    summary:
      'Your App Server checks Okta\'s signature locally with cached public keys, then validates every claim.',
    messages: [
      { from: 'app', to: 'okta', label: 'GET /v1/keys (only on startup or unknown kid)' },
      { from: 'app', to: 'app', label: 'Verify RS256 signature + iss, aud, exp, nonce' },
    ],
    details: [
      'A JWT has three base64url parts: header, payload and signature. The header\'s kid says which Okta key signed it. The app fetches Okta\'s public keys (JWKS) once, caches them, and only refetches when it sees a kid it does not know, which happens when Okta rotates keys.',
      'After the signature checks out, the app validates the claims: iss must be exactly the Okta issuer, aud must be this app (or this API, for access tokens), exp must be in the future, and nonce must match the one from step 1. Only then does it trust sub as your identity.',
      'Because verification is local, every API call can be authenticated in a fraction of a millisecond without a network call to Okta. The tradeoff: a JWT stays valid until it expires even if revoked, so access tokens are kept short-lived.',
    ],
    examples: [
      {
        label: 'Decoded ID token',
        code: `Header
{ "kid": "8f2a", "alg": "RS256" }

Payload
{
  "iss": "https://company.okta.com/oauth2/default",
  "sub": "00u1a2b3c4EXAMPLE",
  "aud": "0oa1b2c3d4EXAMPLE",
  "iat": 1792920000,
  "exp": 1792923600,
  "auth_time": 1792919990,
  "nonce": "n-0S6_WzA2Mj",
  "amr": ["pwd", "mfa"],
  "email": "you@enterprise.com",
  "name": "Your Name"
}

Signature
RSASSA-PKCS1-v1_5 with SHA-256 over: base64url(header) + "." + base64url(payload)`,
      },
      {
        label: 'JWKS',
        code: `GET https://company.okta.com/oauth2/default/v1/keys
{
  "keys": [
    {
      "kty": "RSA",
      "alg": "RS256",
      "kid": "8f2a",
      "use": "sig",
      "e": "AQAB",
      "n": "xGOr-H7A-PWG3z...(2048-bit modulus, base64url)"
    }
  ]
}`,
        caption: 'Public keys only. Okta keeps the private key; anyone can verify signatures but only Okta can create them.',
      },
    ],
    checks: [
      'Signature verifies with the key matching kid; algorithm pinned to RS256 (reject "none" and HS256)',
      'iss is exactly the expected issuer; aud is exactly your client_id or API audience',
      'exp and iat are valid, allowing only a small clock skew (about 1-2 minutes)',
      'nonce matches the value stored in step 1 (ID token)',
      'For access tokens, check scp / groups for the action being performed',
    ],
  },
  {
    step: 7,
    title: 'Session & token lifecycle',
    summary:
      'The app creates its own session, refreshes tokens in the background, and logs out at both the app and Okta.',
    messages: [
      { from: 'app', to: 'browser', label: '302 /dashboard + Set-Cookie: __Host-session' },
      { from: 'app', to: 'okta', label: 'POST /v1/token grant_type=refresh_token (later)' },
    ],
    details: [
      'Your App Server stores the tokens server-side and gives the browser only an opaque, HttpOnly session cookie. JavaScript in the page can never read the tokens, which removes the main payoff of an XSS attack. This is the backend-for-frontend (BFF) pattern.',
      'When the access token is about to expire, the app uses the refresh token to get a new one. With refresh token rotation, every use returns a new refresh token and invalidates the old one; if an old one is ever reused, Okta treats it as theft and revokes the whole chain.',
      'Logout has two parts: destroy the app session, then redirect to Okta\'s logout endpoint to end the Okta session too. Otherwise the next visit would silently sign you back in via SSO.',
    ],
    examples: [
      {
        label: 'Session established',
        code: `HTTP/2 302
location: /dashboard
set-cookie: __Host-session=s%3A9f8c1e...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800
set-cookie: __Host-oidc_tx=; Path=/; Secure; HttpOnly; Max-Age=0

Session store (Redis)   key sess:9f8c1e...   TTL 8 h
{
  "sub": "00u1a2b3c4EXAMPLE",
  "access_token_exp": 1792923600,
  "refresh_token": "(encrypted at rest)"
}`,
      },
      {
        label: 'Refresh & logout',
        code: `# 55 minutes later: refresh before the access token expires
POST /oauth2/default/v1/token
grant_type=refresh_token&refresh_token=8xLOxBtZp8...&scope=openid%20profile%20email%20offline_access
-> 200 { "access_token": "eyJ...(new)", "refresh_token": "Qm9hT4...(rotated)", "expires_in": 3600 }

# Logout: end the app session, then the Okta session
GET https://company.okta.com/oauth2/default/v1/logout
  ?id_token_hint=eyJraWQiOiI4ZjJhIiwiYWxnIjoiUlMyNTYifQ...
  &post_logout_redirect_uri=https%3A%2F%2Fapi.enterprise.com%2Fsigned-out
  &state=xyz123`,
      },
    ],
    checks: [
      'Keep access tokens short-lived (5-60 minutes); rely on refresh for long sessions',
      'Enable refresh token rotation with reuse detection',
      'Revoke tokens and end the Okta session on logout',
      'Rotate the session ID after login to prevent session fixation',
    ],
  },
];

export const IDENTITY_PITFALLS: Risk[] = [
  { name: 'Tokens in localStorage', detail: 'Any XSS bug can read localStorage and exfiltrate long-lived tokens.', mitigation: 'Keep tokens on the server (BFF) or in HttpOnly cookies; use a strict Content-Security-Policy.' },
  { name: 'Algorithm confusion', detail: 'Libraries that trust the token\'s own "alg" header have accepted "none", or verified RS256 tokens as HS256 using the public key as the secret.', mitigation: 'Pin the expected algorithm in code and use maintained JWT libraries.' },
  { name: 'Missing audience check', detail: 'A token issued for a different app on the same Okta org is accepted by yours.', mitigation: 'Always validate aud against your own client ID or API audience.' },
  { name: 'MFA fatigue', detail: 'Repeated push prompts until a user taps "Approve" (Uber, 2022).', mitigation: 'Number matching, phishing-resistant factors, and alerting on bursts of push requests.' },
  { name: 'Open redirect after login', detail: 'A returnTo parameter sends users to an attacker\'s site right after a legitimate login.', mitigation: 'Only allow relative paths or an allowlist of destinations.' },
  { name: 'Long-lived tokens with no revocation', detail: 'A leaked JWT with a 24 h lifetime stays valid for a day even after the user is disabled.', mitigation: 'Short access token lifetimes, refresh token rotation, and Okta event hooks to revoke sessions on deprovisioning.' },
];
