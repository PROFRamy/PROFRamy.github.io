// OMEGA Student Portal. Firebase Auth manages passwords; Firestore stores only profile metadata.
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

/* Cohort-specific feed: Firestore restricts every document to the student's group. */
const feedLabels={lesson:"الدروس",exercise:"التدريبات",revision:"المراجعات",announcement:"الإعلانات"};
const emptyFeed={lesson:"لم تُنشر دروس بعد.",exercise:"لم تُنشر تدريبات بعد.",revision:"لم تُنشر مراجعات بعد.",announcement:"لم تُنشر إعلانات بعد."};
const feedEntries={lesson:[],exercise:[],revision:[],announcement:[]};
let activeType=null,activeSubject=null;
function cohortKey(profile){
 if(profile.stage==="primary"||profile.stage==="preparatory")return profile.stage+"|"+profile.grade;
 if(profile.stage==="university"){
  const other=profile.department==="other"?(String(profile.departmentOther||"").trim().replace(/\s+/g," ")+"|"):"";
  return "university|"+profile.department+"|"+other+profile.level;
 }
 return "";
}
function safeResourceUrl(value){
 try{const url=new URL(value);return url.protocol==="https:"&&url.username===""&&url.password===""?url.href:""}catch(_){return ""}
}
function node(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function subjectOf(item){
 const named=String(item.subject||"").trim().replace(/\s+/g," ");
 if(named)return named;
 // Existing lessons have no subject field; recognize only familiar title prefixes.
 const first=String(item.title||"").split(/\s+[-–—]\s+|[:：]/)[0].trim();
 const known=/^(قصة|القصة|قواعد|القواعد|صوتيات|الصوتيات|ترجمة|الترجمة|الأدب|أدب|دراما|شعر|رواية|نصوص|نحو|قراءة|علم اللغة|علم اللغة النصي|لسانيات|تكنولوجيا المعلومات|اللغة العربية|اللغة الإنجليزية|اللغة الفرنسية|فرنسية الصحافة|قصة قصيرة|الترجمة من الإنجليزية إلى العربية|Grammar|Story|Phonetics|Linguistics|Literature|Drama|Poetry|Translation|ICT)$/i;
 return known.test(first)?first:"مواد غير مصنفة";
}
function renderBrowser(){
 const browser=$("contentBrowser"),grid=$("dashboardGrid");
 grid.hidden=!!activeType;browser.hidden=!activeType;
 if(!activeType)return;
 const type=activeType,subject=activeSubject,host=$("browserList");host.replaceChildren();
 $("browserCrumb").textContent=subject?feedLabels[type]+" / المواد الدراسية":type==="announcement"?"آخر التحديثات":"المواد الدراسية";
 $("browserTitle").textContent=subject||feedLabels[type];
 $("browserBack").textContent=subject?"العودة للمواد":"العودة للأقسام";
 const records=feedEntries[type]||[];
 if(type!=="announcement"&&subject===null){
  const bySubject=new Map();
  for(const item of records){
   const name=subjectOf(item);
   if(!bySubject.has(name))bySubject.set(name,[]);
   bySubject.get(name).push(item);
  }
  if(!bySubject.size){host.append(node("p","browser-empty",emptyFeed[type]));return}
  for(const [name,lessons] of bySubject){
   const btn=node("button","subject-card");btn.type="button";
   const title=node("span","subject-name");
   title.append(node("span","subject-icon","📁"),node("span","",name));
   const count=node("span","subject-count",lessons.length+" "+(type==="lesson"?"دروس":"عناصر"));
   btn.append(title,count);
   btn.addEventListener("click",()=>navigateFeed(type,name));
   host.append(btn);
  }
  return;
 }
 const visible=subject===null?records:records.filter(item=>subjectOf(item)===subject);
 if(!visible.length){host.append(node("p","browser-empty",emptyFeed[type]));return}
 for(const item of visible){
  const details=node("details","lesson-details");
  const summary=node("summary","",item.title||"محتوى جديد");
  const body=node("div","lesson-body");
  if(item.description)body.append(node("p","feed-description",item.description));
  const link=safeResourceUrl(item.url);
  if(link){const a=node("a","feed-link","فتح المرجع المرفق");a.href=link;a.target="_blank";a.rel="noopener noreferrer";body.append(a)}
  if(!item.description&&!link)body.append(node("p","feed-description","لا توجد تفاصيل إضافية."));
  details.append(summary,body);host.append(details);
 }
}
function navigateFeed(type=null,subject=null){
 activeType=type;activeSubject=subject;renderBrowser();
 const target=type?$("contentBrowser"):$("dashboardGrid");
 target.scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll("[data-feed-type]").forEach(button=>button.addEventListener("click",()=>navigateFeed(button.dataset.feedType)));
$("browserBack").addEventListener("click",()=>activeSubject!==null?navigateFeed(activeType):navigateFeed());
function renderFeed(documents){
 for(const type of Object.keys(feedEntries))feedEntries[type]=[];
 for(const item of documents){if(Object.hasOwn(feedEntries,item.type))feedEntries[item.type].push(item)}
 for(const type of Object.keys(feedEntries))$(type+"Count").textContent=String(feedEntries[type].length);
 renderBrowser();
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
  const records=snapshot.docs.map(d=>d.data());
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
  stopFeed();activeType=null;activeSubject=null;renderFeed([]);
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