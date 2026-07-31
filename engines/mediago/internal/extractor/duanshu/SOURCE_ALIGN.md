# duanshu 源码对齐对照

## URL 常量

| .cdc.py 行 | duanshu.go 行/名 | 一致? |
|---|---|---|
| Duanshu_Base.py:33 `referer = 'https://h5.duanshu.com'` | `referer` | ✓ |
| Duanshu_Base.py:35-36 user/shop APIs | `user_detail_url`, `shop_identifier_url` | ✓ |
| Duanshu_Base.py:37 `content_detail_url = 'https://api.duanshu.com/h5/content/detail/{content_id}'` | `content_detail_url` with `%s` | ✓ |
| Duanshu_Base.py:38-40 column/course detail APIs | `column_detail_url`, `column_contents_url`, `course_detail_url` | ✓ |
| Duanshu_Base.py:41-44 chapters/class/play_info/user_column APIs | `course_chapters_url`, `class_detail_url`, `video_play_info_url`, `user_column_url` | ✓ |

## HTTP 调用

| 源码方法 | Go 函数 | method | 一致? |
|---|---|---|---|
| `_verify_login` line 400 | `Extract` | GET `/h5/user/detail` | ✓ |
| `_prepare_single` line 702 | `resolveSingle` | GET content detail | ✓ |
| `_prepare_column` line 772 | `resolveColumn` / `fetchColumnItems` | GET detail + contents | ✓ |
| `_prepare_course` line 851 | `resolveCourse` | GET course detail + chapters | ✓ |
| `_get_class_resource` line 661 | `resolveClass` | GET class detail | ✓ |
| play info fallback | `resolveVideoPlayInfo` | GET video play info | ✓ |

## JSON 字段映射

| 源码 key 链 | Go 映射 | 一致? |
|---|---|---|
| `response.data.title` | `pickTitle` | ✓ |
| `play_data` / `audio_data` / `content` | `findMediaURL` recursive keys | ✓ |
| `video_path`, `video_url`, `url` | `findMediaURL` media keys | ✓ |
| `response.content_list/list/items/data[]` | `collectContentItems` | ✓ |
| course chapters `class_id`, `id`, `title`, `name` | `collectClassItems` | ✓ |
| cookie headers `x-member`, `x-shop`, `referer` | `duanshuHeaders` | ✓ |

## 阻塞步骤

无. 没有解析到视频/音频 URL 时返回明确错误, 不返回空 Streams.
