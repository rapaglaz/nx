#### Add Optional SVGR Webpack Package

Adds `@svgr/webpack` to the workspace when a `next.config.js` resolves it.

`@svgr/webpack` is no longer a direct dependency of `@nx/next`; it is now an optional peer dependency, so installing `@nx/next` no longer pulls SVGR and its Babel and SVGO tooling into workspaces that do not import SVGs as components. This migration backfills it for workspaces whose `next.config.js` contains the `withSvgr` helper that the Nx 22 `add-svgr-to-next-config` migration inlines. Workspaces that already have `@svgr/webpack` are left untouched.

#### Examples

##### Before

```jsonc title="package.json"
{
  "devDependencies": {
    "@nx/next": "23.1.0",
  },
}
```

##### After

```jsonc title="package.json"
{
  "devDependencies": {
    "@nx/next": "23.1.0",
    "@svgr/webpack": "^8.0.1",
  },
}
```
