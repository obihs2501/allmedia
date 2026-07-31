package huke88

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"
)

func (x *huke88Ctx) collectSources() ([]hukeSource, error) {
	info, err := x.getVideoPlayInfo(x.cid)
	if err != nil {
		return nil, err
	}
	if x.title == "" {
		x.title = cleanTitle(firstNonEmpty(str(info["catalogHeaderTitle"]), x.cid))
	}
	videos := x.parseCatalog(listMaps(info["catalog"]))
	if len(videos) == 0 {
		videos = []hukeSource{x.parseVideoInfo(x.cid, x.title, []int{1, 1}, info)}
		x.courseIDs = []string{x.cid}
	}

	var out []hukeSource
	for _, video := range videos {
		play, err := x.getVideoPlayInfo(video.ID)
		if err != nil {
			return nil, err
		}
		if u := normalizeURL(str(play["video_url"])); u != "" {
			video.URL = u
			video.Format = mediaFormat(u, "mp4")
			video.Raw = play
			out = append(out, video)
		}
	}
	for _, file := range x.parseFileInfos(x.courseIDs) {
		u, err := x.getFileURL(file)
		if err != nil || u == "" || isInvalidFileURL(u) {
			continue
		}
		file.URL = quoteHuke88URL(u)
		file.Format = fileFormatFromURL(u, firstNonEmpty(file.Format, "zip"))
		out = append(out, file)
	}
	if len(out) == 0 {
		msg := str(info["msg"])
		if msg != "" {
			return nil, fmt.Errorf("huke88: no playable URL: %s", msg)
		}
		return nil, fmt.Errorf("huke88: no playable video or file URL")
	}
	return out, nil
}

func (x *huke88Ctx) getCoursePage(courseID string) (string, error) {
	if courseID == "" {
		return "", fmt.Errorf("huke88: empty course id")
	}
	u := fmt.Sprintf(course_url, courseID)
	body, err := x.c.GetString(u, x.htmlHeader(u))
	if err != nil {
		return "", fmt.Errorf("course page unavailable: %w", err)
	}
	return body, nil
}

func (x *huke88Ctx) getCurrentUID() (string, error) {
	body, err := x.c.GetString(referer, x.htmlHeader(referer))
	if err != nil {
		return "", err
	}
	x.uid = extractParam(body, "uid", x.uid)
	return x.uid, nil
}

func (x *huke88Ctx) courseList() ([]courseRef, error) {
	uid := x.uid
	if uid == "" {
		var err error
		uid, err = x.getCurrentUID()
		if err != nil {
			return nil, err
		}
	}
	if uid == "" {
		return nil, fmt.Errorf("huke88: cannot extract current uid")
	}
	seen := map[string]bool{}
	var out []courseRef
	for page := 1; page <= 5; page++ {
		u := fmt.Sprintf(purchased_study_url, uid, fmt.Sprint(page))
		body, err := x.c.GetString(u, x.htmlHeader(u))
		if err != nil {
			return nil, err
		}
		items := parseStudyCourses(body)
		added := 0
		for _, item := range items {
			if item.ID == "" || seen[item.ID] {
				continue
			}
			seen[item.ID] = true
			out = append(out, item)
			added++
		}
		if added == 0 || !strings.Contains(body, "下一页") {
			break
		}
	}
	return out, nil
}

func (x *huke88Ctx) getVideoPlayInfo(courseID string) (map[string]any, error) {
	courseID = strings.TrimSpace(courseID)
	if courseID == "" {
		return nil, fmt.Errorf("huke88: empty video id")
	}
	if cached := x.videoCache[courseID]; cached != nil {
		return cached, nil
	}
	page := x.coursePageText
	if courseID != x.cid || page == "" {
		var err error
		page, err = x.getCoursePage(courseID)
		if err != nil {
			return nil, err
		}
	}
	csrf := extractCSRF(page, x.cookie)
	if csrf != "" {
		x.csrf = csrf
	}
	if x.csrf == "" {
		return nil, fmt.Errorf("huke88: missing csrf-token")
	}
	form := map[string]string{
		"_csrf-frontend": x.csrf,
		"isSeries":       extractParam(page, "isSeries", "0"),
		"isFreeLimit":    extractParam(page, "isFreeLimit", "0"),
		"async":          "false",
		"confirm":        "0",
		"studySourceId":  extractParam(page, "studySourceId", "1"),
		"exposure":       extractParam(page, "exposure", "0"),
		"id":             courseID,
	}
	root, err := x.postFormJSON(video_play_url, form, x.apiHeader(fmt.Sprintf(course_url, courseID)))
	if err != nil {
		return nil, fmt.Errorf("huke88 video-play request failed: %w", err)
	}
	if intValue(root["confirm"]) == 1 && !intIn(intValue(root["code"]), 1, 2, 3, 4, 6, 80, 99) {
		form["confirm"] = "1"
		if again, err := x.postFormJSON(video_play_url, form, x.apiHeader(fmt.Sprintf(course_url, courseID))); err == nil && again != nil {
			root = again
		}
	}
	x.videoCache[courseID] = root
	return root, nil
}

func (x *huke88Ctx) getFileURL(file hukeSource) (string, error) {
	if file.ID == "" || file.FileType == "" {
		return "", nil
	}
	page := x.coursePageText
	if file.ID != x.cid || page == "" {
		var err error
		page, err = x.getCoursePage(file.ID)
		if err != nil {
			return "", err
		}
	}
	csrf := extractCSRF(page, x.cookie)
	if csrf != "" {
		x.csrf = csrf
	}
	if x.csrf == "" {
		return "", nil
	}
	form := map[string]string{
		"_csrf-frontend": x.csrf,
		"confirm":        "0",
		"studySourceId":  extractParam(page, "studySourceId", "1"),
		"type":           file.FileType,
		"id":             file.ID,
	}
	root, err := x.postFormJSON(file_url, form, x.apiHeader(fmt.Sprintf(course_url, file.ID)))
	if err != nil {
		return "", err
	}
	if intValue(root["confirm"]) == 1 && str(root["download_url"]) != "" {
		form["confirm"] = "1"
		if again, err := x.postFormJSON(file_url, form, x.apiHeader(fmt.Sprintf(course_url, file.ID))); err == nil && again != nil {
			root = again
		}
	}
	return normalizeURL(str(root["download_url"])), nil
}

func (x *huke88Ctx) postFormJSON(endpoint string, form map[string]string, headers map[string]string) (map[string]any, error) {
	body, err := x.c.PostForm(endpoint, form, headers)
	if err != nil {
		return nil, err
	}
	var root map[string]any
	if err := json.Unmarshal([]byte(body), &root); err != nil {
		return nil, err
	}
	return root, nil
}

func (x *huke88Ctx) parseCatalog(catalog []map[string]any) []hukeSource {
	x.courseIDs = nil
	var out []hukeSource
	for i, item := range catalog {
		courseID := firstNonEmpty(str(item["courseId"]), str(item["id"]))
		title := firstNonEmpty(str(item["courseTitle"]), str(item["title"]), courseID)
		if courseID == "" {
			continue
		}
		x.courseIDs = append(x.courseIDs, courseID)
		out = append(out, x.parseVideoInfo(courseID, title, []int{1, i + 1}, item))
	}
	return out
}

func (x *huke88Ctx) parseVideoInfo(courseID, title string, index []int, raw map[string]any) hukeSource {
	if title == "" {
		title = courseID
	}
	name := cleanName(fmt.Sprintf("[%s]--%s", formatIndex(index), title))
	x.videoTitles[courseID] = stripVideoIndex(name)
	return hukeSource{Kind: "video", ID: courseID, Name: name, Format: "mp4", Raw: raw}
}

func (x *huke88Ctx) parseFileInfos(courseIDs []string) []hukeSource {
	if len(courseIDs) == 0 {
		courseIDs = []string{x.cid}
	}
	var out []hukeSource
	for i, courseID := range courseIDs {
		title := firstNonEmpty(x.videoTitles[courseID], courseID)
		for _, pair := range []struct{ typ, label string }{{"1", "源文件"}, {"2", "素材文件"}} {
			name := cleanName(fmt.Sprintf("(1.%d.%s)--%s--%s", i+1, pair.typ, title, pair.label))
			out = append(out, hukeSource{Kind: "file", ID: courseID, Name: name, Format: "zip", FileType: pair.typ})
		}
	}
	return out
}

func parseStudyCourses(text string) []courseRef {
	seen := map[string]bool{}
	var out []courseRef
	matches := regexp.MustCompile(`(?is)<a\b[^>]+href=["']([^"']*(?:/course/\d+\.html|/career/video/\d+-\d+\.html)[^"']*)["'][^>]*>`).FindAllStringSubmatchIndex(text, -1)
	for _, m := range matches {
		href := text[m[2]:m[3]]
		id := extractCourseIDFromHref(href)
		if id == "" || seen[id] {
			continue
		}
		start, end := m[0]-700, m[1]+700
		if start < 0 {
			start = 0
		}
		if end > len(text) {
			end = len(text)
		}
		title := extractStudyCardTitle(text[start:end])
		seen[id] = true
		out = append(out, courseRef{ID: id, Title: title})
	}
	return out
}

func extractCourseIDFromHref(href string) string {
	if m := courseURLRe.FindStringSubmatch(href); len(m) > 1 {
		return m[1]
	}
	if m := careerURLRe.FindStringSubmatch(href); len(m) > 1 {
		return m[1]
	}
	return ""
}

func extractStudyCardTitle(card string) string {
	for _, re := range []*regexp.Regexp{
		regexp.MustCompile(`(?is)<[^>]+class=["'][^"']*class-name[^"']*["'][^>]*>\s*<a[^>]*>(.*?)</a>`),
		regexp.MustCompile(`(?is)<[^>]+class=["'][^"']*class-name[^"']*["'][^>]*>(.*?)</[^>]+>`),
		regexp.MustCompile(`(?is)<input[^>]+class=["'][^"']*cert-name[^"']*["'][^>]+value=["']([^"']+)`),
		regexp.MustCompile(`(?is)<img[^>]+alt=["']([^"']+)`),
	} {
		if m := re.FindStringSubmatch(card); len(m) > 1 {
			if title := cleanStudyCourseTitle(m[1]); title != "" {
				return title
			}
		}
	}
	return cleanStudyCourseTitle(stripTags(card))
}

func cleanStudyCourseTitle(title string) string {
	title = html.UnescapeString(stripTags(title))
	title = regexp.MustCompile(`\s+`).ReplaceAllString(title, " ")
	title = regexp.MustCompile(`\s*(继续学习|取消学习|学习进度\d+%|已学\d+节|共\d+节课教程|主课程\d+节|练习题\d+节)\s*`).ReplaceAllString(title, " ")
	title = strings.Trim(regexp.MustCompile(`\s+`).ReplaceAllString(title, " "), " -_｜|")
	if title == "继续学习" || title == "取消学习" || regexp.MustCompile(`^\d{4}/\d{2}/\d{2}\s*已学\s*继续学习$`).MatchString(title) {
		return ""
	}
	return title
}
