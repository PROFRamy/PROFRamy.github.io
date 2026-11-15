/* OMEGA Rich Text v1.
   Only safe text layout tags, selected formatting and HTTPS links are retained.
   This sanitizer is applied when saving, editing and displaying student content. */
const ALLOWED=new Set(["P","DIV","BR","B","STRONG","I","EM","U","S","SPAN","FONT","H1","H2","H3","H4","UL","OL","LI","BLOCKQUOTE","A","PRE","CODE"]);
const DISCARD=new Set(["SCRIPT","STYLE","SVG","MATH","IFRAME","OBJECT","EMBED","FORM","INPUT","BUTTON","TEXTAREA","SELECT","IMG","VIDEO","AUDIO","LINK","META","BASE","TEMPLATE","NOSCRIPT"]);
const FSIZES={"1":"11px","2":"13px","3":"16px","4":"18px","5":"24px","6":"30px","7":"36px"};
const NAMED={black:"#171717",red:"#c62828",green:"#16803c",blue:"#215bab",navy:"#162c48",orange:"#d97706",purple:"#7e22ce",white:"#ffffff",yellow:"#fff2a6"};
const STYLES=["color","background-color","font-size","font-weight","font-style","text-decoration","text-align","direction"];
const MAX_HTML=60000;
function colorValue(value){
 const s=String(value||"").trim().toLowerCase();
 if(NAMED[s])return NAMED[s];
 if(/^#[0-9a-f]{6}$/.test(s))return s;
 if(/^#[0-9a-f]{3}$/.test(s))return "#"+[...s.slice(1)].map(c=>c+c).join("");
 const match=s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:1|0(?:\.\d+)?))?\s*\)$/);
 if(match){
  const rgb=match.slice(1,4).map(Number);
  if(rgb.every(v=>v<=255))return "#"+rgb.map(v=>v.toString(16).padStart(2,"0")).join("");
 }
 return "";
}
function copyStyle(element,source){
 if(source.style){
  for(const prop of STYLES){
   const raw=source.style.getPropertyValue(prop).trim().toLowerCase();
   if(!raw)continue;
   if(prop==="color"||prop==="background-color"){
    const color=colorValue(raw);if(color)element.style.setProperty(prop,color);
   }else if(prop==="font-size"){
    const n=Number(raw.replace(/px$/,""));
    if(/^\d+(?:\.\d+)?px$/.test(raw)&&n>=10&&n<=40)element.style.fontSize=n+"px";
   }else if(prop==="font-weight"&&(/^(bold|bolder)$/.test(raw)||/^[6-9]00$/.test(raw)))element.style.fontWeight="bold";
   else if(prop==="font-style"&&raw==="italic")element.style.fontStyle="italic";
   else if(prop==="text-decoration"&&raw.includes("underline"))element.style.textDecoration="underline";
   else if(prop==="text-decoration"&&raw.includes("line-through"))element.style.textDecoration="line-through";
   else if(prop==="text-align"&&["right","left","center","justify"].includes(raw))element.style.textAlign=raw;
   else if(prop==="direction"&&["ltr","rtl"].includes(raw))element.style.direction=raw;
  }
 }
 if(source.tagName==="FONT"){
  const color=colorValue(source.getAttribute("color"));
  if(color)element.style.color=color;
  const size=FSIZES[source.getAttribute("size")];
  if(size)element.style.fontSize=size;
 }
 if(source.hasAttribute("dir")&&["rtl","ltr","auto"].includes(source.getAttribute("dir"))){
  element.setAttribute("dir",source.getAttribute("dir"));
 }
}
function safeNode(node,doc){
 if(node.nodeType===3)return doc.createTextNode(node.nodeValue||"");
 if(node.nodeType!==1)return doc.createDocumentFragment();
 const tag=node.tagName.toUpperCase();
 if(DISCARD.has(tag))return doc.createDocumentFragment();
 const fragment=doc.createDocumentFragment();
 const name=tag==="FONT"?"SPAN":tag;
 const target=ALLOWED.has(tag)?doc.createElement(name.toLowerCase()):fragment;
 if(target!==fragment){
  copyStyle(target,node);
  if(tag==="A"){
   const href=node.getAttribute("href");
   try{
    const url=new URL(href,location.href);
    if(href&&/^https?:\/\//i.test(href)&&url.protocol==="https:"&&!url.username&&!url.password&&href.length<=1200){
     target.setAttribute("href",url.href);
     target.setAttribute("rel","noopener noreferrer");
    }
   }catch(_){}
  }
 }
 for(const child of [...node.childNodes])target.append(safeNode(child,doc));
 return target;
}
export function sanitizedFragment(html){
 const parsed=new DOMParser().parseFromString(String(html||""),"text/html");
 const output=document.createDocumentFragment();
 for(const child of [...parsed.body.childNodes])output.append(safeNode(child,document));
 return output;
}
export function sanitizeRich(html){
 const root=document.createElement("div");
 root.append(sanitizedFragment(html));
 return root.innerHTML;
}
export function renderRich(container,html){
 container.replaceChildren(sanitizedFragment(html));
}
export function setEditorContent(editor,richHtml,plainText){
 editor.replaceChildren();
 if(richHtml&&typeof richHtml==="string"){
  editor.append(sanitizedFragment(richHtml));return;
 }
 const text=String(plainText||"");
 if(text){
  for(const line of text.split(/\r?\n/)){
   const p=document.createElement("p");
   if(line)p.textContent=line;else p.append(document.createElement("br"));
   editor.append(p);
  }
 }
}
export function editorResult(editor){
 const html=sanitizeRich(editor.innerHTML).trim();
 const holder=document.createElement("div");
 holder.append(sanitizedFragment(html));
 const text=(holder.innerText||holder.textContent||"").trim();
 return {html,text,valid:html.length<=MAX_HTML,htmlLength:html.length,textLength:text.length};
}
export function bindRichToolbar(editor,toolbar,counter,preview,previewButton){
 const tools=[...toolbar.querySelectorAll("button[data-rich-command],select[data-rich-command]")];
 let lastRange=null;
 function hasSelection(){
  const selection=getSelection();
  if(!selection||!selection.rangeCount)return false;
  return editor.contains(selection.getRangeAt(0).commonAncestorContainer);
 }
 function saveRange(){
  if(hasSelection())lastRange=getSelection().getRangeAt(0).cloneRange();
 }
 function restoreRange(){
  editor.focus();
  if(lastRange&&editor.contains(lastRange.commonAncestorContainer)){
   const selection=getSelection();
   selection.removeAllRanges();selection.addRange(lastRange);
  }
 }
 function count(){
  const result=editorResult(editor);
  counter.textContent=result.textLength.toLocaleString("en-US")+" حرفًا • حجم التنسيق "+result.htmlLength.toLocaleString("en-US")+" / "+MAX_HTML.toLocaleString("en-US");
  counter.style.color=result.valid?"":"#c62828";
  if(!preview.hidden)renderRich(preview,result.html);
 }
 function command(action,value){
  restoreRange();
  if(!document.queryCommandSupported||!document.queryCommandSupported(action)){
   // Browsers may still support execCommand without reporting support.
  }
  document.execCommand("styleWithCSS",false,true);
  document.execCommand(action,false,value===undefined?null:value);
  saveRange();count();
 }
 toolbar.addEventListener("mousedown",event=>{
  if(event.target.closest("button"))event.preventDefault();
 });
 editor.addEventListener("mouseup",saveRange);
 editor.addEventListener("keyup",saveRange);
 document.addEventListener("selectionchange",()=>{
  if(hasSelection())saveRange();
 });
 for(const tool of tools){
  tool.addEventListener("click",event=>{
   if(tool.tagName!=="BUTTON")return;
   event.preventDefault();
   const name=tool.dataset.richCommand;
   const val=tool.dataset.value||undefined;
   command(name,val);
  });
  if(tool.tagName==="SELECT")tool.addEventListener("change",()=>{
   const name=tool.dataset.richCommand;
   const val=tool.value;
   if(name==="fontSize")command(name,val);
   else if(name==="foreColor"||name==="hiliteColor")command(name,val);
   tool.selectedIndex=0;
  });
 }
 editor.addEventListener("paste",event=>{
  const clip=event.clipboardData;
  if(!clip)return;
  event.preventDefault();
  const html=clip.getData("text/html"),plain=clip.getData("text/plain");
  const safe=html?sanitizeRich(html):"";
  if(safe)document.execCommand("insertHTML",false,safe);
  else document.execCommand("insertText",false,plain);
  count();
 });
 editor.addEventListener("input",count);
 previewButton.addEventListener("click",()=>{
  preview.hidden=!preview.hidden;
  previewButton.setAttribute("aria-pressed",String(!preview.hidden));
  previewButton.textContent=preview.hidden?"معاينة الشرح":"إخفاء المعاينة";
  count();
 });
 count();
 return {refresh:count,clear:()=>{
  lastRange=null;
  preview.hidden=true;
  previewButton.textContent="معاينة الشرح";
  previewButton.setAttribute("aria-pressed","false");
  count();
 }};
}
