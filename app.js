const DB="stockflow_db", VER=1; let db, page="dashboard";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const sizes=["XS","S","M","L","XL","XXL","XXXL"];

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains("products")){const p=d.createObjectStore("products",{keyPath:"id",autoIncrement:true});p.createIndex("name","name");}if(!d.objectStoreNames.contains("sales")){const s=d.createObjectStore("sales",{keyPath:"id",autoIncrement:true});s.createIndex("date","date");}};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
function tx(store,mode="readonly"){return db.transaction(store,mode).objectStore(store)}
function all(store){return new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(store,obj){return new Promise((res,rej)=>{const r=tx(store,"readwrite").put(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function del(store,id){return new Promise((res,rej)=>{const r=tx(store,"readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const money=n=>"৳"+Number(n||0).toLocaleString("en-BD");
const totalStock=p=>(p.colours||[]).reduce((a,c)=>a+(c.sizes||[]).reduce((x,z)=>x+Number(z.qty||0),0),0);
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function dateFmt(x){return new Date(x).toLocaleString("en-BD",{dateStyle:"medium",timeStyle:"short"})}

async function render(){
 const ps=await all("products"), ss=await all("sales");
 const title={dashboard:["Dashboard","Overview of your stock and sales"],inventory:["Inventory","Manage products, colours, sizes and stock"],sales:["Sales History","Every completed sale is stored locally"],reports:["Reports","Sales and inventory summary"],settings:["Settings","Backup and manage local data"]}[page];
 $("#pageTitle").textContent=title[0];$("#pageSub").textContent=title[1];
 if(page==="dashboard") renderDash(ps,ss); if(page==="inventory") renderInv(ps); if(page==="sales") renderSales(ss); if(page==="reports") renderReports(ps,ss); if(page==="settings") renderSettings();
 $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
}
function renderDash(ps,ss){
 const stock=ps.reduce((a,p)=>a+totalStock(p),0), revenue=ss.reduce((a,s)=>a+s.total,0), today=new Date().toISOString().slice(0,10);
 const todaySales=ss.filter(s=>s.date.slice(0,10)===today), todayRev=todaySales.reduce((a,s)=>a+s.total,0);
 $("#content").innerHTML=`<div class="stats">
 <div class="stat"><span class="label">TOTAL PRODUCTS</span><strong>${ps.length}</strong></div>
 <div class="stat"><span class="label">AVAILABLE STOCK</span><strong>${stock}</strong></div>
 <div class="stat"><span class="label">TODAY'S SALES</span><strong>${todaySales.reduce((a,s)=>a+s.qty,0)}</strong></div>
 <div class="stat"><span class="label">TOTAL REVENUE</span><strong>${money(revenue)}</strong></div></div>
 <div class="grid"><div class="card"><h2>Inventory snapshot</h2><div class="product-list">${ps.length?ps.slice(0,8).map(productHTML).join(""):`<div class="empty">No products yet.<br><br><button class="primary" onclick="openProduct()">Add your first product</button></div>`}</div></div>
 <div class="card"><h2>Recent sales</h2>${ss.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Product</th><th>Size</th><th>Total</th></tr></thead><tbody>${ss.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(s=>`<tr><td>${dateFmt(s.date)}</td><td>${esc(s.name)} · ${esc(s.colour)}</td><td>${esc(s.size)} × ${s.qty}</td><td>${money(s.total)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No sales recorded yet.</div>`}</div></div>`;
}
function productHTML(p){
 return `<div class="product"><div><h3>${esc(p.name)}</h3><div class="muted">${p.colours.length} colour${p.colours.length!==1?"s":""} · ${totalStock(p)} units</div><div class="chips">${p.colours.map(c=>`<span class="chip"><b>${esc(c.name)}</b>: ${(c.sizes||[]).map(z=>`${esc(z.size)} ${z.qty}`).join(" · ")||"No stock"}</span>`).join("")}</div></div><div class="actions"><button class="sell" onclick="openSell(${p.id})">Sell</button><button class="secondary" onclick="openProduct(${p.id})">Edit</button></div></div>`
}
function renderInv(ps){
 $("#content").innerHTML=`<div class="toolbar"><input id="invSearch" class="search" placeholder="Search product or colour…" oninput="filterInv()"></div><div id="invList" class="product-list">${ps.length?ps.map(productHTML).join(""):`<div class="card empty">Your inventory is empty.<br><br><button class="primary" onclick="openProduct()">＋ Add Product</button></div>`}</div>`;
}
async function filterInv(){const q=$("#invSearch").value.toLowerCase(),ps=await all("products");$("#invList").innerHTML=ps.filter(p=>JSON.stringify(p).toLowerCase().includes(q)).map(productHTML).join("")||`<div class="card empty">No matching products.</div>`}

function openProduct(id=null){
 const load=id?all("products").then(a=>a.find(x=>x.id===id)):Promise.resolve(null);
 load.then(p=>{$("#modalBody").innerHTML=`<h2>${p?"Edit product":"Add product"}</h2><form id="productForm">
 <div class="form-grid"><div class="field full"><label>PRODUCT NAME</label><input id="pname" required value="${esc(p?.name||"")}"></div>
 <div class="field full"><label>COLOURS & STOCK</label><div id="colourBox"></div><button type="button" class="secondary" onclick="addColour()">＋ Add colour</button></div></div>
 <div class="modal-footer"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Product</button></div></form>`;
 const box=$("#colourBox");(p?.colours?.length?p.colours:[{name:"",sizes:sizes.map(size=>({size,qty:0}))}]).forEach(c=>addColour(c));
 $("#productForm").onsubmit=async e=>{e.preventDefault();const colours=[...box.querySelectorAll(".colour-card")].map(card=>({name:card.querySelector(".cname").value.trim(),sizes:[...card.querySelectorAll(".size-row")].map(r=>({size:r.dataset.size,qty:Math.max(0,Number(r.querySelector("input").value)||0)})).filter(z=>z.qty>0)})).filter(c=>c.name);
 if(!$("#pname").value.trim()||!colours.length)return toast("Enter product and at least one colour.");
 const obj={...(p||{}),name:$("#pname").value.trim(),colours,updatedAt:new Date().toISOString()};await put("products",obj);closeModal();toast("Product saved");render()};
 });}
function addColour(c={name:"",sizes:sizes.map(size=>({size,qty:0}))}){const box=$("#colourBox"),div=document.createElement("div");div.className="colour-card";div.style.cssText="border:1px solid var(--line);padding:12px;border-radius:10px;margin:8px 0";div.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:8px"><input class="cname" placeholder="Colour name (e.g. Olive)" value="${esc(c.name)}" style="flex:1;border:1px solid var(--line);padding:9px;border-radius:8px"><button type="button" class="danger" onclick="this.closest('.colour-card').remove()">Remove</button></div>${c.sizes.map(z=>`<div class="size-row" data-size="${z.size}"><span class="size-name">${z.size}</span><input type="number" min="0" step="1" value="${z.qty}" placeholder="Qty"><span></span></div>`).join("")}`;box.appendChild(div)}
function closeModal(){$("#modal").classList.remove("show");$("#modalBody").innerHTML=""}

async function openSell(id){
 const p=(await all("products")).find(x=>x.id===id);if(!p)return;
 $("#modalBody").innerHTML=`<h2>Record a sale</h2><div class="notice"><b>${esc(p.name)}</b><br>Select colour, size and selling price. Stock updates immediately after confirmation.</div>
 <form id="sellForm"><div class="form-grid"><div class="field"><label>COLOUR</label><select id="scolour">${p.colours.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label>SIZE</label><select id="ssize"></select></div><div class="field"><label>QUANTITY</label><input id="sqty" type="number" min="1" step="1" value="1" required></div><div class="field"><label>SELLING PRICE / UNIT (৳)</label><input id="sprice" type="number" min="0" step="0.01" required></div></div><div id="avail" class="muted" style="margin-top:12px"></div><div class="modal-footer"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Confirm Sale</button></div></form>`;
 const update=()=>{const c=p.colours[Number($("#scolour").value)], valid=(c.sizes||[]).filter(z=>z.qty>0);$("#ssize").innerHTML=valid.map(z=>`<option value="${esc(z.size)}">${esc(z.size)} — ${z.qty} available</option>`).join("")||`<option>No stock</option>`;$("#avail").textContent=valid.length?`Available: ${valid.find(z=>z.size===$("#ssize").value)?.qty||0} units`:"No stock available for this colour"};
 $("#scolour").onchange=update;$("#ssize").onchange=update;update();
 $("#sellForm").onsubmit=async e=>{e.preventDefault();const c=p.colours[Number($("#scolour").value)],size=$("#ssize").value,z=c.sizes.find(x=>x.size===size),qty=Number($("#sqty").value),price=Number($("#sprice").value);if(!z||qty<1||qty>z.qty)return toast("Quantity exceeds available stock.");if(price<0)return toast("Invalid price.");
 z.qty-=qty;p.updatedAt=new Date().toISOString();await put("products",p);await put("sales",{date:new Date().toISOString(),productId:p.id,name:p.name,colour:c.name,size,qty,price,total:qty*price});closeModal();toast("Sale recorded");render()};
}

function renderSales(ss){ss=ss.slice().sort((a,b)=>b.date.localeCompare(a.date));$("#content").innerHTML=`<div class="toolbar"><input id="saleSearch" class="search" placeholder="Search sales…" oninput="filterSales()"></div><div class="card"><div id="saleTable">${salesTable(ss)}</div></div>`}
function salesTable(ss){return ss.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Product</th><th>Colour</th><th>Size</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${ss.map(s=>`<tr><td>${dateFmt(s.date)}</td><td>${esc(s.name)}</td><td>${esc(s.colour)}</td><td>${esc(s.size)}</td><td>${s.qty}</td><td>${money(s.price)}</td><td><b>${money(s.total)}</b></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No sales yet.</div>`}
async function filterSales(){const q=$("#saleSearch").value.toLowerCase(),ss=await all("sales");$("#saleTable").innerHTML=salesTable(ss.filter(s=>JSON.stringify(s).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)))}

function renderReports(ps,ss){const rev=ss.reduce((a,s)=>a+s.total,0),qty=ss.reduce((a,s)=>a+s.qty,0),stock=ps.reduce((a,p)=>a+totalStock(p),0);const by=Object.entries(ss.reduce((a,s)=>(a[s.name]=(a[s.name]||0)+s.total,a),{})).sort((a,b)=>b[1]-a[1]);$("#content").innerHTML=`<div class="stats"><div class="stat"><span class="label">UNITS SOLD</span><strong>${qty}</strong></div><div class="stat"><span class="label">REVENUE</span><strong>${money(rev)}</strong></div><div class="stat"><span class="label">CURRENT STOCK</span><strong>${stock}</strong></div><div class="stat"><span class="label">TRANSACTIONS</span><strong>${ss.length}</strong></div></div><div class="card"><h2>Revenue by product</h2>${by.length?by.map(([n,v])=>`<div class="summary-row"><span>${esc(n)}</span><b>${money(v)}</b></div>`).join(""):`<div class="empty">Sales data will appear here.</div>`}</div>`}
function renderSettings(){const html=`<div class="settings-grid"><div class="card setting"><h3>Backup your data</h3><p>Download a JSON backup containing your products and sales. Keep it somewhere safe.</p><button class="primary" onclick="backup()">Export Backup</button></div><div class="card setting"><h3>Restore data</h3><p>Restore a previous StockFlow backup. This replaces the current local database.</p><label class="primary" style="display:inline-block">Import Backup<input class="file-input" type="file" accept=".json" onchange="restore(this.files[0])"></label></div><div class="card setting"><h3>Storage</h3><p>Your data is stored locally in this browser using IndexedDB. No server is required.</p><button class="danger" onclick="clearData()">Delete All Data</button></div><div class="card setting"><h3>Offline app</h3><p>StockFlow is a Progressive Web App. After it has loaded once, the interface is available offline.</p></div></div>`;$("#content").innerHTML=html}
async function backup(){const data={version:1,exportedAt:new Date().toISOString(),products:await all("products"),sales:await all("sales")};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`stockflow-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup exported")}
async function restore(file){if(!file)return;try{const d=JSON.parse(await file.text());if(!Array.isArray(d.products)||!Array.isArray(d.sales))throw Error();if(!confirm("Restore this backup? Current local data will be replaced."))return;const tr=db.transaction(["products","sales"],"readwrite");tr.objectStore("products").clear();tr.objectStore("sales").clear();tr.oncomplete=async()=>{for(const p of d.products)await put("products",p);for(const s of d.sales)await put("sales",s);toast("Backup restored");render()}}catch(e){toast("Invalid backup file")}}
async function clearData(){if(!confirm("Delete ALL inventory and sales data? This cannot be undone unless you have a backup."))return;const tr=db.transaction(["products","sales"],"readwrite");tr.objectStore("products").clear();tr.objectStore("sales").clear();tr.oncomplete=()=>{toast("All data deleted");render()}}
$$(".nav").forEach(n=>n.onclick=()=>{page=n.dataset.page;render();$(".sidebar").classList.remove("open")});
$("#quickAdd").onclick=()=>openProduct();$("#mobileMenu").onclick=()=>$(".sidebar").classList.toggle("open");
$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
openDB().then(render).catch(()=>toast("Could not open local database"));
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
