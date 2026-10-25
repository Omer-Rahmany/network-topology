# Enterprise Network, OSI & Identity Explorer

Interactive explorer tracing one HTTPS request from your computer to your application server, with realistic packets, commands and numbers at every step:

- **OSI Stack**: each layer with realistic captures, header-field tables, CLI commands to try, attacks and troubleshooting
- **Packet Anatomy**: a full-size packet byte by byte, encapsulation, and MTU/MSS across setups
- **ISP & Last Mile**: router, GPON fiber, BNG, backbone/BGP, IXP peering and the anycast edge
- **Cloud Topology**: DNS, CDN/WAF, load balancer, Kubernetes, service mesh, your app, and workload identity to the database
- **Identity & SSO**: the Okta OIDC Authorization Code + PKCE flow with sequence diagrams and the actual HTTP messages
- **Request Timeline**: where every millisecond goes, cold vs warm vs cached

**Live:** https://omer-rahmany.github.io/network-topology/

## Run locally

```bash
npm install
npm run dev
```

Built with React, Vite, Tailwind CSS, and lucide-react. Deployed to GitHub Pages via GitHub Actions on every push to `main`.

## Contributing

Issues and pull requests are welcome. Merged PRs deploy to the live site automatically. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Omer Rahmany
