import type { EncapLayer, MtuScenario } from '../types';

// One full-size TCP segment carrying part of the HTTPS response, as it
// leaves Your Computer's Ethernet port. Outermost layer first.
export const ENCAP_LAYERS: EncapLayer[] = [
  {
    id: 'l1',
    layer: 'L1',
    name: 'Physical framing',
    tone: 'rose',
    header: { label: 'Preamble + SFD', bytes: 8 },
    trailer: { label: 'Inter-frame gap', bytes: 12 },
    detail:
      'Not part of the frame software sees, but it still uses time on the wire. The preamble (alternating 1s and 0s) lets the receiver lock onto the clock; the start frame delimiter marks where the frame begins. After the frame, the sender must stay silent for at least 12 byte-times.',
  },
  {
    id: 'l2',
    layer: 'L2',
    name: 'Ethernet frame',
    tone: 'amber',
    header: { label: 'Ethernet header', bytes: 14 },
    trailer: { label: 'FCS (CRC-32)', bytes: 4 },
    detail:
      'Destination MAC (the router, 6 B), source MAC (your NIC, 6 B) and EtherType 0x0800 (2 B). The 4-byte Frame Check Sequence at the end lets every receiver detect corruption. Add 4 more bytes if the link carries an 802.1Q VLAN tag.',
  },
  {
    id: 'l3',
    layer: 'L3',
    name: 'IPv4 packet',
    tone: 'orange',
    header: { label: 'IPv4 header', bytes: 20 },
    detail:
      'Source 192.168.1.50 (rewritten to 203.0.113.5 by NAT), destination 104.16.123.96, TTL, protocol 6 (TCP), DF flag set. The whole IP packet, header included, must fit in the 1500-byte MTU. IPv6 would need 40 bytes here instead of 20.',
  },
  {
    id: 'l4',
    layer: 'L4',
    name: 'TCP segment',
    tone: 'violet',
    header: { label: 'TCP header', bytes: 32 },
    detail:
      '20 fixed bytes (ports, sequence, ack, flags, window, checksum) plus 12 bytes of timestamp options, which almost every modern connection uses. That is why the effective MSS is often 1448 rather than the textbook 1460.',
  },
  {
    id: 'l6',
    layer: 'L6',
    name: 'TLS 1.3 record',
    tone: 'sky',
    header: { label: 'TLS record header', bytes: 5 },
    trailer: { label: 'Inner type + AEAD tag', bytes: 17 },
    detail:
      '5-byte record header (type 23, version 0x0303, length). After the encrypted data comes 1 byte of the real content type (hidden inside the encryption) and a 16-byte AES-GCM authentication tag. In practice TLS records are often larger than one TCP segment and span several packets; here one record fits one segment to keep the picture simple.',
  },
  {
    id: 'l7',
    layer: 'L7',
    name: 'HTTP/2 DATA frame',
    tone: 'emerald',
    header: { label: 'HTTP/2 frame header', bytes: 9 },
    detail:
      '9 bytes: length (3), type (DATA = 0x0), flags (1, e.g. END_STREAM) and stream ID (4, here stream 3). The payload after it is a slice of the brotli-compressed JSON response body.',
  },
];

/** Bytes of actual application data left in a 1500-byte IP packet after all the headers above. */
export const PAYLOAD_BYTES = 1417;

export const MTU_SCENARIOS: MtuScenario[] = [
  { scenario: 'Standard Ethernet, IPv4', mtu: '1500', mss: '1460', note: '1500 - 20 (IP) - 20 (TCP). The textbook number.' },
  { scenario: 'With TCP timestamps', mtu: '1500', mss: '1448', note: 'What most real connections end up with: 12 more bytes of TCP options per segment.' },
  { scenario: 'IPv6', mtu: '1500', mss: '1440', note: 'IPv6 header is 40 bytes instead of 20.' },
  { scenario: 'PPPoE DSL / fiber', mtu: '1492', mss: '1452', note: '8 bytes of PPPoE header. Routers clamp the MSS so endpoints do not send oversized packets.' },
  { scenario: 'WireGuard VPN (default)', mtu: '1420', mss: '1380', note: 'Outer IP + UDP (8) + WireGuard (32): 60 bytes over IPv4, 80 over IPv6. The 1420 default covers the IPv6 worst case.' },
  { scenario: 'IPsec ESP tunnel', mtu: '~1400', mss: '~1360', note: 'Overhead varies with cipher and padding; VPN gateways usually clamp MSS to 1350-1360.' },
  { scenario: 'AWS VPC (jumbo frames)', mtu: '9001', mss: '8961', note: 'Inside a VPC. Traffic leaving to the internet, through VPN or some peering paths, drops to 1500.' },
  { scenario: 'QUIC / HTTP/3', mtu: '1200-1500', mss: 'n/a', note: 'QUIC packets are UDP datagrams of at least 1200 bytes; the QUIC stack probes the path MTU itself.' },
];
