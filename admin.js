// OMEGA administrator console. The Firestore rules, not this interface, enforce privileges.
import { bindRichToolbar, setEditorContent, editorResult } from "./omega-rich.js?v=20261115-rich1";
import { MEDIA_LIMIT, MEDIA_TYPES, checkMediaList, mediaUrl, renderMedia, audioSourcePlan } from "./omega-media.js?v=20261115-audio2";
const $=id=>document.getElementById(id);
const primary=["الصف الأول الابتدائي","الصف الثاني الابتدائي","الصف الثالث الابتدائي","الصف الرابع الابتدائي","الصف الخامس الابتدائي","الصف السادس الابتدائي"];
const prep=["الصف الأول الإعدادي","الصف الثاني الإعدادي","الصف الثالث الإعدادي"];
const typeNames={lesson:"درس",exercise:"تدريب",revision:"مراجعة",announcement:"إعلان"};
const deptNames={english:"اللغة الإنجليزية",english_translation:"اللغة الإنجليزية والترجمة",french:"اللغة الفرنسية",other:"قسم آخر"};
const stageNames={primary:"المرحلة الابتدائية",preparatory:"المرحلة الإعدادية",university:"المرحلة الجامعية"};
const knownSubjects=/^(قصة|القصة|قواعد|القواعد|صوتيات|الصوتيات|ترجمة|الترجمة|الأدب|أدب|دراما|شعر|رواية|نصوص|نحو|قراءة|علم اللغة|علم اللغة النصي|لسانيات|تكنولوجيا المعلومات|اللغة العربية|اللغة الإنجليزية|اللغة الفرنسية|فرنسية الصحافة|قصة قصيرة|الترجمة من الإنجليزية إلى العربية|Grammar|Story|Phonetics|Linguistics|Literature|Drama|Poetry|Translation|ICT)$/i;
function inferSubject(item){
 const named=tidy(item.subject||"");if(named)return named;
 const first=String(item.title||"").split(/\s+[-–—]\s+|[:：]/)[0].trim();
 return knownSubjects.test(first)?first:"مواد غير مصنفة";
}

/* External media attachments are metadata only: no file bytes, tokens or secret keys. */
function mediaCount(){
 const count=$("mediaRows").children.length;
 $("mediaCount").textContent=count+" / "+MEDIA_LIMIT+" مرفقات";
 $("addMedia").disabled=count>=MEDIA_LIMIT;
 $("mediaPreview").hidden=true;
 $("mediaAlert").textContent="";
}
function addMediaRow(item={}){
 if($("mediaRows").children.length>=MEDIA_LIMIT)return;
 const box=document.createElement("div");box.className="omega-media-row";
 const typeLabel=document.createElement("label");typeLabel.textContent="نوع المرفق";
 const type=document.createElement("select");type.className="omega-media-type";
 for(const [value,meta] of Object.entries(MEDIA_TYPES)){
  const option=new Option(meta.icon+" "+meta.name,value);type.add(option);
 }
 type.value=Object.hasOwn(MEDIA_TYPES,item.type)?item.type:"image";
 typeLabel.append(type);
 const titleLabel=document.createElement("label");titleLabel.textContent="اسم المرفق";
 const title=document.createElement("input");title.className="omega-media-titlefield";
 title.type="text";title.maxLength=100;title.value=item.title||"";
 title.placeholder="مثال: شرح المحاضرة الأولى";titleLabel.append(title);
 const urlLabel=document.createElement("label");urlLabel.className="omega-media-linkfield";
 urlLabel.textContent="رابط الملف HTTPS";
 const url=document.createElement("input");url.className="omega-media-urlfield";
 url.type="url";url.maxLength=1200;url.value=item.url||"";url.dir="ltr";
 url.placeholder="https://example.com/lesson.mp3";urlLabel.append(url);
 const advice=document.createElement("p");advice.className="omega-media-advice";advice.setAttribute("role","status");
 function refreshAdvice(){
  if(type.value!=="audio"){advice.textContent="";advice.hidden=true;return}
  advice.hidden=false;
  if(!url.value.trim()){advice.textContent="💡 الصوت يحتاج رابطًا مباشرًا لملف MP3/M4A أو رابط مشاركة Google Drive عام.";return}
  advice.textContent=audioSourcePlan(url.value.trim()).hint;
 }
 type.addEventListener("change",refreshAdvice);
 url.addEventListener("input",refreshAdvice);
 refreshAdvice();
 const actions=document.createElement("div");actions.className="omega-media-actions";
 const up=document.createElement("button");up.type="button";up.textContent="↑ لأعلى";up.setAttribute("aria-label","تحريك المرفق لأعلى");
 const down=document.createElement("button");down.type="button";down.textContent="↓ لأسفل";down.setAttribute("aria-label","تحريك المرفق لأسفل");
 const remove=document.createElement("button");remove.type="button";remove.textContent="حذف";remove.setAttribute("aria-label","حذف المرفق");
 for(const b of [up,down]){b.style.color="#16803c";b.style.borderColor="#b7dcca";b.style.background="#eef9f0"}
 up.addEventListener("click",()=>{const before=box.previousElementSibling;if(before){box.parentNode.insertBefore(box,before);mediaCount()}});
 down.addEventListener("click",()=>{const next=box.nextElementSibling;if(next){box.parentNode.insertBefore(next,box);mediaCount()}});
 remove.addEventListener("click",()=>{box.remove();mediaCount()});
 actions.append(up,down,remove);
 box.append(typeLabel,titleLabel,urlLabel,advice,actions);
 $("mediaRows").append(box);
 mediaCount();
}
function loadMediaRows(items){
 $("mediaRows").replaceChildren();
 const safe=checkMediaList(items);
 for(const item of safe||[])addMediaRow(item);
 mediaCount();
}
function collectMedia(){
 const entries=[];
 for(const [index,row] of [...$("mediaRows").children].entries()){
  const type=row.querySelector(".omega-media-type").value;
  const title=row.querySelector(".omega-media-titlefield").value.trim();
  const url=row.querySelector(".omega-media-urlfield").value.trim();
  if(!title&&!url)continue;
  const approved=mediaUrl(url);
  if(!title||title.length>100||!approved)throw Error("المرفق "+(index+1)+": اكتب اسمًا واضحًا ورابط HTTPS مباشرًا وصحيحًا.");
  entries.push({type,title,url:approved});
 }
 const safe=checkMediaList(entries);
 if(!safe)throw Error("المرفقات غير صالحة أو تجاوزت 12 مرفقًا.");
 return safe;
}
$("addMedia").addEventListener("click",()=>addMediaRow());
$("mediaPreviewButton").addEventListener("click",()=>{
 try{
  const entries=collectMedia();
  if(!entries.length){$("mediaAlert").textContent="أضف مرفقًا واحدًا على الأقل لمعاينته.";return}
  renderMedia($("mediaPreview"),entries);
 }catch(err){$("mediaAlert").textContent=err.message}
});

function updateSubjectVisibility(){
 const needsSubject=$("contentType").value!=="announcement";
 $("subjectBox").hidden=!needsSubject;
 $("contentSubject").required=needsSubject;
}
const cfg=window.OMEGA_FIREBASE_CONFIG||{};
let auth,db,authApi,store,unsubscribe=null,isSaving=false,items=[],adminReady=false,editingOriginal=null;
const richControls=bindRichToolbar($("richEditor"),$("richToolbar"),$("richCounter"),$("richPreview"),$("richPreviewButton"));

function message(id,text,kind=""){
 const el=$(id);el.textContent=text;el.className="note"+(kind?" "+kind:"");
}
const tidy=value=>String(value||"").trim().replace(/\s+/g," ");
function safeUrl(value){
 if(!value)return "";
 try{const url=new URL(value);return url.protocol==="https:"&&url.username===""&&url.password===""&&value.length<=1200?url.href:""}catch(_){return ""}
}
function updateTargets(){
 const stage=$("targetStage").value;
 $("gradeBox").hidden=stage==="university";
 $("universityBox").hidden=stage!=="university";
 if(stage!=="university"){
  const values=stage==="primary"?primary:prep;
  const prev=$("targetGrade").value;
  $("targetGrade").replaceChildren(...values.map(name=>new Option(name,name)));
  if(values.includes(prev))$("targetGrade").value=prev;
 }
 $("otherBox").hidden=stage!=="university"||$("targetDepartment").value!=="other";
 previewPlacement();
}
$("targetStage").addEventListener("change",updateTargets);
$("targetDepartment").addEventListener("change",updateTargets);
$("contentType").addEventListener("change",updateSubjectVisibility);
$("targetGrade").addEventListener("change",previewPlacement);
$("targetLevel").addEventListener("change",previewPlacement);
$("otherDepartment").addEventListener("input",previewPlacement);
updateTargets();updateSubjectVisibility();
function readTarget(){
 const stage=$("targetStage").value;
 let grade="",department="",level="",departmentOther="";
 if(stage==="primary"||stage==="preparatory"){
  grade=$("targetGrade").value;
  const permitted=stage==="primary"?primary:prep;
  if(!permitted.includes(grade))throw Error("اختار الصف الدراسي الصحيح.");
 }else{
  department=$("targetDepartment").value;
  level=$("targetLevel").value;
  if(!Object.hasOwn(deptNames,department))throw Error("اختار قسمًا جامعيًا صحيحًا.");
  if(!["المستوى الأول","المستوى الثاني","المستوى الثالث","المستوى الرابع","خريج جامعي"].includes(level))throw Error("اختار المستوى الدراسي.");
  if(department==="other"){
   departmentOther=tidy($("otherDepartment").value);
   if(departmentOther.length<2||departmentOther.length>70)throw Error("اسم القسم الآخر يجب أن يكون من حرفين إلى 70 حرفًا.");
  }
 }
 const audienceKey=stage==="university"?
  ("university|"+department+"|"+(department==="other"?departmentOther+"|":"")+level):
  (stage+"|"+grade);
 return {stage,grade,department,level,departmentOther,audienceKey};
}
function targetLabel(item){
 if(item.stage==="primary"||item.stage==="preparatory")return stageNames[item.stage]+" • "+(item.grade||"صف غير محدد");
 if(item.stage==="university")return "المرحلة الجامعية • "+(item.department==="other"?item.departmentOther||"قسم آخر":deptNames[item.department]||item.department)+" • "+(item.level||"مستوى غير محدد");
 return "مجموعة غير محددة";
}
function previewPlacement(){
 const label=$("targetPreviewLabel"),text=$("targetPreviewText"),help=$("targetPreviewHelp"),box=$("targetPreview");
 let target;
 try{target=readTarget()}catch(_){
  box.classList.remove("changed");label.textContent="المجموعة المستهدفة";text.textContent="أكمل بيانات القسم أو المستوى لتحديد مكان المحتوى.";help.textContent="";$("saveContent").textContent=$("editingId").value?"حفظ التعديلات":"حفظ المحتوى";return;
 }
 const moved=!!(editingOriginal&&editingOriginal.audienceKey!==target.audienceKey);
 box.classList.toggle("changed",moved);
 label.textContent=moved?"سيتم نقل المحتوى إلى":editingOriginal?"مكان المحتوى الحالي":"سيظهر المحتوى لدى";
 text.textContent=targetLabel(target);
 help.textContent=moved?"المكان السابق: "+editingOriginal.label+" — لن يظهر المحتوى للطلاب هناك بعد الحفظ.":editingOriginal?"يمكنك تغيير المرحلة أو القسم أو المستوى، ثم حفظ التعديلات.":"سيظهر المحتوى لهذه المجموعة فقط عند نشره.";
 if(!isSaving)$("saveContent").textContent=moved?"حفظ ونقل المحتوى":editingOriginal?"حفظ التعديلات":"حفظ المحتوى";
}
function resetEditor(){
 $("contentForm").reset();$("editingId").value="";editingOriginal=null;$("placementTip").hidden=true;updateSubjectVisibility();
 setEditorContent($("richEditor"),"","");richControls.clear();loadMediaRows([]);
 $("editorHeading").textContent="إضافة محتوى جديد";updateTargets();
 message("formStatus","اختر المجموعة المستهدفة ثم احفظ المحتوى أو المسودة.");
}
$("cancelEdit").addEventListener("click",resetEditor);
function setBusy(busy){
 isSaving=busy;$("saveContent").disabled=busy;
 if(busy)$("saveContent").textContent="جاري الحفظ...";
 else previewPlacement();
}
function element(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function displayItems(){
 const host=$("contentList");host.replaceChildren();
 $("contentCount").textContent=items.length+" عناصر";
 if(!items.length){host.append(element("div","empty","لا يوجد محتوى بعد. أضف أول درس أو مراجعة."));return}
 for(const item of items){
  const box=element("article","item");
  const state=element("span","pill"+(item.published?"":" draft"),item.published?"منشور":"مسودة");
  const title=element("h3","",item.title||"بدون عنوان");
  const snippet=String(item.description||"").trim();
  const desc=element("p","",snippet.length>210?snippet.slice(0,210)+"…":snippet);
  const details=element("div","meta",(typeNames[item.type]||"محتوى")+" • "+(item.type==="announcement"?"":"المادة: "+inferSubject(item)+" • ")+targetLabel(item));
  const actions=element("div","buttons");
  const edit=element("button","btn light","تعديل التفاصيل");edit.type="button";
  edit.addEventListener("click",()=>editItem(item));
  const move=element("button","btn move","📍 تغيير المكان");move.type="button";
  move.addEventListener("click",()=>editItem(item,true));
  const del=element("button","btn red","حذف");del.type="button";
  del.addEventListener("click",()=>deleteItem(item));
  actions.append(edit,move,del);
  box.append(state,title,details,desc);
  if(item.url&&safeUrl(item.url)){const link=element("a","url-text","فتح الرابط المرفق");link.href=safeUrl(item.url);link.target="_blank";link.rel="noopener noreferrer";box.append(link)}
  box.append(actions);host.append(box);
 }
}
function editItem(item,focusPlacement=false){
 $("editingId").value=item.id;editingOriginal={audienceKey:item.audienceKey,label:targetLabel(item)};
 $("contentType").value=item.type;updateSubjectVisibility();
 $("contentSubject").value=item.type==="announcement"?"":inferSubject(item);
 $("targetStage").value=item.stage;updateTargets();
 if(item.stage==="university"){
  $("targetDepartment").value=item.department;updateTargets();
  $("otherDepartment").value=item.departmentOther||"";
  $("targetLevel").value=item.level;
 }else $("targetGrade").value=item.grade;
 $("contentTitle").value=item.title;
 setEditorContent($("richEditor"),item.richHtml||"",item.description||"");
 richControls.clear();loadMediaRows(item.media||[]);
 $("contentUrl").value=item.url||"";$("isPublished").checked=!!item.published;
 $("editorHeading").textContent=focusPlacement?"تغيير مكان ظهور المحتوى":"تعديل المحتوى";
 $("placementTip").hidden=false;
 previewPlacement();
 message("formStatus",focusPlacement?"غيّر المرحلة الدراسية أو القسم أو المستوى، ثم احفظ المحتوى.":"يمكنك تعديل التفاصيل أو تغيير مكان ظهور المحتوى ثم حفظ التعديلات.");
 if(focusPlacement){
  $("targetStage").scrollIntoView({behavior:"smooth",block:"center"});
  $("targetStage").focus({preventScroll:true});
 }else $("editorHeading").scrollIntoView({behavior:"smooth",block:"start"});
}
async function deleteItem(item){
 if(!adminReady||!confirm("حذف المحتوى «"+item.title+"» نهائيًا؟"))return;
 try{
  await store.deleteDoc(store.doc(db,"contentItems",item.id));
  message("formStatus","تم حذف المحتوى.","good");
  if($("editingId").value===item.id)resetEditor();
 }catch(err){message("formStatus","تعذر الحذف. تحقق من صلاحيات المدير وحاول مرة أخرى.","error")}
}
$("contentForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!adminReady||isSaving)return;
 const title=tidy($("contentTitle").value);
 const type=$("contentType").value;
 const subject=type==="announcement"?"":tidy($("contentSubject").value);
 if(type!=="announcement"&&(subject.length<2||subject.length>70)){message("formStatus","اكتب اسم المادة الدراسية من حرفين إلى 70 حرفًا حتى تظهر الدروس داخل المادة الصحيحة.","error");$("contentSubject").focus();return}
 const rich=editorResult($("richEditor"));
 const description=rich.text.slice(0,6000);
 const richHtml=rich.html;
 if(!rich.valid||rich.textLength>40000){
  message("formStatus","المحتوى طويل جدًا بالنسبة إلى درس واحد (الحد 40 ألف حرف، وحجم التنسيق 60 ألف حرف). قسّم الشرح إلى محاضرتين.","error");return;
 }
 let media;
 try{media=collectMedia()}catch(err){$("mediaAlert").textContent=err.message;message("formStatus",err.message,"error");return}
 const inputUrl=$("contentUrl").value.trim();
 const url=safeUrl(inputUrl);
 if(title.length<3||title.length>140){message("formStatus","اكتب عنوانًا من 3 إلى 140 حرفًا.","error");return}
 if(!rich.text&&!inputUrl&&!media.length){message("formStatus","اكتب نص الدرس أو أضف مرفقًا أو رابطًا صحيحًا.","error");return}
 if(inputUrl&&!url){message("formStatus","الرابط يجب أن يكون HTTPS صالحًا وأقل من 1200 حرف.","error");return}
 let target;
 try{target=readTarget()}catch(err){message("formStatus",err.message,"error");return}
 const editing=$("editingId").value;
 const moved=!!(editing&&editingOriginal&&editingOriginal.audienceKey!==target.audienceKey);
 const data={
  type,subject,title,description,richHtml,media,url,published:$("isPublished").checked,
  ...target,updatedAt:store.serverTimestamp()
 };
 if(!Object.hasOwn(typeNames,data.type)){message("formStatus","اختر نوع المحتوى.","error");return}
 setBusy(true);
 try{
  if(editing){
   await store.updateDoc(store.doc(db,"contentItems",editing),data);
  }else{
   await store.addDoc(store.collection(db,"contentItems"),{
    ...data,ownerId:auth.currentUser.uid,createdAt:store.serverTimestamp()
   });
  }
  resetEditor();
  message("formStatus",moved?"تم نقل المحتوى بنجاح إلى: "+targetLabel(target)+(data.published?" — سيظهر للطلاب في المجموعة الجديدة فقط.":" — سيظل مسودة حتى تنشره."):"تم حفظ المحتوى بنجاح.","good");
 }catch(err){
  message("formStatus",err.code==="permission-denied"?
   "تم رفض الحفظ بسبب قواعد Firestore. انشر أحدث ملف firestore.rules الذي يسمح بالمرفقات (media)، وتأكد من صلاحيات المدير.":
   "تعذر حفظ المحتوى. تحقق من الاتصال والحقول ثم حاول مجددًا.","error");
 }finally{setBusy(false)}
});
function logoutView(){
 adminReady=false;if(unsubscribe){unsubscribe();unsubscribe=null}
 $("adminArea").hidden=true;$("loginPane").hidden=false;
}
$("logoutAdmin").addEventListener("click",async()=>{if(auth)await authApi.signOut(auth);logoutView()});
$("adminLogin").addEventListener("submit",async e=>{
 e.preventDefault();if(!auth){message("loginStatus","الاتصال بخدمة الحسابات غير متاح حاليًا.","error");return}
 $("loginBtn").disabled=true;
 try{
  await authApi.signInWithEmailAndPassword(auth,$("adminEmail").value.trim(),$("adminPassword").value);
  $("adminPassword").value="";
 }catch(err){
  message("loginStatus","لم يكتمل تسجيل الدخول. تأكد من البريد وكلمة المرور، ثم حاول مجددًا.","error");
 }finally{$("loginBtn").disabled=false}
});
async function checkAdmin(user){
 if(!user){logoutView();message("loginStatus","سجّل الدخول بحساب المدير المصرح له.");return}
 try{
  const docRef=store.doc(db,"admins",user.uid);
  const snap=await store.getDoc(docRef);
  if(!snap.exists()||snap.data().enabled!==true){
   logoutView();
   message("loginStatus","هذا الحساب غير معتمد كمدير. أضف admins/"+user.uid+" مع enabled = true من وحدة Firebase بواسطة مالك المشروع.","error");
   return;
  }
  adminReady=true;$("loginPane").hidden=true;$("adminArea").hidden=false;
  if(unsubscribe)unsubscribe();
  unsubscribe=store.onSnapshot(store.collection(db,"contentItems"),snapshot=>{
   items=snapshot.docs.map(d=>({id:d.id,...d.data()}));
   items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
   displayItems();
  },err=>message("formStatus","تعذر تحميل المحتوى. تأكد من نشر قواعد Firestore الأخيرة.","error"));
 }catch(err){logoutView();message("loginStatus","تعذر التحقق من صلاحيات الإدارة. تأكد من قواعد Firestore.","error")}
}
async function start(){
 if(!cfg.apiKey||!cfg.projectId||!cfg.appId){
  message("loginStatus","إعداد Firebase غير مكتمل.","error");return;
 }
 try{
  const app=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
  authApi=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
  store=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
  const instance=app.initializeApp(cfg);
  auth=authApi.getAuth(instance);
  db=store.getFirestore(instance);
  authApi.onAuthStateChanged(auth,user=>{checkAdmin(user)});
 }catch(err){message("loginStatus","تعذر الاتصال بـ Firebase. افحص الإنترنت أو إعدادات المتصفح.","error")}
}
start();
