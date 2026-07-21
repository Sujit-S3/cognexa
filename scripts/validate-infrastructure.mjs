import fs from 'node:fs'
import path from 'node:path'
import { parseAllDocuments } from 'yaml'

const workspace = path.resolve(import.meta.dirname, '..')
const yamlRoots = ['.github', 'deploy']
const yamlFiles = ['docker-compose.yml', 'docs/openapi.yaml']

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target)
    else if (/\.ya?ml$/i.test(entry.name)) yamlFiles.push(path.relative(workspace, target))
  }
}

for (const root of yamlRoots) walk(path.join(workspace, root))

for (const relativePath of yamlFiles) {
  const source = fs.readFileSync(path.join(workspace, relativePath), 'utf8')
  const documents = parseAllDocuments(source, { prettyErrors: true })
  for (const document of documents) {
    if (document.errors.length) {
      throw new Error(`${relativePath}: ${document.errors.map((error) => error.message).join('; ')}`)
    }
    document.toJS()
  }
}

const basePath = path.join(workspace, 'deploy/k8s/base')
const baseKustomization = parseAllDocuments(
  fs.readFileSync(path.join(basePath, 'kustomization.yaml'), 'utf8')
)[0].toJS()
const requiredResources = [
  'namespace.yaml',
  'configmap.yaml',
  'server-deployment.yaml',
  'server-service.yaml',
  'web-deployment.yaml',
  'web-service.yaml',
  'ingress.yaml',
  'autoscaling.yaml',
  'availability.yaml',
  'network-policy.yaml',
]

for (const resource of requiredResources) {
  if (!baseKustomization.resources?.includes(resource)) {
    throw new Error(`Kubernetes base does not include ${resource}`)
  }
  if (!fs.existsSync(path.join(basePath, resource))) {
    throw new Error(`Kubernetes resource does not exist: ${resource}`)
  }
}

const deployWorkflow = fs.readFileSync(path.join(workspace, '.github/workflows/deploy.yml'), 'utf8')
for (const contract of ['server_digest', 'web_digest', 'kubectl rollout status', 'smoke-test.mjs']) {
  if (!deployWorkflow.includes(contract)) throw new Error(`Deploy workflow is missing ${contract}`)
}

for (const dockerfile of ['docker/server.Dockerfile', 'docker/web.Dockerfile']) {
  const source = fs.readFileSync(path.join(workspace, dockerfile), 'utf8')
  if (!source.includes('HEALTHCHECK') || !source.includes('USER ')) {
    throw new Error(`${dockerfile} must define a non-root user and image health check`)
  }
}

console.log(`Infrastructure validation passed for ${yamlFiles.length} YAML files and both runtime images.`)
