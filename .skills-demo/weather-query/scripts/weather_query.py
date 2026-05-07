from __future__ import annotations

import argparse
import json
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

BASE_URL = "https://wttr.in/{city}?format=j2"
ACCEPT_LANGUAGE = "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6"


def build_weather_url(city: str) -> str:
    return BASE_URL.format(city=quote(city.strip()))


def fetch_weather_payload(city: str) -> dict[str, Any]:
    request = Request(
        build_weather_url(city),
        headers={"Accept-Language": ACCEPT_LANGUAGE},
    )
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"无法获取城市天气：{city}") from exc

    if not isinstance(payload, dict):
        raise RuntimeError(f"天气接口返回格式异常：{city}")

    return payload


def _first_value(items: Any) -> str:
    if isinstance(items, list) and items:
        first = items[0]
        if isinstance(first, dict):
            value = first.get("value", "")
            return str(value) if value is not None else ""
    return ""


def _weather_desc(current: dict[str, Any]) -> str:
    desc = current.get("lang_zh") # weatherDesc
    if isinstance(desc, list) and desc:
        first = desc[0]
        if isinstance(first, dict):
            return str(first.get("value", ""))
    return ""


def standardize_weather_payload(payload: dict[str, Any], city: str) -> dict[str, Any]:
    nearest_area = payload.get("nearest_area") or []
    current_condition = payload.get("current_condition") or []

    area = nearest_area[0] if isinstance(nearest_area, list) and nearest_area else {}
    current = current_condition[0] if isinstance(current_condition, list) and current_condition else {}
    if not isinstance(area, dict):
        area = {}
    if not isinstance(current, dict):
        current = {}

    data = {
        "city": city,
        "location_name": _first_value(area.get("areaName")),
        "country": _first_value(area.get("country")),
        "region": _first_value(area.get("region")),
        "weather": _weather_desc(current),
        "temperature": f"{current.get('temp_C', '')}°C" if current.get("temp_C") not in (None, "") else "",
        "feels_like": f"{current.get('FeelsLikeC', '')}°C" if current.get("FeelsLikeC") not in (None, "") else "",
        "humidity": f"{current.get('humidity', '')}%" if current.get("humidity") not in (None, "") else "",
        "wind_direction": str(current.get("winddir16Point", "") or ""),
        "wind_speed": f"{current.get('windspeedKmph', '')} km/h" if current.get("windspeedKmph") not in (None, "") else "",
        "precipitation": f"{current.get('precipMM', '')} mm" if current.get("precipMM") not in (None, "") else "",
        "pressure": f"{current.get('pressure', '')} hPa" if current.get("pressure") not in (None, "") else "",
        "update_time": str(current.get("localObsDateTime", "") or ""),
    }

    return {
        "success": True,
        "data": data,
        "raw": payload,
    }


def query_weather(city: str) -> dict[str, Any]:
    payload = fetch_weather_payload(city)
    return standardize_weather_payload(payload, city)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query weather for a city via wttr.in")
    parser.add_argument("city", nargs="?", help="城市名称，支持中文或英文")
    return parser.parse_args(argv)


def print_result(result: dict[str, Any]) -> None:
    if result.get("success") is True:
        data = result.get("data") or {}
        print("\n" + "=" * 20)
        print(f"📍 {data.get('city', '')} 实时天气")
        print("=" * 20)
        print(f"☁️  天气：{data.get('weather', '')}")
        print(f"🌡️  温度：{data.get('temperature', '')}（体感 {data.get('feels_like', '')}）")
        print(f"💧 湿度：{data.get('humidity', '')}")
        print(f"💨 风力：{data.get('wind_direction', '')} {data.get('wind_speed', '')}")
        print(f"🌧️  降水：{data.get('precipitation', '')}")
        print(f"🔬 气压：{data.get('pressure', '')}")
        print(f"⏰ 更新时间：{data.get('update_time', '')}")
        return

    error = result.get("error") or "未知错误"
    print(str(error), file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    city = (args.city or input("请输入城市名称: ")).strip()
    if not city:
        print("错误：城市名称不能为空", file=sys.stderr)
        return 1

    try:
        result = query_weather(city)
    except RuntimeError as exc:
        result = {"success": False, "error": str(exc), "data": None}

    print_result(result)
    return 0 if result.get("success") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())