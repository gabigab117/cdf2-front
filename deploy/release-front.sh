#!/usr/bin/env bash
#
# Deploy one build of the front end to an instance of the application.
#
# The CI builds the Nitro server (`.output`) and streams it, as a gzipped tar
# archive, to this script through an SSH key restricted to this command; the
# commit SHA arrives in SSH_ORIGINAL_COMMAND. By hand, from an archive:
#
#     sudo -u cdf3 cdf3-release-front preprod <commit-sha> < output.tar.gz
#
# Every build gets its own release directory; the `current` link is switched
# atomically, and a release that fails its health check is rolled back.
set -euo pipefail

readonly APP_ROOT=/var/www/cdf3
readonly KEEP_RELEASES=3
readonly MAX_ARCHIVE_BYTES=$((100 * 1024 * 1024))
readonly TAG=cdf3-release-front

# Details go to the journal (journalctl -t cdf3-release-front); the caller only
# gets one status line, as the logs of a public CI are readable by anyone.
exec 3>&1
exec 1> >(systemd-cat -t "$TAG") 2>&1
# A dropped SSH connection must not stop a deployment halfway through.
trap '' HUP PIPE

fail() {
    echo "error: $*"
    printf 'Deployment failed: %s\n' "$*" >&3 || true
    exit 1
}

main() {
    local instance=${1:-} sha=${2:-${SSH_ORIGINAL_COMMAND:-}}
    [[ $instance =~ ^(preprod|prod)$ ]] || fail "unknown instance '$instance'"
    [[ $sha =~ ^[0-9a-f]{40}$ ]] || fail "a full commit SHA is expected"

    local base=$APP_ROOT/$instance
    local app=$base/front
    local release=$app/releases/$sha
    local env_file=$base/shared/front.env

    exec 9>"$base/deploy.lock"
    flock -w 600 9 || fail "another deployment is still running"

    echo "receiving the build of $sha for $instance"
    rm -rf "$release.partial"
    mkdir "$release.partial"
    head -c "$MAX_ARCHIVE_BYTES" | tar -xz -C "$release.partial" ||
        fail "the archive is invalid or larger than $MAX_ARCHIVE_BYTES bytes"
    [[ -f $release.partial/server/index.mjs ]] || fail "the archive holds no Nitro server"
    printf '%s\n' "$sha" >"$release.partial/REVISION"
    rm -rf "$release"
    mv "$release.partial" "$release"

    local previous
    previous=$(readlink -f "$app/current" || true)
    activate "$app" "$release"
    sudo systemctl restart "cdf3-web@$instance.service"

    if ! healthy "$env_file"; then
        [[ -n $previous && $previous != "$release" ]] || fail "$sha did not pass its health check"
        local previous_sha
        previous_sha=$(basename "$previous")
        echo "health check failed, rolling back to $previous_sha"
        activate "$app" "$previous"
        sudo systemctl restart "cdf3-web@$instance.service"
        # The caller must know whether the site is back, not only that the
        # deployment failed.
        healthy "$env_file" ||
            fail "$sha did not pass its health check, nor did $previous_sha after the rollback"
        fail "$sha did not pass its health check, rolled back to $previous_sha"
    fi

    prune "$app/releases" "$release"
    echo "deployed $sha"
    printf 'Deployed %s to %s\n' "$sha" "$instance" >&3 || true
}

# Point the `current` link at a release, atomically (rename over the old link).
activate() {
    local app=$1 target=$2
    ln -sfn "$target" "$app/current.next"
    mv -T "$app/current.next" "$app/current"
}

# The freshly restarted server must render the home page.
healthy() {
    local env_file=$1 host port attempt
    host=$(sed -n 's/^NITRO_HOST=//p' "$env_file")
    port=$(sed -n 's/^NITRO_PORT=//p' "$env_file")
    for attempt in $(seq 15); do
        if curl -fsS --max-time 5 -o /dev/null "http://$host:$port/" 2>/dev/null; then
            return 0
        fi
        echo "health check $attempt failed, retrying"
        sleep 2
    done
    return 1
}

# Keep the most recent releases, never the one just deployed.
prune() {
    local releases=$1 keep=$2 dir
    find "$releases" -mindepth 1 -maxdepth 1 -type d ! -name '*.partial' -printf '%T@ %p\n' |
        sort -rn | tail -n +$((KEEP_RELEASES + 1)) | cut -d' ' -f2- |
        while read -r dir; do
            [[ $dir == "$keep" ]] || rm -rf "$dir"
        done
}

main "$@"
