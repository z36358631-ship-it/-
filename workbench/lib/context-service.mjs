import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

export class ContextService {
  constructor({ store, allowedRoot }) {
    this.store = store;
    this.allowedRoot = path.resolve(allowedRoot);
  }

  getRequirementContext(requirementId) {
    const requirement = this.store.getRequirement(requirementId);
    if (!requirement) {
      throw Object.assign(new Error('requirement does not exist'), { statusCode: 404 });
    }
    return {
      requirement,
      artifacts: this.store.listArtifacts(requirementId),
      thread: this.store.getRequirementThread(requirementId) || null,
    };
  }

  authorizeFiles(requirementId, requestedPaths) {
    const context = this.getRequirementContext(requirementId);
    const registered = new Map(context.artifacts.map(item => [item.path, item]));
    return [...new Set(requestedPaths || [])].map(relativePath => {
      const artifact = registered.get(relativePath);
      if (!artifact) {
        throw Object.assign(
          new Error(`File is not registered to requirement: ${relativePath}`),
          { statusCode: 403 },
        );
      }
      assertAuthorizedPath(this.allowedRoot, path.join(this.allowedRoot, relativePath));
      return artifact;
    });
  }
}
