from ultralytics import YOLO
import cv2
import time
import os
import json
import sys

def is_new_pothole(xywh, existing, threshold=50):
    x, y, w, h = xywh
    if w < 15 or h < 15:
        return False
    for e in existing:
        if abs(x - e[0]) < threshold and abs(y - e[1]) < threshold:
            return False
    return True

def detect_potholes(video_path, output_dir):
    print(f"[DEBUG] Starting detection on: {video_path}", file=sys.stderr)
    model_path = "best.pt"
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("ERROR: Unable to open video", file=sys.stderr)
        return

    model = YOLO(model_path)
    print(f"[DEBUG] Model loaded: {model_path}", file=sys.stderr)

    frame_num = 0
    logged_potholes = []
    log_data = []
    pothole_counter = 0

    base_lat = 19.123456
    base_lon = 72.987654
    lat_increment = 0.00001
    lon_increment = 0.00001

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[DEBUG] Total frames: {total_frames}", file=sys.stderr)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_num += 1
        if frame_num % 5 != 0:
            continue

        results = model.predict(frame, conf=0.5, imgsz=1280)
        
        num_detections = len(results[0].boxes)
        print(f"[DEBUG] Frame {frame_num}/{total_frames}: {num_detections} detections", file=sys.stderr)

        for box in results[0].boxes.xywh.cpu().numpy():
            x, y, w, h = map(int, box)
            print(f"[DEBUG] Detected: x={x}, y={y}, w={w}, h={h}", file=sys.stderr)

            if is_new_pothole((x, y, w, h), logged_potholes, threshold=70):
                logged_potholes.append((x, y, w, h))
                pothole_counter += 1
                timestamp = time.strftime("%H:%M:%S")

                current_lat = base_lat + (pothole_counter * lat_increment)
                current_lon = base_lon + (pothole_counter * lon_increment)

                x1 = max(x - w//2, 0)
                y1 = max(y - h//2, 0)
                x2 = min(x + w//2, frame.shape[1])
                y2 = min(y + h//2, frame.shape[0])
                
                if y2 > y1 and x2 > x1:
                    crop = frame[int(y1):int(y2), int(x1):int(x2)]
                    image_name = f"pothole_{frame_num}_{pothole_counter}.jpg"
                    image_path = os.path.join(output_dir, image_name)
                    
                    # Ensure directory exists
                    os.makedirs(os.path.dirname(image_path), exist_ok=True)
                    
                    # Save image and verify
                    if not cv2.imwrite(image_path, crop):
                        print(f"[ERROR] Failed to save image: {image_path}", file=sys.stderr)
                        continue

                    # Normalize path for cross-platform compatibility
                    normalized_path = os.path.normpath(image_path)
                    
                    log_data.append({
                        "Frame": frame_num,
                        "Time": timestamp,
                        "X": x,
                        "Y": y,
                        "Width": w,
                        "Height": h,
                        "Latitude": current_lat,
                        "Longitude": current_lon,
                        "Image": normalized_path
                    })
                    print(f"[DEBUG] Saved pothole image: {normalized_path}", file=sys.stderr)

    cap.release()
    print(f"[DEBUG] Total potholes detected: {pothole_counter}", file=sys.stderr)

    if pothole_counter > 0:
        log_path = os.path.join(output_dir, "pothole_log.json")
        with open(log_path, "w") as f:
            json.dump(log_data, f)
        print(f"DETECTED_POTHOLES:{log_path}")
        sys.stdout.flush()
    else:
        print("NO_POTHOLES")
        sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) == 3:
        detect_potholes(sys.argv[1], sys.argv[2])
    else:
        print("Usage: pothole_detector.py <video_path> <output_dir>", file=sys.stderr)
        sys.exit(1)