package houdu

import (
	"fmt"
	"net/url"
	"strings"
)

func (x *hdCtx) prepare(rawURL string) error {
	if err := x.checkCookie(); err != nil {
		return err
	}
	x.cid = parseCourseID(rawURL)
	courses := x.getCourseList()
	if x.cid == "" && len(courses) > 0 {
		x.applyCourse(courses[0])
	} else if x.cid != "" {
		if c, ok := x.courseMap[x.cid]; ok {
			x.applyCourse(c)
		} else {
			x.applyCourse(hdCourse{CourseID: x.cid, Title: "厚读课程" + x.cid, Purchased: true})
		}
	}
	if x.cid == "" {
		return fmt.Errorf("houdu: empty course list and no class id in URL")
	}
	detail := x.loadCourseDetail()
	if len(detail) > 0 {
		x.applyDetail(detail)
	}
	if x.title == "" {
		x.title = "厚读课程" + x.cid
	}
	return nil
}

func parseCourseID(raw string) string {
	if u, err := url.Parse(strings.TrimSpace(raw)); err == nil {
		q := u.Query()
		if id := firstNonEmpty(q.Get("class_id"), q.Get("classId"), q.Get("course_id"), q.Get("courseId"), q.Get("cid"), q.Get("id")); id != "" {
			return id
		}
	}
	if m := idRe.FindStringSubmatch(raw); len(m) > 0 {
		for _, g := range m[1:] {
			if g != "" {
				return g
			}
		}
	}
	return ""
}

func (x *hdCtx) applyCourse(c hdCourse) {
	x.selectedCourse = c
	x.cid = c.CourseID
	x.title = cleanName(c.Title)
	x.courseType = c.CourseType
	x.price = c.Price
	x.purchased = c.Purchased || c.CourseID != ""
}

func (x *hdCtx) getCourseList() []hdCourse {
	if x.courseList != nil {
		return x.courseList
	}
	merged := map[string]hdCourse{}
	for _, c := range append(x.collectPackageCourses(), x.collectClassCourses()...) {
		if c.CourseID == "" {
			continue
		}
		merged[c.CourseID] = mergeCourseInfo(merged[c.CourseID], c)
	}
	x.courseMap = merged
	x.courseList = make([]hdCourse, 0, len(merged))
	for _, c := range merged {
		x.courseList = append(x.courseList, c)
	}
	return x.courseList
}

func (x *hdCtx) collectPackageCourses() []hdCourse {
	var out []hdCourse
	for page := 1; page <= 20; page++ {
		resp, err := x.requestHoudu("/mini/mini/coursePackageList", map[string]any{"cycle_type": 0, "page_size": 100, "page": page}, "phoenix")
		if err != nil {
			break
		}
		data := x.extractData(resp)
		rows := listAt(asMap(data), "package_list")
		if len(rows) == 0 {
			break
		}
		for _, pkg := range rows {
			pkgID := firstNonEmpty(str(pkg["id"]), str(pkg["package_id"]))
			children := gatherRows(pkg, []string{"package_class_list", "class_list", "classes", "course_list", "courseList", "list"})
			if len(children) == 0 {
				children = []map[string]any{pkg}
			}
			for _, child := range children {
				if c := normalizeCourseInfo(child, []string{pkgID}); c.CourseID != "" {
					out = append(out, c)
				}
			}
		}
		total := intVal(asMap(data)["total"])
		if total == 0 || page*100 >= total {
			break
		}
	}
	return out
}

func (x *hdCtx) collectClassCourses() []hdCourse {
	var out []hdCourse
	for page := 1; page <= 20; page++ {
		resp, err := x.requestHoudu("/mini/mini/classList", map[string]any{"page_size": 100, "page": page}, "phoenix")
		if err != nil {
			break
		}
		data := x.extractData(resp)
		m := asMap(data)
		rows := listAt(m, "list")
		if len(rows) == 0 {
			rows = listAt(m, "class_list")
		}
		if len(rows) == 0 {
			break
		}
		for _, row := range rows {
			if c := normalizeCourseInfo(row, nil); c.CourseID != "" {
				out = append(out, c)
			}
		}
		total := intVal(m["total"])
		if total == 0 || page*100 >= total {
			break
		}
	}
	return out
}

func normalizeCourseInfo(course map[string]any, packageIDs []string) hdCourse {
	title := cleanName(firstString(course, "class_name", "title", "name"))
	cid := firstNonEmpty(firstString(course, "id", "class_id", "course_id"))
	if cid == "" || title == "" {
		return hdCourse{}
	}
	return hdCourse{
		CourseID:    cid,
		Title:       title,
		CourseType:  firstString(course, "course_type", "type"),
		PackageList: uniqueStrings(packageIDs),
		Price:       extractPrice(course),
		Purchased:   coerceBool(firstNonEmpty(firstString(course, "is_buy"), firstString(course, "is_purchased"), firstString(course, "has_buy")), true),
		Raw:         course,
	}
}

func mergeCourseInfo(current, incoming hdCourse) hdCourse {
	if current.CourseID == "" {
		return incoming
	}
	current.PackageList = uniqueStrings(append(current.PackageList, incoming.PackageList...))
	if incoming.Title != "" {
		current.Title = incoming.Title
	}
	if incoming.CourseType != "" {
		current.CourseType = incoming.CourseType
	}
	if incoming.Price > 0 {
		current.Price = incoming.Price
	}
	if incoming.Purchased {
		current.Purchased = true
	}
	if len(incoming.Raw) > 0 {
		current.Raw = incoming.Raw
	}
	return current
}

func extractPrice(info map[string]any) float64 {
	for _, key := range PRICE_KEYS {
		if p := normalizePrice(info[key]); p > 0 {
			return p
		}
	}
	for _, key := range []string{"price_info", "priceInfo", "goods_info", "goodsInfo", "sale_info", "saleInfo"} {
		if p := extractPrice(asMap(info[key])); p > 0 {
			return p
		}
	}
	return 0
}

func (x *hdCtx) loadCourseDetail() map[string]any {
	if x.cid == "" {
		return nil
	}
	if cached, ok := x.detailCache[x.cid]; ok {
		return cached
	}
	resp, err := x.requestHoudu("/mini/mini/classDetail", map[string]any{"class_id": coerceAPIID(x.cid)}, "phoenix")
	if err != nil {
		return nil
	}
	data := asMap(x.extractData(resp))
	detail := firstMap(asMap(data["class_info"]), asMap(data["class_detail"]), asMap(data["info"]), data)
	x.detailCache[x.cid] = detail
	return detail
}

func (x *hdCtx) applyDetail(detail map[string]any) {
	if len(detail) == 0 {
		return
	}
	if ct := firstString(detail, "course_type", "type"); ct != "" {
		x.courseType = ct
	}
	if title := cleanName(firstString(detail, "class_name", "title", "name")); title != "" {
		x.title = title
	}
	if p := extractPrice(detail); p > 0 || x.price == 0 {
		x.price = p
	}
	if v := firstNonEmpty(firstString(detail, "is_buy"), firstString(detail, "is_purchased"), firstString(detail, "has_buy")); v != "" {
		x.purchased = coerceBool(v, true)
	}
	if x.price == 0 {
		x.price = DEFAULT_HIDDEN_PRICE
	}
}

func (x *hdCtx) extractData(resp map[string]any) any {
	if v, ok := resp["data"]; ok {
		switch v.(type) {
		case map[string]any, []any:
			return v
		}
	}
	return map[string]any{}
}

func firstMap(vals ...map[string]any) map[string]any {
	for _, v := range vals {
		if len(v) > 0 {
			return v
		}
	}
	return map[string]any{}
}

func coerceAPIID(value string) any {
	v := strings.TrimSpace(value)
	if v == "" {
		return ""
	}
	for _, ch := range v {
		if ch < '0' || ch > '9' {
			return v
		}
	}
	var n int64
	for _, ch := range v {
		n = n*10 + int64(ch-'0')
	}
	return n
}
