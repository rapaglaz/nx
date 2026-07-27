import {
  addDependenciesToPackageJson,
  getProjects,
  joinPathFragments,
  type NxJsonConfiguration,
  readNxJson,
  type Tree,
} from '@nx/devkit';
import {
  expressVersion,
  httpProxyMiddlewareVersion,
  nxVersion,
  svgrWebpackVersion,
} from '../../utils/versions';

const moduleFederationExecutors = new Set([
  '@nx/react:module-federation-dev-server',
  '@nx/react:module-federation-ssr-dev-server',
  '@nx/react:module-federation-static-server',
]);
const staticServerExecutor = '@nx/react:module-federation-static-server';

function collectExecutors(
  targetDefaults: NxJsonConfiguration['targetDefaults']
): string[] {
  // targetDefaults are keyed by target name or executor, and a default can set
  // an executor that an empty project target inherits, so scan the keys and any
  // executor on the default (both the object and array forms).
  const executors: string[] = [];
  for (const [targetOrExecutor, config] of Object.entries(
    targetDefaults ?? {}
  )) {
    executors.push(targetOrExecutor);
    for (const entry of Array.isArray(config) ? config : [config]) {
      if (entry.executor != null) {
        executors.push(entry.executor);
      }
    }
  }

  return executors;
}

export default async function addOptionalModuleFederationPackages(tree: Tree) {
  const projects = getProjects(tree);
  const nxJson = readNxJson(tree);
  let needsModuleFederation = false;
  let needsStaticServer = false;
  let needsSvgr = false;

  for (const [, project] of projects) {
    for (const target of Object.values(project.targets ?? {})) {
      needsModuleFederation ||= moduleFederationExecutors.has(target.executor);
      needsStaticServer ||= target.executor === staticServerExecutor;

      // The Nx 22 `add-svgr-to-webpack-config` migration inlined a `withSvgr`
      // helper that resolves `@svgr/webpack` into these configs, and it only
      // ever rewrote configs reachable through this option.
      for (const options of [
        target.options,
        ...Object.values(target.configurations ?? {}),
      ]) {
        const webpackConfig = options?.webpackConfig;
        if (typeof webpackConfig === 'string') {
          needsSvgr ||= referencesSvgrWebpack(tree, webpackConfig);
        }
      }
    }

    // Remotes get a plain dev-server (no Module Federation executor) but still
    // generate a module-federation.config that requires @nx/module-federation
    // at build time, so detect them by that config file too. This covers
    // remotes whose host lives in a different workspace.
    needsModuleFederation ||=
      tree.exists(
        joinPathFragments(project.root, 'module-federation.config.ts')
      ) ||
      tree.exists(
        joinPathFragments(project.root, 'module-federation.config.js')
      );
  }

  for (const executor of collectExecutors(nxJson?.targetDefaults)) {
    needsModuleFederation ||= moduleFederationExecutors.has(executor);
    needsStaticServer ||= executor === staticServerExecutor;
  }

  if (!needsModuleFederation && !needsStaticServer && !needsSvgr) {
    return;
  }

  return addDependenciesToPackageJson(
    tree,
    {},
    {
      ...(needsModuleFederation ? { '@nx/module-federation': nxVersion } : {}),
      ...(needsStaticServer
        ? {
            express: expressVersion,
            'http-proxy-middleware': httpProxyMiddlewareVersion,
          }
        : {}),
      ...(needsSvgr ? { '@svgr/webpack': svgrWebpackVersion } : {}),
    },
    undefined,
    true
  );
}

function referencesSvgrWebpack(tree: Tree, path: string): boolean {
  if (!tree.exists(path)) {
    return false;
  }

  return tree.read(path, 'utf-8').includes('@svgr/webpack');
}
