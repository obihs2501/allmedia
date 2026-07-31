# magedu 源码对齐对照

## URL 常量

| .cdc.py 行 | magedu.go 行/名 | 一致? |
|---|---|---|
| `Magedu_Base.py:33 referer = 'https://edu.magedu.com/person/home/0/course'` | `magedu.go:18 urlReferer = "https://edu.magedu.com/person/home/0/course"` | ✓ |
| `Magedu_Base.py:34 origin = 'https://edu.magedu.com'` | `magedu.go:19 urlOrigin = "https://edu.magedu.com"` | ✓ |
| `Magedu_Base.py:35 api_base = 'https://edu.magedu.com/v1/api'` | `magedu.go:20 urlAPIBase = "https://edu.magedu.com/v1/api"` | ✓ |
| `Magedu_Base.py:36 ke_api_base = api_base + '/ke'` | `magedu.go:21 urlKEAPIBase = "https://edu.magedu.com/v1/api/ke"` | ✓ |
| `Magedu_Base.py:37 market_api_base = api_base + '/market'` | `magedu.go:22 urlMarketAPIBase = "https://edu.magedu.com/v1/api/market"` | ✓ |
| `Magedu_Base.py:38 login_check_url = ke_api_base + '/user/simpleInfo'` | `magedu.go:23 urlLoginCheck = "https://edu.magedu.com/v1/api/ke/user/simpleInfo"` | ✓ |
| `Magedu_Config.py:16 USER_AGENT = 'Mozilla/5.0 ... Chrome/124.0.0.0 ...'` | `magedu.go:35 mageduUA = "Mozilla/5.0 ... Chrome/124.0.0.0 ..."` | ✓ |
| `Magedu_Course.py:29 course_list_url = '/v2/study/myList'` | `magedu.go:24 urlCourseList = "/v2/study/myList"` | ✓ |
| `Magedu_Course.py:30 detail_url = '/v2/curriculum/detail'` | `magedu.go:25 urlDetail = "/v2/curriculum/detail"` | ✓ |
| `Magedu_Course.py:31 outline_url = '/v2/curriculum/outline'` | `magedu.go:26 urlOutline = "/v2/curriculum/outline"` | ✓ |
| `Magedu_Course.py:32 old_detail_url = '/curriculum/detail'` | `magedu.go:27 urlOldDetail = "/curriculum/detail"` | ✓ |
| `Magedu_Course.py:33 old_outline_url = '/curriculum/outline'` | `magedu.go:28 urlOldOutline = "/curriculum/outline"` | ✓ |
| `Magedu_Course.py:34 material_url = '/leaningMaterial/getOne'` | `magedu.go:29 urlMaterial = "/leaningMaterial/getOne"` | ✓ |
| `Magedu_Course.py:35 play_safe_token_url = '/polyv/playsafe/token'` | `magedu.go:30 urlPlaySafeToken = "/polyv/playsafe/token"` | ✓ |

## HTTP 调用

| 源码方法 | Go 函数 | method | 一致? |
|---|---|---|---|
| `Magedu_Base._check_cookie line 370` | `mageduBuildSession line 80` | GET `login_check_url` | ✓ |
| `Magedu_Base._request_json line 266` | `mageduGetJSON line 273` | GET JSON with `token`, `Referer`, `Origin` | ✓ |
| `Magedu_Course._get_course_list line 212` | `mageduFetchCourseList line 93` | GET `/v2/study/myList` with `filter/pageSize/pageIndex` | ✓ |
| `Magedu_Course._detail_data line 278` | `mageduDetail line 120` | GET `/v2/curriculum/detail`, fallback `/curriculum/detail` | ✓ |
| `Magedu_Course._outline_data line 300` | `mageduOutline line 130` | GET `/v2/curriculum/outline`, fallback `/curriculum/outline` | ✓ |
| `Magedu_Course._get_cid line 322` | `parseMageduID line 283` | regex URL parse for `cid1/cid2/cid3` and query ids | ✓ |
| `Magedu_Course._get_infos line 570` | `mageduCollectItems line 139` | parse `outlineVOList/chapterList/sectionDetailList` | ✓ |
| `Magedu_Course._get_play_safe_token line 635` | `mageduPlaySafeToken line 262` | GET `/polyv/playsafe/token` on market API | ✓ |
| `Magedu_Course._resolve_play_source line 662` | `mageduBuildEntry line 253` | Polyv via `shared.PolyvResolveSecure` + `shared.PolyvPickBestManifest` | ✓ |

## JSON 字段映射

| 源码 key 链 | Go 解析 | 一致? |
|---|---|---|
| `_load_login_payload: gupao_edu_college_token/token` | `mageduBuildSession`, `cookieValue(... gupao_edu_college_token/token)` | ✓ |
| `_is_success/_data: code/success/data` | `mageduSuccess`, `mageduData` | ✓ |
| `_get_course_list: data.records/list/data, totalPage/pages` | `mageduCourseRecords`, `mageduFetchCourseList` | ✓ |
| `_normalize_course_item: id/curriculumId/courseId/cuId` | `mageduNormalizeCourse` | ✓ |
| `_normalize_course_item: title/name/courseName, owner/purchased/isBuy, price/expired` | `mageduNormalizeCourse` | ✓ |
| `_detail_data: curriculumId` | `mageduDetail(... map[string]string{"curriculumId": cid})` | ✓ |
| `_outline_data: curriculumId` | `mageduOutline(... map[string]string{"curriculumId": cid})` | ✓ |
| `_get_infos: outlineVOList[].sectionDetailList, chapterList[].sectionDetailList` | `mageduCollectItems`, `mageduParseSections` | ✓ |
| `_is_hidden: isHide` | `mageduHidden` | ✓ |
| `_parse_video_info: content/videoId/vid, id, videoStorageId, size` | `mageduVideoItem` | ✓ |
| `_material_files: sectionType == '2', content` | `mageduInlineFile` | ✓ |
| `_get_play_safe_token: data.token/playSafe/playSafeToken` | `mageduPlaySafeToken` | ✓ |

## 阻塞步骤

无.
