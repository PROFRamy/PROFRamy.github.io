/* OMEGA lesson media: HTTPS links only; files are hosted outside Firestore.
   Rendering uses DOM creation, textContent and verified URLs (never raw HTML).
   No privileged uploads or storage tokens are included in the static website. */
export const MEDIA_LIMIT=12;
export const MEDIA_TITLE_MAX=100;
export const MEDIA_URL_MAX=1200;
export const MEDIA_TYPES=Object.freeze({
  image:{name:"صورة تعليمية",icon:"🖼️"},
  audio:{name:"تسجيل صوتي",icon:"🎧"},
  pdf:{name:"ملف PDF",icon:"📄"}
});

export function mediaUrl(raw){
 if(typeof raw!=="string"||!raw||raw.length>MEDIA_URL_MAX||raw.trim()!==raw)return "";
 try{
  const u=new URL(raw);
  return u.protocol==="https:"&&!u.username&&!u.password&&!/[\u0000-\u0020]/.test(raw)?u.href:"";
 }catch(_){return ""}
}
export function checkMediaItem(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const {type,title,url}=value;
 if(typeof type!=="string"||!Object.hasOwn(MEDIA_TYPES,type))return null;
 if(typeof title!=="string"||!title.trim()||title.length>MEDIA_TITLE_MAX)return null;
 const safe=mediaUrl(url);
 if(!safe)return null;
 return {type,title:title.trim(),url:safe};
}
export function checkMediaList(items){
 if(!Array.isArray(items)||items.length>MEDIA_LIMIT)return null;
 const clean=[];
 for(const item of items){
  const one=checkMediaItem(item);
  if(!one)return null;
  clean.push(one);
 }
 return clean;
}
const node=(tag,cls,txt)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
};
function link(href,label){
 const a=node("a","omega-media-external",label+" ↗");
 a.href=href;
 a.rel="noopener noreferrer";
 a.referrerPolicy="no-referrer";
 return a;
}
function imageCard(m){
 const el=node("figure","omega-media-card omega-media-image");
 const img=node("img","omega-media-img");
 img.src=m.url;img.alt=m.title;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
 const fallback=node("p","omega-media-error","الصورة غير متاحة للعرض حاليًا. يمكنك فتح رابطها مباشرة.");
 fallback.hidden=true;
 img.addEventListener("error",()=>{img.hidden=true;fallback.hidden=false});
 const caption=node("figcaption","omega-media-caption",m.title);
 const open=node("button","omega-media-zoom","تكبير الصورة");open.type="button";
 open.addEventListener("click",()=>zoomImage(m));
 el.append(img,fallback,caption,open,link(m.url,"فتح الصورة"));
 return el;
}
function zoomImage(m){
 const dialog=node("dialog","omega-media-dialog");
 const box=node("div","omega-media-dialog-body");
 const close=node("button","omega-media-close","إغلاق ✕");close.type="button";
 close.addEventListener("click",()=>dialog.close());
 const img=node("img","omega-media-full");img.src=m.url;img.alt=m.title;
 img.referrerPolicy="no-referrer";
 box.append(close,img,node("p","omega-media-caption",m.title));
 dialog.append(box);
 dialog.addEventListener("close",()=>dialog.remove());
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
 document.body.append(dialog);
 if(typeof dialog.showModal==="function")dialog.showModal();
 else dialog.open=true;
}
function audioCard(m){
 const el=node("section","omega-media-card omega-media-audio");
 const header=node("div","omega-media-title","🎧 "+m.title);
 const audio=node("audio","omega-media-player");
 audio.controls=true;audio.preload="none";audio.src=m.url;
 audio.setAttribute("aria-label","تشغيل التسجيل الصوتي: "+m.title);
 audio.addEventListener("error",()=>{
  const msg=el.querySelector(".omega-media-error");
  if(msg)msg.hidden=false;
 });
 const err=node("p","omega-media-error","تعذر تشغيل الصوت داخل الصفحة؛ جرّب رابط الملف.");
 err.hidden=true;
 el.append(header,audio,err,link(m.url,"فتح التسجيل"));
 return el;
}
function pdfEmbedUrl(href){
 const u=new URL(href);
 // Google Drive share pages are not raw PDF URLs. Use Drive's supported preview form.
 if(u.hostname==="drive.google.com"){
  const match=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})\/(?:view|preview)?\/?$/);
  if(match)return "https://drive.google.com/file/d/"+match[1]+"/preview";
 }
 return href;
}
function pdfCard(m){
 const el=node("section","omega-media-card omega-media-pdf");
 const title=node("div","omega-media-title","📄 "+m.title);
 const viewer=node("iframe","omega-media-frame");
 viewer.src=pdfEmbedUrl(m.url);
 viewer.title="معاينة PDF: "+m.title;
 viewer.loading="lazy";
 viewer.referrerPolicy="no-referrer";
 viewer.setAttribute("sandbox","allow-downloads");
 const help=node("p","omega-media-caption","إذا لم تظهر المعاينة، افتح الملف من الرابط. بعض خدمات الاستضافة تمنع العرض داخل المواقع الأخرى.");
 el.append(title,viewer,help,link(m.url,"فتح ملف PDF"));
 return el;
}
export function renderMedia(container,rawItems){
 container.replaceChildren();
 const items=Array.isArray(rawItems)?rawItems.map(checkMediaItem).filter(Boolean).slice(0,MEDIA_LIMIT):[];
 if(!items.length){container.hidden=true;return}
 container.hidden=false;
 container.append(node("h3","omega-media-heading","مرفقات الدرس"));
 const grid=node("div","omega-media-grid");
 for(const m of items){
  grid.append(m.type==="image"?imageCard(m):m.type==="audio"?audioCard(m):pdfCard(m));
 }
 container.append(grid);
}
