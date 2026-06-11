import requests
from PIL import Image
from io import BytesIO

def get_streetview_image(panoid: str, yaw: float = 0, pitch: float = -10, width: int = 800, height: int = 600, save_as: str = None):
    url = f"https://streetviewpixels-pa.googleapis.com/v1/thumbnail?cb_client=maps_sv.tactile&w={width}&h={height}&panoid={panoid}&yaw={yaw}&pitch={pitch}"
    r = requests.get(url)
    if r.status_code == 200:
        img = Image.open(BytesIO(r.content))
        if save_as:
            img.save(save_as)
            print(f"Saved: {save_as}")
        return img
    else:
        print("Failed or no image")
        return None

# Example usage with your known good panoid from earlier
panoid = "58sNv_pZ9fqzsDgsqxefpA"   # replace with any working one

# Generate multiple angles of same spot
for yaw in [0, 90, 180, 270]:
    get_streetview_image(panoid, yaw=yaw, pitch=-5, save_as=f"view_{yaw}.jpg")