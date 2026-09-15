const express=require('express'), multer=require('multer'), fs=require('fs'), path=require('path');
const app=express(), PORT=process.env.PORT||8080;
const DATA=path.join(__dirname,'data','orders.json');
const UP=path.join(__dirname,'uploads');
fs.mkdirSync(path.dirname(DATA),{recursive:true}); fs.mkdirSync(UP,{recursive:true});
if(!fs.existsSync(DATA)) fs.writeFileSync(DATA,'[]');
const upload=multer({dest:UP,limits:{fileSize:40*1024*1024,files:30}});
app.use(express.json({limit:'2mb'})); app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
const read=()=>{try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch(e){return []}};
const write=x=>fs.writeFileSync(DATA,JSON.stringify(x,null,2));
const code=()=>`IB-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(1000+Math.random()*9000)}`;
app.post('/api/orders',upload.fields([{name:'altiumFiles',maxCount:15},{name:'imageFiles',maxCount:15}]),(req,res)=>{
  const a=read(), tracking=code(), f=req.files||{};
  const files=[...(f.altiumFiles||[]).map(x=>({name:x.originalname,file:x.filename,type:'altium'})),
               ...(f.imageFiles||[]).map(x=>({name:x.originalname,file:x.filename,type:'image'}))];
  const o={id:Date.now(),tracking,createdAt:new Date().toISOString(),status:'در انتظار بررسی',
    customer:{name:req.body.name||'',company:req.body.company||'',phone:req.body.phone||'',email:req.body.email||''},
    project:{title:req.body.title||'',quantity:req.body.quantity||'',layers:req.body.layers||'',material:req.body.material||'FR-4',
      thickness:req.body.thickness||'',copper:req.body.copper||'',finish:req.body.finish||'',notes:req.body.notes||''},
    files,messages:[],price:null,proforma:null};
  a.unshift(o); write(a); res.json({ok:true,tracking,order:o});
});
app.get('/api/track/:code',(req,res)=>{const o=read().find(x=>x.tracking.toLowerCase()===req.params.code.toLowerCase()); if(!o)return res.sendStatus(404);res.json({order:o})});
app.get('/api/admin/orders',(req,res)=>res.json(read()));
app.patch('/api/admin/orders/:id',(req,res)=>{let a=read(),o=a.find(x=>String(x.id)===req.params.id);if(!o)return res.sendStatus(404);Object.assign(o,req.body);write(a);res.json({ok:true,order:o})});
app.post('/api/admin/orders/:id/message',(req,res)=>{let a=read(),o=a.find(x=>String(x.id)===req.params.id);if(!o)return res.sendStatus(404);let text=(req.body.text||'').trim();if(!text)return res.status(400).json({ok:false});o.messages=o.messages||[];o.messages.push({from:'admin',text,at:new Date().toISOString()});if(req.body.status)o.status=req.body.status;write(a);res.json({ok:true,order:o})});
app.post('/api/orders/:code/reply',upload.fields([{name:'extraFiles',maxCount:10}]),(req,res)=>{let a=read(),o=a.find(x=>x.tracking.toLowerCase()===req.params.code.toLowerCase());if(!o)return res.sendStatus(404);let text=(req.body.text||'').trim();o.messages=o.messages||[];if(text)o.messages.push({from:'customer',text,at:new Date().toISOString()});o.files=o.files||[];((req.files&&req.files.extraFiles)||[]).forEach(x=>o.files.push({name:x.originalname,file:x.filename,type:'extra'}));if(text||((req.files&&req.files.extraFiles)||[]).length)o.status='اطلاعات تکمیلی دریافت شد';write(a);res.json({ok:true})});
app.get('/api/admin/agent',(req,res)=>{const a=read();res.json({total:a.length,new:a.filter(x=>x.status==='در انتظار بررسی').length,need:a.filter(x=>x.status.includes('تکمیل')).length,priced:a.filter(x=>x.price).length})});
app.listen(PORT,'0.0.0.0',()=>console.log('IranBoard V3 running on',PORT));
