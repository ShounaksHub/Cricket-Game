import urllib.request
import urllib.parse
import json

def test(query):
    search_q = f"{query} cricketer"
    url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(search_q)}&gsrlimit=3&prop=pageimages&pithumbsize=600&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'CricketApp/1.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for pid, page in pages.items():
                title = page.get('title')
                thumb = page.get('thumbnail', {}).get('source')
                print(f"Title: {title}, Thumb: {thumb}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    for name in ["Steve Smith", "Mitchell Marsh", "Glenn Maxwell", "Harshit Rana", "Marnus Labuschagne"]:
        print(f"--- {name} ---")
        test(name)
