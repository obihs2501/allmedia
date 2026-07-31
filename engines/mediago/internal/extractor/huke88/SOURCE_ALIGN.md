# huke88 源码对齐对照

## URL 常量

| .cdc.py 行 | Go 行/名 | 一致? |
|---|---|---|
| Huke88_Base.py:32 `referer = 'https://huke88.com/'` | `huke88.go:14` `referer` | ✓ |
| Huke88_Base.py:33 `login_check_url = 'https://huke88.com/course/174979.html'` | `huke88.go:15` `login_check_url` | ✓ |
| Huke88_Course.py:34 `course_url = 'https://huke88.com/course/{cid}.html'` | `huke88.go:16` `course_url` with `%s` | ✓ |
| Huke88_Course.py:35 `study_url = 'https://huke88.com/person/study/{uid}.html?page={page}&per-page=30'` | `huke88.go:17` `study_url` with `%s` | ✓ |
| Huke88_Course.py:36 `purchased_study_url = 'https://huke88.com/person/study/{uid}.html?type=6&page={page}&per-page=30'` | `huke88.go:18` `purchased_study_url` with `%s` | ✓ |
| Huke88_Course.py:37 `video_play_url = 'https://asyn.huke88.com/video/video-play'` | `huke88.go:19` `video_play_url` | ✓ |
| Huke88_Course.py:38 `file_url = 'https://asyn.huke88.com/download/video-annex'` | `huke88.go:20` `file_url` | ✓ |
| Mooc_Config.py:214 Huke88 regex accepts `/course/<cid>.html`, huke88 URLs, `huke88/虎课网/虎课` | `huke88.go:24-28` `patterns`, `courseURLRe`, `careerURLRe` | ✓ |

## 认证与 Header

| 源码方法/常量 | Go 函数/行 | 一致? |
|---|---|---|
| Huke88_Base.py:47-52 default header: JSON Accept, `X-Requested-With`, Origin, Referer, Cookie | `huke88.go:94-100` | ✓ |
| Huke88_Base._check_cookie line 168: require `_identity-usernew` | `huke88.go:108-111` | ✓ |
| Huke88_Base._check_cookie line 183: GET `login_check_url` with HTML header | `huke88.go:112-115` | ✓ |
| Huke88_Base._check_cookie line 187: accept `Param.is_login=1` or `Param.uid=<digits>` | `huke88.go:116-119` | ✓ |
| Huke88_Course._html_header line 327: HTML Accept, remove `X-Requested-With` and Origin | `helpers.go:35-46` | ✓ |
| Huke88_Course._api_header line 346: Referer, Origin, `XMLHttpRequest`, JSON Accept | `helpers.go:48-59` | ✓ |
| Huke88_Course._cookie_value / normalize header cookie | `helpers.go:16-33` cookie header from jar, reused by stream headers | ✓ |

## HTTP 调用

| 源码方法 (line) | Go 函数 (line) | method | 一致? |
|---|---|---|---|
| Huke88_Course._get_course_page line 307: GET `course_url.format(cid)` | `course.go:57-67` | GET | ✓ |
| Huke88_Course._get_current_uid line 184: GET `https://huke88.com/`, parse `Param.uid` | `course.go:69-76` | GET | ✓ |
| Huke88_Course._get_course_list line 146: GET `purchased_study_url` pages 1..5 | `course.go:78-113` | GET | ✓ |
| Huke88_Course._get_video_play_info line 529: POST `video_play_url` form | `course.go:115-160`, `course.go:201-211` | POST form + JSON | ✓ |
| Huke88_Course._get_video_play_info line 576: retry with `confirm=1` when needed | `course.go:152-157` | POST form + JSON | ✓ |
| Huke88_Course._get_file_url line 749: POST `file_url` form | `course.go:162-199`, `course.go:201-211` | POST form + JSON | ✓ |
| Huke88_Course._get_file_url line 780: retry file confirm | `course.go:192-197` | POST form + JSON | ✓ |
| Huke88_Course._download_video line 707 uses `_get_video_url(video_id)` | `course.go:25-36` calls `getVideoPlayInfo(video.ID)` and reads `video_url` | POST form + JSON | ✓ |

## JSON / HTML 字段映射

| 源码 key / regex | Go parser | 一致? |
|---|---|---|
| `_get_cid` line 54 + Mooc regex `cid`; career `/career/video/<n>-<cid>.html` | `huke88.go:152-159`; `course.go:276-284` | ✓ |
| `_extract_title` line 375: `Param.title`, `og:title`, `<title>`, strip `虎课网` suffix | `helpers.go:71-89` | ✓ |
| `_extract_param` line 394: `Param.<name>` | `helpers.go:91-100` | ✓ |
| `_extract_csrf` line 409: meta csrf-token, input csrfToken, cookie `_csrf-frontend` | `helpers.go:102-118` | ✓ |
| `_extract_paid_course_id` line 429: last non-zero `Param.courseId` | `helpers.go:120-128` | ✓ |
| `_parse_study_courses` line 198: study card list | `course.go:252-273` | ✓ |
| `_extract_study_card_course_id` line 245 and `_extract_course_id_from_href` line 226 | `course.go:276-284` | ✓ |
| `_extract_study_card_title` line 283 and `_clean_study_course_title` line 263 | `course.go:286-311` | ✓ |
| `_get_video_play_info` form keys: `_csrf-frontend`, `isSeries`, `isFreeLimit`, `async`, `confirm`, `studySourceId`, `exposure`, `id` | `course.go:138-147` | ✓ |
| `_get_video_play_info` response keys: `confirm`, `code`, `msg`, `video_url`, `catalogHeaderTitle`, `catalog` | `course.go:11-54`, `course.go:152-158`, `helpers.go:290-302` | ✓ |
| `_parse_catalog` line 598: item `courseId/id`, `courseTitle/title` | `course.go:213-226` | ✓ |
| `_parse_video_info` line 636: `video_name`, `video_id`, `type=video` | `course.go:228-235` | ✓ |
| `_parse_file_infos` line 651: `file_fmt=zip`, `file_type=1/2`, `video_id`, names `源文件/素材文件` | `course.go:237-250` | ✓ |
| `_get_file_url` response `download_url` | `course.go:188-199` | ✓ |
| `_is_invalid_file_url` line 799 and `_file_fmt_from_url` line 824 | `helpers.go:137-160` | ✓ |
| `_download_one_file` line 855 `parse.quote(url, safe=':/?=&%')` | `helpers.go:162-196`, `course.go:43-44` | ✓ |

## 返回结构

| 源码行为 | Go 实现 | 一致? |
|---|---|---|
| 课程多视频列表逐个下载 | `media.go:10-25` top-level `Entries`; `course.go:25-46` builds video/file entries | ✓ |
| 视频下载支持 m3u8/mp4, 携带 Cookie | `media.go:28-51`, `helpers.go:130-148` | ✓ |
| 资料下载以 file entry 返回, 格式从 URL 或 zip 默认 | `course.go:38-46`, `media.go:32-45` | ✓ |

## 阻塞步骤

无。
