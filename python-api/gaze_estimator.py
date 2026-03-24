import math
import os
import sys
import urllib.request
import numpy as np

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

LEFT_EYE_TOP=159; LEFT_EYE_BOTTOM=145; LEFT_EYE_LEFT=33; LEFT_EYE_RIGHT=133
RIGHT_EYE_TOP=386; RIGHT_EYE_BOTTOM=374; RIGHT_EYE_LEFT=362; RIGHT_EYE_RIGHT=263
NOSE_TIP=1; CHIN=152; LEFT_EYE_L=226; RIGHT_EYE_R=446

def get_model_path():
    """Return a writable path for the face landmarker model."""
    if getattr(sys, 'frozen', False):
        # PyInstaller bundle — use AppData/Local/FocusGuard/models
        app_data = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
        model_dir = os.path.join(app_data, 'FocusGuard', 'models')
    else:
        # Plain Python — use script directory
        model_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(model_dir, exist_ok=True)
    return os.path.join(model_dir, 'face_landmarker.task')

class GazeEstimator:
    def __init__(self):
        model_path = get_model_path()
        if not os.path.exists(model_path):
            print(f"Downloading face landmarker model to {model_path}...")
            urllib.request.urlretrieve(MODEL_URL, model_path)
            print("Model downloaded.")

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.detector = mp_vision.FaceLandmarker.create_from_options(options)

    def _lm_px(self, lm, w, h):
        return int(lm.x * w), int(lm.y * h)

    def _ear(self, lms, top, bot, left, right, w, h):
        t=np.array(self._lm_px(lms[top],w,h)); b=np.array(self._lm_px(lms[bot],w,h))
        l=np.array(self._lm_px(lms[left],w,h)); r=np.array(self._lm_px(lms[right],w,h))
        vert=np.linalg.norm(t-b); horiz=np.linalg.norm(l-r)
        return float(vert/horiz) if horiz else 0.0

    def _head_pose(self, lms, w, h):
        nose=np.array(self._lm_px(lms[NOSE_TIP],w,h))
        chin=np.array(self._lm_px(lms[CHIN],w,h))
        le=np.array(self._lm_px(lms[LEFT_EYE_L],w,h))
        re=np.array(self._lm_px(lms[RIGHT_EYE_R],w,h))
        ntl=abs(nose[0]-le[0]); ntr=abs(nose[0]-re[0]); tot=ntl+ntr
        yaw=(ntr/tot-0.5)*90 if tot else 0.0
        dy=chin[1]-nose[1]
        pitch=math.degrees(math.atan2(nose[0]-chin[0],dy)) if dy else 0.0
        return float(yaw), float(pitch)

    def analyze(self, frame_bgr):
        import cv2
        h,w=frame_bgr.shape[:2]
        rgb=cv2.cvtColor(frame_bgr,cv2.COLOR_BGR2RGB)
        mp_image=mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result=self.detector.detect(mp_image)

        if not result.face_landmarks:
            return {"face_detected":False,"looking_away":True,"eyes_closed":False,
                    "yaw":0.0,"pitch":0.0,"left_ear":0.0,"right_ear":0.0,"confidence":0.0}

        lms=result.face_landmarks[0]
        lear=self._ear(lms,LEFT_EYE_TOP,LEFT_EYE_BOTTOM,LEFT_EYE_LEFT,LEFT_EYE_RIGHT,w,h)
        rear=self._ear(lms,RIGHT_EYE_TOP,RIGHT_EYE_BOTTOM,RIGHT_EYE_LEFT,RIGHT_EYE_RIGHT,w,h)
        eyes_closed=(lear+rear)/2 < 0.18
        yaw,pitch=self._head_pose(lms,w,h)
        looking_away=abs(yaw)>25 or abs(pitch)>20 or eyes_closed

        return {"face_detected":True,"looking_away":looking_away,"eyes_closed":eyes_closed,
                "yaw":round(yaw,2),"pitch":round(pitch,2),
                "left_ear":round(lear,3),"right_ear":round(rear,3),"confidence":1.0}

    def close(self):
        self.detector.close()