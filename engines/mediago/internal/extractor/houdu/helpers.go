package houdu

import (
	"encoding/base64"
	"encoding/json"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

func cloneHeaders(in map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cookieHeader(jar http.CookieJar, origins []string) string {
	seen := map[string]bool{}
	var parts []string
	for _, origin := range origins {
		u, err := url.Parse(origin)
		if err != nil {
			continue
		}
		for _, c := range jar.Cookies(u) {
			if c.Name == "" || seen[c.Name] {
				continue
			}
			seen[c.Name] = true
			parts = append(parts, c.Name+"="+c.Value)
		}
	}
	return strings.Join(parts, "; ")
}

func parseCookieHeader(cookie string) map[string]string {
	out := map[string]string{}
	for _, part := range strings.Split(cookie, ";") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 {
			out[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return out
}

func asMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

func listMaps(v any) []map[string]any {
	list, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(list))
	for _, item := range list {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func firstString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if s := str(m[k]); s != "" {
			return s
		}
	}
	return ""
}

func str(v any) string {
	switch t := v.(type) {
	case string:
		return strings.TrimSpace(t)
	case json.Number:
		return t.String()
	case float64:
		if math.Trunc(t) == t {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'f', -1, 64)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

func intVal(v any) int {
	s := str(v)
	if s == "" {
		return 0
	}
	f, _ := strconv.ParseFloat(s, 64)
	return int(f)
}

func coerceBool(v any, defaultValue bool) bool {
	s := strings.ToLower(strings.TrimSpace(str(v)))
	if s == "" || s == "none" || s == "null" {
		return defaultValue
	}
	switch s {
	case "0", "false", "no", "n":
		return false
	case "1", "true", "yes", "y":
		return true
	default:
		return defaultValue
	}
}

func normalizePrice(v any) float64 {
	switch t := v.(type) {
	case nil:
		return 0
	case string:
		s := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(t, ",", ""), "¥", ""))
		if s == "" || strings.EqualFold(s, "free") || strings.EqualFold(s, "none") || strings.EqualFold(s, "null") {
			return 0
		}
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0
		}
		if f >= 1000 && float64(int64(f)) == f {
			f /= 100
		}
		if f < 0 {
			return 0
		}
		return math.Round(f*100) / 100
	case float64:
		f := t
		if f >= 1000 && float64(int64(f)) == f {
			f /= 100
		}
		if f < 0 {
			return 0
		}
		return math.Round(f*100) / 100
	case int:
		return normalizePrice(float64(t))
	case int64:
		return normalizePrice(float64(t))
	default:
		return 0
	}
}

func cleanName(s string) string {
	s = strings.TrimSpace(s)
	s = strings.NewReplacer("\n", " ", "\r", " ", "\t", " ").Replace(s)
	s = unsafeNameRe.ReplaceAllString(s, "")
	s = strings.Join(strings.Fields(s), " ")
	return s
}

var unsafeNameRe = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]+`)

func extFormat(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	p := raw
	if err == nil {
		p = u.Path
	}
	ext := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(pathExt(p))), ".")
	if ext == "m3u8" || strings.Contains(strings.ToLower(raw), ".m3u8") {
		return "m3u8"
	}
	if ext == "flv" {
		return "flv"
	}
	if ext == "pdf" || ext == "ppt" || ext == "doc" || ext == "docx" || ext == "pptx" || ext == "xls" || ext == "xlsx" {
		return ext
	}
	return "mp4"
}

func pathExt(p string) string {
	i := strings.LastIndex(p, ".")
	if i < 0 {
		return ""
	}
	return p[i:]
}

func normalizeMediaURL(raw string) string {
	s := strings.TrimSpace(raw)
	if strings.HasPrefix(s, "//") {
		s = "https:" + s
	}
	if strings.HasPrefix(strings.ToLower(s), "bjcloudvod://") {
		return decodeBjcloudvod(s)
	}
	if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") {
		low := strings.ToLower(s)
		if strings.Contains(low, ".mp4") || strings.Contains(low, ".m3u8") || strings.Contains(low, ".flv") {
			return s
		}
	}
	return ""
}

func decodeBjcloudvod(encoded string) string {
	const prefix = "bjcloudvod://"
	if !strings.HasPrefix(encoded, prefix) {
		return ""
	}
	payload := strings.TrimPrefix(encoded, prefix)
	payload = strings.NewReplacer("-", "+", "_", "/").Replace(payload)
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil || len(decoded) == 0 {
		return ""
	}
	shift := int(decoded[0] % 8)
	decoded = decoded[1:]
	out := make([]byte, len(decoded))
	for i, b := range decoded {
		out[i] = b ^ byte((shift+i)%8)
	}
	return string(out)
}

func walkStrings(v any) []string {
	var out []string
	var walk func(any)
	walk = func(x any) {
		switch t := x.(type) {
		case string:
			out = append(out, t)
		case map[string]any:
			for _, child := range t {
				walk(child)
			}
		case []any:
			for _, child := range t {
				walk(child)
			}
		}
	}
	walk(v)
	return out
}

func uniqueStrings(vals []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(vals))
	for _, v := range vals {
		v = strings.TrimSpace(v)
		if v == "" {
			continue
		}
		k := strings.ToLower(v)
		if seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, v)
	}
	return out
}

func listAt(m map[string]any, key string) []map[string]any { return listMaps(m[key]) }

func gatherRows(v any, keys []string) []map[string]any {
	var out []map[string]any
	if m, ok := v.(map[string]any); ok {
		for _, k := range keys {
			if rows := listMaps(m[k]); len(rows) > 0 {
				out = append(out, rows...)
			}
		}
	}
	return out
}
