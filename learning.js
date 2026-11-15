// OMEGA independent learning pages. All content is scoped by the signed-in student's Firestore profile.
const $=id=>document.getElementById(id);
const config=window.OMEGA_FIREBASE_CONFIG||{};
const args=new URLSearchParams(location.search);
const kinds={lesson:{title:"الدروس",singular:"درس",icon:"📖"},exercise:{title:"التدريبات",singular:"تدريب",icon:"📝"},revision:{title:"المراجعات",singular:"مراجعة",icon:"📚"},announcement:{title:"الإعلانات",singular:"إعلان",icon:"📣"}};
const kind=Object.hasOwn(kinds,args.get("type"))?args.get("type"):"lesson";
const selectedSubject=(args.get("subject")||"").trim().slice(0,120);
const selectedId=(args.get("id")||"").trim().slice(0,120);
const stageNames={primary:"المرحلة الابتدائية",preparatory:"المرحلة الإعدادية",university:"المرحلة الجامعية"};
const departmentNames={english:"اللغة الإنجليزية",english_translation:"اللغة الإنجليزية والترجمة",french:"اللغة الفرنسية",other:"قسم آخر"};
const familiarSubjects=/^(قصة|القصة|قواعد|القواعد|صوتيات|الصوتيات|ترجمة|الترجمة|الأدب|أدب|دراما|شعر|رواية|نصوص|نحو|قراءة|علم اللغة|علم اللغة النصي|لسانيات|تكنولوجيا المعلومات|اللغة العربية|اللغة الإنجليزية|اللغة الفرنسية|فرنسية الصحافة|قصة قصيرة|الترجمة من الإنجليزية إلى العربية|Grammar|Story|Phonetics|Linguistics|Literature|Drama|Poetry|Translation|ICT)$/i;
let releaseListener=null;

function make(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
}
function status(text,mode=""){
 const target=$("pageState");
 target.hidden=false;target.className="state"+(mode?" "+mode:"");
 target.replaceChildren(make("span","",text));
}
function promptToLogin(text){
 status(text+" ","error");
 const a=make("a","resource-link","تسجيل الدخول إلى حساب الطالب");
 a.href="student.html?view=login";$("pageState").append(a);
 $("contentCard").hidden=true;
}
function urlFor(subject=null,id=null){
 const url=new URL("learning.html",location.href);
 url.search="";
 url.searchParams.set("type",kind);
 if(subject!==null)url.searchParams.set("subject",subject);
 if(id!==null)url.searchParams.set("id",id);
 return url.toString();
}
function addNavLink(host,text,href){
 const a=make("a","",text);a.href=href;host.append(a);
}
function crumb(text){$("breadcrumbs").append(make("span","",text))}
function page(title,subtitle,n){
 $("pageTitle").textContent=title;
 $("pageSubtitle").textContent=subtitle;
 $("pageCount").textContent=n;
 document.title=title+" | اوميجا للغات";
 $("contentCard").hidden=false;$("pageState").hidden=true;
}
function cohortKey(profile){
 if(profile.stage==="primary"||profile.stage==="preparatory")return profile.stage+"|"+profile.grade;
 if(profile.stage==="university"){
  const other=profile.department==="other"?(String(profile.departmentOther||"").trim().replace(/\s+/g," ")+"|"):"";
  return "university|"+profile.department+"|"+other+profile.level;
 }
 return "";
}
function cohortLabel(profile){
 if(profile.stage==="primary"||profile.stage==="preparatory")return (stageNames[profile.stage]||"")+" — "+profile.grade;
 if(profile.stage==="university")return "كلية الآداب — "+(profile.department==="other"?(profile.departmentOther||"قسم آخر"):(departmentNames[profile.department]||profile.department))+" — "+profile.level;
 return "مجموعة الطالب";
}
function subjectName(item){
 const specified=String(item.subject||"").trim().replace(/\s+/g," ");
 if(specified)return specified;
 const prefix=String(item.title||"").split(/\s+[-–—]\s+|[:：]/)[0].trim();
 return familiarSubjects.test(prefix)?prefix:"مواد غير مصنفة";
}
function linkCard(icon,name,count,href,aria){
 const a=make("a","link-card");a.href=href;a.setAttribute("aria-label",aria);
 const head=make("span","entry-head"),badge=make("span","entry-icon",icon);
 const nameEl=make("span","entry-name",name),side=make("span","entry-count",count);
 head.append(badge,nameEl);a.append(head,side);
 return a;
}
function lessonLink(item,index,subject){
 const a=make("a","lesson-card");
 a.href=urlFor(subject,item.id);
 a.setAttribute("aria-label","الانتقال إلى "+item.title);
 a.append(make("span","lesson-index",String(index+1)),make("span","lesson-name",item.title||"محتوى جديد"),make("span","lesson-link-icon","↗"));
 return a;
}
function inlineFormat(parent,line){
 // Only text nodes and strongly marked fragments; no untrusted HTML is interpreted.
 for(const part of line.split(/(\*\*[^*\n]+\*\*)/g)){
  if(!part)continue;
  if(part.startsWith("**")&&part.endsWith("**"))parent.append(make("strong","",part.slice(2,-2)));
  else parent.append(document.createTextNode(part));
 }
}
function renderDescription(root,text){
 const lines=String(text||"").replace(/\r\n?/g,"\n").split("\n");
 let paragraph=[],list=null;
 function flush(){
  if(!paragraph.length)return;
  const p=make("p","");
  paragraph.forEach((line,i)=>{if(i)p.append(document.createElement("br"));inlineFormat(p,line)});
  root.append(p);paragraph=[];
 }
 for(const line of lines){
  const trimmed=line.trim();
  if(!trimmed){flush();list=null;continue}
  const heading=trimmed.match(/^(#{1,4})\s+(.+)$/);
  if(heading){flush();list=null;const el=make(heading[1].length===1?"h2":"h3","");inlineFormat(el,heading[2]);root.append(el);continue}
  const bullet=trimmed.match(/^[-•]\s+(.+)$/);
  if(bullet){flush();if(!list){list=make("ul","");root.append(list)}const li=make("li","");inlineFormat(li,bullet[1]);list.append(li);continue}
  list=null;paragraph.push(line);
 }
 flush();
}
function resourceUrl(value){
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:""}catch(_){return ""}
}
function render(records){
 const visible=records.filter(item=>item.type===kind);
 const area=$("contentArea");area.replaceChildren();
 const bread=$("breadcrumbs");bread.replaceChildren();
 const back=$("pageBack");
 back.href=selectedId?(kind==="announcement"?urlFor():urlFor(selectedSubject)):(selectedSubject?urlFor():"student.html");
 back.textContent=selectedId?"← الرجوع إلى عناوين "+kinds[kind].title:(selectedSubject?"← الرجوع إلى المواد":"← الرجوع إلى أقسام الطالب");
 addNavLink(bread,"حساب الطالب","student.html");crumb(" / ");
 if(!selectedSubject&&!selectedId&&kind!=="announcement"){
  crumb(kinds[kind].title);
  const groups=new Map();
  for(const item of visible){
   const name=subjectName(item);
   if(!groups.has(name))groups.set(name,[]);
   groups.get(name).push(item);
  }
  page("المواد الدراسية — "+kinds[kind].title,"اختر المادة الدراسية لعرض عناوين "+kinds[kind].title+" الموجودة داخلها.",String(visible.length)+" "+kinds[kind].title);
  if(!groups.size){area.append(make("p","empty","لا يوجد محتوى منشور في هذا القسم حتى الآن."));return}
  const grid=make("div","grid");
  for(const [name,items] of groups)grid.append(linkCard("📁",name,String(items.length)+" "+(kind==="lesson"?"درس":"عناصر"),urlFor(name),"الانتقال إلى مادة "+name));
  area.append(grid);return;
 }
 // Announcements do not need a subject selection: open titles directly.
 if(!selectedId&&(selectedSubject||kind==="announcement")){
  const data=kind==="announcement"?visible:visible.filter(item=>subjectName(item)===selectedSubject);
  if(kind!=="announcement"){
   addNavLink(bread,kinds[kind].title,urlFor());crumb(" / ");crumb(selectedSubject);
  }else crumb(kinds[kind].title);
  page(kind==="announcement"?"الإعلانات":selectedSubject,"اختر عنوان "+kinds[kind].singular+" لفتح تفاصيله في تبويب مستقل.",String(data.length)+" "+kinds[kind].title);
  if(!data.length){area.append(make("p","empty","لا يوجد محتوى متاح لهذه المادة حاليًا."));return}
  const list=make("div","entries");
  data.forEach((item,i)=>list.append(lessonLink(item,i,kind==="announcement"?null:selectedSubject)));
  area.append(list);return;
 }
 // A direct lesson URL never bypasses the student's cohort-filtered query.
 const item=visible.find(record=>record.id===selectedId&&(kind==="announcement"||subjectName(record)===selectedSubject));
 if(!item){
  addNavLink(bread,kinds[kind].title,urlFor());
  page("المحتوى غير متاح","هذا المحتوى غير منشور لمجموعتك، أو تم نقله أو حذفه.","");
  area.append(make("p","empty","الدرس المطلوب غير متاح في حسابك حاليًا. ارجع إلى قائمة المواد واختر محتوى متاحًا."));return;
 }
 addNavLink(bread,kinds[kind].title,urlFor());crumb(" / ");
 if(kind!=="announcement"){addNavLink(bread,selectedSubject,urlFor(selectedSubject));crumb(" / ")}
 crumb("تفاصيل "+kinds[kind].singular);
 page(item.title||"تفاصيل المحتوى","محتوى "+kinds[kind].singular+" الخاص بمجموعتك الدراسية",kinds[kind].singular);
 const article=make("article","");
 article.append(make("h2","detail-title",item.title||"محتوى جديد"));
 const body=make("div","lesson-content");
 if(item.description)renderDescription(body,item.description);
 else body.append(make("p","","لا يوجد وصف مرفق."));
 article.append(body);
 const href=resourceUrl(item.url);
 if(href){
  const link=make("a","resource-link","فتح المرجع أو الملف المرفق ↗");
  link.href=href;article.append(link);
 }
 area.append(article);
}
async function boot(){
 if(!config.apiKey||!config.projectId||!config.appId){status("إعداد خدمة الطلاب غير مكتمل.","error");return}
 try{
  const [appModule,authModule,firestoreModule]=await Promise.all([
   import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
   import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
   import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
  ]);
  const app=appModule.initializeApp(config);
  const auth=authModule.getAuth(app),db=firestoreModule.getFirestore(app);
  authModule.onAuthStateChanged(auth,async user=>{
   if(releaseListener){releaseListener();releaseListener=null}
   if(!user){promptToLogin("لازم تسجّل الدخول أولًا لعرض دروس مجموعتك.");return}
   status("جاري تحميل بياناتك الدراسية...");
   try{
    const profileDoc=await firestoreModule.getDoc(firestoreModule.doc(db,"students",user.uid));
    if(!profileDoc.exists()){promptToLogin("ملف الطالب غير مكتمل. تواصل مع الإدارة.");return}
    const profile=profileDoc.data(),key=cohortKey(profile);
    if(!key){status("لم نتمكن من تحديد صفك أو قسمك. تواصل مع إدارة اوميجا.","error");return}
    $("studentGroup").hidden=false;$("studentGroup").textContent=cohortLabel(profile);
    const feedQuery=firestoreModule.query(firestoreModule.collection(db,"contentItems"),
     firestoreModule.where("audienceKey","==",key),firestoreModule.where("published","==",true));
    releaseListener=firestoreModule.onSnapshot(feedQuery,snap=>{
     const records=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
     records.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
     render(records);
    },err=>{
     const msg=err.code==="permission-denied"?"لا تملك صلاحية عرض هذا المحتوى. تأكد من نشر قواعد Firestore، أو تواصل مع الإدارة.":"تعذر تحميل المحتوى. راجع اتصال الإنترنت.";
     status(msg,"error");$("contentCard").hidden=true;
    });
   }catch(err){status("تعذر قراءة بيانات حساب الطالب. حاول فتح الموقع مجددًا أو تواصل مع الإدارة.","error")}
  });
 }catch(err){status("تعذر الاتصال بخدمة Firebase. تأكد من الإنترنت ثم أعد فتح الصفحة.","error")}
}
boot();
