from collections import deque
from datetime import datetime

class ScoreCalculator:
    def __init__(self, window_size=30):
        self.window_size = window_size
        self._window = deque(maxlen=window_size)
        self._all_samples = []
        self._session_start = datetime.now()
        self.distraction_streak = 0
        self._minute_buckets = {}

    def _current_minute(self):
        elapsed = (datetime.now() - self._session_start).total_seconds()
        return int(elapsed // 60)

    def record(self, gaze_result):
        focused = (gaze_result.get("face_detected", False) and
                   not gaze_result.get("looking_away", True))
        self._window.append(focused)
        self._all_samples.append(focused)
        if not focused:
            self.distraction_streak += 1
        else:
            self.distraction_streak = 0
        minute = self._current_minute()
        self._minute_buckets.setdefault(minute, []).append(focused)
        return self.current_state()

    def current_state(self):
        if not self._window:
            return {"focus_score": 100, "distraction_streak": 0,
                    "window_size": 0, "should_nudge": False, "session_focus_pct": 100}
        focused_in_window = sum(self._window)
        focus_score = round((focused_in_window / len(self._window)) * 100)
        session_focused = sum(self._all_samples)
        session_total = len(self._all_samples)
        session_pct = round((session_focused / session_total) * 100) if session_total else 100
        return {"focus_score": focus_score, "distraction_streak": self.distraction_streak,
                "window_size": len(self._window), "should_nudge": self.distraction_streak >= 3,
                "session_focus_pct": session_pct}

    def session_timeline(self):
        return [{"minute": m, "focus_pct": round((sum(s) / len(s)) * 100)}
                for m, s in sorted(self._minute_buckets.items())]

    def reset(self):
        self._window.clear()
        self._all_samples.clear()
        self._session_start = datetime.now()
        self.distraction_streak = 0
        self._minute_buckets.clear()
