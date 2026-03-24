"""
app.py — FocusGuard Python AI backend
--------------------------------------
Endpoints:
  POST /analyze        — analyze a base64 webcam frame
  POST /session/start  — reset score calculator for a new session
  POST /session/end    — return full session report
  GET  /health         — liveness check

Run:
  python app.py
  # -> http://localhost:5000
"""

import sys
import os

# Force UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Determine writable directory for model file
# When bundled by PyInstaller, sys._MEIPASS is the temp extraction dir (read-only)
# Use AppData/Local/FocusGuard for persistent writable storage
def get_model_dir():
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        app_data = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
        model_dir = os.path.join(app_data, 'FocusGuard', 'models')
    else:
        # Running as plain Python script
        model_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(model_dir, exist_ok=True)
    return model_dir

import base64
import io
import traceback

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from gaze_estimator import GazeEstimator
from score_calculator import ScoreCalculator

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "file://*"]}})

# Singletons — one estimator + calculator per server process
estimator  = GazeEstimator()
calculator = ScoreCalculator(window_size=30)


def decode_frame(b64_data: str) -> np.ndarray:
    """Decode a base64 image string to a BGR numpy array."""
    # Strip data URI prefix if present: "data:image/jpeg;base64,..."
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]
    raw     = base64.b64decode(b64_data)
    buf     = np.frombuffer(raw, dtype=np.uint8)
    frame   = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return frame


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "mediapipe-facemesh"})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects JSON: { "frame": "<base64 jpeg/png>" }

    Returns JSON:
    {
      "face_detected":       bool,
      "looking_away":        bool,
      "eyes_closed":         bool,
      "yaw":                 float,
      "pitch":               float,
      "focus_score":         int (0-100, rolling window),
      "session_focus_pct":   int (0-100, full session),
      "distraction_streak":  int,
      "should_nudge":        bool
    }
    """
    try:
        data    = request.get_json(force=True)
        b64     = data.get("frame", "")

        if not b64:
            return jsonify({"error": "No frame provided"}), 400

        frame = decode_frame(b64)
        if frame is None:
            return jsonify({"error": "Could not decode frame"}), 400

        # Run gaze estimation
        gaze = estimator.analyze(frame)

        # Update rolling score
        score_state = calculator.record(gaze)

        return jsonify({
            **gaze,
            **score_state,
        })

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500


@app.route("/session/start", methods=["POST"])
def session_start():
    """Reset the score calculator for a fresh Pomodoro session."""
    calculator.reset()
    return jsonify({"status": "session started"})


@app.route("/session/end", methods=["POST"])
def session_end():
    """Return the full session report including per-minute timeline."""
    state    = calculator.current_state()
    timeline = calculator.session_timeline()
    return jsonify({
        **state,
        "timeline": timeline,
        "total_samples": len(calculator._all_samples),
    })


if __name__ == "__main__":
    print("FocusGuard AI backend starting on http://localhost:5000")
    print("Press Ctrl+C to stop.\n")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)