# Jianshe99 源码对齐

## URL 常量

| .cdc.py 行 | jianshe99.go 行/名 | 一致? |
|---|---|---|
| `Jianshe99_Config.pyc.1shot.cdc.py:37-43` `MEMBER_HOME_URL`, `ELEARNING_HOME_URL`, `DOORMAN_BASE_URL`, `MATERIALS_URL`, `MATERIAL_DOWNLOAD_URL` | `jianshe99.go:17-21` | ✓ |
| `Jianshe99_Course.pyc.1shot.cdc.py:33-42` `course_group_path`, `course_detail_path`, `course_subject_path`, `live_replay_*`, `cc_replay_*` | `jianshe99.go:23-31` | ✓ |
| `Jianshe99_Course.pyc.1shot.cdc.py:485` videoList URL | `jianshe99.go:31` `video_list_url` | ✓ |

## HTTP 调用

| 源码方法 | Go 函数 | method | 一致? |
|---|---|---|---|
| `_parse_video_tree` (`all_decrypted.json: Courses/Jianshe99/Jianshe99_Course__t310__parse_video_tree.pyc`) | `Extract` / `parseLessons` (`jianshe99.go:71-80`, `103-125`) | GET | ✓ |
| `_resolve_live_replay_payload` line 484 | `fetchReplayPayload` (`jianshe99.go:194-210`) | GET | ✓ |
| `_login_live_replay_cc` line 505, `_get_live_replay_context` line 589 | `shared.CssLcloudResolvePlayInfo` call (`jianshe99.go:139`) | POST + GET | ✓ |
| `_prepare_live_replay_m3u8_text` line 710 | `CssLcloudRewriteM3U8Keys` call (`jianshe99.go:145-150`) | GET | ✓ |

## JSON 字段映射

| 源码 key 链 | Go struct tag / helper | 一致? |
|---|---|---|
| `data.replay` / `data.vod` / `replay` / `vod` | `replayInfoResponse` (`jianshe99.go:169-177`) | ✓ |
| `liveRoomId`, `liveId`, `roomid`, `accessid`, `accesskey`, `recordId`, `recordid`, `userid`, `uid`, `viewername`, `viewertoken`, `token` | `replayPayload` tags (`jianshe99.go:179-191`) | ✓ |
| csslcloud `datas.sessionId`, `data.vod_info.video`, `data.vod_info.audio` | `shared.CssLcloudResolvePlayInfo` | ✓ |

## 阻塞步骤

无。
