from PIL import Image, ImageDraw, ImageOps
import numpy as np
S=600
def trim(im):
    a=np.array(im.convert('RGBA'))
    m=a[:,:,3]>10
    ys,xs=np.where(m); return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def white_to_alpha(im, thr=235):
    im=im.convert('RGBA'); a=np.array(im)
    # flood fill from border on near-white
    from collections import deque
    h,w=a.shape[:2]; white=(a[:,:,:3].min(axis=2)>thr); vis=np.zeros((h,w),bool)
    q=deque([(0,0),(0,w-1),(h-1,0),(h-1,w-1)])
    for p in q: vis[p]=True
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not vis[ny,nx] and white[ny,nx]:
                vis[ny,nx]=True; q.append((ny,nx))
    a[vis,3]=0; return Image.fromarray(a)
def badge(im, name, fill=0.74):
    im=trim(im); c=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(c)
    d.ellipse((0,0,S-1,S-1),fill=(255,255,255,255))
    r=S*fill; sc=min(r/im.width,r/im.height); im=im.resize((int(im.width*sc),int(im.height*sc)),Image.LANCZOS)
    c.alpha_composite(im,((S-im.width)//2,(S-im.height)//2)); c.save(f'logos/b_{name}.png')
# cska: also keep transparent full version
cs=trim(white_to_alpha(Image.open('logos/cska.jpg'))); cs.save('logos/cska_t.png'); badge(cs,'cska',0.78)
badge(Image.open('logos/zvezda.png'),'zvezda',0.84)
a=Image.open('logos/astr.jpg').convert('RGBA'); m=Image.new('L',a.size,0); ImageDraw.Draw(m).ellipse((14,14,a.width-14,a.height-14),fill=255); a.putalpha(m); badge(a,'astr',0.96)
badge(Image.open('logos/univ.png'),'univ',0.80)
badge(Image.open('logos/luch.png'),'luch',0.82)
