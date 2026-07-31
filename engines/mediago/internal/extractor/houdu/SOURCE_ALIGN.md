# houdu 源码对齐对照

## URL 常量

| .cdc.py 行 | Go 行/名 | 一致? |
|---|---|---|
| `Houdu_Config.pyc.1shot.cdc.py:27 USER_AGENT = 'Mozilla/5.0 ... Chrome/120.0.0.0 ...'` | `houdu.go:34 USER_AGENT` | ✓ |
| `Houdu_Config.pyc.1shot.cdc.py:29-34 HOUDU_HEADERS` | `newCtx` / `houdu.go:111-126 headers` | ✓ |
| `Houdu_Base.pyc.1shot.cdc.py:35 referer = 'https://s.houduweilai.com/'` | `houdu.go:29 referer` | ✓ |
| `Houdu_Base.pyc.1shot.cdc.py:36 token_key = 'user-token'` | `houdu.go:30 token_key` | ✓ |
| `Houdu_Base.pyc.1shot.cdc.py:37 user_info_key = 'user-info'` | `houdu.go:31 user_info_key` | ✓ |
| `Houdu_Base.pyc.1shot.cdc.py:38 check_url = 'https://api.houduweilai.com/mini/student/othersStudents'` | `houdu.go:32 check_url` | ✓ |
| `Houdu_Course.pyc.1shot.cdc.py:68 request_json('https://api.houduweilai.com{}'.format(path), ...)` | `houdu.go:33 api_url_format` | ✓ |

## 认证与 Cookie

| 源码方法 (line) | Go 函数 (line) | 一致? |
|---|---|---|
| `Houdu_Base._parse_saved_auth` line 94 | `newCtx` line 95 + `parseCookieHeader` | ✓ |
| `Houdu_Base._gen_trace_id` line 214 | `genTraceID` line 185 | ✓ |
| `Houdu_Base._gen_sign` line 232 | `genSign` line 196 | ✓ |
| `Houdu_Base._check_cookie` line 274 | `checkCookie` line 130 | ✓ |
| `Houdu_Course._request_houdu` line 54 | `requestHoudu` line 145 + `postJSON` line 161 | ✓ |

## HTTP 调用

| 源码方法 (line) | Go 函数 (line) | method | 一致? |
|---|---|---|---|
| `Houdu_Course._collect_package_courses` line 555 | `collectPackageCourses` line 82 | POST JSON | ✓ |
| `Houdu_Course._collect_class_courses` line 591 | `collectClassCourses` line 114 | POST JSON | ✓ |
| `Houdu_Course._get_course_list` line 622 | `getCourseList` line 63 | POST JSON aggregate | ✓ |
| `Houdu_Course._load_course_detail` line 642 | `loadCourseDetail` line 197 | POST JSON | ✓ |
| `Houdu_Course._get_infos` line 841 | `loadSources` line 8 + `lessonList` line 24 | POST JSON | ✓ |
| `Houdu_Course._get_class_lesson_list` line 656 | `getClassLessonList` line 46 | POST JSON paged | ✓ |
| `Houdu_Course._get_play_url_for_mode` line 770 | `getPlayURLForMode` line 11 | POST JSON | ✓ |
| `Houdu_Course._extract_play_url` line 482 | `extractPlayURL` line 49 | JSON parse + string walk | ✓ |
| `Houdu_Course._get_best_video_url` line 462 | `bestVideoURL` line 142 | JSON parse | ✓ |
| `Houdu_Course._append_mini_token` line 496 | `appendMiniToken` line 131 | URL mutate | ✓ |
| `Houdu_Course._build_play_stub_url` line 502 | `buildPlayStubURL` line 118 | URL build | ✓ |
| `Houdu_Course._resolve_baijiayun_url` line 539 | `resolveBaijiayunURL` line 104 + `shared.BaijiayunResolve*` | GET JSONP | ✓ |

## JSON 字段映射

| 源码 key 链 | Go 解析 | 一致? |
|---|---|---|
| `code -> data -> list` | `checkCookie` line 130-143 | ✓ |
| `data.package_list -> package_class_list` | `collectPackageCourses` line 82-112 | ✓ |
| `data.list / data.class_list` | `collectClassCourses` line 114-141 | ✓ |
| `class_name/title/name + id/class_id/course_id + course_type/type` | `normalizeCourseInfo` line 143 | ✓ |
| `data.class_info / class_detail / info` | `loadCourseDetail` line 197-211 | ✓ |
| `data.group_list / list / lesson_list` | `lessonList` line 24-43 | ✓ |
| `lesson.id / lesson_id / title / lesson_name / name` | `makeLessonSources` line 112-127 | ✓ |
| `replay_status / replay_status_name / lesson_type` | `lessonModes` line 129-139 | ✓ |
| `url/play_url/playUrl/hls_url/hlsUrl` | `extractPlayURL` line 49-68 | ✓ |
| `play_info -> 1080p/superHD/720p/high/480p/standard -> cdn_list -> enc_url/url` | `bestVideoURL` line 142-173 | ✓ |
| `token + video_id/vid/live_id` | `buildPlayStubURL` line 118-129 / `shared.BaijiayunResolveVOD` | ✓ |
| `token + room_id/roomid/classid/class_id` | `buildPlayStubURL` line 118-129 / `shared.BaijiayunResolvePlayback` | ✓ |
| `file_list/files/material_list/materials/resource_list/resources/download_list/downloads` | `extractSourceInfo` line 11-37 | ✓ |
| `url/download_url/file_url/path + suffix/ext/extension/format/file_format` | `makeFileSource` line 39-52 | ✓ |

## 阻塞步骤

无。百家云 VOD/回放解析按仓库规则委托 `internal/extractor/shared/baijiayun.go`。
