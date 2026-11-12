FROM node:22.18.0-bookworm-slim
WORKDIR /opt/careplay
# Dependencies are installed only while building this developer-controlled image.
RUN npm init -y && npm install --save-exact --ignore-scripts typescript@5.9.3 esbuild@0.25.12 && node node_modules/esbuild/install.js
COPY runner.mjs test-worker.mjs acceptance.mjs runtime-core.mjs runtime-api.d.ts design-acceptance.mjs component-acceptance.mjs ./
ARG CAREPLAY_RUNTIME_SHA256
LABEL careplay.runtime-sha256=$CAREPLAY_RUNTIME_SHA256
USER 1000:1000
ENV HOME=/tmp
ENTRYPOINT ["node", "/opt/careplay/runner.mjs"]
