# Contributing

Thanks for helping improve the Enterprise Network, OSI & Identity Explorer. Corrections to the networking or identity content are just as valuable as code changes.

## How changes reach the live site

1. Fork the repo (or create a branch if you're a collaborator).
2. Make your change and open a pull request against `main`.
3. CI runs `npm run build` (type-check + production build) on the PR. It must pass.
4. A maintainer reviews and merges.
5. On merge, GitHub Actions rebuilds and deploys to https://omer-rahmany.github.io/network-topology/ within a minute or two.

Pull requests never deploy on their own; only merges to `main` do.

## Local setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # same check CI runs
```

## Where things live

Content is plain data, separate from the UI. Most contributions only touch `src/data/`:

| File | Tab | What's in it |
| --- | --- | --- |
| [`src/data/osi.ts`](src/data/osi.ts) | OSI Stack | Per layer: examples, header-field table, deep dive, CLI commands, risks, troubleshooting |
| [`src/data/packet.ts`](src/data/packet.ts) | Packet Anatomy | Encapsulation layers with byte counts, MTU/MSS scenarios |
| [`src/data/isp.ts`](src/data/isp.ts) | ISP & Last Mile | Hops from your computer to the app's edge |
| [`src/data/cloud.ts`](src/data/cloud.ts) | Cloud Topology | DNS, edge/WAF, ALB, Kubernetes, mesh, app, STS/DB |
| [`src/data/identity.ts`](src/data/identity.ts) | Identity & SSO | OIDC steps with sequence-diagram messages, HTTP examples, checks |
| [`src/data/timeline.ts`](src/data/timeline.ts) | Request Timeline | Latency phases per scenario, reference numbers, takeaways |

The shapes are defined in [`src/types.ts`](src/types.ts), so TypeScript tells you if a field is missing. Views live in `src/views/`, shared components in `src/components/ui.tsx`, and colors in `src/theme.ts` (use a `tone` name like `'sky'` rather than raw Tailwind classes).

Icons come from [lucide-react](https://lucide.dev/icons/).

### Keep the example consistent

All tabs follow the same request, so numbers should agree across files:

- Your Computer `192.168.1.50`, home router WAN `203.0.113.5`, app edge `104.16.123.96` (Frankfurt, 12 ms RTT)
- Origin in us-east-1, ~80 ms RTT from the edge, app pod `10.0.5.22:8443`
- Server time 24 ms, of which the DB query is 12.4 ms

Use documentation IP ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`), documentation ASNs (64496-64511), and `EXAMPLE` placeholders for IDs and keys. Never put real credentials or tokens in examples.

## Guidelines

- Keep technical claims accurate. If you're correcting something, a link to an RFC or vendor doc in the PR description helps reviewers.
- Keep PRs focused: one topic per PR.
- Match the existing Tailwind styling and dark theme.

## Becoming a maintainer

Regular contributors are welcome to join as maintainers. Open an issue or mention it in a PR.
