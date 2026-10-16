from __future__ import annotations

import json
import threading
from copy import deepcopy
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data.json"
DATA_LOCK = threading.Lock()

app = Flask(__name__, static_folder=None)

DEFAULT_DATA: dict[str, list[dict[str, Any]]] = {'students': [{'id': 1,
               'name': 'Студент 1',
               'birthDate': '',
               'phone': '',
               'email': '',
               'regDate': '2026-09-01'},
              {'id': 2,
               'name': 'Студент 2',
               'birthDate': '',
               'phone': '',
               'email': '',
               'regDate': '2026-09-02'},
              {'id': 3,
               'name': 'Студент 3',
               'birthDate': '',
               'phone': '',
               'email': '',
               'regDate': '2026-09-03'}],
 'teachers': [{'id': 1,
               'name': 'Ченцов А.М.',
               'spec': 'Веб-разработка, архитектура информационных систем',
               'phone': '',
               'email': '',
               'exp': '12 лет'},
              {'id': 2,
               'name': 'Михайлов С.В.',
               'spec': 'Базы данных (SQL, NoSQL), серверное ПО',
               'phone': '',
               'email': '',
               'exp': '8 лет'}],
 'courses': [{'id': 1,
              'name': 'Разработка информационных ресурсов',
              'desc': 'Проектирование и создание масштабируемых веб-приложений с использованием '
                      'программных платформ.',
              'duration': '72 ак. часа',
              'price': 34000,
              'teacherId': 1},
             {'id': 2,
              'name': 'Проектирование и администрирование баз данных',
              'desc': 'Реляционные модели, проектирование таблиц, написание сложных запросов и '
                      'индексов.',
              'duration': '54 ак. часа',
              'price': 28000,
              'teacherId': 2},
             {'id': 3,
              'name': 'Frontend: JavaScript & TypeScript',
              'desc': 'Современные скриптовые языки, реактивные паттерны, архитектура '
                      'веб-интерфейсов.',
              'duration': '80 ак. часов',
              'price': 39000,
              'teacherId': 1}],
 'groups': [{'id': 1,
             'name': 'ВТ-1-24',
             'courseId': 1,
             'teacherId': 1,
             'startDate': '2026-09-01',
             'endDate': '2026-12-25'},
            {'id': 2,
             'name': 'БД-2-24',
             'courseId': 2,
             'teacherId': 2,
             'startDate': '2026-10-01',
             'endDate': '2026-12-30'}],
 'enrollments': [{'id': 1, 'studentId': 1, 'groupId': 1, 'enrollDate': '2026-09-01'},
                 {'id': 2, 'studentId': 2, 'groupId': 1, 'enrollDate': '2026-09-02'},
                 {'id': 3, 'studentId': 3, 'groupId': 2, 'enrollDate': '2026-09-03'}],
 'schedules': [{'id': 1,
                'date': '2026-10-06',
                'startTime': '09:00',
                'endTime': '10:30',
                'groupId': 1,
                'teacherId': 1,
                'room': 'Ауд. 302 (Лаборатория веб-разработки)'},
               {'id': 2,
                'date': '2026-10-06',
                'startTime': '10:40',
                'endTime': '12:10',
                'groupId': 1,
                'teacherId': 1,
                'room': 'Ауд. 302 (Лаборатория веб-разработки)'},
               {'id': 3,
                'date': '2026-10-07',
                'startTime': '13:00',
                'endTime': '14:30',
                'groupId': 2,
                'teacherId': 2,
                'room': 'Ауд. 214 (Серверный класс)'}],
 'feedback': []}

ENTITIES = tuple(DEFAULT_DATA.keys())


def write_data(data: dict[str, Any]) -> None:
    temporary_file = DATA_FILE.with_suffix(".json.tmp")
    temporary_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_file.replace(DATA_FILE)


def read_data() -> dict[str, Any]:
    with DATA_LOCK:
        if not DATA_FILE.exists():
            write_data(deepcopy(DEFAULT_DATA))
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = deepcopy(DEFAULT_DATA)
            write_data(data)

        for entity in ENTITIES:
            data.setdefault(entity, [])
        return data


def save_data(data: dict[str, Any]) -> None:
    with DATA_LOCK:
        write_data(data)


def get_json_object() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Тело запроса должно быть объектом JSON")
    return payload


def next_id(records: list[dict[str, Any]]) -> int:
    return max((int(item.get("id", 0)) for item in records), default=0) + 1


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Ресурс не найден"}), 404
    return send_from_directory(BASE_DIR, "index.html")


@app.errorhandler(405)
def method_not_allowed(_error):
    return jsonify({"error": "Метод запроса не поддерживается"}), 405


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    return send_from_directory(BASE_DIR, filename)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "DevSphere API"})


@app.get("/api/data")
def get_all_data():
    return jsonify(read_data())


@app.put("/api/data")
def replace_all_data():
    try:
        payload = get_json_object()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    for entity in ENTITIES:
        if entity not in payload:
            payload[entity] = []
        if not isinstance(payload[entity], list):
            return jsonify({"error": f"Поле {entity} должно быть массивом"}), 400

    save_data(payload)
    return jsonify(payload)


@app.post("/api/reset")
def reset_data():
    data = deepcopy(DEFAULT_DATA)
    save_data(data)
    return jsonify(data)


@app.get("/api/<entity>")
def list_records(entity: str):
    if entity not in ENTITIES:
        return jsonify({"error": "Неизвестная сущность"}), 404
    return jsonify(read_data()[entity])


@app.post("/api/<entity>")
def create_record(entity: str):
    if entity not in ENTITIES:
        return jsonify({"error": "Неизвестная сущность"}), 404
    try:
        payload = get_json_object()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    data = read_data()
    payload["id"] = next_id(data[entity])
    data[entity].append(payload)
    save_data(data)
    return jsonify(payload), 201


@app.get("/api/<entity>/<int:record_id>")
def get_record(entity: str, record_id: int):
    if entity not in ENTITIES:
        return jsonify({"error": "Неизвестная сущность"}), 404
    record = next((item for item in read_data()[entity] if item.get("id") == record_id), None)
    if record is None:
        return jsonify({"error": "Запись не найдена"}), 404
    return jsonify(record)


@app.put("/api/<entity>/<int:record_id>")
def update_record(entity: str, record_id: int):
    if entity not in ENTITIES:
        return jsonify({"error": "Неизвестная сущность"}), 404
    try:
        payload = get_json_object()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    data = read_data()
    for index, item in enumerate(data[entity]):
        if item.get("id") == record_id:
            payload["id"] = record_id
            data[entity][index] = payload
            save_data(data)
            return jsonify(payload)
    return jsonify({"error": "Запись не найдена"}), 404


@app.delete("/api/<entity>/<int:record_id>")
def delete_record(entity: str, record_id: int):
    if entity not in ENTITIES:
        return jsonify({"error": "Неизвестная сущность"}), 404
    data = read_data()
    old_length = len(data[entity])
    data[entity] = [item for item in data[entity] if item.get("id") != record_id]
    if len(data[entity]) == old_length:
        return jsonify({"error": "Запись не найдена"}), 404
    save_data(data)
    return "", 204


if __name__ == "__main__":
    read_data()
    app.run(host="127.0.0.1", port=5000, debug=True)
