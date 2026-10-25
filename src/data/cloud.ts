import { Laptop, Search, Cloud, Layers, Hexagon, Workflow, Server, Database } from 'lucide-react';
import type { TopologyNode } from '../types';

export const CLOUD_NODES: TopologyNode[] = [
  {
    id: 'computer',
    label: 'Your Computer',
    icon: Laptop,
    tone: 'cyan',
    summary: 'Browser starts the HTTPS request.',
    layers: ['L7', 'L6', 'L4'],
    details: [
      'Your browser sends the request to api.enterprise.com. Before the first byte leaves, it checks its HSTS list (to force HTTPS), its DNS cache, and its pool of open connections. A cold request pays for DNS, TCP and TLS; a warm one reuses everything and goes straight out on an existing HTTP/2 connection.',
      'The browser attaches cookies for the domain, or your single-page app adds an Authorization header with the access token. It also enforces CORS and other same-origin rules before handing the response to JavaScript.',
    ],
    metrics: [
      { label: 'Connections per origin (HTTP/2)', value: '1' },
      { label: 'Connections per origin (HTTP/1.1)', value: 'up to 6' },
      { label: 'Cold request to first byte', value: '~167 ms' },
      { label: 'Warm request to first byte', value: '~120 ms' },
    ],
    examples: [
      {
        label: 'DevTools timing',
        code: `Chrome DevTools -> Network -> /api/v1/query -> Timing
  Queueing               0.4 ms
  DNS Lookup            23.0 ms
  Initial connection    24.0 ms   (TCP 12.0 + TLS 12.0)
    SSL                 12.0 ms
  Request sent           0.2 ms
  Waiting for server   120.0 ms   <- edge, ocean crossing, LB, app, DB, and back
  Content Download      12.0 ms
  -----------------------------
  Total                179.6 ms`,
      },
    ],
    risks: [
      { name: 'Malicious browser extensions', detail: 'Extensions with broad permissions can read pages and steal session cookies or tokens.', mitigation: 'Manage allowed extensions with MDM / browser policy on corporate devices.' },
    ],
  },
  {
    id: 'dns',
    label: 'DNS',
    icon: Search,
    tone: 'lime',
    summary: 'Turns api.enterprise.com into an IP address.',
    layers: ['L7'],
    details: [
      'Your Computer asks its configured resolver (the home router, the ISP, or a public resolver like 1.1.1.1). On a cache miss, the recursive resolver walks the hierarchy: a root server points it to the .com servers, which point it to enterprise.com\'s authoritative servers (here AWS Route 53), which return the answer.',
      'The answer is a CNAME to the CDN, which returns an anycast IP. TTLs control caching: short TTLs (60 s) allow fast failover but cause more lookups; long TTLs are cheaper and faster but slow to change.',
      'Cloud DNS services add routing logic: latency-based, geolocation, weighted (canary) and health-check-based failover records.',
    ],
    metrics: [
      { label: 'Record TTL (api.enterprise.com)', value: '60 s' },
      { label: 'Resolver cache hit', value: '1-5 ms' },
      { label: 'Full recursive resolution', value: '50-150 ms' },
      { label: 'Transport', value: 'UDP/53, DoH/DoT on 443/853' },
    ],
    examples: [
      {
        label: 'dig +trace',
        code: `$ dig +trace api.enterprise.com      (abridged)
.                    518400 IN NS  a.root-servers.net.
;; Received 239 bytes from 192.168.1.1#53 in 2 ms
com.                 172800 IN NS  a.gtld-servers.net.
;; Received 1170 bytes from 198.41.0.4#53(a.root-servers.net) in 18 ms
enterprise.com.      172800 IN NS  ns-1024.awsdns-00.org.
;; Received 724 bytes from 192.5.6.30#53(a.gtld-servers.net) in 24 ms
api.enterprise.com.  60     IN CNAME api.enterprise.com.edge.example-cdn.net.
;; Received 112 bytes from ns-1024.awsdns-00.org in 31 ms`,
        caption: 'Every step is a separate round trip, which is why a cold DNS lookup can cost more than the TCP and TLS handshakes combined.',
      },
      {
        label: 'Route 53 record (Terraform)',
        code: `resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.enterprise.zone_id
  name    = "api.enterprise.com"
  type    = "CNAME"
  ttl     = 60
  records = ["api.enterprise.com.edge.example-cdn.net"]
}`,
      },
    ],
    risks: [
      { name: 'Subdomain takeover', detail: 'A CNAME still points at a deleted cloud resource (bucket, app); an attacker claims that resource and serves content on your domain.', mitigation: 'Delete DNS records together with the resources; scan for dangling CNAMEs.' },
      { name: 'DNS hijacking and cache poisoning', detail: 'A compromised registrar account or spoofed responses send users to an attacker\'s server.', mitigation: 'Registrar lock and MFA, DNSSEC signing, and TLS validation as the last line of defense.' },
    ],
  },
  {
    id: 'waf',
    label: 'Edge CDN / WAF',
    icon: Cloud,
    tone: 'rose',
    summary: 'TLS termination, attack filtering and caching near the user.',
    layers: ['L3', 'L4', 'L6', 'L7'],
    details: [
      'The Frankfurt edge terminates TCP and TLS from Your Computer, decrypts the request and inspects it. The Web Application Firewall applies managed rule sets (such as the OWASP Core Rule Set) to catch SQL injection, XSS and known exploits; bot management scores the client using TLS fingerprints (JA4) and behavior.',
      'Rate limits protect sensitive endpoints like login. Static assets are served straight from the edge cache; dynamic API calls are forwarded to the origin over a pool of warm, mutually-authenticated (mTLS) connections, so the expensive handshakes across the ocean happen once, not per user.',
    ],
    metrics: [
      { label: 'Handshake RTT (user to edge)', value: '12 ms' },
      { label: 'WAF evaluation', value: '~1-2 ms' },
      { label: 'Cache hit ratio (static assets)', value: '90%+' },
      { label: 'Edge to origin RTT', value: '~80 ms' },
    ],
    examples: [
      {
        label: 'WAF block event',
        code: `{
  "action": "block",
  "rule_id": "942100",
  "rule": "SQL Injection Attack Detected via libinjection",
  "client_ip": "198.51.100.77",
  "method": "GET",
  "uri": "/api/v1/query?id=1%27%20OR%201=1--",
  "ja4": "t13d1516h2_8daaf6152771_02713d6af862",
  "pop": "FRA",
  "request_id": "8c1f2a3b4d5e6f70"
}`,
        caption: 'Rule 942100 in the OWASP Core Rule Set uses libinjection to recognize SQL injection syntax in parameters.',
      },
      {
        label: 'Rate limit rule',
        code: `rate_limit "login-bruteforce" {
  match     = path == "/api/v1/login" and method == "POST"
  key       = client_ip
  threshold = 10 requests per 60 s
  action    = block for 600 s, respond 429 Too Many Requests
}`,
      },
    ],
    risks: [
      { name: 'WAF bypass', detail: 'Attackers obfuscate payloads with unusual encodings or split them across parameters.', mitigation: 'Normalize input before matching, keep managed rules updated, and never rely on the WAF instead of fixing the app.' },
      { name: 'Cache poisoning / data leaks', detail: 'Personalized responses cached and served to other users.', mitigation: 'Send Cache-Control: private, no-store on per-user responses; include auth in the cache key or bypass cache for authenticated requests.' },
    ],
  },
  {
    id: 'alb',
    label: 'Cloud ALB',
    icon: Layers,
    tone: 'violet',
    summary: 'Layer 7 load balancing into private subnets.',
    layers: ['L4', 'L6', 'L7'],
    details: [
      'The Application Load Balancer in us-east-1 is the origin\'s front door. It terminates TLS from the edge with an ACM certificate, picks a rule by Host header and path, and forwards to a target group of pod IPs spread across three availability zones.',
      'It continuously health-checks every target and only sends traffic to healthy ones. Traffic is DNATed from the ALB\'s address to the pod IP (10.0.5.22:8443) inside a private subnet with no public route. It adds X-Forwarded-For, X-Forwarded-Proto and X-Amzn-Trace-Id headers so the app knows the original client and can join traces.',
    ],
    metrics: [
      { label: 'Idle connection timeout (default)', value: '60 s' },
      { label: 'Health check interval (default)', value: '30 s' },
      { label: 'Deregistration delay (default)', value: '300 s' },
      { label: 'Added latency', value: '~1 ms' },
    ],
    examples: [
      {
        label: 'Access log line',
        code: `h2 2026-10-25T10:42:01.095Z app/prod-api-alb/50dc6c495c0c9188
   172.70.8.14:41822 10.0.5.22:8443          <- client (edge) and target (pod)
   0.001 0.024 0.000                         <- request / target / response processing (s)
   200 200 517 31244                         <- ALB status, target status, bytes in, bytes out
   "POST https://api.enterprise.com:443/api/v1/query HTTP/2.0"
   TLS_AES_128_GCM_SHA256 TLSv1.3
   arn:aws:elasticloadbalancing:us-east-1:111122223333:targetgroup/api-pods/73e2d6bc24d8a067
   "Root=1-6718f3a9-5e1c2b7a9d0f4e3c8b6a1d20"`,
      },
      {
        label: 'Listener (Terraform)',
        code: `resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.api.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_pods.arn
  }
}`,
      },
    ],
    risks: [
      { name: '502s from keep-alive mismatch', detail: 'If the app closes idle connections sooner than the ALB (60 s), the ALB sometimes sends a request on a connection the app just closed.', mitigation: 'Set the app\'s keep-alive timeout above the ALB idle timeout (e.g. 65 s).' },
      { name: 'Traffic to terminating pods', detail: 'During deploys, pods shut down while the ALB still routes to them.', mitigation: 'Readiness probes, a preStop sleep, and a deregistration delay that matches graceful shutdown.' },
    ],
  },
  {
    id: 'k8s',
    label: 'K8s Ingress & Service',
    icon: Hexagon,
    tone: 'blue',
    summary: 'Cluster routing, admission control and network policy.',
    layers: ['L3', 'L4', 'L7'],
    details: [
      'The AWS Load Balancer Controller watches Kubernetes Ingress objects and configures the ALB to match: listeners, rules and target groups. In IP target mode, the ALB sends traffic straight to pod IPs, which the VPC CNI assigns from the VPC subnet.',
      'A Service and its EndpointSlices track which pods are ready. Readiness probes decide whether a pod receives traffic; liveness probes restart stuck ones; a HorizontalPodAutoscaler adds replicas under load.',
      'Before any pod runs, admission controllers check it: Pod Security Admission blocks privileged containers, and policy engines like Kyverno or OPA Gatekeeper enforce rules such as "images must come from our registry". NetworkPolicies then restrict which pods can talk to which.',
    ],
    metrics: [
      { label: 'Replicas (across 3 AZs)', value: '6' },
      { label: 'Autoscaling target', value: '70% CPU' },
      { label: 'Readiness probe period', value: '10 s' },
      { label: 'Pod IP source', value: 'VPC subnet (VPC CNI)' },
    ],
    examples: [
      {
        label: 'Ingress',
        code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: prod
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
spec:
  ingressClassName: alb
  rules:
    - host: api.enterprise.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8443`,
      },
      {
        label: 'NetworkPolicy',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-restrict
  namespace: prod
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - ipBlock: { cidr: 10.0.0.0/20 }      # ALB subnets only
      ports:
        - { port: 8443, protocol: TCP }
  egress:
    - to:
        - ipBlock: { cidr: 10.0.20.0/24 }     # database subnet
      ports:
        - { port: 5432, protocol: TCP }
    # (DNS egress to kube-dns omitted for brevity)`,
      },
      {
        label: 'kubectl view',
        code: `$ kubectl -n prod get pods -l app=api -o wide
NAME                   READY   STATUS    RESTARTS   AGE   IP            NODE
api-7f9c6d5b8-2xkqp    2/2     Running   0          3d    10.0.5.22     ip-10-0-5-100
api-7f9c6d5b8-8hd4n    2/2     Running   0          3d    10.0.6.41     ip-10-0-6-17
api-7f9c6d5b8-tq9wz    2/2     Running   0          3d    10.0.7.13     ip-10-0-7-88

READY 2/2 = app container + Envoy sidecar`,
      },
    ],
    risks: [
      { name: 'Privileged or root containers', detail: 'A container escape from a privileged pod gives control of the node and its credentials.', mitigation: 'Pod Security Admission "restricted" profile, read-only root filesystem, non-root users.' },
      { name: 'Flat pod network', detail: 'By default every pod can reach every other pod, so one compromised service can scan the whole cluster.', mitigation: 'Default-deny NetworkPolicies per namespace, then allow only required flows.' },
    ],
  },
  {
    id: 'mesh',
    label: 'Service Mesh (Envoy)',
    icon: Workflow,
    tone: 'pink',
    summary: 'Sidecar proxy: timeouts, retries, mTLS and telemetry.',
    layers: ['L4', 'L6', 'L7'],
    details: [
      'Each pod runs an Envoy sidecar next to the app container (Istio injects it automatically). iptables rules redirect the pod\'s traffic through Envoy, so the app talks plain HTTP to localhost while Envoy handles the network.',
      'Envoy enforces per-route timeouts (the 15 s x-envoy-expected-rq-timeout-ms header comes from here), limited retries for safe failures, circuit breaking, and outlier detection that ejects unhealthy upstream pods.',
      'For calls between services, sidecars use mutual TLS with short-lived certificates whose identity is a SPIFFE ID tied to the Kubernetes service account. Authorization policies can then say "only the api service account may call the billing service", independent of IP addresses.',
    ],
    metrics: [
      { label: 'Added latency per sidecar hop', value: '~1-3 ms' },
      { label: 'Workload cert lifetime (Istio default)', value: '24 h' },
      { label: 'Route timeout', value: '15 s' },
      { label: 'Retries', value: '2 attempts, 5 s each' },
    ],
    examples: [
      {
        label: 'VirtualService',
        code: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
  namespace: prod
spec:
  hosts: [api.prod.svc.cluster.local]
  http:
    - timeout: 15s
      retries:
        attempts: 2
        perTryTimeout: 5s
        retryOn: connect-failure,refused-stream,503
      route:
        - destination:
            host: api.prod.svc.cluster.local
            port: { number: 8443 }`,
      },
      {
        label: 'mTLS identity',
        code: `Peer certificate presented between sidecars
  URI SAN:   spiffe://cluster.local/ns/prod/sa/api
  Issuer:    istiod (cluster CA)
  Validity:  24 h, rotated automatically

AuthorizationPolicy "billing-allow-api":
  allow  principals: ["cluster.local/ns/prod/sa/api"]
         to: POST /billing/v1/*`,
      },
      {
        label: 'Envoy access log',
        code: `[2026-10-25T10:42:01.096Z] "POST /api/v1/query HTTP/2" 200 - via_upstream
  bytes_in=517 bytes_out=31244 duration=24ms upstream_time=23ms
  x-forwarded-for="203.0.113.5" request_id="7c1e9a52-0f3b-4d6e-9a1c-2b8f5d3e4a10"
  upstream="127.0.0.1:8080" (app container)`,
      },
    ],
    risks: [
      { name: 'Retry storms', detail: 'Every layer retrying a struggling service multiplies load and turns a slowdown into an outage.', mitigation: 'Retry only idempotent requests, cap attempts, use retry budgets and circuit breakers.' },
      { name: 'mTLS left in permissive mode', detail: 'Permissive mode accepts plain-text traffic too, so the identity guarantees are not actually enforced.', mitigation: 'Switch to STRICT PeerAuthentication once all workloads have sidecars.' },
    ],
  },
  {
    id: 'server',
    label: 'Your Application Server',
    icon: Server,
    tone: 'emerald',
    summary: 'Authenticates the caller and runs business logic.',
    layers: ['L7'],
    details: [
      'Your Application Server (Node.js, Java, Go, Python...) receives the request from its sidecar. It first authenticates it: verifies the JWT signature with Okta\'s public keys (cached in memory, so no call to Okta per request), checks issuer, audience and expiry, then authorizes it by checking scopes or roles.',
      'It runs the business logic, using a connection pool to query the database, and emits structured logs, metrics and trace spans tagged with the trace ID that arrived in the traceparent header.',
      'Here the whole request costs about 24 ms of server time; 12 ms of that is the database query.',
    ],
    metrics: [
      { label: 'JWT verification (keys cached)', value: '~0.2 ms' },
      { label: 'Server time for this request', value: '24 ms' },
      { label: 'Latency p50 / p99', value: '24 / 180 ms' },
      { label: 'DB pool size per pod', value: '20' },
    ],
    examples: [
      {
        label: 'JWT check (Node, jose)',
        code: `import { createRemoteJWKSet, jwtVerify } from 'jose';

// Okta's public keys; cached in memory and refetched only for an unknown "kid".
const JWKS = createRemoteJWKSet(
  new URL('https://company.okta.com/oauth2/default/v1/keys')
);

export async function authenticate(req) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://company.okta.com/oauth2/default',
    audience: 'api://enterprise',
    algorithms: ['RS256'],
  });
  if (!payload.scp?.includes('query:read')) throw new ForbiddenError();
  return payload; // { sub, scp, exp, ... }
}`,
      },
      {
        label: 'Structured log',
        code: `{"ts":"2026-10-25T10:42:01.121Z","level":"info","msg":"query ok",
 "trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","sub":"00u1a2b3c4EXAMPLE",
 "route":"POST /api/v1/query","status":200,"db_ms":12.4,"total_ms":23.9,"rows":2}`,
      },
    ],
    risks: [
      { name: 'Broken object-level authorization', detail: 'The token proves who the caller is, but the code forgets to check they own record 1234 (IDOR). The top item in the OWASP API Security Top 10.', mitigation: 'Check ownership or tenancy on every object access, ideally in one shared layer.' },
      { name: 'Secrets and tokens in logs', detail: 'Authorization headers or DB passwords logged in plain text end up in log storage with wide access.', mitigation: 'Redact sensitive fields at the logger, and use a secrets manager or workload identity instead of static secrets.' },
    ],
  },
  {
    id: 'data',
    label: 'AWS STS / Database',
    icon: Database,
    tone: 'amber',
    summary: 'Workload identity and the data store.',
    layers: ['L7'],
    details: [
      'The app needs AWS credentials to reach the database and other services, but no static keys are stored anywhere. Instead, Kubernetes mounts a signed service-account token (an OIDC JWT issued by the cluster), and the AWS SDK exchanges it with STS (AssumeRoleWithWebIdentity) for temporary credentials. This is IAM Roles for Service Accounts (IRSA); EKS Pod Identity is the newer alternative.',
      'With those credentials the app generates a short-lived RDS IAM authentication token and connects to PostgreSQL over TLS with full certificate verification. No database password exists to leak.',
      'The query itself uses an index on the timestamp column and finishes in 12.4 ms.',
    ],
    metrics: [
      { label: 'STS credential lifetime (default)', value: '1 h' },
      { label: 'RDS IAM auth token lifetime', value: '15 min' },
      { label: 'Query execution time', value: '12.4 ms' },
      { label: 'DB connection', value: 'TLS, sslmode=verify-full' },
    ],
    examples: [
      {
        label: 'STS exchange',
        code: `$ aws sts assume-role-with-web-identity \\
    --role-arn arn:aws:iam::111122223333:role/api-prod \\
    --role-session-name api-7f9c \\
    --web-identity-token file:///var/run/secrets/eks.amazonaws.com/serviceaccount/token
{
  "Credentials": {
    "AccessKeyId": "ASIA4EXAMPLE7QXZ",
    "SecretAccessKey": "wJalr...(redacted)",
    "SessionToken": "IQoJb3JpZ2luX2Vj...",
    "Expiration": "2026-10-25T11:42:01Z"
  },
  "AssumedRoleUser": {
    "Arn": "arn:aws:sts::111122223333:assumed-role/api-prod/api-7f9c"
  }
}`,
        caption: 'Keys starting with ASIA are temporary; long-lived IAM user keys start with AKIA. The SDK does this exchange automatically and refreshes before expiry.',
      },
      {
        label: 'IAM trust policy',
        code: `{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::111122223333:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:prod:api",
      "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:aud": "sts.amazonaws.com"
    }
  }
}`,
        caption: 'Only the "api" service account in the "prod" namespace of this specific cluster can assume the role.',
      },
      {
        label: 'Query plan',
        code: `analytics=> EXPLAIN ANALYZE
  SELECT region, SUM(revenue) FROM orders
  WHERE ts > now() - interval '30 days' GROUP BY region;

 HashAggregate  (actual time=11.9..12.1 rows=4 loops=1)
   Group Key: region
   ->  Index Scan using orders_ts_idx on orders  (actual time=0.03..8.7 rows=48211 loops=1)
         Index Cond: (ts > (now() - '30 days'::interval))
 Planning Time: 0.2 ms
 Execution Time: 12.4 ms`,
      },
    ],
    risks: [
      { name: 'Over-permissive IAM roles', detail: 'A role with "*" permissions turns any app bug into full account access.', mitigation: 'Least-privilege policies scoped to specific resources, plus condition keys and permission boundaries.' },
      { name: 'Long-lived static credentials', detail: 'Access keys in environment variables or code leak via logs, images and repositories.', mitigation: 'IRSA or EKS Pod Identity for workloads; scan repos and images for secrets.' },
    ],
  },
];
