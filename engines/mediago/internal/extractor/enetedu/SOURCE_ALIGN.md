# enetedu 源码对齐对照

## URL 常量

| .cdc.py 行 | enetedu.go 行/名 | 一致? |
|---|---|---|
| Enetedu_Base.py:32-36 `origin`, `referer`, `login_url`, `api_base`, `token_key` | same constants | ✓ |
| Enetedu_Course.py:29 `detail_path = '/course/broadcast/glanceAndGet'` | `detail_path` | ✓ |
| Enetedu_Course.py:30-31 task tree/node paths | `task_tree_path`, `task_node_path` | ✓ |
| Enetedu_Course.py:32-35 file/learning/transcode/playback paths | `course_file_path`, `learning_tree_path`, `transcode_path`, `playback_deal_path` | ✓ |
| Enetedu_Course.py:695 sample liveCourseDetails URL | `url0` | ✓ |

## HTTP 调用

| 源码方法 | Go 函数 | method | 一致? |
|---|---|---|---|
| `_get_title` line 100 | `Extract` | GET `glanceAndGet?id=` | ✓ |
| `_parse_live_tasks` line 269 | `parseLiveTasks` | GET `task/homeView` | ✓ |
| `_parse_learning_tree` line 343 | `parseLearningTree` | GET `learningCourseTreeList` | ✓ |
| `_resolve_node_url` line 415 | `resolveNodeURL` | GET `task/node/get` | ✓ |
| `_resolve_learning_url` line 441 | `resolveLearningURL` | POST `getMediaTranscodeInfo` | ✓ |
| `playback_deal_path` | `dealPlaybackURL` | POST | ✓ |

## JSON 字段映射

| 源码 key 链 | Go 映射 | 一致? |
|---|---|---|
| `data.courseId`, `courseName/name/title` | `dataOf`, `valueString` | ✓ |
| live task `name/title/realId/id`, `playbackUrl/url/sourceAddress` | `walkLivePayload` | ✓ |
| learning tree `fileName/mediaName/chapterName`, `videoId/mediaId`, `filePath/playUrl/url` | `walkLearningPayload` | ✓ |
| transcode `transcodeOutputs/list[].playUrl/url/filePath` | `findMediaURL` recursive parse | ✓ |
| token header `eneteduToken` / `Authorization` | `requestHeaders` | ✓ |

## 阻塞步骤

无. 无法通过任务节点或转码接口解析媒体 URL 时返回明确错误, 不返回空 Streams.
