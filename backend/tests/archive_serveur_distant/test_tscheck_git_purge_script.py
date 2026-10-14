"""Test: /app/zayado/scripts/purge-historique-secrets.sh exists, is
executable, and genuinely purges the given paths from git history when run
inside a throwaway clone -- WITHOUT ever touching /app's own history.

The clone is made via `git clone /app <tmp>`; the script itself lives
untracked under zayado/scripts in the workspace (not yet committed), so it is
copied into the clone before being invoked -- this does not affect the
purge logic under test, which only operates on the clone's git history.
"""
import os
import pathlib
import shutil
import stat
import subprocess
import tempfile

REPO_ROOT = pathlib.Path("/app")
SCRIPT_PATH = REPO_ROOT / "zayado" / "scripts" / "purge-historique-secrets.sh"

TARGET_PATHS = [
    "zayado/backend/kairos.db",
    "zayado/.token_sara",
    "zayado/.token_vendeur",
    "zayado/.token_test",
]


def _git(args, cwd):
    return subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_script_exists_and_executable():
    assert SCRIPT_PATH.exists(), f"purge script missing at {SCRIPT_PATH}"
    mode = SCRIPT_PATH.stat().st_mode
    assert mode & stat.S_IXUSR, f"purge script is not executable (mode={oct(mode)})"


def test_script_purges_secrets_from_a_throwaway_clone():
    tmp_dir = tempfile.mkdtemp(prefix="purge-clone-")
    try:
        clone_dir = os.path.join(tmp_dir, "clone")
        r = _git(["clone", str(REPO_ROOT), clone_dir], cwd=tmp_dir)
        assert r.returncode == 0, f"git clone failed: {r.stderr}"

        # Sanity: the target paths must actually appear in the clone's history
        # before we purge, otherwise the test would prove nothing.
        for path in TARGET_PATHS:
            before = _git(["log", "--all", "--oneline", "--", path], cwd=clone_dir)
            assert before.stdout.strip(), f"precondition failed: '{path}' has no history in the clone"

        # Copy the (currently untracked) script into the clone and run it there.
        script_in_clone = os.path.join(clone_dir, "purge-historique-secrets.sh")
        shutil.copy(str(SCRIPT_PATH), script_in_clone)
        os.chmod(script_in_clone, 0o755)

        result = subprocess.run(
            ["bash", script_in_clone] + TARGET_PATHS,
            cwd=clone_dir,
            capture_output=True,
            text=True,
            timeout=180,
        )
        assert result.returncode == 0, (
            f"purge script exited {result.returncode}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )

        for path in TARGET_PATHS:
            after = _git(["log", "--all", "--", path], cwd=clone_dir)
            assert after.stdout.strip() == "", f"'{path}' still has {len(after.stdout.splitlines())} commit(s) after purge"

        objects = _git(["rev-list", "--objects", "--all"], cwd=clone_dir)
        assert "kairos.db" not in objects.stdout, "kairos.db still reachable as a git object after purge"
        assert ".token_" not in objects.stdout, ".token_* file still reachable as a git object after purge"

        # /app's own history must remain untouched by this test.
        app_before = _git(["log", "--all", "--oneline", "--", "zayado/backend/kairos.db"], cwd=str(REPO_ROOT))
        assert app_before.stdout.strip(), "/app's own history for kairos.db should remain intact (not purged) per spec_deviations"
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
