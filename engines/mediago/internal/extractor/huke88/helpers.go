package huke88

import (
	"encoding/json"
	"fmt"
	"html"
	"math"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
)

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

func (x *huke88Ctx) htmlHeader(ref string) map[string]string {
	h := copyHeaders(x.headers)
	if ref == "" {
		ref = referer
	}
	h["Referer"] = ref
	h["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
	delete(h, "X-Requested-With")
	delete(h, "Origin")
	delete(h, "cookie")
	return h
}

func (x *huke88Ctx) apiHeader(ref string) map[string]string {
	h := copyHeaders(x.headers)
	if ref == "" {
		ref = fmtCourseURL(x.cid)
	}
	h["Referer"] = ref
	h["Origin"] = "https://huke88.com"
	h["X-Requested-With"] = "XMLHttpRequest"
	h["Accept"] = "application/json, text/javascript, */*; q=0.01"
	delete(h, "cookie")
	return h
}

func copyHeaders(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func fmtCourseURL(courseID string) string { return "https://huke88.com/course/" + courseID + ".html" }

func extractTitle(text string) string {
	for _, pattern := range []string{
		`(?is)Param\.title\s*=\s*["']([^"']+)`,
		`(?is)<meta\s+property=["']og:title["']\s+content=["']([^"']+)`,
		`(?is)<title>(.*?)</title>`,
	} {
		if m := regexp.MustCompile(pattern).FindStringSubmatch(text); len(m) > 1 {
			return cleanTitle(m[1])
		}
	}
	return ""
}

func cleanTitle(s string) string {
	s = stripTags(html.UnescapeString(s))
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, " ")
	s = regexp.MustCompile(`\s*-\s*虎课网\s*$`).ReplaceAllString(s, "")
	return cleanName(s)
}

func extractParam(text, name, def string) string {
	if text == "" || name == "" {
		return def
	}
	pattern := `Param\.` + regexp.QuoteMeta(name) + `\s*=\s*["']?([^;"']+)`
	if m := regexp.MustCompile(pattern).FindStringSubmatch(text); len(m) > 1 {
		return strings.TrimSpace(html.UnescapeString(m[1]))
	}
	return def
}

func extractCSRF(text, cookie string) string {
	for _, pattern := range []string{
		`(?is)<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)`,
		`(?is)<input[^>]+name=["']csrfToken["'][^>]+value=["']([^"']+)`,
	} {
		if m := regexp.MustCompile(pattern).FindStringSubmatch(text); len(m) > 1 {
			return strings.TrimSpace(html.UnescapeString(m[1]))
		}
	}
	if m := regexp.MustCompile(`(^|;)\s*_csrf-frontend=([^;]+)`).FindStringSubmatch(cookie); len(m) > 2 {
		if decoded, err := url.QueryUnescape(m[2]); err == nil {
			return decoded
		}
		return m[2]
	}
	return ""
}

func extractPaidCourseID(text string) string {
	matches := regexp.MustCompile(`Param\.courseId\s*=\s*["']?(\d+)`).FindAllStringSubmatch(text, -1)
	for i := len(matches) - 1; i >= 0; i-- {
		if matches[i][1] != "0" {
			return matches[i][1]
		}
	}
	return ""
}

func mediaFormat(raw, def string) string {
	if strings.Contains(strings.ToLower(raw), ".m3u8") {
		return "m3u8"
	}
	return fileFormatFromURL(raw, def)
}

func fileFormatFromURL(raw, def string) string {
	u, err := url.Parse(raw)
	p := raw
	if err == nil {
		p = u.Path
	}
	ext := strings.TrimPrefix(strings.ToLower(path.Ext(p)), ".")
	if ext != "" && regexp.MustCompile(`^[a-z0-9]{1,10}$`).MatchString(ext) {
		return ext
	}
	return def
}

func isInvalidFileURL(raw string) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return true
	}
	p := strings.TrimSpace(u.Path)
	return p == "" || p == "/"
}

func quoteHuke88URL(raw string) string {
	if raw == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(raw) * 3)
	for i := 0; i < len(raw); i++ {
		c := raw[i]
		if isQuoteSafe(c) {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte("0123456789ABCDEF"[c>>4])
		b.WriteByte("0123456789ABCDEF"[c&0x0f])
	}
	return b.String()
}

func isQuoteSafe(c byte) bool {
	switch {
	case c >= 'A' && c <= 'Z':
		return true
	case c >= 'a' && c <= 'z':
		return true
	case c >= '0' && c <= '9':
		return true
	}
	switch c {
	case '-', '_', '.', '~', ':', '/', '?', '=', '&', '%':
		return true
	default:
		return false
	}
}

func normalizeURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "//") {
		return "https:" + raw
	}
	return raw
}

func cleanName(s string) string {
	s = strings.TrimSpace(s)
	s = strings.NewReplacer("\n", " ", "\r", " ", "\t", " ").Replace(s)
	s = regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]+`).ReplaceAllString(s, "")
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func stripTags(s string) string {
	s = regexp.MustCompile(`(?is)<script\b.*?</script>`).ReplaceAllString(s, " ")
	s = regexp.MustCompile(`(?is)<style\b.*?</style>`).ReplaceAllString(s, " ")
	s = regexp.MustCompile(`(?is)<[^>]+>`).ReplaceAllString(s, " ")
	return html.UnescapeString(s)
}

func stripVideoIndex(s string) string {
	return regexp.MustCompile(`^\[[\d.]+\]--`).ReplaceAllString(s, "")
}

func formatIndex(index []int) string {
	parts := make([]string, 0, len(index))
	for _, n := range index {
		parts = append(parts, strconv.Itoa(n))
	}
	return strings.Join(parts, ".")
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func str(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
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
			return "1"
		}
		return "0"
	default:
		return strings.TrimSpace(fmt.Sprint(t))
	}
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

func intValue(v any) int {
	n, _ := strconv.Atoi(str(v))
	return n
}

func intIn(n int, vals ...int) bool {
	for _, v := range vals {
		if n == v {
			return true
		}
	}
	return false
}
