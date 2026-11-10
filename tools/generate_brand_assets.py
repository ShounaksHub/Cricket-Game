"""
Cricket Dream XI Official Brand Asset Generator
Extracts and generates production-quality SVG vectors and raster favicon/PWA/logo assets
from the official brand reference sheet.
"""

import os
import cv2
import numpy as np
from PIL import Image

SOURCE_IMAGE_PATH = r"C:\Users\shoun\.gemini\antigravity\brain\226e3aa6-cebc-4aca-a1fe-9211fa2c5e28\.user_uploaded\media_1794314699044_39147fe6.jpg"

PUBLIC_BRAND_DIR = "apps/web/public/brand"
PUBLIC_DIR = "apps/web/public"
STITCH_ASSETS_DIR = "apps/web/public/assets/stitch"

os.makedirs(PUBLIC_BRAND_DIR, exist_ok=True)
os.makedirs(STITCH_ASSETS_DIR, exist_ok=True)

# Official Brand Palette
HEX_DARK_GREEN = "#06230F"  # Dark forest green foundation
HEX_LIME_GREEN = "#75C657"  # Vibrant trajectory & XI lime green
HEX_WHITE = "#FFFFFF"       # High contrast light chalk for dark backgrounds
HEX_PITCH_DARK = "#040E07"  # Application dark pitch background

def unmultiply_alpha(crop_arr, sheet_bg=np.array([254.0, 252.0, 240.0]), threshold=12.0, max_dist=75.0):
    """
    Computes exact alpha and unmultiplies foreground color from the beige background,
    completely eliminating fringing or halos.
    """
    h, w, _ = crop_arr.shape
    dist = np.sqrt(np.sum((crop_arr.astype(float) - sheet_bg)**2, axis=2))
    
    alpha = np.clip((dist - threshold) / (max_dist - threshold), 0.0, 1.0)
    
    eps = 1e-3
    fg = np.zeros_like(crop_arr, dtype=float)
    for c in range(3):
        fg_c = (crop_arr[:, :, c].astype(float) - (1.0 - alpha) * sheet_bg[c]) / np.maximum(alpha, eps)
        fg[:, :, c] = np.clip(fg_c, 0.0, 255.0)
        
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = fg.astype(np.uint8)
    out[:, :, 3] = (alpha * 255.0).astype(np.uint8)
    return out

def convert_to_dark_mode(rgba_arr):
    """
    Converts dark forest green pixels into crisp white (#FFFFFF),
    while preserving lime green (#75C657) trajectory/ball and transparent alpha.
    """
    out = rgba_arr.copy()
    r = out[:, :, 0].astype(float)
    g = out[:, :, 1].astype(float)
    b = out[:, :, 2].astype(float)
    a = out[:, :, 3].astype(float)
    
    # Identify lime green pixels: G is high, significantly greater than R and B
    is_lime = (g > 130) & (r < 160) & (b < 130) & (a > 30)
    
    # Non-lime content pixels are dark green -> convert to crisp white
    is_dark = (a > 30) & (~is_lime)
    
    out[is_dark, 0] = 255
    out[is_dark, 1] = 255
    out[is_dark, 2] = 255
    
    # Guarantee lime green color saturation for lime parts
    out[is_lime, 0] = 117
    out[is_lime, 1] = 198
    out[is_lime, 2] = 87
    
    return out

def convert_to_monochrome(rgba_arr, color=(255, 255, 255)):
    """
    Converts all content pixels to a single monochrome color with original alpha.
    """
    out = rgba_arr.copy()
    a = out[:, :, 3] > 30
    out[a, 0] = color[0]
    out[a, 1] = color[1]
    out[a, 2] = color[2]
    return out

def trace_svg_paths(bin_mask, scale=4, min_area=30):
    """
    Traces clean polygon contours from high-resolution binary mask.
    """
    cnts, _ = cv2.findContours(bin_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    cmds = []
    if cnts is None or len(cnts) == 0:
        return ""
    
    for c in cnts:
        if cv2.contourArea(c) < min_area * scale * scale:
            continue
        approx = cv2.approxPolyDP(c, 0.75, True)
        pts = approx.reshape(-1, 2)
        if len(pts) < 3:
            continue
        cmd = f"M {pts[0][0]/scale:.2f},{pts[0][1]/scale:.2f}"
        for p in pts[1:]:
            cmd += f" L {p[0]/scale:.2f},{p[1]/scale:.2f}"
        cmd += " Z"
        cmds.append(cmd)
    return " ".join(cmds)

def main():
    print("Loading official brand reference image...")
    src_bgr = cv2.imread(SOURCE_IMAGE_PATH)
    src_rgb = cv2.cvtColor(src_bgr, cv2.COLOR_BGR2RGB)
    
    # -------------------------------------------------------------------------
    # 1. CROP RAW ELEMENTS FROM SHEET
    # -------------------------------------------------------------------------
    # Primary Monogram: y: 80 to 225, x: 117 to 378
    mono_crop = src_rgb[80:225, 117:378]
    
    # Primary Wordmark: y: 86 to 222, x: 427 to 960
    word_crop = src_rgb[86:222, 427:960]
    
    # Stacked Logo: y: 381 to 597, x: 78 to 332
    stacked_crop = src_rgb[381:597, 78:332]
    
    # App Icon: y: 350 to 567, x: 400 to 621
    app_crop = src_rgb[350:567, 400:621]
    
    # -------------------------------------------------------------------------
    # 2. EXTRACT ALPHA-MATTED RASTER ASSETS
    # -------------------------------------------------------------------------
    print("Extracting clean alpha-matted foregrounds...")
    mono_rgba = unmultiply_alpha(mono_crop)
    word_rgba = unmultiply_alpha(word_crop)
    stacked_rgba = unmultiply_alpha(stacked_crop)
    
    # Composite Horizontal Logo (Monogram + Wordmark with original 49px gap)
    h_mono, w_mono, _ = mono_rgba.shape
    h_word, w_word, _ = word_rgba.shape
    gap = 46
    h_horiz = max(h_mono, h_word)
    w_horiz = w_mono + gap + w_word
    
    horiz_rgba = np.zeros((h_horiz, w_horiz, 4), dtype=np.uint8)
    y_mono_off = (h_horiz - h_mono) // 2
    y_word_off = (h_horiz - h_word) // 2
    
    horiz_rgba[y_mono_off:y_mono_off+h_mono, :w_mono] = mono_rgba
    horiz_rgba[y_word_off:y_word_off+h_word, w_mono+gap:w_mono+gap+w_word] = word_rgba
    
    # Dark Mode Variants (White text/monogram + Lime accents)
    mono_dark_rgba = convert_to_dark_mode(mono_rgba)
    horiz_dark_rgba = convert_to_dark_mode(horiz_rgba)
    stacked_dark_rgba = convert_to_dark_mode(stacked_rgba)
    
    # Monochrome Variant
    mono_white_rgba = convert_to_monochrome(mono_rgba, (255, 255, 255))
    horiz_white_rgba = convert_to_monochrome(horiz_rgba, (255, 255, 255))
    
    # Save Master Raster PNGs
    Image.fromarray(horiz_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-horizontal-light.png"))
    Image.fromarray(horiz_dark_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-horizontal-dark.png"))
    Image.fromarray(stacked_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-stacked-light.png"))
    Image.fromarray(stacked_dark_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-stacked-dark.png"))
    Image.fromarray(mono_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-monogram-light.png"))
    Image.fromarray(mono_dark_rgba, 'RGBA').save(os.path.join(PUBLIC_BRAND_DIR, "logo-monogram-dark.png"))
    
    # Also update public/assets/stitch/logo.png with the official horizontal dark logo
    Image.fromarray(horiz_dark_rgba, 'RGBA').save(os.path.join(STITCH_ASSETS_DIR, "logo.png"))
    print("Saved master brand raster PNGs.")
    
    # -------------------------------------------------------------------------
    # 3. BUILD SQUIRCLE APP ICON & FAVICON SUITE (From APP ICON Section)
    # -------------------------------------------------------------------------
    print("Building App Icon and Favicon suite...")
    # Clean extract of the app icon squircle
    app_h, app_w, _ = app_crop.shape
    sheet_bg = np.array([254.0, 252.0, 240.0])
    dist_sheet = np.sqrt(np.sum((app_crop.astype(float) - sheet_bg)**2, axis=2))
    
    # Squircle alpha mask (smooth edge)
    sq_alpha = np.clip((dist_sheet - 10.0) / (60.0 - 10.0), 0.0, 1.0)
    
    # Foreground inside squircle
    app_fg = app_crop.copy()
    app_rgba = np.zeros((app_h, app_w, 4), dtype=np.uint8)
    app_rgba[:, :, :3] = app_fg
    app_rgba[:, :, 3] = (sq_alpha * 255.0).astype(np.uint8)
    
    app_icon_512 = Image.fromarray(app_rgba, 'RGBA').resize((512, 512), Image.Resampling.LANCZOS)
    app_icon_512.save(os.path.join(PUBLIC_BRAND_DIR, "app-icon-512.png"))
    app_icon_512.save(os.path.join(PUBLIC_DIR, "android-chrome-512x512.png"))
    app_icon_512.save(os.path.join(PUBLIC_DIR, "icon.png"))
    
    app_icon_192 = Image.fromarray(app_rgba, 'RGBA').resize((192, 192), Image.Resampling.LANCZOS)
    app_icon_192.save(os.path.join(PUBLIC_DIR, "android-chrome-192x192.png"))
    
    app_icon_180 = Image.fromarray(app_rgba, 'RGBA').resize((180, 180), Image.Resampling.LANCZOS)
    app_icon_180.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"))
    app_icon_180.save(os.path.join(PUBLIC_DIR, "apple-icon.png"))
    
    app_icon_48 = Image.fromarray(app_rgba, 'RGBA').resize((48, 48), Image.Resampling.LANCZOS)
    app_icon_48.save(os.path.join(PUBLIC_DIR, "favicon-48x48.png"))
    
    app_icon_32 = Image.fromarray(app_rgba, 'RGBA').resize((32, 32), Image.Resampling.LANCZOS)
    app_icon_32.save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"))
    
    app_icon_16 = Image.fromarray(app_rgba, 'RGBA').resize((16, 16), Image.Resampling.LANCZOS)
    app_icon_16.save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"))
    
    # Multi-resolution favicon.ico
    app_icon_512.save(
        os.path.join(PUBLIC_DIR, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Favicon suite and PWA icons generated.")

    # -------------------------------------------------------------------------
    # 4. GENERATE OPEN GRAPH (OG) SHARING IMAGE (1200 x 630)
    # -------------------------------------------------------------------------
    print("Generating Open Graph image (1200x630)...")
    og_img = Image.new("RGBA", (1200, 630), (4, 14, 7, 255))
    stadium_path = os.path.join(STITCH_ASSETS_DIR, "stadium-hero.png")
    if os.path.exists(stadium_path):
        stadium = Image.open(stadium_path).convert("RGBA").resize((1200, 630), Image.Resampling.LANCZOS)
        # Dim slightly for high contrast
        dim = Image.new("RGBA", (1200, 630), (4, 14, 7, 180))
        stadium = Image.alpha_composite(stadium, dim)
        og_img = stadium
    
    # Place large horizontal logo centered
    horiz_pil = Image.fromarray(horiz_dark_rgba, 'RGBA')
    logo_w = 780
    logo_h = int(h_horiz * (logo_w / w_horiz))
    logo_resized = horiz_pil.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    paste_x = (1200 - logo_w) // 2
    paste_y = (630 - logo_h) // 2 - 20
    og_img.paste(logo_resized, (paste_x, paste_y), logo_resized)
    og_img.save(os.path.join(PUBLIC_DIR, "og-image.png"))
    print("Open Graph image saved.")

    # -------------------------------------------------------------------------
    # 5. GENERATE HIGH-PRECISION VECTOR SVGS
    # -------------------------------------------------------------------------
    print("Tracing high-precision vector SVG assets...")
    scale = 4
    
    def vectorize_rgba(rgba_img):
        up = cv2.resize(rgba_img, (rgba_img.shape[1]*scale, rgba_img.shape[0]*scale), interpolation=cv2.INTER_LANCZOS4)
        r = up[:, :, 0]
        g = up[:, :, 1]
        b = up[:, :, 2]
        a = up[:, :, 3]
        
        is_lime = (g > 130) & (r < 160) & (b < 130) & (a > 50)
        is_main = (a > 50) & (~is_lime)
        
        lime_mask = cv2.GaussianBlur((is_lime.astype(np.uint8)*255), (3, 3), 0)
        _, lime_bin = cv2.threshold(lime_mask, 127, 255, cv2.THRESH_BINARY)
        
        main_mask = cv2.GaussianBlur((is_main.astype(np.uint8)*255), (3, 3), 0)
        _, main_bin = cv2.threshold(main_mask, 127, 255, cv2.THRESH_BINARY)
        
        d_lime = trace_svg_paths(lime_bin, scale=scale, min_area=35)
        d_main = trace_svg_paths(main_bin, scale=scale, min_area=35)
        return d_main, d_lime
    
    # 5.1 Monogram SVGs
    d_mono_main, d_mono_lime = vectorize_rgba(mono_rgba)
    
    svg_mono_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_mono} {h_mono}" width="{w_mono}" height="{h_mono}" fill="none">
  <path d="{d_mono_main}" fill="{HEX_WHITE}" fill-rule="evenodd" />
  <path d="{d_mono_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-monogram-dark.svg"), "w") as f:
        f.write(svg_mono_dark)
        
    svg_mono_light = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_mono} {h_mono}" width="{w_mono}" height="{h_mono}" fill="none">
  <path d="{d_mono_main}" fill="{HEX_DARK_GREEN}" fill-rule="evenodd" />
  <path d="{d_mono_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-monogram-light.svg"), "w") as f:
        f.write(svg_mono_light)

    # 5.2 Primary Horizontal Logo SVGs
    d_horiz_main, d_horiz_lime = vectorize_rgba(horiz_rgba)
    
    svg_horiz_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_horiz} {h_horiz}" width="{w_horiz}" height="{h_horiz}" fill="none">
  <path d="{d_horiz_main}" fill="{HEX_WHITE}" fill-rule="evenodd" />
  <path d="{d_horiz_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-horizontal-dark.svg"), "w") as f:
        f.write(svg_horiz_dark)
        
    svg_horiz_light = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_horiz} {h_horiz}" width="{w_horiz}" height="{h_horiz}" fill="none">
  <path d="{d_horiz_main}" fill="{HEX_DARK_GREEN}" fill-rule="evenodd" />
  <path d="{d_horiz_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-horizontal-light.svg"), "w") as f:
        f.write(svg_horiz_light)

    # 5.3 Stacked Logo SVGs
    w_st, h_st = stacked_rgba.shape[1], stacked_rgba.shape[0]
    d_st_main, d_st_lime = vectorize_rgba(stacked_rgba)
    
    svg_st_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_st} {h_st}" width="{w_st}" height="{h_st}" fill="none">
  <path d="{d_st_main}" fill="{HEX_WHITE}" fill-rule="evenodd" />
  <path d="{d_st_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-stacked-dark.svg"), "w") as f:
        f.write(svg_st_dark)
        
    svg_st_light = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_st} {h_st}" width="{w_st}" height="{h_st}" fill="none">
  <path d="{d_st_main}" fill="{HEX_DARK_GREEN}" fill-rule="evenodd" />
  <path d="{d_st_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-stacked-light.svg"), "w") as f:
        f.write(svg_st_light)

    # 5.4 App Icon Squircle SVG
    svg_app_icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <rect width="512" height="512" rx="112" fill="{HEX_DARK_GREEN}" />
  <g transform="translate(68, 126) scale(1.44)">
    <path d="{d_mono_main}" fill="{HEX_WHITE}" fill-rule="evenodd" />
    <path d="{d_mono_lime}" fill="{HEX_LIME_GREEN}" fill-rule="evenodd" />
  </g>
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-app-icon.svg"), "w") as f:
        f.write(svg_app_icon)
    with open(os.path.join(PUBLIC_DIR, "icon.svg"), "w") as f:
        f.write(svg_app_icon)

    # 5.5 Monochrome Logo SVG
    svg_mono_all = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_horiz} {h_horiz}" width="{w_horiz}" height="{h_horiz}" fill="none">
  <path d="{d_horiz_main} {d_horiz_lime}" fill="currentColor" fill-rule="evenodd" />
</svg>'''
    with open(os.path.join(PUBLIC_BRAND_DIR, "logo-monochrome.svg"), "w") as f:
        f.write(svg_mono_all)

    print("Successfully generated all production SVG vectors!")

if __name__ == "__main__":
    main()

