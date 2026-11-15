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
 {value:"french",label:"اللغة الفرنسية"}
];
const levels=["المستوى الأول","المستوى الثاني","المستوى الثالث"];
let auth=null,db=null,authLib=null,firestoreLib=null,registering=false,loading=false;
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
  const stage=selectValue("stage");
  show("primaryChoices",stage==="primary");
  show("prepChoices",stage==="preparatory");
  show("uniChoices",stage==="university");
  show("uniLevelsBox",stage==="university"&&!!selectValue("uniDepartment"));
  const groups={primaryGrade:"primary",prepGrade:"preparatory",uniDepartment:"university",uniLevel:"university"};
  for(const [group,value] of Object.entries(groups)){
    if(value!==stage)document.querySelectorAll('input[name="'+group+'"]').forEach(input=>input.checked=false);
  }
}
stages.forEach(radio=>radio.addEventListener("change",setStage));
$("departments").addEventListener("change",()=>show("uniLevelsBox",!!selectValue("uniDepartment")));
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
 username:"اسم المستخدم لازم يكون من 3 إلى 30 حرف إنجليزي أو رقم أو شرطة سفلية (_).",
 regEmail:"اكتب بريدًا إلكترونيًا صحيحًا، مثل student@gmail.com.",
 regPassword:"كلمة المرور لازم تكون 8 أحرف على الأقل.",
 confirmPassword:"تأكيد كلمة المرور غير مطابق. اكتب نفس كلمة المرور.",
 loginEmail:"اكتب بريدك الإلكتروني بصورة صحيحة.",
 loginPassword:"اكتب كلمة المرور الخاصة بحساب اوميجا."
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
 if(id==="username"&&!/^[A-Za-z0-9_]{3,30}$/.test(input.value.trim()))error=fieldMessages[id];
 if((id==="regEmail"||id==="loginEmail")&&(!input.value.trim()||!input.checkValidity()))error=fieldMessages[id];
 if(id==="regPassword"&&input.value.length<8)error=fieldMessages[id];
 if(id==="confirmPassword"&&input.value!==$("regPassword").value)error=fieldMessages[id];
 if(id==="loginPassword"&&!input.value)error=fieldMessages[id];
 fieldError(id,error);return !error;
}
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
  if(!stage||stage==="secondary")throw Error("اختار المرحلة الدراسية المتاحة أولًا.");
  if((stage==="primary"||stage==="preparatory")&&!grade)throw Error("اختار الصف الدراسي.");
  if(stage==="university"&&(!department||!level))throw Error("اختار القسم الجامعي والمستوى الدراسي.");
  return {stage,grade,department,level};
}
function showAuthentication(){
  $("authViews").hidden=false;
  $("dashboard").hidden=true;
}
function dashboard(profile){
  $("welcomeName").textContent="أهلًا يا "+(profile.fullName||"طالب اوميجا")+" 👋";
  const tags=$("profileTags");tags.replaceChildren();
  const labels=[stageNames[profile.stage]||"",profile.grade||"",profile.department?departments.find(x=>x.value===profile.department)?.label||"":"",profile.level||""].filter(Boolean);
  if(profile.stage==="university")labels.splice(1,0,"كلية الآداب – جامعة طنطا");
  for(const value of labels){const span=document.createElement("span");span.textContent=value;tags.appendChild(span)}
  $("authViews").hidden=true;$("dashboard").hidden=false;
}
function explain(error){
  switch(error?.code){
    case "auth/email-already-in-use":return "البريد الإلكتروني مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.";
    case "auth/invalid-email":return "البريد الإلكتروني غير صحيح. راجع كتابة البريد وعلامة @ واسم النطاق.";
    case "auth/weak-password":return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل، ويفضل الجمع بين حروف وأرقام ورموز.";
    case "auth/invalid-credential":case "auth/wrong-password":case "auth/user-not-found":return "بيانات الدخول غير صحيحة.";
    case "auth/too-many-requests":return "محاولات كثيرة. حاول مرة أخرى لاحقًا.";
    case "auth/network-request-failed":return "تعذر الاتصال بالإنترنت. تأكد من اتصالك ثم أعد المحاولة.";\n    case "auth/operation-not-allowed":return "طريقة تسجيل الدخول غير مفعلة حاليًا. تواصل مع إدارة اوميجا.";\n    case "auth/unauthorized-domain":return "الموقع غير مصرح له بتسجيل الدخول. تواصل مع الإدارة.";\n    case "auth/popup-blocked":return "المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مجددًا.";\n    case "auth/popup-closed-by-user":return "تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية. حاول مرة أخرى.";\n    case "auth/account-exists-with-different-credential":return "هذا البريد مرتبط بطريقة دخول مختلفة. جرّب الطريقة التي سجلت بها أول مرة.";
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
  if(!validateFields(["fullName","username","regEmail","regPassword","confirmPassword"])){notice("regNotice","راجع الخانات المحددة بالأحمر وصحح البيانات قبل المتابعة.","error");return}\n  let group;try{group=selection()}catch(err){notice("regNotice",err.message,"error");return}
  const fullName=$("fullName").value.trim(),username=$("username").value.trim(),email=$("regEmail").value.trim().toLowerCase();
  const password=$("regPassword").value;
  if(fullName.length<2){notice("regNotice","اكتب اسم الطالب بشكل صحيح.","error");return}
  if(!/^[A-Za-z0-9_]{3,30}$/.test(username)){notice("regNotice","اسم المستخدم يجب أن يتكون من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو _","error");return}
  if(password.length<8||password!==$("confirmPassword").value){notice("regNotice","تأكد من تطابق كلمتي المرور، وأنهما 8 أحرف على الأقل.","error");return}
  registering=true;setBusy(true);
  try{
    const credentials=await authLib.createUserWithEmailAndPassword(auth,email,password);
    const student=credentials.user;
    const profile={uid:student.uid,fullName,username,email,...group,createdAt:firestoreLib.serverTimestamp()};
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