package download

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// ffmpegStubSpec describes the behavior of a fake ffmpeg executable so the
// same tests can run on both Unix (.sh) and Windows (.bat).
type ffmpegStubSpec struct {
	// writeLastArg, when non-empty, writes this text into the file named by
	// the last command-line argument (mimicking ffmpeg writing its output).
	writeLastArg string
	// stderrText, when non-empty, is echoed to stderr.
	stderrText string
	exitCode   int
}

func TestRunFFmpegKeepsSuccessSilent(t *testing.T) {
	script := writeFFmpegStub(t, ffmpegStubSpec{stderrText: "quiet stderr", exitCode: 0})
	stderr := captureStderr(t, func() {
		if err := runFFmpeg(exec.Command(script)); err != nil {
			t.Fatalf("runFFmpeg returned error: %v", err)
		}
	})
	if stderr != "" {
		t.Fatalf("stderr = %q, want empty", stderr)
	}
}

func TestRunFFmpegPrintsStderrOnFailure(t *testing.T) {
	script := writeFFmpegStub(t, ffmpegStubSpec{stderrText: "ffmpeg build info", exitCode: 1})
	stderr := captureStderr(t, func() {
		if err := runFFmpeg(exec.Command(script)); err == nil {
			t.Fatal("runFFmpeg returned nil error")
		}
	})
	if !strings.Contains(stderr, "ffmpeg build info") {
		t.Fatalf("stderr = %q, want ffmpeg stderr to be printed", stderr)
	}
}

func TestMuxDASHWritesPartThenRenamesOnSuccess(t *testing.T) {
	dir := t.TempDir()
	videoPath := filepath.Join(dir, "video.mp4")
	outPath := filepath.Join(dir, "merged.mp4")
	if err := os.WriteFile(videoPath, []byte("video"), 0o644); err != nil {
		t.Fatalf("write video: %v", err)
	}
	script := writeFFmpegStub(t, ffmpegStubSpec{writeLastArg: "merged", exitCode: 0})
	engine := New(Opts{OutputDir: dir, Overwrite: true})
	engine.ffmpeg = script

	if err := engine.muxDASH(videoPath, "", outPath, false); err != nil {
		t.Fatalf("muxDASH returned error: %v", err)
	}
	if _, err := os.Stat(outPath); err != nil {
		t.Fatalf("merged output missing: %v", err)
	}
	if _, err := os.Stat(outPath + ".part"); !os.IsNotExist(err) {
		t.Fatalf("part file still exists or stat failed unexpectedly: %v", err)
	}
}

func TestMuxDASHCleansPartOnFailure(t *testing.T) {
	dir := t.TempDir()
	videoPath := filepath.Join(dir, "video.mp4")
	outPath := filepath.Join(dir, "merged.mp4")
	if err := os.WriteFile(videoPath, []byte("video"), 0o644); err != nil {
		t.Fatalf("write video: %v", err)
	}
	script := writeFFmpegStub(t, ffmpegStubSpec{
		writeLastArg: "partial",
		stderrText:   "ffmpeg failed",
		exitCode:     1,
	})
	engine := New(Opts{OutputDir: dir, Overwrite: true})
	engine.ffmpeg = script

	_ = captureStderr(t, func() {
		if err := engine.muxDASH(videoPath, "", outPath, false); err == nil {
			t.Fatal("muxDASH returned nil error")
		}
	})
	if _, err := os.Stat(outPath + ".part"); !os.IsNotExist(err) {
		t.Fatalf("part file still exists or stat failed unexpectedly: %v", err)
	}
	if _, err := os.Stat(outPath); !os.IsNotExist(err) {
		t.Fatalf("final output exists or stat failed unexpectedly: %v", err)
	}
}

func writeFFmpegStub(t *testing.T, spec ffmpegStubSpec) string {
	t.Helper()
	dir := t.TempDir()

	if runtime.GOOS == "windows" {
		path := filepath.Join(dir, "ffmpeg-stub.bat")
		var b strings.Builder
		b.WriteString("@echo off\r\n")
		if spec.writeLastArg != "" {
			b.WriteString("set \"last=\"\r\n")
			b.WriteString("for %%a in (%*) do set \"last=%%~a\"\r\n")
			b.WriteString("echo " + spec.writeLastArg + "> \"%last%\"\r\n")
		}
		if spec.stderrText != "" {
			b.WriteString("echo " + spec.stderrText + " 1>&2\r\n")
		}
		b.WriteString(fmt.Sprintf("exit /b %d\r\n", spec.exitCode))
		if err := os.WriteFile(path, []byte(b.String()), 0o755); err != nil {
			t.Fatalf("write stub: %v", err)
		}
		return path
	}

	path := filepath.Join(dir, "ffmpeg-stub.sh")
	var b strings.Builder
	b.WriteString("#!/bin/sh\n")
	if spec.writeLastArg != "" {
		b.WriteString("for last do :; done\n")
		b.WriteString("echo " + spec.writeLastArg + " > \"$last\"\n")
	}
	if spec.stderrText != "" {
		b.WriteString("echo \"" + spec.stderrText + "\" >&2\n")
	}
	b.WriteString(fmt.Sprintf("exit %d\n", spec.exitCode))
	if err := os.WriteFile(path, []byte(b.String()), 0o755); err != nil {
		t.Fatalf("write stub: %v", err)
	}
	return path
}

func captureStderr(t *testing.T, fn func()) string {
	t.Helper()
	old := os.Stderr
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	os.Stderr = w
	defer func() {
		os.Stderr = old
	}()
	defer r.Close()
	defer w.Close()

	fn()
	if err := w.Close(); err != nil {
		t.Fatalf("close pipe writer: %v", err)
	}
	data, err := io.ReadAll(r)
	if err != nil {
		t.Fatalf("read pipe: %v", err)
	}
	return string(data)
}
