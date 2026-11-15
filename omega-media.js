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

/* Identify sharing-page links before passing them to an HTML5 audio player.
   This does not bypass permissions: files must still be public and reachable. */
export function audioSourcePlan(raw){
 const href=mediaUrl(raw);
 if(!href)return {mode:"invalid",hint:"رابط التسجيل غير صالح. استخدم رابط HTTPS صحيحًا."};
 const u=new URL(href);
 const host=u.hostname.toLowerCase();
 if(host==="t.me"||host==="www.t.me"||host==="telegram.me"||host==="www.telegram.me"){
  // Telegram message URLs, including forum-topic links /username/topicId/messageId,
  // are web/app message links, not downloadable MP3 streams.
  const validMessage=/^\/(?:[A-Za-z0-9_]{5,32}|c\/\d+)\/\d+(?:\/\d+)?\/?$/.test(u.pathname);
  return {
   mode:validMessage?"telegram":"unsupported",
   src:href,
   hint:validMessage
    ?"رابط Telegram ده بيفتح رسالة (أو رسالة داخل موضوع)، مش ملف MP3 مباشر. هنظهر زر «الاستماع عبر Telegram» بدل مشغل صوت لا يعمل. لازم يكون للطالب حق الوصول للرسالة."
    :"رابط Telegram لا يبدو كرابط رسالة محددة. انسخ رابط الرسالة نفسها من Telegram، مثل t.me/group/topic/message."
  };
 }
 if(host==="drive.google.com"){
  let id="";
  const m=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/);
  if(m)id=m[1];
  if(!id&&u.pathname==="/open"||!id&&u.pathname==="/uc")id=u.searchParams.get("id")||"";
  if(/^[A-Za-z0-9_-]{10,}$/.test(id)){
   return {mode:"drive",src:"https://drive.google.com/file/d/"+id+"/preview",hint:"رابط Google Drive: نعرض مشغل المعاينة بدل مشغل MP3. قد تمنع إعدادات المشاركة أو قيود Google التشغيل المدمج."};
  }
  return {mode:"unsupported",hint:"الرابط من Google Drive، لكن تعذر تحديد الملف. استخدم رابط مشاركة من نوع /file/d/.../view."};
 }
 if(host==="www.dropbox.com"||host==="dropbox.com"){
  u.searchParams.delete("dl");
  u.searchParams.set("raw","1");
  return {mode:"audio",src:u.href,hint:"سيستخدم الموقع وضع عرض الملف مباشرة من Dropbox (raw=1). يجب أن تكون مشاركة الملف عامة."};
 }
 if(host==="github.com"){
  const m=u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if(m){
   const rawUrl="https://raw.githubusercontent.com/"+m[1]+"/"+m[2]+"/"+m[3]+"/"+m[4];
   return {mode:"audio",src:rawUrl,hint:"تم تحويل رابط صفحة ملف GitHub إلى رابط الملف الخام. لازم يكون المستودع عامًا."};
  }
 }
 return {mode:"audio",src:href,hint:"لازم الرابط يرجّع بيانات ملف صوت فعلي مثل MP3 أو M4A، وليس صفحة مشاركة أو صفحة تسجيل دخول."};
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
 const plan=audioSourcePlan(m.url);
 el.append(header);
 if(plan.mode==="telegram"){
  const message=node("p","omega-media-caption","التسجيل موجود داخل رسالة على Telegram. افتح الرسالة واضغط تشغيل هناك؛ قد تحتاج إلى الاشتراك في الجروب أو تسجيل الدخول إلى Telegram.");
  const button=link(plan.src,"🎧 الاستماع عبر Telegram");
  button.classList.add("omega-media-telegram");
  el.append(message,button);
  return el;
 }
 if(plan.mode==="drive"){
  const frame=node("iframe","omega-media-drive-frame");
  frame.src=plan.src;frame.title="معاينة تسجيل Google Drive: "+m.title;
  frame.loading="lazy";frame.referrerPolicy="no-referrer";
  frame.setAttribute("allow","autoplay");
  frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-popups");
  el.append(frame,node("p","omega-media-caption","مشغّل Google Drive: لو مفيش صوت، تأكد إن مشاركة الملف متاحة لأي شخص لديه الرابط. قد لا يسمح Google بتشغيله داخل مواقع أخرى."),link(m.url,"فتح التسجيل في Google Drive"));
  return el;
 }
 if(plan.mode!=="audio"){
  el.append(node("p","omega-media-error",plan.hint),link(m.url,"فحص رابط التسجيل"));
  return el;
 }
 const audio=node("audio","omega-media-player");
 audio.controls=true;audio.preload="metadata";
 audio.setAttribute("aria-label","تشغيل التسجيل الصوتي: "+m.title);
 const err=node("p","omega-media-error");
 err.hidden=true;
 const retry=node("button","omega-media-retry","إعادة محاولة تشغيل الصوت");
 retry.type="button";retry.hidden=true;
 const guidance=node("p","omega-media-caption");
 guidance.hidden=true;
 function showAudioError(){
  const code=audio.error?.code;
  const explanation=code===2?"حدث خطأ بالشبكة أثناء تحميل الصوت.":code===3?"صيغة الصوت أو بيانات الملف لا يمكن فك ترميزها على جهازك.":code===4?"الرابط لا يحتوي ملفًا صوتيًا مدعومًا، أو الخدمة تمنع تشغيله مباشرة.":"تعذر تحميل التسجيل.";
  err.textContent=explanation+" افتح رابط التسجيل للتأكد أنه يعمل بدون تسجيل دخول.";
  err.hidden=false;retry.hidden=false;
  guidance.textContent=plan.hint;guidance.hidden=false;
 }
 audio.addEventListener("error",showAudioError);
 audio.addEventListener("loadedmetadata",()=>{err.hidden=true;retry.hidden=true;guidance.hidden=true});
 retry.addEventListener("click",()=>{err.hidden=true;retry.hidden=true;audio.load()});
 audio.src=plan.src;
 el.append(audio,err,retry,guidance,link(m.url,"فتح رابط التسجيل للتحقق"));
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
