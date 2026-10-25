import { Laptop, Router, Box, Building2, Server, Network, Waypoints, ShieldCheck } from 'lucide-react';
import type { TopologyNode } from '../types';

export const ISP_NODES: TopologyNode[] = [
  {
    id: 'computer',
    label: 'Your Computer',
    icon: Laptop,
    tone: 'cyan',
    summary: 'Origin of the request.',
    layers: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
    details: [
      'Your Computer is where the journey begins: a browser or native client builds the HTTP request (L7), encrypts it with TLS (L6), splits it into TCP segments (L4), wraps each in an IP packet (L3) and an Ethernet or Wi-Fi frame (L2), and the network card turns the bits into radio waves or voltages (L1).',
      'Before it can send anything it needs network configuration. DHCP gives it an IP address, subnet mask, default gateway and DNS server in four messages (Discover, Offer, Request, Acknowledge). With IPv6, the router\'s Router Advertisements let it build its own global address (SLAAC).',
      'It also keeps several caches that make the next request faster: the DNS cache, the ARP table (gateway MAC), the TLS session ticket store and the browser\'s pool of open HTTP/2 connections.',
    ],
    metrics: [
      { label: 'Default MTU on Ethernet / Wi-Fi', value: '1500 B' },
      { label: 'Ephemeral source ports (macOS)', value: '49152-65535' },
      { label: 'DHCP lease from home router', value: '24 h typical' },
      { label: 'Kernel stack processing', value: '< 0.1 ms' },
    ],
    examples: [
      {
        label: 'DHCP (DORA)',
        code: `DHCP DISCOVER  0.0.0.0:68     -> 255.255.255.255:67   "Any DHCP server out there?"  (broadcast)
DHCP OFFER     192.168.1.1:67 -> 192.168.1.50:68      "You can have 192.168.1.50 for 86400 s"
DHCP REQUEST   0.0.0.0:68     -> 255.255.255.255:67   "I'll take 192.168.1.50"
DHCP ACK       192.168.1.1:67 -> 192.168.1.50:68      router=192.168.1.1  dns=192.168.1.1  mask=255.255.255.0`,
      },
      {
        label: 'Network config',
        code: `$ networksetup -getinfo Wi-Fi        (macOS)
DHCP Configuration
IP address: 192.168.1.50
Subnet mask: 255.255.255.0
Router: 192.168.1.1
IPv6: Automatic
IPv6 IP address: 2001:db8:4a2c:100::50
IPv6 Router: fe80::21a:2bff:fe3c:4d5e
Wi-Fi ID: aa:bb:cc:dd:ee:ff`,
      },
    ],
    risks: [
      { name: 'Compromised endpoint', detail: 'Malware on the laptop sees everything before encryption, including tokens and passwords.', mitigation: 'EDR, OS patching, device posture checks in Okta (device trust) before granting access.' },
      { name: 'Rogue DHCP / DNS', detail: 'A malicious DHCP server on the LAN hands out its own DNS server and redirects traffic.', mitigation: 'DHCP snooping on switches, encrypted DNS (DoH/DoT), TLS certificate validation catches the redirect.' },
    ],
  },
  {
    id: 'home',
    label: 'Home / Office Router',
    icon: Router,
    tone: 'sky',
    summary: 'LAN gateway, firewall and SNAT.',
    layers: ['L1', 'L2', 'L3', 'L4'],
    details: [
      'Your Computer reaches the router over Wi-Fi or Ethernet. The router is the default gateway: anything not on the local 192.168.1.0/24 subnet is sent here.',
      'It performs Source NAT (masquerading): it replaces the private source address 192.168.1.50:49152 with its single public WAN address 203.0.113.5 and a free port, and remembers the mapping in its connection-tracking table so replies can be translated back.',
      'Its stateful firewall allows replies to connections started from inside and drops unsolicited inbound traffic. Most home routers also run the DHCP server and a DNS forwarder for the LAN.',
    ],
    metrics: [
      { label: 'Added latency (wired)', value: '0.2-1 ms' },
      { label: 'Wi-Fi hop latency', value: '1-5 ms (busy: 10-50+)' },
      { label: 'Conntrack TCP established timeout (Linux)', value: '5 days' },
      { label: 'Public IPv4 addresses shared', value: '1 for the whole home' },
    ],
    examples: [
      {
        label: 'NAT table (conntrack)',
        code: `$ conntrack -L -p tcp --dport 443        (Linux-based router, e.g. OpenWrt)
tcp  6 431999 ESTABLISHED
     src=192.168.1.50 dst=104.16.123.96 sport=49152 dport=443        <- original direction
     src=104.16.123.96 dst=203.0.113.5 sport=443 dport=12055         <- expected reply
     [ASSURED] mark=0 use=1`,
        caption: 'The second tuple is what replies will look like. When a packet arrives for 203.0.113.5:12055, the router rewrites it back to 192.168.1.50:49152.',
      },
      {
        label: 'Firewall rules (nftables)',
        code: `table inet fw4 {
  chain forward {
    type filter hook forward priority filter; policy drop;
    ct state established,related accept          # replies to our own connections
    iifname "br-lan" oifname "wan" accept         # LAN may start outbound connections
  }
  chain srcnat {
    type nat hook postrouting priority srcnat;
    oifname "wan" masquerade                      # 192.168.1.0/24 -> 203.0.113.5
  }
}`,
      },
    ],
    risks: [
      { name: 'Vulnerable firmware and default credentials', detail: 'Consumer routers are a favorite botnet target (e.g. Mirai) because they are rarely patched.', mitigation: 'Auto-update firmware, change the admin password, disable remote (WAN) administration.' },
      { name: 'UPnP port forwarding', detail: 'Any device or malware on the LAN can ask the router to open inbound ports.', mitigation: 'Disable UPnP unless something specifically needs it.' },
    ],
  },
  {
    id: 'ont',
    label: 'GPON ONT',
    icon: Box,
    tone: 'green',
    summary: 'Optical Network Terminal at your home.',
    layers: ['L1', 'L2'],
    details: [
      'The ONT converts Ethernet from your router into GPON frames on a fiber shared with up to 32-64 neighbors through passive optical splitters (no power in the field).',
      'Downstream (1490 nm) the OLT broadcasts everything to every ONT on the fiber, encrypted with AES-128 per ONT, and each ONT keeps only its own traffic. Upstream (1310 nm) all ONTs share one wavelength, so the OLT gives each ONT precise time slots (TDMA, managed by Dynamic Bandwidth Allocation) to avoid collisions.',
      'Your traffic is carried in GEM ports mapped to VLANs: one for internet, sometimes others for VoIP or IPTV.',
    ],
    metrics: [
      { label: 'GPON downstream (shared)', value: '2.488 Gb/s' },
      { label: 'GPON upstream (shared)', value: '1.244 Gb/s' },
      { label: 'XGS-PON (symmetric, shared)', value: '~10 Gb/s' },
      { label: 'Max reach to OLT', value: '20 km' },
    ],
    examples: [
      {
        label: 'ONT registration (OLT view)',
        code: `ONU 1/1/12:17
  Serial:        HWTC1A2B3C4D       State: O5 (Operation)
  Distance:      3.42 km            Rx power at OLT: -21.3 dBm
  T-CONT 1:      Type 4 (best effort), DBA profile "1G-UP"
  GEM port 1017  -> VLAN 100 (Internet)
  GEM port 2017  -> VLAN 200 (VoIP)`,
      },
      {
        label: 'Optical status',
        code: `ONT optical module
  Rx optical power : -19.8 dBm    (class B+ window: -8 to -28 dBm)
  Tx optical power :  +2.1 dBm
  Bias current     :  12 mA
  Temperature      :  48 C`,
      },
    ],
    risks: [
      { name: 'Shared medium eavesdropping', detail: 'Every ONT on the splitter physically receives all downstream traffic.', mitigation: 'GPON downstream AES encryption per ONT, and TLS end to end on top.' },
      { name: 'ONT cloning', detail: 'Copying another subscriber\'s ONT serial could hijack their service.', mitigation: 'OLT authenticates ONTs by serial plus password / LOID, and the BNG authenticates again.' },
    ],
  },
  {
    id: 'olt',
    label: 'ISP OLT',
    icon: Building2,
    tone: 'teal',
    summary: 'Optical Line Terminal in the ISP central office.',
    layers: ['L1', 'L2'],
    details: [
      'The OLT terminates hundreds of PON fibers in the ISP\'s local exchange. It ranges each ONT (measures its distance so time slots line up), schedules upstream bandwidth, and decrypts and forwards traffic upstream.',
      'Toward the ISP network it tags each subscriber\'s frames with two VLAN tags (802.1ad "QinQ"): an outer S-VLAN identifying the OLT port and an inner C-VLAN identifying the subscriber. The BNG uses these tags to know exactly which home a frame came from.',
    ],
    metrics: [
      { label: 'ONTs per PON port', value: '32-128' },
      { label: 'PON ports per chassis', value: 'hundreds' },
      { label: 'Uplinks to aggregation', value: '10 / 100 Gb/s' },
      { label: 'Added latency', value: '~1 ms (upstream scheduling)' },
    ],
    examples: [
      {
        label: 'QinQ frame toward BNG',
        code: `Frame leaving the OLT (802.1ad QinQ)
  Outer S-VLAN: 1012   (OLT 1, PON port 12)
  Inner C-VLAN: 117    (subscriber ONU 17)
  EtherType:    0x0800
  Payload:      IPv4 packet  src 203.0.113.5 -> dst 104.16.123.96`,
      },
    ],
    risks: [
      { name: 'Single point of failure', detail: 'One OLT card or uplink can serve thousands of homes.', mitigation: 'Redundant uplinks, PON protection (Type B), spare cards.' },
    ],
  },
  {
    id: 'bng',
    label: 'ISP BNG',
    icon: Server,
    tone: 'indigo',
    summary: 'Broadband Network Gateway: your first IP hop at the ISP.',
    layers: ['L2', 'L3'],
    details: [
      'The BNG is where your home becomes an IP subscriber. It terminates the subscriber session (IPoE with DHCP, or PPPoE), authenticates it against RADIUS, and assigns your router\'s public IPv4 address and delegated IPv6 prefix.',
      'It enforces your plan: shaping download/upload speeds, applying QoS, and filtering spoofed source addresses (uRPF). When IPv4 addresses are scarce, it or a nearby box performs Carrier-Grade NAT, giving your router a 100.64.0.0/10 address instead of a public one.',
      'It is also the default gateway you see as hop 2 in traceroute, and where lawful intercept and usage accounting happen.',
    ],
    metrics: [
      { label: 'Subscribers per BNG', value: '32k-128k+' },
      { label: 'Session setup', value: 'DHCP / PPPoE + RADIUS' },
      { label: 'Your plan (example)', value: '1000 / 100 Mb/s' },
      { label: 'traceroute hop 2 RTT', value: '~5 ms' },
    ],
    examples: [
      {
        label: 'RADIUS authentication',
        code: `RADIUS Access-Request   (BNG -> AAA server)
  User-Name          = "HWTC1A2B3C4D@isp.example"
  NAS-Port-Id        = "olt1/1/12:1012.117"
  Calling-Station-Id = "00:1a:2b:3c:4d:5f"

RADIUS Access-Accept    (AAA server -> BNG)
  Framed-IP-Address      = 203.0.113.5
  Delegated-IPv6-Prefix  = 2001:db8:4a2c:100::/56
  Session-Timeout        = 86400
  Cisco-AVPair           = "ip:sub-qos-policy-in=PLAN-1G-DOWN"`,
      },
      {
        label: 'Subscriber session',
        code: `BNG# show subscriber session ip 203.0.113.5
  Interface:    Bundle-Ether1.1012.117      State: activated
  MAC:          00:1a:2b:3c:4d:5f            Up-time: 3d 04:12:55
  IPv4:         203.0.113.5                  IPv6 PD: 2001:db8:4a2c:100::/56
  QoS in/out:   PLAN-1G-DOWN / PLAN-100M-UP
  Bytes in/out: 48.2 GB / 3.1 GB`,
      },
    ],
    risks: [
      { name: 'Source address spoofing', detail: 'A subscriber forging source IPs can launch reflection DDoS attacks.', mitigation: 'Unicast Reverse Path Forwarding (uRPF) and anti-spoofing ACLs per subscriber.' },
      { name: 'CGNAT side effects', detail: 'Hundreds of customers share one public IP: inbound connections are impossible and IP-based reputation or rate limits hit innocent users.', mitigation: 'Deploy IPv6 so most traffic bypasses CGNAT; log port blocks for abuse handling.' },
    ],
  },
  {
    id: 'core',
    label: 'ISP Core / BGP',
    icon: Network,
    tone: 'orange',
    summary: 'Backbone routing and the full internet routing table.',
    layers: ['L3'],
    details: [
      'Inside the ISP, traffic crosses a high-capacity backbone running an interior routing protocol (IS-IS or OSPF) plus MPLS or Segment Routing for fast, engineered paths.',
      'At the edge of the ISP, border routers run BGP with other networks and hold the full internet routing table. For each destination prefix they may know several paths (via peers, via paid transit) and pick one by policy: local preference first, then shortest AS path, then other tie-breakers.',
      'Routes are increasingly cryptographically checked with RPKI: a route whose origin AS is not authorized to announce the prefix is marked invalid and dropped.',
    ],
    metrics: [
      { label: 'Global IPv4 BGP table', value: '~1M prefixes' },
      { label: 'Global IPv6 BGP table', value: '~200k+ prefixes' },
      { label: 'Backbone link speeds', value: '100-400 Gb/s' },
      { label: 'BGP reconvergence', value: 'seconds to minutes' },
    ],
    examples: [
      {
        label: 'BGP table entry',
        code: `core1# show bgp ipv4 unicast 104.16.112.0/20
BGP routing table entry for 104.16.112.0/20
Paths: (2 available, best #1)
  64501                                  <- direct via IXP peering
    198.51.100.17 from 198.51.100.17
      Origin IGP, localpref 200, valid, external, best
      RPKI validation: Valid
  64510 64501                            <- via paid transit provider
    192.0.2.9 from 192.0.2.9
      Origin IGP, localpref 100, valid, external
      RPKI validation: Valid`,
        caption: 'The peering path wins on local preference (200 > 100): peering is free, transit costs money per Mb/s. AS numbers here are from the documentation range.',
      },
    ],
    risks: [
      { name: 'BGP hijacks and route leaks', detail: 'In 2008 Pakistan Telecom announced a more specific YouTube prefix; it leaked globally and blackholed YouTube for about two hours.', mitigation: 'RPKI Route Origin Validation, max-prefix limits and strict filters on every BGP session.' },
      { name: 'Fiber cuts', detail: 'A single cut can remove a major path between cities or continents.', mitigation: 'Geographically diverse routes; BGP and MPLS fast-reroute shift traffic in milliseconds to seconds.' },
    ],
  },
  {
    id: 'ixp',
    label: 'IXP / Peering',
    icon: Waypoints,
    tone: 'yellow',
    summary: 'Where your ISP hands traffic to your app\'s network.',
    layers: ['L2', 'L3'],
    details: [
      'An Internet Exchange Point is a shared switching fabric where many networks connect and exchange traffic directly, usually without paying each other ("settlement-free peering"). Your ISP and your app\'s CDN both connect to the same IXP in Frankfurt, so your packets cross in a single hop.',
      'Most networks peer through IXP route servers, which collect and redistribute routes so each member does not need hundreds of individual BGP sessions. Very large traffic flows move to private network interconnects (PNIs): dedicated fibers between two networks in the same datacenter.',
      'Without peering, traffic goes via transit providers: the ISP pays an upstream network to reach the rest of the internet, which usually adds hops and latency.',
    ],
    metrics: [
      { label: 'Peak traffic at the largest IXPs', value: '10+ Tb/s' },
      { label: 'Member port speeds', value: '10 / 100 / 400 GE' },
      { label: 'Hops added', value: '1' },
      { label: 'Cost of peering traffic', value: 'port fee only' },
    ],
    examples: [
      {
        label: 'Route server session',
        code: `IXP route server - neighbor summary
  Neighbor 198.51.100.1 (AS64500, your ISP)     State: Established   Up: 41d 06h
  Prefixes received from your ISP: 1,204    accepted: 1,198  (6 RPKI-invalid dropped)
  Prefixes sent to your ISP:       182,330
Peering LAN: 198.51.100.0/22    Member port: 2 x 100GE    Peak utilization: 63%`,
      },
    ],
    risks: [
      { name: 'IXP fabric outage', detail: 'A switching failure at a big IXP disrupts many networks at once.', mitigation: 'Connect at multiple IXPs and keep transit as a fallback path.' },
      { name: 'Route leaks via peers', detail: 'A misconfigured member re-announces routes it learned elsewhere.', mitigation: 'Route servers filter with IRR and RPKI data; members apply max-prefix limits.' },
    ],
  },
  {
    id: 'server_edge',
    label: 'Your App Server Edge',
    icon: ShieldCheck,
    tone: 'rose',
    summary: 'Anycast edge PoP: where the internet ends and your platform begins.',
    layers: ['L3', 'L4', 'L5', 'L6', 'L7'],
    details: [
      'Your app\'s public IP, 104.16.123.96, is anycast: the CDN announces it via BGP from hundreds of cities. Your ISP\'s best BGP path leads to the Frankfurt PoP, about 12 ms away, so that is where your TCP and TLS handshakes complete.',
      'Terminating connections close to users is the single biggest latency win: the handshake round trips cost 12 ms each instead of ~90 ms to the origin in Virginia. The edge then forwards requests to the origin over connections it keeps warm and reuses.',
      'From here the request enters the cloud topology: WAF inspection, load balancer, Kubernetes, and finally Your Application Server. See the Cloud Topology tab.',
    ],
    metrics: [
      { label: 'RTT from Your Computer', value: '12 ms' },
      { label: 'RTT edge to origin (us-east-1)', value: '~80 ms' },
      { label: 'Anycast PoPs announcing the IP', value: '100s' },
      { label: 'DDoS capacity (large CDNs)', value: 'tens to hundreds of Tb/s' },
    ],
    examples: [
      {
        label: 'Anycast in action',
        code: `104.16.123.96/20 announced by AS64501 from:
  Frankfurt  (FRA)   <- best path from your ISP (via IXP)    RTT  12 ms
  Amsterdam  (AMS)                                           RTT  19 ms
  London     (LHR)                                           RTT  24 ms
  Virginia   (IAD)                                           RTT  92 ms
Same IP everywhere; BGP routing picks the closest PoP for each network.`,
      },
      {
        label: 'Which PoP am I hitting?',
        code: `$ curl -sI https://api.enterprise.com/health | grep -iE "server|pop|ray|via"
server: example-cdn
x-edge-pop: FRA
x-edge-request-id: 8c1f2a3b4d5e6f70-FRA`,
      },
    ],
    risks: [
      { name: 'Volumetric DDoS', detail: 'Hundreds of Gb/s of junk traffic aimed at your IP.', mitigation: 'Anycast spreads the attack across all PoPs, where it is absorbed and filtered before reaching the origin.' },
      { name: 'Origin bypass', detail: 'If attackers find the origin\'s real IP they can skip the edge, WAF and DDoS protection.', mitigation: 'Only accept traffic from edge IP ranges at the origin, or require authenticated origin pulls (mTLS from the edge).' },
    ],
  },
];
