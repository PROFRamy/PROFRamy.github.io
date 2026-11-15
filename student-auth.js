// OMEGA Student Portal. Firebase Auth manages passwords; Firestore stores only profile metadata.
import { renderRich } from "./omega-rich.js?v=20261115-rich1";
import { renderMedia } from "./omega-media.js?v=20261115-audio2";
const $ = id => document.getElementById(id);
const registerForm = $("registerForm");
const loginForm = $("loginForm");
const regTab = $("regTab");
const loginTab = $("loginTab");
const stages = document.querySelectorAll('input[name="stage"]');
const cfg = window.OMEGA_FIREBASE_CONFIG || {};
const stageNames = {primary:"المرحلة الابتدائية",preparatory:"المرحلة الإعدادية",university:"المرحلة الجامعية"};
const primary = ["الصف الأول الابتدائي","الصف الثاني الابتدائي","الصف الثالث الابتدائي","الصف الرابع الابتدائي","الصف الخامس الابتدائي","الصف السادس الابتدائي"];
const preparatory = ["الصف الأول الإعدادي","الصف الثاني الإعدادي","الصف الثالث الإعدادي"];
const departments = [
 {value:"english",label:"اللغة الإنجليزية"},
 {value:"english_translation",label:"اللغة الإنجليزية والترجمة"},
 {value:"french",label:"اللغة الفرنسية"},
 {value:"other",label:"قسم آخر"}
];
const levels=["المستوى الأول","المستوى الثاني","المستوى الثالث","المستوى الرابع","خريج جامعي"];
let auth=null,db=null,authLib=null,firestoreLib=null,registering=false,loading=false,feedUnsubscribe=null;
const show = (id,visible)=>$(id).classList.toggle("hidden",!visible);
function createOptions(containerId,group,items){
  const container=$(containerId);
  for(const item of items){
    const label=document.createElement("label");
    label.className="opt";
    const radio=document.createElement("input");
    radio.type="radio";radio.name=group;radio.value=typeof item==="string"?item:item.value;
    const span=document.createElement("span");
    span.textContent=typeof item==="string"?item:item.label;
    label.append(radio,span);container.append(label);
  }
}
createOptions("primaryGrades","primaryGrade",primary);
createOptions("prepGrades","prepGrade",preparatory);
createOptions("departments","uniDepartment",departments);
createOptions("uniLevels","uniLevel",levels);
function selectValue(name){return document.querySelector('input[name="'+name+'"]:checked')?.value||""}
function setStage(){
  $("stageError").hidden=true;
  $("stageGrid").classList.remove("has-error");
  const stage=selectValue("stage");
  show("primaryChoices",stage==="primary");
  show("prepChoices",stage==="preparatory");
  show("uniChoices",stage==="university");
  show("uniLevelsBox",stage==="university"&&!!selectValue("uniDepartment"));
  show("departmentOtherBox",stage==="university"&&selectValue("uniDepartment")==="other");
  const groups={primaryGrade:"primary",prepGrade:"preparatory",uniDepartment:"university",uniLevel:"university"};
  for(const [group,value] of Object.entries(groups)){
    if(value!==stage)document.querySelectorAll('input[name="'+group+'"]').forEach(input=>input.checked=false);
  }
}
stages.forEach(radio=>radio.addEventListener("change",setStage));
$("departments").addEventListener("change",()=>{
  const department=selectValue("uniDepartment");
  show("uniLevelsBox",!!department);
  show("departmentOtherBox",department==="other");
  if(department!=="other"){ $("departmentOther").value="";fieldError("departmentOther",""); }
});
function switchTab(type){
  const registration=type==="register";
  show("registerForm",registration);show("loginForm",!registration);
  regTab.classList.toggle("active",registration);
  loginTab.classList.toggle("active",!registration);
  regTab.setAttribute("aria-selected",String(registration));
  loginTab.setAttribute("aria-selected",String(!registration));
  $("formTitle").textContent=registration?"أنشئ حسابك وابدأ":"أهلًا بيك من جديد!";
  $("formHint").textContent=registration?"حدد بياناتك ومرحلتك الدراسية؛ لتظهر لك مساحة التعلم المناسبة.":"ادخل البريد الإلكتروني وكلمة المرور لفتح حسابك.";
}
regTab.addEventListener("click",()=>switchTab("register"));
loginTab.addEventListener("click",()=>switchTab("login"));
$("goRegister").addEventListener("click",()=>switchTab("register"));
document.querySelectorAll(".toggle-pass").forEach(btn=>btn.addEventListener("click",()=>{
  const input=$(btn.dataset.for),hidden=input.type==="password";input.type=hidden?"text":"password";btn.textContent=hidden?"إخفاء":"إظهار";btn.setAttribute("aria-label",hidden?"إخفاء كلمة المرور":"إظهار كلمة المرور");
}));
function notice(id,message,style){
  const node=$(id);node.textContent=message;node.className="notice"+(style?" "+style:"");
}
// Accessible field-level validation: show the exact issue next to its input.
const fieldMessages={
 fullName:"اكتب اسم الطالب (حرفين على الأقل).",
 username:"رقم الموبايل لازم يكون 11 رقمًا، ويبدأ بـ 010 أو 011 أو 012 أو 015.",
 nationalId:"الرقم القومي يجب أن يتكوّن من 14 رقمًا بالضبط، أو اترك الخانة فارغة.",
 regEmail:"اكتب بريدًا إلكترونيًا صحيحًا، مثل student@gmail.com.",
 regPassword:"كلمة المرور لازم تكون 8 أحرف على الأقل.",
 confirmPassword:"تأكيد كلمة المرور غير مطابق. اكتب نفس كلمة المرور.",
 loginEmail:"اكتب بريدك الإلكتروني بصورة صحيحة.",
 loginPassword:"اكتب كلمة المرور الخاصة بحساب اوميجا.",
 departmentOther:"اكتب اسم القسم الآخر من حرفين إلى 70 حرفًا."
};
function fieldError(id,message){
 const input=$(id),node=$(id+"Error");
 if(!input||!node)return;
 input.setAttribute("aria-invalid",message?"true":"false");
 node.textContent=message||"";
 node.hidden=!message;
}
function checkField(id){
 const input=$(id);if(!input)return true;
 let error="";
 if(id==="fullName"&&input.value.trim().length<2)error=fieldMessages[id];
 if(id==="username"&&!/^01[0125][0-9]{8}$/.test(input.value.trim()))error=fieldMessages[id];
 if(id==="nationalId"&&input.value.trim()!==""&&!/^[0-9]{14}$/.test(input.value.trim()))error=fieldMessages[id];
 if((id==="regEmail"||id==="loginEmail")&&(!input.value.trim()||!input.checkValidity()))error=fieldMessages[id];
 if(id==="regPassword"&&input.value.length<8)error=fieldMessages[id];
 if(id==="confirmPassword"&&input.value!==$("regPassword").value)error=fieldMessages[id];
 if(id==="loginPassword"&&!input.value)error=fieldMessages[id];
 if(id==="departmentOther"&&selectValue("stage")==="university"&&selectValue("uniDepartment")==="other"&&(input.value.trim().length<2||input.value.trim().length>70))error=fieldMessages[id];
 fieldError(id,error);return !error;
}
// Keep phone input digits-only, including Arabic/Eastern Arabic numerals pasted from phones.
function normalizeDigits(value,maxLength){
 return String(value).replace(/[٠-٩۰-۹]/g,char=>{
  const code=char.charCodeAt(0);
  return String(code>=0x06F0 ? code-0x06F0 : code-0x0660);
 }).replace(/[^0-9]/g,"").slice(0,maxLength);
}
[["username",11],["nationalId",14]].forEach(([id,maxLength])=>{
 $(id).addEventListener("input",event=>{
   const input=event.currentTarget,cleaned=normalizeDigits(input.value,maxLength);
   if(input.value!==cleaned)input.value=cleaned;
 });
});
Object.keys(fieldMessages).forEach(id=>{
 const input=$(id);if(!input)return;
 input.addEventListener("blur",()=>checkField(id));
 input.addEventListener("input",()=>{
  if(input.getAttribute("aria-invalid")==="true")checkField(id);
  if(id==="regPassword"&&$("confirmPassword").value)checkField("confirmPassword");
 });
});
function validateFields(ids){
 let valid=true,first=null;
 for(const id of ids){if(!checkField(id)){valid=false;first??=$(id)}}
 if(first){first.focus();first.scrollIntoView({behavior:"smooth",block:"center"})}
 return valid;
}
function setBusy(value){
  loading=value;
  const connected=!!auth;
  $("registerSubmit").disabled=value||!connected;
  $("loginSubmit").disabled=value||!connected;
  $("resetPassword").disabled=value||!connected;
  $("registerSubmit").textContent=value?"جاري تنفيذ الطلب…":"إنشاء حساب الطالب";
  $("loginSubmit").textContent=value?"جاري تنفيذ الطلب…":"تسجيل الدخول";
}
function selection(){
  const stage=selectValue("stage"),grade=stage==="primary"?selectValue("primaryGrade"):stage==="preparatory"?selectValue("prepGrade"):"";
  const department=stage==="university"?selectValue("uniDepartment"):"";
  const level=stage==="university"?selectValue("uniLevel"):"";
  const departmentOther=stage==="university"&&department==="other"?$("departmentOther").value.trim().replace(/\s+/g," "):"";
  if(!stage||stage==="secondary")throw Error("⚠️ اختار المرحلة الدراسية أولًا: ابتدائي أو إعدادي أو جامعي.");
  if((stage==="primary"||stage==="preparatory")&&!grade)throw Error("⚠️ اختار الصف الدراسي من الخيارات الظاهرة.");
  if(stage==="university"&&(!department||!level))throw Error("⚠️ اختار القسم الجامعي والمستوى الدراسي.");
  if(stage==="university"&&department==="other"&&!checkField("departmentOther")){
    $("departmentOther").focus();
    throw Error("⚠️ اكتب اسم القسم الآخر في الخانة المخصصة.");
  }
  return {stage,grade,department,level,departmentOther};
}

/* Single-page navigation: subjects, lesson titles and full content stay inside student.html.
   Firebase rules still enforce the student's cohort for every returned document. */
const omegaTypes={lesson:"الدروس",exercise:"التدريبات",revision:"المراجعات",announcement:"الإعلانات"};
const omegaOne={lesson:"درس",exercise:"تدريب",revision:"مراجعة",announcement:"إعلان"};
const omegaSubjects=/^(قصة|القصة|قواعد|القواعد|صوتيات|الصوتيات|ترجمة|الترجمة|الأدب|أدب|دراما|شعر|رواية|نصوص|نحو|قراءة|علم اللغة|علم اللغة النصي|لسانيات|تكنولوجيا المعلومات|اللغة العربية|اللغة الإنجليزية|اللغة الفرنسية|فرنسية الصحافة|قصة قصيرة|الترجمة من الإنجليزية إلى العربية|Grammar|Story|Phonetics|Linguistics|Literature|Drama|Poetry|Translation|ICT)$/i;
let omegaItems=[];
function cohortKey(profile){
 if(profile.stage==="primary"||profile.stage==="preparatory")return profile.stage+"|"+profile.grade;
 if(profile.stage==="university"){
  const other=profile.department==="other"?(String(profile.departmentOther||"").trim().replace(/\s+/g," ")+"|"):"";
  return "university|"+profile.department+"|"+other+profile.level;
 }
 return "";
}
function studySubject(item){
 const selected=String(item.subject||"").trim().replace(/\s+/g," ");
 if(selected)return selected;
 const first=String(item.title||"").split(/\s+[-–—]\s+|[:：]/)[0].trim();
 return omegaSubjects.test(first)?first:"مواد غير مصنفة";
}
function studyElement(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
}
function studyUrl(type=null,subject=null,id=null){
 if(!type)return "";
 const q=new URLSearchParams({type});
 if(subject!==null)q.set("subject",subject);
 if(id!==null)q.set("id",id);
 return "#omega-study?"+q.toString();
}
function studyRoute(){
 const h=location.hash;
 if(!h.startsWith("#omega-study?"))return {type:null,subject:null,id:null};
 const q=new URLSearchParams(h.slice("#omega-study?".length));
 const type=q.get("type");
 if(!Object.hasOwn(omegaTypes,type))return {type:null,subject:null,id:null};
 return {type,subject:q.get("subject"),id:q.get("id")};
}
function studyOpen(type=null,subject=null,id=null){
 const hash=studyUrl(type,subject,id);
 const destination=location.pathname+location.search+hash;
 if(location.pathname+location.search+location.hash!==destination)history.pushState({omegaStudy:true},"",destination);
 studyRender();
 $("dashboard").scrollIntoView({behavior:"smooth",block:"start"});
}
function studySafeHref(raw){
 try{const u=new URL(raw);return u.protocol==="https:"&&!u.username&&!u.password?u.href:""}catch(_){return ""}
}
function studyInline(parent,raw){
 for(const part of String(raw).split(/(\*\*[^*\n]+\*\*)/g)){
  if(!part)continue;
  if(part.startsWith("**")&&part.endsWith("**"))parent.append(studyElement("strong","",part.slice(2,-2)));
  else parent.append(document.createTextNode(part));
 }
}
function studyDescription(parent,text){
 const lines=String(text||"").replace(/\r\n?/g,"\n").split("\n");
 let current=[],bulletList=null;
 function flush(){
  if(!current.length)return;
  const p=studyElement("p","");
  current.forEach((line,i)=>{if(i)p.append(document.createElement("br"));studyInline(p,line)});
  parent.append(p);current=[];
 }
 for(const line of lines){
  const trimmed=line.trim();
  if(!trimmed){flush();bulletList=null;continue}
  const heading=trimmed.match(/^(#{1,4})\s+(.+)$/);
  if(heading){flush();bulletList=null;const el=studyElement(heading[1].length===1?"h2":"h3","");studyInline(el,heading[2]);parent.append(el);continue}
  const bullet=trimmed.match(/^[-•]\s+(.+)$/);
  if(bullet){flush();if(!bulletList){bulletList=studyElement("ul","");parent.append(bulletList)}const li=studyElement("li","");studyInline(li,bullet[1]);bulletList.append(li);continue}
  bulletList=null;current.push(line);
 }
 flush();
}
function studyRender(){
 const route=studyRoute(),active=!!route.type;
 // Remove the right-hand marketing panel only while the full lesson is open.
 document.body.classList.toggle("omega-reading",active&&!!route.id);
 $("studentWelcome").hidden=active;
 $("feedStatus").hidden=active;
 $("dashboardGrid").hidden=active;
 $("studentNavigator").hidden=!active;
 if(!active){document.title="بوابة طلاب اوميجا";return}
 const list=$("navigatorList");list.replaceChildren();
 const type=route.type,items=omegaItems.filter(item=>item.type===type);
 const bread=$("navigatorTrail");bread.replaceChildren();
 const crumb=(text,subject,id)=>{
  bread.append(document.createTextNode(" / "));
  if(subject===undefined)bread.append(document.createTextNode(text));
  else{
   const b=studyElement("button","",text);b.type="button";b.addEventListener("click",()=>studyOpen(type,subject,id));bread.append(b);
  }
 };
 crumb(omegaTypes[type],null,null);
 if(route.subject!==null)crumb(route.subject,null===route.id?undefined:route.subject,null);
 $("navigatorBack").textContent=route.id?"العودة للدروس":route.subject!==null?"العودة للمواد":"العودة للأقسام";
 $("navigatorBack").onclick=()=>route.id?studyOpen(type,route.subject):route.subject!==null?studyOpen(type):studyOpen();
 $("navigatorTitle").textContent=route.id?"الشرح":route.subject!==null?route.subject:type==="announcement"?"الإعلانات":"المواد الدراسية";
 function summary(count){$("navigatorCount").textContent=count+" "+(type==="lesson"?"درس":"عنصر")}
 if(!route.id&&route.subject===null&&type!=="announcement"){
  const groups=new Map();
  for(const item of items){const subject=studySubject(item);if(!groups.has(subject))groups.set(subject,[]);groups.get(subject).push(item)}
  summary(items.length);
  if(!groups.size){list.append(studyElement("p","student-empty","لا يوجد محتوى منشور حاليًا."));return}
  for(const [name,entries] of groups){
   const b=studyElement("button","student-subject");b.type="button";
   b.append(studyElement("span","student-subject-name","📁 "+name),studyElement("span","student-subject-count",entries.length+" "+(type==="lesson"?"دروس":"عناصر")));
   b.addEventListener("click",()=>studyOpen(type,name));list.append(b);
  }
  return;
 }
 const matches=type==="announcement"?items:items.filter(item=>studySubject(item)===route.subject);
 if(!route.id){
  summary(matches.length);
  if(!matches.length){list.append(studyElement("p","student-empty","لا توجد عناوين في هذا القسم حاليًا."));return}
  matches.forEach((item,i)=>{
   const b=studyElement("button","student-lesson");b.type="button";
   b.append(studyElement("span","student-lesson-index",String(i+1)),studyElement("span","student-lesson-title",item.title||"درس جديد"));
   b.addEventListener("click",()=>studyOpen(type,route.subject,item.id));list.append(b);
  });return;
 }
 const item=matches.find(item=>item.id===route.id);
 if(!item){$("navigatorCount").textContent="";list.append(studyElement("p","student-empty","هذا المحتوى غير متاح في مجموعتك حاليًا. قد يكون نُقل أو حُذف."));return}
 $("navigatorTitle").textContent="قراءة "+omegaOne[type];
 $("navigatorCount").textContent=omegaOne[type];
 const article=studyElement("article","student-detail");
 article.append(studyElement("h4","",item.title||"محتوى جديد"));
 const body=studyElement("div","student-detail-body");
 if(typeof item.richHtml==="string"&&item.richHtml.trim()){
  body.classList.add("omega-rich-content");
  renderRich(body,item.richHtml);
 }else if(item.description)studyDescription(body,item.description);
 else body.append(studyElement("p","","لا يوجد شرح نصي لهذا الدرس."));
 article.append(body);
 const attachments=studyElement("section","omega-media-container");
 renderMedia(attachments,item.media||[]);
 article.append(attachments);
 if(item.url){
  const href=studySafeHref(item.url);
  if(href){const a=studyElement("a","student-resource","عرض المرجع المرفق");a.href=href;article.append(a)}
 }
 list.append(article);
}
$("navigatorHome").addEventListener("click",()=>studyOpen());
document.querySelectorAll("[data-omega-type]").forEach(button=>{
 button.addEventListener("click",()=>studyOpen(button.dataset.omegaType));
});
window.addEventListener("popstate",studyRender);
function renderFeed(documents){
 omegaItems=documents.filter(item=>Object.hasOwn(omegaTypes,item.type));
 const totals={lesson:0,exercise:0,revision:0,announcement:0};
 for(const item of omegaItems)totals[item.type]++;
 for(const type of Object.keys(totals))$(type+"Count").textContent=String(totals[type]);
 studyRender();
}
function stopFeed(){
 if(feedUnsubscribe){feedUnsubscribe();feedUnsubscribe=null}
}
function startFeed(profile){
 stopFeed();renderFeed([]);
 if(!db||!firestoreLib){$("feedStatus").textContent="تعذر الاتصال بقاعدة المحتوى.";return}
 const key=cohortKey(profile);
 if(!key){$("feedStatus").textContent="تعذر تحديد المجموعة الدراسية لهذا الحساب.";return}
 $("feedStatus").className="notice";$("feedStatus").textContent="جاري تحميل محتوى صفك أو قسمك الدراسي…";
 const query=firestoreLib.query(
  firestoreLib.collection(db,"contentItems"),
  firestoreLib.where("audienceKey","==",key),
  firestoreLib.where("published","==",true)
 );
 feedUnsubscribe=firestoreLib.onSnapshot(query,snapshot=>{
  const records=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  records.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  renderFeed(records);
  $("feedStatus").className="notice good";
  $("feedStatus").textContent=records.length?
   ("المحتوى الخاص بمجموعتك متاح — "+records.length+" عنصر."):"لا يوجد محتوى منشور لمجموعتك حتى الآن.";
 },err=>{
  $("feedStatus").className="notice error";
  $("feedStatus").textContent=err.code==="permission-denied"?
   "تعذر عرض المحتوى. يرجى التأكد من تحديث قواعد Firestore.":
   "تعذر تحميل المحتوى حاليًا. حاول مجددًا بعد التحقق من الاتصال.";
 });
}

function showAuthentication(){
  document.body.classList.remove("omega-reading");
  stopFeed();omegaItems=[];
  $("authViews").hidden=false;
  $("dashboard").hidden=true;
}
function dashboard(profile){
  $("welcomeName").textContent="أهلًا يا "+(profile.fullName||"طالب اوميجا")+" 👋";
  const tags=$("profileTags");tags.replaceChildren();
  const labels=[stageNames[profile.stage]||"",profile.grade||"",profile.department?(profile.department==="other"?(profile.departmentOther||"قسم آخر"):departments.find(x=>x.value===profile.department)?.label||""):"",profile.level||""].filter(Boolean);
  if(profile.stage==="university")labels.splice(1,0,"كلية الآداب – جامعة طنطا");
  for(const value of labels){const span=document.createElement("span");span.textContent=value;tags.appendChild(span)}
  $("authViews").hidden=true;$("dashboard").hidden=false;
  startFeed(profile);
  studyRender();
}
function explain(error){
  switch(error?.code){
    case "auth/email-already-in-use":return "البريد الإلكتروني مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.";
    case "auth/invalid-email":return "البريد الإلكتروني غير صحيح. راجع كتابة البريد وعلامة @ واسم النطاق.";
    case "auth/weak-password":return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل، ويفضل الجمع بين حروف وأرقام ورموز.";
    case "auth/invalid-credential":case "auth/wrong-password":case "auth/user-not-found":return "بيانات الدخول غير صحيحة.";
    case "auth/too-many-requests":return "محاولات كثيرة. حاول مرة أخرى لاحقًا.";
    case "auth/network-request-failed":return "تعذر الاتصال بالإنترنت. تأكد من اتصالك ثم أعد المحاولة.";
    case "auth/operation-not-allowed":return "طريقة تسجيل الدخول غير مفعلة حاليًا. تواصل مع إدارة اوميجا.";
    case "auth/unauthorized-domain":return "الموقع غير مصرح له بتسجيل الدخول. تواصل مع الإدارة.";
    case "auth/popup-blocked":return "المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مجددًا.";
    case "auth/popup-closed-by-user":return "تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية. حاول مرة أخرى.";
    case "auth/account-exists-with-different-credential":return "هذا البريد مرتبط بطريقة دخول مختلفة. جرّب الطريقة التي سجلت بها أول مرة.";
    case "permission-denied":return "تعذر حفظ بيانات الطالب. تأكد من إعداد قواعد Firestore أو تواصل مع الإدارة.";
    default:return "تعذر إكمال العملية. راجع إعدادات الخدمة، أو حاول مرة أخرى.";
  }
}
async function loadProfile(user){
  const ref=firestoreLib.doc(db,"students",user.uid);
  const snap=await firestoreLib.getDoc(ref);
  if(snap.exists())dashboard(snap.data());
  else{
    showAuthentication();switchTab("login");
    notice("loginNotice","حساب الدخول موجود، لكن ملف الطالب غير مكتمل. تواصل مع الإدارة لإصلاحه.","error");
  }
}
registerForm.addEventListener("submit",async event=>{
  event.preventDefault();if(!auth||loading)return;
  if(!validateFields(["fullName","username","regEmail","nationalId","regPassword","confirmPassword"])){notice("regNotice","راجع الخانات المحددة بالأحمر وصحح البيانات قبل المتابعة.","error");return}
  let group;try{group=selection()}catch(err){$("stageError").textContent=err.message;$("stageError").hidden=false;$("stageGrid").classList.add("has-error");notice("regNotice",err.message,"error");$("stageError").scrollIntoView({behavior:"smooth",block:"center"});return}
  const fullName=$("fullName").value.trim(),username=$("username").value.trim(),email=$("regEmail").value.trim().toLowerCase();
  const password=$("regPassword").value;
  if(fullName.length<2){notice("regNotice","اكتب اسم الطالب بشكل صحيح.","error");return}
  if(!/^01[0125][0-9]{8}$/.test(username)){fieldError("username",fieldMessages.username);notice("regNotice",fieldMessages.username,"error");return}
  if(password.length<8||password!==$("confirmPassword").value){notice("regNotice","تأكد من تطابق كلمتي المرور، وأنهما 8 أحرف على الأقل.","error");return}
  registering=true;setBusy(true);
  try{
    const credentials=await authLib.createUserWithEmailAndPassword(auth,email,password);
    const student=credentials.user;
    const nationalId=$("nationalId").value.trim();
    const profile={uid:student.uid,fullName,username,email,nationalId,...group,createdAt:firestoreLib.serverTimestamp()};
    await firestoreLib.setDoc(firestoreLib.doc(db,"students",student.uid),profile);
    try{await authLib.updateProfile(student,{displayName:fullName})}catch(_){}
    notice("regNotice","تم إنشاء الحساب بنجاح.","good");registerForm.reset();Object.keys(fieldMessages).forEach(id=>fieldError(id,""));dashboard(profile);
  }catch(err){if(err?.code==="auth/email-already-in-use"||err?.code==="auth/invalid-email")fieldError("regEmail",explain(err));if(err?.code==="auth/weak-password")fieldError("regPassword",explain(err));notice("regNotice",explain(err),"error")}
  finally{registering=false;setBusy(false)}
});
loginForm.addEventListener("submit",async event=>{
  event.preventDefault();if(!auth||loading)return;
  setBusy(true);
  try{
    await authLib.signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);
    $("loginPassword").value="";
  }catch(err){notice("loginNotice",explain(err),"error")}
  finally{setBusy(false)}
});
$("resetPassword").addEventListener("click",async()=>{
  if(!auth)return;
  const email=$("loginEmail").value.trim();
  if(!email){notice("loginNotice","اكتب البريد الإلكتروني الأول لاستعادة كلمة المرور.","error");return}
  try{
    await authLib.sendPasswordResetEmail(auth,email);
    notice("loginNotice","لو البريد الإلكتروني مسجل، هتوصلك رسالة لإعادة تعيين كلمة المرور.","good");
  }catch(err){notice("loginNotice",explain(err),"error")}
});
$("logout").addEventListener("click",async()=>{if(auth){await authLib.signOut(auth);showAuthentication();switchTab("login")}});
async function initFirebase(){
  if(!cfg.apiKey||!cfg.projectId||!cfg.authDomain||!cfg.appId){return}
  try{
    const appModule=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
    authLib=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
    firestoreLib=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    const app=appModule.initializeApp(cfg);
    auth=authLib.getAuth(app);db=firestoreLib.getFirestore(app);
    setBusy(false);
    notice("regNotice","التسجيل متاح. اختار المرحلة والصف أو القسم والمستوى، ثم أنشئ حسابك.","good");
    notice("loginNotice","اكتب البريد الإلكتروني وكلمة المرور الخاصة بحساب اوميجا.","good");
    authLib.onAuthStateChanged(auth,async user=>{
      if(registering)return;
      if(!user){showAuthentication();return}
      try{await loadProfile(user)}
      catch(err){showAuthentication();switchTab("login");notice("loginNotice",explain(err),"error")}
    });
  }catch(err){
    auth=null;setBusy(false);
    notice("regNotice","تعذر تشغيل خدمة تسجيل الحسابات. تواصل مع إدارة اوميجا.","error");
    notice("loginNotice","تعذر تشغيل خدمة تسجيل الدخول حاليًا.","error");
  }
}
setStage();initFirebase();