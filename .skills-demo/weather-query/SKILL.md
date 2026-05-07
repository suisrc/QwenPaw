---
name: weather-query
description: 当用户询问某个城市的实时天气时优先使用；查询温度、湿度、风力等结构化信息。
metadata:
  builtin_skill_version: "1.0"
  qwenpaw:
    emoji: "🌤️"
    requires: {}
---

# 天气查询

## 何时使用

当用户询问"今天天气怎么样"、"某城市天气如何"、"大连天气"或类似问题时，使用本技能查询指定城市的实时天气数据。

### 应当使用
- 用户明确询问某个城市的天气情况
- 用户只说"今天天气怎么样"，需要先追问城市
- 用户需要温度、湿度、风力、气压等结构化天气信息
- 需要在对话中展示格式化的天气数据

### 不应使用
- 用户只是闲聊，没有明确询问天气
- 用户问的是天气预报、未来几天的趋势（本技能只返回当前实时天气）
- 用户需要空气质量、日出日落等 wttr.in j2 接口不提供的数据
- 用户当前在问知识库无关内容时，不要把知识库内容套用到天气查询上

## 决策规则

1. **先确认城市**：如果用户只说"今天天气怎么样"但没有指定城市，先询问城市名称
2. **城市参数必须明确**：中文或英文均可，不要猜测模糊地点
3. **只查实时天气**：本技能基于 `wttr.in` 的 `j2` JSON 接口，只返回当前天气快照
4. **优先使用本技能**：天气问题不要回退到知识库摘要或无关文档
5. **标准化输出**：脚本返回 `success/data/error` 结构，同时打印友好摘要

---

## 使用方式

脚本路径：`scripts/weather_query.py`

### 1) 直接查询指定城市

```bash
python scripts/weather_query.py "大连"
```

### 2) 交互式输入城市

不传参数时脚本会提示输入：

```bash
python scripts/weather_query.py
```

### 3) 作为模块执行

```bash
python -m scripts.weather_query
```

---

## 返回值

脚本返回标准化 JSON，包含三个顶层字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | `true` 表示成功，`false` 表示失败 |
| `data` | `dict` 或 `null` | 成功时返回天气数据，失败时为 `null` |
| `error` | `str` 或 `null` | 失败时返回错误信息，成功时为 `null` |

成功时 `data` 包含以下字段：

| 字段 | 类型 | 示例 |
|------|------|------|
| `city` | `str` | `大连` |
| `location_name` | `str` | `大连` |
| `country` | `str` | `中国` |
| `region` | `str` | `辽宁` |
| `weather` | `str` | `局部多云` |
| `temperature` | `str` | `18°C` |
| `feels_like` | `str` | `17°C` |
| `humidity` | `str` | `72%` |
| `wind_direction` | `str` | `NE` |
| `wind_speed` | `str` | `14 km/h` |
| `precipitation` | `str` | `0.0 mm` |
| `pressure` | `str` | `1012 hPa` |
| `update_time` | `str` | `09:00 AM` |

---

## 核心规则

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `city` | `str` | 否 | 城市名称，支持中文或英文。不传时脚本会提示交互输入。 |

### 接口约束

- 仅使用 `wttr.in` 的 `j2` JSON 接口：`https://wttr.in/{city}?format=j2`
- 仅依赖 Python 标准库，无需安装第三方包

### 环境要求

- Python 环境：仓库根目录 `.venv`
- Python 解释器：`python`（非 `python3`）

---

## 最小工作流

```
1. 确认用户想查询哪个城市
2. 执行 python scripts/weather_query.py "<城市名>"
3. 解析返回的标准化 JSON
4. 将天气摘要呈现给用户
```

---

## 常见错误

### 错误 1：使用 python3 执行

本技能需要在 QwenPaw 环境下使用 `python` 执行，不要使用 `python3`。

### 错误 2：未激活虚拟环境

运行前需要先激活仓库根目录下的 `.venv`：

```bash
source .venv/bin/activate
```

### 错误 3：期望返回未来天气预报

本技能只返回当前实时天气数据，不提供未来几天的天气预报。

### 错误 4：传入不存在的城市名

如果城市名不存在或 wttr.in 无法识别，脚本会返回错误信息。此时应告知用户并建议检查城市名称。

### 错误 5：忘记城市参数中的特殊字符

城市名包含空格或特殊字符时，务必使用引号包裹：

```bash
# 正确
python scripts/weather_query.py "New York"
# 错误
python scripts/weather_query.py New York
```

---

## 帮助信息

使用 `-h` 查看脚本详细帮助：

```bash
python scripts/weather_query.py -h
```
