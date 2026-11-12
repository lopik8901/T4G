import { spawn, spawnSync } from 'node:child_process'
import { dockerExecutable, dockerEnvironment, trustedRuntimeHash } from '../server/generation/docker.ts'

const executable = dockerExecutable()
for(const file of ['runner.mjs','test-worker.mjs','runtime-core.mjs','component-acceptance.mjs','design-acceptance.mjs','acceptance.mjs']){
  const check=spawnSync(process.execPath,['--check',`sandbox/${file}`],{stdio:'inherit',windowsHide:true})
  if(check.status!==0)throw Error(`Trusted harness syntax check failed: ${file}`)
}
const child = spawn(executable, ['build', '--tag', 'careplay-validator:1', '--build-arg', `CAREPLAY_RUNTIME_SHA256=${trustedRuntimeHash}`, './sandbox'], {
  env: dockerEnvironment(executable), stdio: 'inherit', shell: false, windowsHide: true,
})
child.on('error', () => { console.error('Docker could not start. Check Docker Desktop is installed and running.'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
