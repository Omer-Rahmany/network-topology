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

All content and UI are in [`src/App.tsx`](src/App.tsx):

- `OSI_LAYERS`: the OSI stack tab (snippets, NAT tables, explanations)
- `ISP_NODES`: the ISP & last-mile topology
- `CLOUD_NODES`: the cloud topology
- `ID_STEPS`: the Okta / OIDC SSO flow

Adding a node or layer is usually just adding an entry to one of these arrays. Icons come from [lucide-react](https://lucide.dev/icons/).

## Guidelines

- Keep technical claims accurate. If you're correcting something, a link to an RFC or vendor doc in the PR description helps reviewers.
- Keep PRs focused: one topic per PR.
- Match the existing Tailwind styling and dark theme.

## Becoming a maintainer

Regular contributors are welcome to join as maintainers. Open an issue or mention it in a PR.
