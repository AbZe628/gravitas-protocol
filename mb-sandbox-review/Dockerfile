# Reference sandbox image. All included application code is unaudited and for evaluation, not production.
FROM node:22-bookworm-slim
ARG TARGETARCH
ENV DEBIAN_FRONTEND=noninteractive \
    FOUNDRY_DISABLE_NIGHTLY_WARNING=1 \
    PATH="/opt/openapi-venv/bin:/usr/local/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/openapi-venv \
    && /opt/openapi-venv/bin/pip install --no-cache-dir \
      openapi-spec-validator==0.7.2 pycryptodome==3.23.0

RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64) FOUNDRY_ARCH=linux_amd64 ;; \
      arm64) FOUNDRY_ARCH=linux_arm64 ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/foundry-rs/foundry/releases/download/v1.9.0/foundry_v1.9.0_${FOUNDRY_ARCH}.tar.gz" -o /tmp/foundry.tar.gz; \
    tar -xzf /tmp/foundry.tar.gz -C /usr/local/bin; \
    rm /tmp/foundry.tar.gz; \
    forge --version | grep -F '1.9.0'

WORKDIR /workspace
COPY foundry.toml ./foundry.toml
COPY contracts/ ./contracts/
COPY test/ ./test/
COPY script/ ./script/
COPY lib/openzeppelin-contracts/ ./lib/openzeppelin-contracts/
COPY docs/ ./docs/
COPY integration-kit/ ./integration-kit/
COPY mb-sandbox-review/ ./mb-sandbox-review/

# The root project names this nested library lib/forge-std; keep the repository config untouched.
RUN mkdir -p ./lib \
    && if [ ! -e ./lib/forge-std ]; then ln -s openzeppelin-contracts/lib/forge-std ./lib/forge-std; fi \
    && node --version | grep -E '^v22\.' \
    && forge --version

EXPOSE 8545 8787
CMD ["bash", "/workspace/mb-sandbox-review/reference/scripts/start-sandbox.sh"]
