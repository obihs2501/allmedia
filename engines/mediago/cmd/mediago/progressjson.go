package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// jsonReporter emits machine-readable NDJSON progress events on stdout when
// --progress-json is enabled. Human-readable logs keep going to stderr, so
// a supervising process can parse stdout line by line while still surfacing
// stderr for diagnostics.
//
// Event stream, one JSON object per line:
//
//	{"event":"start","url":"..."}
//	{"event":"info","title":"...","site":"...","playlist":false,"count":1}
//	{"event":"item-start","index":1,"total":1,"title":"..."}
//	{"event":"progress","index":1,"written":123,"total":456,"segDone":0,"segTotal":0}
//	{"event":"merging","index":1}
//	{"event":"item-done","index":1,"path":"C:/out/file.mp4","size":456}
//	{"event":"item-error","index":2,"title":"...","message":"..."}
//	{"event":"url-error","url":"...","message":"..."}
//	{"event":"done","success":1,"failed":0}
//
// progress semantics: written/total are bytes when byte totals are known;
// segDone/segTotal count HLS segments when they are not. total==0 means the
// size is unknown and the consumer should render an indeterminate bar.
type jsonReporter struct {
	mu       sync.Mutex
	enc      *json.Encoder
	index    int
	total    int
	lastEmit time.Time
}

func newJSONReporter() *jsonReporter {
	return &jsonReporter{enc: json.NewEncoder(os.Stdout)}
}

func (r *jsonReporter) emitLocked(fields map[string]any) {
	_ = r.enc.Encode(fields)
}

func (r *jsonReporter) Start(url string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{"event": "start", "url": url})
}

func (r *jsonReporter) Info(title, site string, playlist bool, count int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{
		"event": "info", "title": title, "site": site,
		"playlist": playlist, "count": count,
	})
}

func (r *jsonReporter) ItemStart(index, total int, title string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.index = index
	r.total = total
	r.lastEmit = time.Time{}
	r.emitLocked(map[string]any{
		"event": "item-start", "index": index, "total": total, "title": title,
	})
}

// OnProgress is wired into download.Opts.Progress; throttled to one event
// per 200ms because segment workers can fire it from multiple goroutines.
func (r *jsonReporter) OnProgress(written, total int64, segDone, segTotal int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now()
	if now.Sub(r.lastEmit) < 200*time.Millisecond {
		return
	}
	r.lastEmit = now
	r.emitLocked(map[string]any{
		"event": "progress", "index": r.index,
		"written": written, "total": total,
		"segDone": segDone, "segTotal": segTotal,
	})
}

func (r *jsonReporter) Merging() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{"event": "merging", "index": r.index})
}

func (r *jsonReporter) ItemDone(path string, size int64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{
		"event": "item-done", "index": r.index,
		"path": filepath.ToSlash(path), "size": size,
	})
}

func (r *jsonReporter) ItemError(index int, title, message string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{
		"event": "item-error", "index": index, "title": title, "message": message,
	})
}

func (r *jsonReporter) URLError(url, message string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{"event": "url-error", "url": url, "message": message})
}

func (r *jsonReporter) Done(success, failed int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.emitLocked(map[string]any{"event": "done", "success": success, "failed": failed})
}
