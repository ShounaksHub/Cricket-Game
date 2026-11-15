import os
import json
import time
import urllib.request
import urllib.parse
from PIL import Image, ImageEnhance, ImageOps
import cv2
import numpy as np

HEADERS = {'User-Agent': 'CricketManagerGame/2.0 (contact: support@cricketdreamgame.app)'}

def get_wiki_image_url(name):
    queries = [
        f"{name} (cricketer)",
        name,
        f"{name} cricketer"
    ]
    for q in queries[:2]:
        try:
            url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(q)}&prop=pageimages&pithumbsize=600&format=json"
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                pages = data.get('query', {}).get('pages', {})
                for pid, pdata in pages.items():
                    if pid != "-1" and 'thumbnail' in pdata:
                        return pdata['thumbnail']['source']
        except Exception:
            pass
        time.sleep(0.2)
        
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(name + ' cricketer')}&gsrlimit=2&prop=pageimages&pithumbsize=600&format=json"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for pid, pdata in pages.items():
                if 'thumbnail' in pdata:
                    return pdata['thumbnail']['source']
    except Exception:
        pass
    return None

def download_image(url, out_path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=12) as resp:
        with open(out_path, 'wb') as f:
            f.write(resp.read())

def cartoonize_image(img_path, out_path):
    pil_img = Image.open(img_path).convert('RGB')
    w, h = pil_img.size
    
    min_dim = min(w, h)
    if w > h:
        left = (w - h) // 2
        pil_img = pil_img.crop((left, 0, left + h, h))
    else:
        top = int((h - w) * 0.15) if h > w * 1.2 else (h - w) // 2
        pil_img = pil_img.crop((0, top, w, top + w))
        
    pil_img = pil_img.resize((480, 480), Image.Resampling.LANCZOS)
    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    
    # 1. Bilateral filter for smooth cel skin
    cel_skin = cv2.bilateralFilter(cv_img, d=9, sigmaColor=75, sigmaSpace=75)
    cel_skin = cv2.bilateralFilter(cel_skin, d=7, sigmaColor=50, sigmaSpace=50)
    
    # 2. Extract comic ink outlines
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    gray_blur = cv2.medianBlur(gray, 7)
    ink_edges = cv2.adaptiveThreshold(
        gray_blur, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        blockSize=9,
        C=2
    )
    
    # 3. Combine skin colors and ink outlines
    edges_colored = cv2.cvtColor(ink_edges, cv2.COLOR_GRAY2BGR)
    cartoon_bgr = cv2.bitwise_and(cel_skin, edges_colored)
    
    # 4. Color & contrast enhancements in PIL
    cartoon_rgb = cv2.cvtColor(cartoon_bgr, cv2.COLOR_BGR2RGB)
    out_pil = Image.fromarray(cartoon_rgb)
    out_pil = ImageEnhance.Color(out_pil).enhance(1.35)
    out_pil = ImageEnhance.Contrast(out_pil).enhance(1.15)
    out_pil = ImageOps.posterize(out_pil, 5)
    
    out_pil.save(out_path, format="JPEG", quality=92)

def process_all_remaining():
    os.makedirs('scratch/raw_photos', exist_ok=True)
    out_dir = 'apps/web/public/assets/players/realistic'
    os.makedirs(out_dir, exist_ok=True)
    
    with open('scratch/remaining_all_candidates.json', 'r', encoding='utf-8') as f:
        players = json.load(f)
        
    total = len(players)
    print(f"Starting pipeline for ALL {total} remaining players...")
    
    completed_real = 0
    completed_archetype = 0
    
    for i, p in enumerate(players):
        pid = p['id']
        name = p['fullName']
        final_file = os.path.join(out_dir, f"{pid}.jpg")
        raw_file = os.path.join('scratch/raw_photos', f"{pid}.jpg")
        
        if os.path.exists(final_file) and os.path.getsize(final_file) > 1000:
            print(f"[{i+1}/{total}] Already exists: {name}")
            completed_real += 1
            continue
            
        # Try finding real photo if raw doesn't exist
        if not os.path.exists(raw_file):
            img_url = get_wiki_image_url(name)
            if img_url:
                try:
                    download_image(img_url, raw_file)
                    time.sleep(0.25)
                except Exception:
                    pass
                    
        if os.path.exists(raw_file):
            try:
                cartoonize_image(raw_file, final_file)
                print(f"[{i+1}/{total}] [REAL-PHOTO CARTOON] {name}")
                completed_real += 1
                continue
            except Exception as e:
                print(f"[{i+1}/{total}] Error cartoonizing real photo for {name}: {e}")
                
        # Fallback to deterministic archetype cartoonized
        hash_val = sum(ord(c) for c in pid) % 60 + 1
        archetype_src = f"apps/web/public/assets/players/realistic/generic-cricketer-{hash_val:02d}.jpg"
        if os.path.exists(archetype_src):
            cartoonize_image(archetype_src, final_file)
            print(f"[{i+1}/{total}] [ARCHETYPE CARTOON] {name}")
            completed_archetype += 1
        else:
            print(f"[{i+1}/{total}] Warning missing archetype {archetype_src}")

    print("\n==========================================")
    print(f"ALL REMAINING PLAYERS COMPLETED!")
    print(f"Total: {completed_real + completed_archetype} / {total}")
    print(f"Real-photo cartoonized: {completed_real}")
    print(f"Archetype cartoonized: {completed_archetype}")
    print("==========================================")

if __name__ == '__main__':
    process_all_remaining()
