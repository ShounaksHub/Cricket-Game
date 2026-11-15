import json
import time
import urllib.request
import urllib.parse

HEADERS = {'User-Agent': 'CricketManagerGame/2.0 (contact: support@cricketdreamgame.app)'}

def check_wiki_image(name):
    queries = [
        f"{name} (cricketer)",
        name,
        f"{name} cricketer"
    ]
    for q in queries[:2]:
        try:
            url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(q)}&prop=pageimages&pithumbsize=600&format=json"
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=7) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                pages = data.get('query', {}).get('pages', {})
                for pid, pdata in pages.items():
                    if pid != "-1" and 'thumbnail' in pdata:
                        return True, pdata['thumbnail']['source']
        except Exception:
            pass
        time.sleep(0.25)
        
    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(name + ' cricketer')}&gsrlimit=2&prop=pageimages&pithumbsize=600&format=json"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for pid, pdata in pages.items():
                if 'thumbnail' in pdata:
                    return True, pdata['thumbnail']['source']
    except Exception:
        pass
        
    return False, None

def scan_candidates():
    with open('scratch/batch5_200_candidates.json', 'r', encoding='utf-8') as f:
        players = json.load(f)
        
    print(f"Scanning 200 players for authentic own image availability...")
    results = []
    has_own_image = []
    no_own_image = []
    
    for i, p in enumerate(players):
        name = p['fullName']
        has_img, img_url = check_wiki_image(name)
        record = {
            "id": p['id'],
            "fullName": name,
            "nationality": p.get('nationality'),
            "role": p.get('role'),
            "hasOwnImage": has_img,
            "imageUrl": img_url
        }
        results.append(record)
        if has_img:
            has_own_image.append(name)
            print(f"[{i+1}/200] [OWN IMAGE FOUND] {name}")
        else:
            no_own_image.append(name)
            print(f"[{i+1}/200] [NO OWN IMAGE] {name}")
            
    with open('scratch/batch5_scan_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
        
    print("\n--- SCAN AUDIT REPORT ---")
    print(f"Total players scanned: {len(players)}")
    print(f"Players with OWN real photo available: {len(has_own_image)} ({len(has_own_image)/len(players)*100:.1f}%)")
    print(f"Players WITHOUT own real photo: {len(no_own_image)} ({len(no_own_image)/len(players)*100:.1f}%)")

if __name__ == '__main__':
    scan_candidates()
