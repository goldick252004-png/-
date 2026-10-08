"""Пересборка IMG_3474 по style-guide-montazh.md: грейдж, зумы, плашки EDE8E2, хук, wordmark."""
import json, glob, subprocess, sys
import numpy as np
from PIL import Image
SRC, FR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]   # видео, папка кадров (10 fps), результат
SEGS = json.load(open(sys.argv[4]))                       # segs.json: s,e,x0,x1 (кадры 10 fps)
TXT = {0:["Всем привет"],1:["У меня для"],2:["вас новость","мои дорогие","подписчики"],
 3:["Мы с Даней"],4:["переезжаем"],5:["в Белград"],6:["Вот так вот"],7:["На самом деле"],
 8:["уже куча планов"],9:["куча идей, куда"],10:["сходить"],11:["что там поделать"],
 12:["Следите, я буду"],13:["правда вести свои"],14:["социальные сети"],15:["Я уже планирую"],
 16:["на футбол,"],17:["на баскетбол, в"],18:["в октябре приезжает"],19:["сборная России"],
 20:["по гандболу в"],21:["Сербию"],22:["обязательно схожу"],23:["на товарищеские"],24:["игры"],
 25:["против сборной"],26:["Сербии"],27:["так что жизнь","продолжается"],28:["пора пробовать"],
 29:["что-то"],30:["новое"],31:["Пожелайте удачи"]}
CUTS = {2:[1.1,1.8,2.4,2.8],27:[26.3,27.2,27.8]}
fs = sorted(glob.glob(FR+'/*.png')); K=1.5; FONT='/usr/share/fonts/opentype/inter/Inter-Medium.otf'
IT='/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'
def span(s):  # реальная ширина старой плашки по всем кадрам сегмента
    x0,x1=9999,0
    for i in range(s['s'],s['e']+1):
        a=np.asarray(Image.open(fs[i]).convert('RGB')).astype(int)[895:975]
        r,g,b=a[...,0],a[...,1],a[...,2]
        m=(r>200)&(g<175)&(g>110)&(b>150)&(b<225)&(r-g>45)
        c=np.where(m.sum(0)>20)[0]
        if len(c)>40: x0=min(x0,c.min()); x1=max(x1,c.max())
    return x0,x1
f=[]
f.append("eq=contrast=0.90:saturation=0.80:brightness=0.02")
f.append("colorbalance=rs=0.02:bs=-0.03:rm=0.04:bm=-0.05:rh=0.02:bh=-0.03")
f.append("scale=1080:1920:flags=lanczos")
for k,s in enumerate(SEGS):
    x0,x1=span(s); X0,X1=int(x0*K-10),int(x1*K+10); Y0,Y1=int(904*K-10),int(963*K+10)
    cuts=CUTS.get(k,[s['s']/10,(s['e']+1)/10])
    for j,t in enumerate(TXT[k]):
        a=cuts[j]-(0.05 if j==0 else 0); b=cuts[j+1]+(0.06 if j==len(TXT[k])-1 else 0)
        en=f"between(t,{a:.2f},{b:.2f})"
        f.append(f"drawbox=x={X0}:y={Y0}:w={X1-X0}:h={Y1-Y0}:color=0xEDE8E2@0.95:t=fill:enable='{en}'")
        t=t.replace("'","\\'").replace(":","\\:").replace(",","\\,")
        f.append(f"drawtext=fontfile={FONT}:text='{t}':fontsize=58:fontcolor=0x4F4640:x=(w-text_w)/2:y={(Y0+Y1)//2}-text_h/2:enable='{en}'")
# зумы: чередуем 100% и 108% на границах фраз + медленный дрейф
ch=[0,3.4,8.9,13.4,17.5,22.4,26.3,30.3]; z=[]
for i in range(len(ch)-1):
    base=1.0 if i%2==0 else 1.08; z.append(f"between(t,{ch[i]},{ch[i+1]})*({base}+0.03*(t-{ch[i]})/{ch[i+1]-ch[i]:.2f})")
Z="+".join(z)
f.append(f"noise=alls=6:allf=t")
f.append(f"scale=w='trunc(1080*({Z})/2)*2':h='trunc(1920*({Z})/2)*2':eval=frame:flags=bicubic")
f.append("crop=1080:1920")
# хук (0–2.6 с) и wordmark в конце — после зума, в безопасной зоне
al="alpha='if(lt(t,0.4),t/0.4,if(gt(t,2.2),max(0,(2.6-t)/0.4),1))'"
f.append(f"drawtext=fontfile={FONT}:text='Мы переезжаем':fontsize=56:fontcolor=0xFBF8F4:shadowcolor=0x4F4640@0.45:shadowx=0:shadowy=2:x=(w-text_w)/2:y=240:{al}")
f.append(f"drawtext=fontfile={IT}:text='to Belgrade':fontsize=72:fontcolor=0xFBF8F4:shadowcolor=0x4F4640@0.45:shadowx=0:shadowy=2:x=(w-text_w)/2:y=310:{al}")
wa="alpha='if(lt(t,28.8),0,min((t-28.8)/0.5,1))'"
f.append(f"drawtext=fontfile={IT}:text='Stephania':fontsize=84:fontcolor=0xFBF8F4:shadowcolor=0x4F4640@0.45:shadowx=0:shadowy=2:x=(w-text_w)/2:y=250:{wa}")
open('/tmp/f.txt','w').write(",\n".join(f))
subprocess.run(["ffmpeg","-y","-v","error","-i",SRC,"-filter_script:v","/tmp/f.txt","-c:v","libx264","-crf","24","-maxrate","8M","-bufsize","16M","-preset","medium","-pix_fmt","yuv420p","-c:a","copy",OUT],check=True)
