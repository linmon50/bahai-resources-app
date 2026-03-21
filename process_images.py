from PIL import Image
import os
import shutil

# Make sure public/Images exists
os.makedirs("C:/bahai-resources-app/public/Images", exist_ok=True)

def remove_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # get the background color from the top-left pixel
    bg_color = datas[0]
    
    tolerance = 30
    
    for item in datas:
        if abs(item[0] - bg_color[0]) < tolerance and abs(item[1] - bg_color[1]) < tolerance and abs(item[2] - bg_color[2]) < tolerance:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

remove_bg("C:/bahai-resources-app/Images/Dark Design Open Eye.jpg", "C:/bahai-resources-app/public/Images/Dark Design Open Eye.png")
remove_bg("C:/bahai-resources-app/Images/Dark Design Closed Eye.jpg", "C:/bahai-resources-app/public/Images/Dark Design Closed Eye.png")
print("Images processed successfully.")
