from PIL import Image, ImageDraw
import numpy as np
def trim(im):
    a=np.array(im.convert('RGBA'));ys,xs=np.where(a[:,:,3]>10);return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def save(im,n,H=600):
    im=trim(im);s=H/im.height;im=im.resize((max(1,int(im.width*s)),H),Image.LANCZOS);im.save(f'logos/t_{n}.png');print(n,im.size)
save(Image.open('logos/cska_t.png'),'cska')
save(Image.open('logos/zvezda.png'),'zvezda')
save(Image.open('logos/univ.png'),'univ')
save(Image.open('logos/luch.png'),'luch')
a=Image.open('logos/astr.jpg').convert('RGBA');m=Image.new('L',a.size,0);ImageDraw.Draw(m).ellipse((14,14,a.width-14,a.height-14),fill=255);a.putalpha(m);save(a,'astr')
