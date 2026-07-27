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

function read(relativePath) {
  return fs.readFileSync(path.join(workspace, relativePath), 'utf8')
}

for (const root of yamlRoots) walk(path.join(workspace, root))

for (const relativePath of yamlFiles) {
  const source = read(relativePath)
  const documents = parseAllDocuments(source, { prettyErrors: true })
  for (const document of documents) {
    if (document.errors.length) {
      throw new Error(`${relativePath}: ${document.errors.map((error) => error.message).join('; ')}`)
    }
    document.toJS()
  }
}

const openApi = parseAllDocuments(read('docs/openapi.yaml'))[0].toJS()
function resolveLocalReference(reference) {
  if (!reference.startsWith('#/')) return
  let current = openApi
  for (const segment of reference
    .slice(2)
    .split('/')
    .map((value) => value.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    current = current?.[segment]
  }
  if (current === undefined) throw new Error(`OpenAPI contract has an unresolved reference: ${reference}`)
}

function inspectOpenApiNode(node) {
  if (!node || typeof node !== 'object') return
  if (typeof node.$ref === 'string') resolveLocalReference(node.$ref)
  for (const value of Object.values(node)) inspectOpenApiNode(value)
}
inspectOpenApiNode(openApi)

const requiredOpenApiOperations = {
  '/health/live': ['get'],
  '/health/startup': ['get'],
  '/health/ready': ['get'],
  '/health/dependencies': ['get'],
  '/config': ['get'],
  '/auth/register': ['post'],
  '/auth/login': ['post'],
  '/auth/refresh': ['post'],
  '/auth/session': ['get'],
  '/auth/logout': ['post'],
  '/auth/logout-all': ['post'],
  '/auth/sessions': ['get'],
  '/auth/sessions/{sessionId}': ['delete'],
  '/auth/recover': ['post'],
  '/auth/reset/{token}': ['get', 'post'],
  '/auth/me': ['get', 'patch', 'delete'],
  '/courses': ['get', 'post'],
  '/courses/{courseId}': ['get', 'put', 'delete'],
  '/courses/{courseId}/end-course': ['post'],
  '/courses/{courseId}/enroll': ['post'],
  '/courses/{courseId}/un-enroll': ['post'],
  '/courses/{courseId}/enrollments': ['get', 'post'],
  '/courses/{courseId}/modules': ['get', 'post'],
  '/courses/{courseId}/modules/{moduleId}': ['get', 'put', 'delete'],
  '/courses/{courseId}/modules/{moduleId}/module-item': ['post'],
  '/courses/{courseId}/modules/{moduleId}/module-item/{moduleItemId}': ['put', 'delete'],
  '/courses/{courseId}/lectures': ['get'],
  '/courses/{courseId}/lectures/{moduleItemId}/comments': ['get', 'post'],
  '/courses/{courseId}/lectures/{moduleItemId}/comments/{commentId}': ['delete'],
  '/instructor/dashboard': ['get'],
  '/instructor/courses': ['post'],
  '/instructor/courses/{courseId}': ['get', 'put'],
  '/instructor/courses/{courseId}/status': ['post'],
  '/uploads/cloudinary/signature': ['post'],
  '/deadlines': ['get'],
  '/deadlines/calendar': ['get'],
  '/ai/complete': ['post'],
}
for (const [apiPath, methods] of Object.entries(requiredOpenApiOperations)) {
  for (const method of methods) {
    if (!openApi.paths?.[apiPath]?.[method]) {
      throw new Error(`OpenAPI contract is missing ${method.toUpperCase()} ${apiPath}`)
    }
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
  const source = read(dockerfile)
  if (!source.includes('HEALTHCHECK') || !source.includes('USER ')) {
    throw new Error(`${dockerfile} must define a non-root user and image health check`)
  }
  for (const manifest of ['Server/package.json', 'web/package.json']) {
    if (!source.includes(`COPY ${manifest} ${manifest}`)) {
      throw new Error(`${dockerfile} must include ${manifest} in the frozen workspace install context`)
    }
  }
}

const ciWorkflow = read('.github/workflows/ci.yml')
for (const forbiddenBypass of ['--ignore-unfixed', '--ignorefile', 'continue-on-error:', '.trivyignore']) {
  if (ciWorkflow.includes(forbiddenBypass)) {
    throw new Error(`CI workflow contains a forbidden security bypass: ${forbiddenBypass}`)
  }
}
if ((ciWorkflow.match(/--exit-code 1/g) ?? []).length !== 2) {
  throw new Error('Both container vulnerability scans must fail on critical findings')
}

const gitleaksConfig = read('.gitleaks.toml')
if (/^\s*paths\s*=/m.test(gitleaksConfig) || /^\s*commits\s*=/m.test(gitleaksConfig)) {
  throw new Error('Secret scanning must not exclude paths or commits')
}
if (!gitleaksConfig.includes('^test-secret-key-that-is-at-least-32-characters-long$')) {
  throw new Error('Secret scanning must allow only the exact shared test credential')
}

const packageFiles = ['package.json', 'Server/package.json', 'web/package.json']
const versions = new Map(
  packageFiles.map((relativePath) => [relativePath, JSON.parse(read(relativePath)).version])
)
const releaseVersion = versions.get('package.json')
if (!releaseVersion || [...versions.values()].some((version) => version !== releaseVersion)) {
  throw new Error(
    `Workspace package versions are inconsistent: ${JSON.stringify(Object.fromEntries(versions))}`
  )
}

const versionContracts = [
  ['docker/server.Dockerfile', `ARG APP_VERSION=${releaseVersion}`],
  ['docker/web.Dockerfile', `ARG APP_VERSION=${releaseVersion}`],
  ['deploy/k8s/base/configmap.yaml', `APP_VERSION: '${releaseVersion}'`],
  ['deploy/k8s/base/server-deployment.yaml', `cognexa-server:${releaseVersion}`],
  ['deploy/k8s/base/web-deployment.yaml', `cognexa-web:${releaseVersion}`],
  ['docs/openapi.yaml', `version: ${releaseVersion}`],
]
for (const [relativePath, contract] of versionContracts) {
  if (!read(relativePath).includes(contract)) {
    throw new Error(`${relativePath} is not aligned to release ${releaseVersion}`)
  }
}

console.log(`Infrastructure validation passed for ${yamlFiles.length} YAML files and both runtime images.`)
