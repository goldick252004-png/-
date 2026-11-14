const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
(async()=>{const mode=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('console',m=>console.log('PAGE',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8765/video.html');const total=await p.evaluate(()=>window.ready);console.log('total',total);
if(mode==='preview'){const ts=process.argv.slice(3).map(Number);fs.mkdirSync('prev',{recursive:true});
 for(const t of ts){const d=await p.evaluate(t=>window.frame(t),t);fs.writeFileSync(`prev/t${t}.jpg`,Buffer.from(d.split(',')[1],'base64'));}}
else{const out=process.argv[3];const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-c:v','mjpeg','-r','25','-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
 const n=Math.round(total*25);for(let i=0;i<n;i++){const d=await p.evaluate(t=>window.frame(t),i/25);if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));if(i%100==0)console.log(i,'/',n);}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));}
await b.close();})();
