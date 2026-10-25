import React, { useState } from 'react';
import { 
  Server, Globe, Lock, FileText, Wifi, Network, Laptop, Cloud, Layers, 
  Hexagon, Box, Database, ArrowRight, ChevronRight, Terminal, RefreshCw, 
  ShieldCheck, Zap, Activity, Cable, Router, Radio, ArrowLeftRight, UserCheck, Key, Shield
} from 'lucide-react';

// --- OSI MODEL DATA ---
const OSI_LAYERS = [
  { 
    id: 'L7', name: 'Application', proto: 'HTTP/2, gRPC, JWT', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500',
    snippet: `POST /api/v1/query HTTP/2
Host: api.enterprise.com
Authorization: Bearer eyJhbGci... [JWT Signature Validated]
Content-Type: application/json
x-envoy-expected-rq-timeout-ms: 15000`,
    explanation: [
      "Layer 7 processes the actual semantic payload sent from Your Computer to Your Application Server.",
      "Authentication is evaluated here using OpenID Connect (OIDC). A JSON Web Token (JWT) issued by an Identity Provider (like Okta) is passed in the headers. Your Application Server parses this L7 token and verifies its cryptographic signature against the IdP's public JWKS.",
      "Because L7 tokens are bearer tokens, they rely entirely on lower layers (L6 TLS) to prevent interception on the wire."
    ]
  },
  { 
    id: 'L6', name: 'Presentation', proto: 'TLS 1.3 / X.509', icon: Lock, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500',
    snippet: `[TLS 1.3 1-RTT Handshake]
ClientHello (SNI: api.enterprise.com, ALPN: h2)
ServerHello (Key Share: X25519)
Certificate (Leaf -> Intermediate -> Root)
CertificateVerify (RSA-PSS Signature)
Finished (HMAC) -> [Symmetric AES-256-GCM Tunnel Established]`,
    explanation: [
      "Layer 6 handles data formatting and encryption between Your Computer and Your Application Server. TLS 1.3 establishes a secure channel by authenticating the server and negotiating symmetric ephemeral keys via Elliptic Curve Diffie-Hellman.",
      "Your Computer strictly validates the X.509 Certificate Chain presented by Your Application Server, checking for cryptographic integrity, domain match (SAN), and expiration.",
      "CRITICAL (eMudhra Incident): The client must perform Revocation Checks (OCSP/CRL). If an intermediate CA generates weak keys due to entropy flaws, attackers can forge L6 certificates to intercept traffic if revocation blocklists are outdated."
    ]
  },
  { 
    id: 'L5', name: 'Session', proto: 'TLS Tickets, RPC, SOCKS', icon: ArrowLeftRight, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500',
    snippet: `[Logical Session Persistence]
Session Ticket: 0x8A92B4... (Encrypted State)
0-RTT Early Data: TRUE
RPC Stream ID: 419
SOCKS5 Auth: GSSAPI`,
    explanation: [
      "Layer 5 maintains the logical connection or 'session' between Your Computer and Your Application Server, distinct from the physical L4 transport.",
      "Implemented via TLS Session Resumption. If Your Computer switches from Wi-Fi to Cellular, the underlying L4 TCP connection breaks, but a TLS Session Ticket allows instant session resumption without a full handshake (0-RTT).",
      "Also handles Remote Procedure Calls (RPC) state management and multiplexing multiple logical application sessions over a single L4 TCP pipe."
    ]
  },
  { 
    id: 'L4', name: 'Transport', proto: 'TCP / UDP / QUIC', icon: Server, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500',
    snippet: `[TCP Segment Header]
Src Port: 49152 | Dst Port: 443
Seq: 10485760 | Ack: 2048
Window Size: 65535 (Scaled: 2MB)
Flags: [PSH, ACK]
Options: [SACK Permitted, Timestamps]
Congestion Control: BBRv2`,
    explanation: [
      "Layer 4 provides reliable data transfer between Your Computer and Your Application Server using the TCP State Machine (SYN_SENT -> ESTABLISHED -> FIN_WAIT).",
      "Flow Control: The 'Window Size' dictates buffer capacity using TCP Sliding Windows to prevent Your Computer from overwhelming Your Application Server.",
      "Congestion Control: Algorithms like CUBIC and BBR monitor network latency and pacing to maximize bandwidth without filling ISP router buffers (Bufferbloat)."
    ]
  },
  { 
    id: 'L3', name: 'Network', proto: 'IPv4 / IPv6 / BGP', icon: Globe, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500',
    snippet: `[IPv4 Header]
Source IP: 192.168.1.50 -> [SNAT] -> 203.0.113.5
Destination IP: 104.16.123.96 -> [DNAT] -> 10.0.5.22
Protocol: 6 (TCP) | TTL: 58 | DSCP: CS1`,
    natTable: [
      { 
        title: "Your Computer Edge (SNAT)", 
        original: "Src: 192.168.1.50:49152 (Your Computer LAN)\nDst: 104.16.123.96:443", 
        translated: "Src: 203.0.113.5:12055 (Public ISP)\nDst: 104.16.123.96:443"
      },
      { 
        title: "Cloud Edge for Your App Server (DNAT)", 
        original: "Src: 203.0.113.5:12055\nDst: 104.16.123.96:443 (Load Balancer)", 
        translated: "Src: 203.0.113.5:12055\nDst: 10.0.5.22:8443 (Your App Server Pod IP)"
      }
    ],
    explanation: [
      "Layer 3 handles global logical addressing and routing from Your Computer to Your Application Server. Routers decrement the Time To Live (TTL) per hop.",
      "Network Address Translation (NAT): SNAT masks Your Computer's private IP behind public ISP addresses. DNAT routes incoming traffic from Your Computer to Your Application Server's private cloud container IP.",
      "DSCP bits provide Quality of Service (QoS) across ISP routers."
    ]
  },
  { 
    id: 'L2', name: 'Data Link', proto: 'Ethernet / MAC / VLAN', icon: Network, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500',
    snippet: `[Ethernet II Frame]
Dst MAC: 00:1A:2B:3C:4D:5E (Next Hop Router)
Src MAC: AA:BB:CC:DD:EE:FF (Your Computer NIC)
802.1Q VLAN Tag: 40 (Enterprise LAN)
EtherType: 0x0800 (IPv4)
Frame Check Sequence (FCS): 0x8A3C9100`,
    explanation: [
      "Layer 2 delivers frames between physically connected nodes on the local network segment. From Your Computer, frames are sent to your local gateway router MAC address.",
      "MAC addresses change at every routed hop across the network path until reaching Your Application Server's datacenter network switch.",
      "The Frame Check Sequence (FCS) CRC32 checksum ensures hardware data integrity."
    ]
  },
  { 
    id: 'L1', name: 'Physical', proto: 'Photons / RF / Copper', icon: Cable, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500',
    snippet: `[Raw Media Transmission]
Origin: Your Computer Wi-Fi NIC / Ethernet Port
Media: Single-Mode Fiber / Wi-Fi 6 (OFDMA)
Modulation: QAM-1024 
Binary: 10101010 10101010 10101011 (Preamble)`,
    explanation: [
      "Layer 1 is the physical medium originating at Your Computer, encoding Layer 2 frames into electrical voltages over copper, light pulses over fiber, or RF waves over Wi-Fi.",
      "Complex modulation schemes transmit multiple bits per symbol between Your Computer and network transceivers."
    ]
  }
];

// --- ISP TOPOLOGY DATA ---
const ISP_NODES = [
  {
    id: 'computer', label: 'Your Computer', icon: Laptop, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/10',
    summary: 'Origin of Client Request.',
    details: [
      "Your Computer is where the journey begins, running your web browser or native client application.",
      "It generates the L7 HTTP payload, wraps it in TLS (L6), TCP (L4), IP (L3), and Ethernet frames (L2), before converting bits into physical signals (L1) via its network interface card."
    ]
  },
  {
    id: 'home', label: 'Home / Office Router', icon: Router, color: 'text-sky-400', border: 'border-sky-500', bg: 'bg-sky-500/10',
    summary: 'LAN Gateway & SNAT.',
    details: [
      "Your Computer connects to this local router via Wi-Fi 6 or Ethernet.",
      "The router performs Source NAT (SNAT), replacing Your Computer's private LAN IP with a public ISP IP before forwarding traffic upstream."
    ]
  },
  {
    id: 'gpon', label: 'GPON ONT', icon: Box, color: 'text-green-400', border: 'border-green-500', bg: 'bg-green-500/10',
    summary: 'Optical Network Terminal.',
    details: [
      "Converts electrical ethernet signals from your local network into light pulses over fiber optic cables.",
      "Uses Time-Division Multiple Access (TDMA) to transmit upstream bursts toward Your Application Server without colliding with other subscribers."
    ]
  },
  {
    id: 'bng', label: 'ISP BNG', icon: Server, color: 'text-indigo-400', border: 'border-indigo-500', bg: 'bg-indigo-500/10',
    summary: 'Broadband Network Gateway.',
    details: [
      "Authenticates your connection, assigns public IP leases, and enforces ISP bandwidth rate limits for Your Computer's traffic."
    ]
  },
  {
    id: 'core', label: 'Core BGP Backbone', icon: Network, color: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-500/10',
    summary: 'Global Autonomous System Routing.',
    details: [
      "Routes packets across the global internet toward Your Application Server's cloud datacenter using BGP routing tables."
    ]
  },
  {
    id: 'server_edge', label: 'Your App Server Edge', icon: ShieldCheck, color: 'text-rose-400', border: 'border-rose-500', bg: 'bg-rose-500/10',
    summary: 'Cloud Ingress Point.',
    details: [
      "The destination edge where global ISP traffic arrives at Your Application Server's cloud provider network."
    ]
  }
];

// --- CLOUD TOPOLOGY DATA ---
const CLOUD_NODES = [
  {
    id: 'computer', label: 'Your Computer', icon: Laptop, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/10',
    summary: 'Initiates HTTPS Request.',
    details: [
      "Your Computer sends the encrypted request toward Your Application Server hosted in the enterprise cloud."
    ]
  },
  {
    id: 'waf', label: 'Edge WAF', icon: Cloud, color: 'text-rose-400', border: 'border-rose-500', bg: 'bg-rose-500/10',
    summary: 'TLS Termination & Inspection.',
    details: [
      "Terminates TLS from Your Computer, inspects L7 payloads for threats, and establishes a secure mTLS connection to Your Application Server's origin."
    ]
  },
  {
    id: 'alb', label: 'Cloud ALB', icon: Layers, color: 'text-violet-400', border: 'border-violet-500', bg: 'bg-violet-500/10',
    summary: 'Load Balancing & DNAT.',
    details: [
      "Performs Destination NAT (DNAT) to route traffic from Your Computer into private subnets housing Your Application Server."
    ]
  },
  {
    id: 'k8s', label: 'K8s Ingress & Pod', icon: Hexagon, color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10',
    summary: 'Cluster Admission & Routing.',
    details: [
      "Kubernetes Admission Controllers validate cluster security policies before delivering the request to Your Application Server pod."
    ]
  },
  {
    id: 'server', label: 'Your Application Server', icon: Server, color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/10',
    summary: 'Backend Application Runtime.',
    details: [
      "Your Application Server (running Java/Node/Python) receives the request, validates the SSO JWT from Your Computer, and processes business logic."
    ]
  },
  {
    id: 'sts', label: 'AWS STS / DB', icon: Database, color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500/10',
    summary: 'Cloud Identity Federation.',
    details: [
      "Your Application Server exchanges its OIDC service account token via AssumeRoleWithWebIdentity for temporary AWS STS credentials to access databases safely."
    ]
  }
];

// --- IDENTITY & SSO STEPS ---
const ID_STEPS = [
  {
    step: 1, title: "1. Unauthenticated Request", actor: "Your Computer -> Your App Server",
    desc: "Your Computer tries to access Your Application Server without a session. The server responds with HTTP 302 redirect to the Identity Provider (Okta)."
  },
  {
    step: 2, title: "2. Redirect to Okta (OIDC)", actor: "Your Computer -> Okta IdP",
    desc: "Your Computer's browser is redirected to company.okta.com/oauth2/v1/authorize with Client ID, scopes, and cryptographic state parameters."
  },
  {
    step: 3, title: "3. User Authentication & MFA", actor: "Your Computer <-> Okta IdP",
    desc: "You enter your credentials and approve Multi-Factor Authentication (MFA) push prompt at Okta."
  },
  {
    step: 4, title: "4. Token Issuance & Callback", actor: "Okta IdP -> Your Computer -> Your App Server",
    desc: "Okta issues a signed JSON Web Token (JWT) ID Token and redirects Your Computer back to Your Application Server's callback URL."
  },
  {
    step: 5, title: "5. Local JWKS Verification", actor: "Your Application Server",
    desc: "Your Application Server cryptographically verifies Okta's digital signature on the JWT using cached public keys (JWKS), confirming your identity without querying Okta again."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('osi');
  const [activeOSI, setActiveOSI] = useState(OSI_LAYERS[3]); // Default to L4
  const [activeISP, setActiveISP] = useState(ISP_NODES[0]);
  const [activeCloud, setActiveCloud] = useState(CLOUD_NODES[0]);
  const [activeIdStep, setActiveIdStep] = useState(ID_STEPS[0]);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-300 font-sans selection:bg-sky-500/30 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800/80 bg-[#0c121e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 via-sky-500 to-teal-400 p-2.5 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.2)] border border-white/10">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Enterprise Network, OSI & Identity Explorer</h1>
            <p className="text-[10px] text-sky-400 font-bold tracking-[0.2em] mt-0.5">YOUR COMPUTER TO YOUR APPLICATION SERVER ARCHITECTURE</p>
          </div>
        </div>
        <div className="flex bg-[#070b12] p-1.5 rounded-lg border border-slate-800 shadow-inner flex-wrap gap-1">
          {[
            { id: 'osi', label: 'OSI Stack & Payloads', icon: Layers },
            { id: 'isp', label: 'ISP & Last-Mile', icon: Globe },
            { id: 'cloud', label: 'Cloud Topology', icon: Cloud },
            { id: 'identity', label: 'Identity & SSO (Okta)', icon: UserCheck }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-[12px] font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-[#1e293b] text-white shadow-md border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4"/> {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* === TAB 1: OSI MODEL DEEP DIVE === */}
        {activeTab === 'osi' && (
          <div className="flex-1 flex animate-in fade-in duration-300">
            <div className="w-[380px] bg-[#0c121e] border-r border-slate-800 flex flex-col z-10 shrink-0">
              <div className="p-6 border-b border-slate-800/50 bg-[#070b12]/50">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">OSI Stack Encapsulation</h2>
                <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">From Your Computer to Your Application Server.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                {OSI_LAYERS.map((layer) => {
                  const isActive = activeOSI.id === layer.id;
                  const Icon = layer.icon;
                  return (
                    <button 
                      key={layer.id}
                      onClick={() => setActiveOSI(layer)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-4 group relative overflow-hidden ${
                        isActive 
                          ? `${layer.border} bg-[#161e2e]` 
                          : 'border-slate-800/50 bg-[#070b12] hover:border-slate-600'
                      }`}
                    >
                      {isActive && <div className={`absolute top-0 left-0 w-1 h-full ${layer.bg.replace('/10','')} opacity-50`}></div>}
                      <div className={`p-2.5 rounded-lg transition-colors z-10 ${
                        isActive ? `bg-[#0c121e] ${layer.color} shadow-lg ring-1 ring-inset ${layer.border}` : 'bg-slate-900 text-slate-500 group-hover:text-slate-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 z-10">
                        <div className={`font-bold text-[14px] ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {layer.id}: {layer.name}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 uppercase tracking-wider ${isActive ? layer.color : 'text-slate-600'}`}>
                          {layer.proto}
                        </div>
                      </div>
                      {isActive && <ChevronRight className={`z-10 w-5 h-5 ${layer.color}`} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex items-center gap-5 border-b border-slate-800 pb-6">
                  <div className={`p-4 rounded-2xl ${activeOSI.bg} ${activeOSI.color} ring-1 ring-inset ${activeOSI.border} shadow-xl`}>
                    <activeOSI.icon className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                      Layer {activeOSI.id.replace('L', '')}: {activeOSI.name}
                    </h2>
                    <p className={`font-mono text-sm mt-1.5 font-bold ${activeOSI.color}`}>Protocols: {activeOSI.proto}</p>
                  </div>
                </div>

                <div className="bg-[#0c121e] border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl">
                  <div className="bg-[#111827] border-b border-slate-800 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className={`w-4 h-4 ${activeOSI.color}`} />
                      <span className="text-[11px] font-bold text-slate-400 tracking-[0.15em]">PACKET PAYLOAD INSPECTOR (Your Computer <span className="text-sky-400">&rarr;</span> Your App Server)</span>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto bg-[#070b12]/80">
                    <pre className={`font-mono text-[13px] leading-relaxed ${activeOSI.color}`}>
                      {activeOSI.snippet}
                    </pre>
                  </div>
                </div>

                {activeOSI.natTable && (
                  <div className="space-y-6">
                    {activeOSI.natTable.map((table, idx) => (
                      <div key={idx} className="bg-[#0c121e]/80 border border-slate-700/50 rounded-xl p-6 shadow-lg">
                        <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-orange-400" /> {table.title}
                        </h3>
                        <div className="flex flex-col md:flex-row items-center gap-6 text-[13px] font-mono">
                          <div className="flex-1 w-full bg-[#070b12] border border-slate-700 rounded-lg p-5 text-slate-400 shadow-inner">
                            <div className="text-[9px] text-slate-500 uppercase font-sans font-bold mb-3 tracking-widest">Pre-Routing State</div>
                            <pre className="whitespace-pre-wrap">{table.original}</pre>
                          </div>
                          <ArrowRight className="w-6 h-6 text-orange-500 hidden md:block" />
                          <div className="flex-1 w-full bg-orange-950/20 border border-orange-800/40 rounded-lg p-5 text-orange-300 shadow-inner">
                            <div className="text-[9px] text-orange-500/80 uppercase font-sans font-bold mb-3 tracking-widest">Post-Routing Translation</div>
                            <pre className="whitespace-pre-wrap">{table.translated}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-6 bg-[#0c121e]/80 p-8 rounded-2xl border border-slate-700/50 relative overflow-hidden shadow-lg">
                   <div className={`absolute top-0 left-0 w-1 h-full ${activeOSI.bg.replace('/10', '')}`}></div>
                   <h3 className="text-[12px] font-bold text-white uppercase tracking-[0.15em] mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
                      <Zap className="w-5 h-5 text-yellow-400"/> Engineering Deep Dive
                   </h3>
                  {activeOSI.explanation.map((paragraph, idx) => (
                    <p key={idx} className="text-slate-300/90 leading-relaxed text-[15px]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === TAB 2 & 3: TOPOLOGY VIEWS === */}
        {(activeTab === 'isp' || activeTab === 'cloud') && (() => {
          const activeNodes = activeTab === 'isp' ? ISP_NODES : CLOUD_NODES;
          const activeState = activeTab === 'isp' ? activeISP : activeCloud;
          const setActiveState = activeTab === 'isp' ? setActiveISP : setActiveCloud;

          return (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              <div className="w-full bg-[#0c121e] border-b border-slate-800 pt-12 pb-14 overflow-x-auto relative shrink-0 custom-scrollbar">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-800/80 -translate-y-1/2 -z-10"></div>
                
                <div className="flex items-center min-w-max px-16 mx-auto justify-center">
                  {activeNodes.map((node, index) => {
                    const isActive = activeState.id === node.id;
                    const Icon = node.icon;
                    return (
                      <React.Fragment key={node.id}>
                        <button 
                          onClick={() => setActiveState(node)}
                          className="group flex flex-col items-center relative outline-none cursor-pointer"
                        >
                          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shadow-2xl relative z-10 
                            ${isActive ? `bg-[#111827] ${node.color} ${node.border} scale-110 ring-4 ring-[#070b12]` : 'bg-[#070b12] border-slate-700 text-slate-500 group-hover:border-slate-500 group-hover:text-slate-300 group-hover:scale-105'}`}
                          >
                            <Icon className="w-7 h-7" strokeWidth={isActive ? 2.5 : 1.5} />
                            {isActive && <div className={`absolute -inset-2 rounded-2xl border ${node.border} opacity-30 animate-pulse`}></div>}
                          </div>
                          <div className={`mt-5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            {node.label}
                          </div>
                        </button>
                        
                        {index < activeNodes.length - 1 && (
                          <div className="w-20 relative z-0 flex items-center">
                            <div className={`h-[2px] w-full transition-colors ${activeNodes.findIndex(n => n.id === activeState.id) > index ? 'bg-sky-500/60' : 'bg-slate-800'}`}></div>
                            <ChevronRight className={`absolute -right-3 w-6 h-6 ${activeNodes.findIndex(n => n.id === activeState.id) > index ? 'text-sky-400' : 'text-slate-700'}`} />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col md:flex-row items-start gap-8">
                    <div className={`p-6 rounded-3xl bg-[#0c121e] border-2 ${activeState.border} ${activeState.color} shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0 relative overflow-hidden`}>
                      <div className={`absolute inset-0 opacity-10 bg-current`}></div>
                      <activeState.icon className="w-16 h-16 relative z-10" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">{activeState.label}</h2>
                      <p className={`font-bold mb-8 text-[11px] uppercase tracking-widest inline-block px-4 py-1.5 rounded-full border ${activeState.bg} ${activeState.color} ${activeState.border.replace('border-', 'border-').replace('500', '500/30')}`}>
                        {activeState.summary}
                      </p>
                      
                      <div className="bg-[#0c121e]/90 border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${activeState.bg.replace('/10', '')}`}></div>
                        <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-[0.15em] mb-6 flex items-center gap-3 border-b border-slate-800/80 pb-4">
                          <ShieldCheck className="w-5 h-5 text-emerald-400"/> Architecture & Mechanics
                        </h3>
                        <div className="space-y-6">
                          {activeState.details.map((paragraph, idx) => (
                            <p key={idx} className="text-slate-300/90 leading-relaxed text-[15px]">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* === TAB 4: IDENTITY & SSO (OKTA/OIDC) === */}
        {activeTab === 'identity' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#070b12] overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                  <Key className="text-amber-400 w-7 h-7"/> Identity Federation & SSO (Okta / OIDC Flow)
                </h2>
                <p className="text-slate-400 text-sm mt-1">How Your Computer authenticates with Okta and issues JWTs for Your Application Server.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {ID_STEPS.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setActiveIdStep(s)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      activeIdStep.step === s.step 
                        ? 'bg-[#1e293b] border-amber-500 text-white shadow-lg ring-1 ring-amber-500/50' 
                        : 'bg-[#0c121e] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-amber-400 font-bold">STEP {s.step}</div>
                    <div className="font-bold text-sm mt-2">{s.title}</div>
                  </button>
                ))}
              </div>

              <div className="bg-[#0c121e] border border-slate-700/80 rounded-2xl p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">{activeIdStep.actor}</span>
                  <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-bold">OIDC Protocol Phase</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{activeIdStep.title}</h3>
                <p className="text-slate-300 leading-relaxed text-[16px]">{activeIdStep.desc}</p>
                <div className="bg-[#070b12] border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-400 space-y-2">
                  <div className="text-slate-500 uppercase tracking-widest font-bold">Key Security Artifacts:</div>
                  <div>• Transport: TLS 1.3 Encrypted Session (Port 443)</div>
                  <div>• Artifact: JSON Web Token (JWT) signed by Okta RSA-2048 Private Key</div>
                  <div>• Validation: Verified locally at Your Application Server via JWKS endpoint</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #070b12; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155; 
        }
      `}} />
    </div>
  );
}