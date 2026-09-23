from PIL import Image

def remove_white(in_path, out_path, tolerance=240):
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Calculate how close to pure white it is
        if item[0] >= tolerance and item[1] >= tolerance and item[2] >= tolerance:
            # Smooth alpha calculation for anti-aliasing
            # 255 = 0 alpha, tolerance = 255 alpha
            avg = (item[0] + item[1] + item[2]) / 3.0
            if avg >= 253:
                newData.append((255, 255, 255, 0))
            else:
                alpha = int(255 * (255 - avg) / (255 - tolerance))
                newData.append((item[0], item[1], item[2], alpha))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")

remove_white('elephant.jpg', 'elephant.png', 235)
