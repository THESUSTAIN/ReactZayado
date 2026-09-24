"""Test: previously committed secrets are no longer tracked by git and are
properly ignored, while the underlying files still exist on disk (the app
needs kairos.db to run)."""
import subprocess
import pathlib

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

UNTRACKED_PATHS = [".token_sara", ".token_vendeur", ".token_test", "backend/kairos.db"]
IGNORED_PATHS = [".token_sara", "backend/kairos.db", "backend/.env", "frontend/.env"]
MUST_EXIST_ON_DISK = [".token_sara", "backend/.env", "backend/kairos.db", "frontend/.env"]


def _git(args):
    return subprocess.run(
        ["git"] + args,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=15,
    )


def test_secret_paths_not_tracked_by_git():
    result = _git(["ls-files"])
    assert result.returncode == 0, f"git ls-files failed: {result.stderr}"
    tracked = set(result.stdout.splitlines())
    leaked = [p for p in UNTRACKED_PATHS if p in tracked]
    assert not leaked, f"secret paths still tracked by git: {leaked}"


def test_secret_paths_are_gitignored():
    for path in IGNORED_PATHS:
        result = _git(["check-ignore", "-q", path])
        assert result.returncode == 0, f"'{path}' is NOT ignored by git (check-ignore exit={result.returncode})"


def test_secret_files_still_exist_on_disk():
    missing = [p for p in MUST_EXIST_ON_DISK if not (REPO_ROOT / p).exists()]
    assert not missing, f"expected files missing from disk: {missing}"
