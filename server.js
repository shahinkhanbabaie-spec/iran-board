const express=require('express'), multer=require('multer'), fs=require('fs'), path=require('path');
const app=express(), PORT=process.env.PORT||3000;
const DATA=path.join(__dirname,'data','orders.json'); fs.mkdirSync(path.dirname(DATA),{recursive:true}); if(!fs.existsSync(DATA))fs.writeFileSync(DATA,'[]');
const upload=multer({dest:path.join(__dirname,'uploads'),limits:{fileSize:25*1024*1024}});
app.use(express.json()); app.use(express.urlencoded({extended:true})); app.use(express.static(path.join(__dirname,'public')));
const read=()=>JSON.parse(fs.readFileSync(DATA,'utf8')); const write=x=>fs.writeFileSync(DATA,JSON.stringify(x,null,2));
function code(){return 'IB-'+new Date().toISOString().slice(2,10).replaceAll('-','')+'-'+Math.floor(1000+Math.random()*9000)}
app.post('/api/orders',upload.fields([{name:'altiumFiles',maxCount:15},{name:'imageFiles',maxCount:15}]),(req,res)=>{let a=read(), tracking=code(); while(a.some(x=>x.tracking===tracking))tracking=code(); const f=req.files||{}; const order={id:Date.now(),tracking,createdAt:new Date().toISOString(),status:'در انتظار بررسی',customer:{name:req.body.name||'',mobile:req.body.mobile||'',company:req.body.company||''},pcb:{layers:req.body.layers,size:req.body.size,thickness:req.body.thickness,material:req.body.material,qty:req.body.qty,mask:req.body.mask,notes:req.body.notes},files:[...(f.altiumFiles||[]).map(x=>({name:x.originalname,file:x.filename,type:'altium'})),...(f.imageFiles||[]).map(x=>({name:x.originalname,file:x.filename,type:'image'}))],price:null,messages:[]}; a.unshift(order);write(a);res.json({ok:true,tracking})});
app.get('/api/track/:code',(req,res)=>{const o=read().find(x=>x.tracking.toLowerCase()===req.params.code.toLowerCase()); if(!o)return res.status(404).json({ok:false});res.json({ok:true,order:o})});
app.get('/api/admin/orders',(req,res)=>res.json(read()));
app.patch('/api/admin/orders/:id',(req,res)=>{let a=read(),o=a.find(x=>String(x.id)===req.params.id);if(!o)return res.sendStatus(404);Object.assign(o,req.body);write(a);res.json(o)});

app.post('/api/admin/orders/:id/message',(req,res)=>{
 let a=read(),o=a.find(x=>String(x.id)===req.params.id); if(!o)return res.sendStatus(404);
 const text=(req.body.text||'').trim(); if(!text)return res.status(400).json({ok:false});
 o.messages=o.messages||[]; o.messages.push({from:'admin',text,at:new Date().toISOString()});
 if(req.body.status)o.status=req.body.status; write(a); res.json({ok:true,order:o});
});
app.post('/api/orders/:code/reply',upload.fields([{name:'extraFiles',maxCount:10}]),(req,res)=>{
 let a=read(),o=a.find(x=>x.tracking.toLowerCase()===req.params.code.toLowerCase()); if(!o)return res.sendStatus(404);
 o.messages=o.messages||[]; const text=(req.body.text||'').trim();
 if(text)o.messages.push({from:'customer',text,at:new Date().toISOString()});
 const f=(req.files&&req.files.extraFiles)||[]; o.files=o.files||[];
 f.forEach(x=>o.files.push({name:x.originalname,file:x.filename,type:'extra'}));
 if(text||f.length)o.status='اطلاعات تکمیلی دریافت شد'; write(a); res.json({ok:true});
});
app.post('/api/admin/agent',(req,res)=>{
 const q=(req.body.question||'').trim(), a=read();
 const incomplete=a.filter(x=>x.status.includes('تکمیل'));
 const pending=a.filter(x=>x.status.includes('انتظار'));
 let answer='در نسخه آزمایشی می‌توانم سفارش‌ها را خلاصه کنم. ';
 if(/تکمیل|ناقص/.test(q)) answer+= incomplete.length?`${incomplete.length} سفارش نیازمند تکمیل است: `+incomplete.map(x=>x.tracking).join('، '):'سفارش نیازمند تکمیلی ثبت نشده است.';
 else if(/انتظار|جدید|اولویت/.test(q)) answer+= pending.length?`${pending.length} سفارش در انتظار بررسی است: `+pending.slice(0,5).map(x=>x.tracking).join('، '):'سفارش در انتظار بررسی ندارید.';
 else answer+=`در حال حاضر ${a.length} سفارش ثبت شده، ${pending.length} مورد در انتظار بررسی و ${incomplete.length} مورد نیازمند تکمیل است.`;
 res.json({ok:true,answer});
});

app.listen(PORT,()=>console.log('IranBoard running: http://localhost:'+PORT));
