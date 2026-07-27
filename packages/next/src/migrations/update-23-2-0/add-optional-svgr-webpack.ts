import {
  addDependenciesToPackageJson,
  getProjects,
  joinPathFragments,
  type Tree,
} from '@nx/devkit';
import { svgrWebpackVersion } from '../../utils/versions';

export default async function addOptionalSvgrWebpack(tree: Tree) {
  const projects = getProjects(tree);
  let needsSvgr = false;

  for (const [, project] of projects) {
    // The Nx 22 `add-svgr-to-next-config` migration inlined a `withSvgr` helper
    // that resolves `@svgr/webpack` into this file, and it only ever rewrote
    // `next.config.js` at the project root.
    const nextConfigPath = joinPathFragments(project.root, 'next.config.js');
    needsSvgr ||=
      tree.exists(nextConfigPath) &&
      tree.read(nextConfigPath, 'utf-8').includes('@svgr/webpack');
  }

  if (!needsSvgr) {
    return;
  }

  return addDependenciesToPackageJson(
    tree,
    {},
    { '@svgr/webpack': svgrWebpackVersion },
    undefined,
    true
  );
}
