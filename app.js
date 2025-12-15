/*************************
 * CONFIG
 *************************/
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwo8GWnnmHqOMfgBKmhsjMVr-ciFtaS3_adgQyXGNEHWE-j1mEljpMnwCeyrBJieCKJ/exec";
const TOKEN = "haivo2002-thaovy";

/*************************
 * STATE
 *************************/
let PRODUCTS = [];
let FILTER_LOAI = "";
let FILTER_BRAND = "";
let SELECTED_FOR_QUOTE = new Set();
let CURRENT_DETAIL_ID = null;

/*************************
 * DOM
 *************************/
const $ = (id) => document.getElementById(id);

const notice = $("notice");

// form
const fTen = $("fTen");
const fAnh = $("fAnh");
const fLoai = $("fLoai");
const fThuongHieu = $("fThuongHieu");
const fGia = $("fGia");
const fDonVi = $("fDonVi");
const fTon = $("fTon");
const fOem = $("fOem");
const fGhiChu = $("fGhiChu");

const imgPreview = $("imgPreview");
const imgHint = $("imgHint");

// list
const qSearch = $("qSearch");
const tbProducts = $("tbProducts");
const chipsLoai = $("chipsLoai");
const chipsBrand = $("chipsBrand");

// modals
const modalDetail = $("modalDetail");
const modalOem = $("modalOem");
const modalQuote = $("modalQuote");

// detail fields
const dImg = $("dImg");
const dTen = $("dTen");
const dMeta = $("dMeta");
const dGia = $("dGia");
const dDonVi = $("dDonVi");
const dLoai = $("dLoai");
const dThuongHieu = $("dThuongHieu");
const dOem = $("dOem");
const dAnh = $("dAnh");
const dGhiChu = $("dGhiChu");

const ioType = $("ioType");
const ioQty = $("ioQty");
const ioNote = $("ioNote");
const ioTonInfo = $("ioTonInfo");

const historyList = $("historyList");
const oemMainInfo = $("oemMainInfo");

// oem popup
const oemPopupHint = $("oemPopupHint");
const oemList = $("oemList");

// quote
const quoteItems = $("quoteItems");

/*************************
 * API
 *************************/
async function api(action, payload = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: TOKEN, action, ...payload })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data.data;
}

/*************************
 * INIT
 *************************/
function setNotice(msg, isErr = false) {
  notice.textContent = msg || "";
  notice.style.color = isErr ? "#b42318" : "#667085";
}

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("vi-VN");
}

function safeText(s) {
  return String(s ?? "").trim();
}

function showModal(el, yes) {
  el.classList.toggle("show", !!yes);
}

function getById(id) {
  return PRODUCTS.find(p => String(p.id) === String(id));
}

function distinct(values) {
  return [...new Set(values.filter(v => safeText(v) !== ""))].sort((a,b)=>a.localeCompare(b));
}

async function loadAll() {
  setNotice("Đang tải dữ liệu...");
  const data = await api("getAll");
  PRODUCTS = data.products || [];
  // normalize
  PRODUCTS = PRODUCTS.map(p => ({
    ...p,
    id: String(p.id),
    ten: safeText(p.ten),
    loai: safeText(p.loai),
    thuongHieu: safeText(p.thuongHieu),
    donVi: safeText(p.donVi),
    anh: safeText(p.anh),
    oem: safeText(p.oem),
    ghiChu: safeText(p.ghiChu),
    oemChinhThayThe: safeText(p.oemChinhThayThe),
    gia: Number(p.gia || 0),
    ton: Number(p.ton || 0)
  }));
  renderFilters();
  renderTable();
  setNotice(`Đã tải ${PRODUCTS.length} sản phẩm.`);
}

function renderFilters() {
  const loais = distinct(PRODUCTS.map(p => p.loai));
  const brands = distinct(PRODUCTS.map(p => p.thuongHieu));

  chipsLoai.innerHTML = "";
  chipsBrand.innerHTML = "";

  const mkChip = (text, isActive, onClick) => {
    const b = document.createElement("button");
    b.className = "chip" + (isActive ? " active" : "");
    b.textContent = text;
    b.onclick = onClick;
    return b;
  };

  // Loai chips
  loais.forEach(loai => {
    chipsLoai.appendChild(mkChip(loai || "(Trống)", FILTER_LOAI === loai, () => {
      FILTER_LOAI = (FILTER_LOAI === loai) ? "" : loai;
      renderTable();
      renderFilters();
    }));
  });

  // Brand chips
  brands.forEach(br => {
    chipsBrand.appendChild(mkChip(br || "(Trống)", FILTER_BRAND === br, () => {
      FILTER_BRAND = (FILTER_BRAND === br) ? "" : br;
      renderTable();
      renderFilters();
    }));
  });
}

function currentFiltered() {
  const q = safeText(qSearch.value).toLowerCase();
  return PRODUCTS.filter(p => {
    if (FILTER_LOAI && p.loai !== FILTER_LOAI) return false;
    if (FILTER_BRAND && p.thuongHieu !== FILTER_BRAND) return false;

    if (!q) return true;
    const hay = `${p.ten} ${p.loai} ${p.thuongHieu} ${p.oem}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderTable() {
  const arr = currentFiltered();

  tbProducts.innerHTML = "";
  arr.forEach(p => {
    const tr = document.createElement("tr");

    // select for quote
    const tdSel = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = SELECTED_FOR_QUOTE.has(p.id);
    cb.onchange = () => {
      if (cb.checked) SELECTED_FOR_QUOTE.add(p.id);
      else SELECTED_FOR_QUOTE.delete(p.id);
    };
    tdSel.appendChild(cb);

    // image
    const tdImg = document.createElement("td");
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = p.anh || "";
    img.alt = "img";
    img.onerror = () => { img.src = ""; img.style.display = "none"; };
    tdImg.appendChild(img);

    // name
    const tdName = document.createElement("td");
    tdName.innerHTML = `<div style="font-weight:900">${escapeHtml(p.ten)}</div>
      <div class="muted">OEM: ${escapeHtml(p.oem || "-")}</div>`;

    // loai
    const tdLoai = document.createElement("td");
    tdLoai.innerHTML = `<span class="badge">${escapeHtml(p.loai || "-")}</span>`;

    // brand
    const tdBrand = document.createElement("td");
    tdBrand.innerHTML = `<span class="badge">${escapeHtml(p.thuongHieu || "-")}</span>`;

    // ton
    const tdTon = document.createElement("td");
    tdTon.style.fontWeight = "900";
    tdTon.textContent = String(p.ton || 0);

    // gia
    const tdGia = document.createElement("td");
    tdGia.style.fontWeight = "900";
    tdGia.textContent = money(p.gia);

    // detail button
    const tdBtn = document.createElement("td");
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = "Mở";
    b.onclick = () => openDetail(p.id);
    tdBtn.appendChild(b);

    tr.append(tdSel, tdImg, tdName, tdLoai, tdBrand, tdTon, tdGia, tdBtn);
    tbProducts.appendChild(tr);
  });
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/*************************
 * IMAGE PREVIEW
 *************************/
function updatePreview(url) {
  const u = safeText(url);
  if (!u) {
    imgPreview.style.display = "none";
    imgHint.style.display = "block";
    imgPreview.src = "";
    return;
  }
  imgPreview.src = u;
  imgPreview.style.display = "block";
  imgHint.style.display = "none";
  imgPreview.onerror = () => {
    imgPreview.style.display = "none";
    imgHint.style.display = "block";
    imgHint.textContent = "Không load được ảnh. Kiểm tra lại URL.";
  };
}

/*************************
 * ADD PRODUCT
 *************************/
async function addProduct() {
  const product = {
    ten: fTen.value,
    anh: fAnh.value,
    loai: fLoai.value,
    thuongHieu: fThuongHieu.value,
    gia: Number(fGia.value || 0),
    donVi: fDonVi.value,
    ton: Number(fTon.value || 0),
    oem: fOem.value,
    ghiChu: fGhiChu.value
  };

  try {
    setNotice("Đang thêm sản phẩm...");
    await api("addProduct", { product });
    resetForm();
    await loadAll();
    setNotice("Đã thêm sản phẩm ✅");
  } catch (e) {
    setNotice(e.message, true);
  }
}

function resetForm() {
  fTen.value = "";
  fAnh.value = "";
  fLoai.value = "";
  fThuongHieu.value = "";
  fGia.value = "";
  fDonVi.value = "";
  fTon.value = "";
  fOem.value = "";
  fGhiChu.value = "";
  updatePreview("");
}

/*************************
 * DETAIL
 *************************/
async function openDetail(id) {
  const p = getById(id);
  if (!p) return;

  CURRENT_DETAIL_ID = p.id;

  dTen.textContent = p.ten;
  dMeta.textContent = `Tồn: ${p.ton} · Giá: ${money(p.gia)} · ID: ${p.id}`;

  dGia.value = p.gia || 0;
  dDonVi.value = p.donVi || "";
  dLoai.value = p.loai || "";
  dThuongHieu.value = p.thuongHieu || "";
  dOem.value = p.oem || "";
  dAnh.value = p.anh || "";
  dGhiChu.value = p.ghiChu || "";

  dImg.src = p.anh || "";
  dImg.onerror = () => { dImg.src = ""; };

  ioTonInfo.textContent = `Tồn hiện tại: ${p.ton}`;
  ioQty.value = "";
  ioNote.value = "";

  await renderHistory(p.id);
  renderOemMain(p);

  showModal(modalDetail, true);
}

async function saveDetail() {
  const p = getById(CURRENT_DETAIL_ID);
  if (!p) return;

  const product = {
    id: p.id,
    ten: dTen.textContent,
    gia: Number(dGia.value || 0),
    donVi: dDonVi.value,
    loai: dLoai.value,
    thuongHieu: dThuongHieu.value,
    oem: dOem.value,
    anh: dAnh.value,
    ghiChu: dGhiChu.value
  };

  try {
    setNotice("Đang lưu thay đổi...");
    await api("updateProduct", { product });
    await loadAll();
    setNotice("Đã lưu ✅");
    // reopen with latest
    openDetail(product.id);
  } catch (e) {
    setNotice(e.message, true);
  }
}

async function deleteCurrent() {
  const p = getById(CURRENT_DETAIL_ID);
  if (!p) return;

  const ok = confirm(`Xóa sản phẩm: "${p.ten}" ?`);
  if (!ok) return;

  try {
    setNotice("Đang xóa...");
    await api("deleteProduct", { id: p.id });
    showModal(modalDetail, false);
    await loadAll();
    setNotice("Đã xóa ✅");
  } catch (e) {
    setNotice(e.message, true);
  }
}

/*************************
 * IN/OUT
 *************************/
async function doIO() {
  const p = getById(CURRENT_DETAIL_ID);
  if (!p) return;

  try {
    const qty = Number(ioQty.value || 0);
    const io = ioType.value;
    const note = ioNote.value;

    setNotice("Đang cập nhật IN/OUT...");
    await api("inout", { productId: p.id, ioType: io, qty, note });
    await loadAll();

    // refresh detail and history
    await openDetail(p.id);
    setNotice("Đã cập nhật IN/OUT ✅");
  } catch (e) {
    setNotice(e.message, true);
  }
}

async function renderHistory(productId) {
  historyList.innerHTML = `<div class="muted">Đang tải...</div>`;
  try {
    const rows = await api("getInoutHistory", { productId });
    if (!rows.length) {
      historyList.innerHTML = `<div class="muted">Chưa có lịch sử.</div>`;
      return;
    }
    historyList.innerHTML = "";
    rows.slice(0, 30).forEach(r => {
      const div = document.createElement("div");
      div.className = "hrow";
      const time = new Date(r.time).toLocaleString("vi-VN");
      div.innerHTML = `
        <div class="hleft">
          <div style="font-weight:900">${escapeHtml(r.type)} · SL ${escapeHtml(r.qty)}</div>
          <div class="muted">${escapeHtml(time)} · ${escapeHtml(r.note || "")}</div>
          <div class="muted">Tồn: ${escapeHtml(r.beforeTon)} → ${escapeHtml(r.afterTon)}</div>
        </div>
        <div class="hright">${escapeHtml(r.afterTon)}</div>
      `;
      historyList.appendChild(div);
    });
  } catch (e) {
    historyList.innerHTML = `<div class="muted">Lỗi tải lịch sử: ${escapeHtml(e.message)}</div>`;
  }
}

/*************************
 * OEM REPLACEMENT
 *************************/
function getOemReplacements(product) {
  const oem = safeText(product.oem);
  if (!oem) return [];
  return PRODUCTS.filter(x => x.oem === oem && x.id !== product.id);
}

function renderOemMain(product) {
  const mainId = safeText(product.oemChinhThayThe);
  if (!product.oem) {
    oemMainInfo.innerHTML = `<div class="muted">Sản phẩm chưa có OEM → không gợi ý thay thế.</div>`;
    return;
  }
  if (!mainId) {
    oemMainInfo.innerHTML = `<div class="muted">Chưa chọn “thay thế chính”.</div>`;
    return;
  }
  const main = getById(mainId);
  if (!main) {
    oemMainInfo.innerHTML = `<div class="muted">“Thay thế chính” đã bị xóa hoặc không tồn tại.</div>`;
    return;
  }
  oemMainInfo.innerHTML = `<div class="muted">Thay thế chính: <b>${escapeHtml(main.ten)}</b> (ID: ${escapeHtml(main.id)})</div>`;
}

function openOemPopup() {
  const p = getById(CURRENT_DETAIL_ID);
  if (!p) return;

  const list = getOemReplacements(p);
  oemPopupHint.textContent = p.oem
    ? `OEM: ${p.oem} · Có ${list.length} sản phẩm có thể thay thế.`
    : "Sản phẩm chưa có OEM.";

  oemList.innerHTML = "";
  if (!p.oem || list.length === 0) {
    oemList.innerHTML = `<div class="muted">Không có gợi ý thay thế.</div>`;
  } else {
    list.forEach(x => {
      const div = document.createElement("div");
      div.className = "oem-item";
      const isMain = safeText(p.oemChinhThayThe) === x.id;

      div.innerHTML = `
        <div>
          <div style="font-weight:900">${escapeHtml(x.ten)}</div>
          <div class="muted">Tồn: ${escapeHtml(x.ton)} · Giá: ${escapeHtml(money(x.gia))} · ID: ${escapeHtml(x.id)}</div>
        </div>
      `;

      const btn = document.createElement("button");
      btn.className = "btn" + (isMain ? " btn-primary" : "");
      btn.textContent = isMain ? "Đang là thay thế chính" : "Chọn thay thế chính";
      btn.onclick = async () => {
        try {
          setNotice("Đang cập nhật thay thế chính...");
          await api("setOemChinhThayThe", { productId: p.id, replaceMainId: x.id });
          await loadAll();
          // refresh detail + main info
          await openDetail(p.id);
          setNotice("Đã chọn thay thế chính ✅");
          showModal(modalOem, false);
        } catch (e) {
          setNotice(e.message, true);
        }
      };

      div.appendChild(btn);
      oemList.appendChild(div);
    });
  }

  showModal(modalOem, true);
}

/*************************
 * QUOTE (PRINT + SAVE)
 *************************/
function openQuoteModal() {
  const ids = [...SELECTED_FOR_QUOTE];
  if (ids.length === 0) {
    alert("Bạn chưa chọn sản phẩm nào để báo giá.");
    return;
  }

  const items = ids.map(id => getById(id)).filter(Boolean);

  quoteItems.innerHTML = "";
  items.forEach(p => {
    const wrap = document.createElement("div");
    wrap.className = "oem-item";
    wrap.innerHTML = `
      <div>
        <div style="font-weight:900">${escapeHtml(p.ten)}</div>
        <div class="muted">Giá: ${escapeHtml(money(p.gia))} / ${escapeHtml(p.donVi || "")}</div>
      </div>
    `;

    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.step = "1";
    qty.value = "1";
    qty.style.width = "120px";
    qty.dataset.pid = p.id;

    wrap.appendChild(qty);
    quoteItems.appendChild(wrap);
  });

  showModal(modalQuote, true);
}

async function printAndSaveQuote() {
  try {
    const inputs = quoteItems.querySelectorAll("input[data-pid]");
    const items = [];
    inputs.forEach(inp => {
      const pid = inp.dataset.pid;
      const qty = Number(inp.value || 1);
      items.push({ productId: pid, qty });
    });

    const quoteId = "BG-" + Date.now();
    setNotice("Đang lưu báo giá lên Google Sheet...");
    await api("saveBaoGia", { items, quoteId });

    // Print
    const html = buildQuoteHtml(items, quoteId);
    const w = window.open("", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();

    setNotice(`Đã in + lưu BaoGia (${quoteId}) ✅`);
    showModal(modalQuote, false);
  } catch (e) {
    setNotice(e.message, true);
  }
}

function buildQuoteHtml(items, quoteId) {
  const rows = items.map(it => {
    const p = getById(it.productId);
    const qty = Number(it.qty || 1);
    const gia = Number(p?.gia || 0);
    const tt = qty * gia;
    return `
      <tr>
        <td>${escapeHtml(p?.ten || "")}</td>
        <td style="text-align:right">${qty}</td>
        <td>${escapeHtml(p?.donVi || "")}</td>
        <td style="text-align:right">${money(gia)}</td>
        <td style="text-align:right">${money(tt)}</td>
      </tr>
    `;
  }).join("");

  const total = items.reduce((s, it) => {
    const p = getById(it.productId);
    return s + Number(it.qty || 1) * Number(p?.gia || 0);
  }, 0);

  const time = new Date().toLocaleString("vi-VN");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Báo giá ${quoteId}</title>
  <style>
    body{font-family:Arial; padding:20px;}
    h2{margin:0 0 8px}
    .muted{color:#666; font-size:12px}
    table{width:100%; border-collapse:collapse; margin-top:14px}
    th,td{border:1px solid #ddd; padding:8px; font-size:13px}
    th{background:#f5f5f5; text-align:left}
    .right{text-align:right}
  </style>
</head>
<body>
  <h2>BÁO GIÁ</h2>
  <div class="muted">Mã: <b>${quoteId}</b> · Thời gian: ${time}</div>

  <table>
    <thead>
      <tr>
        <th>Sản phẩm</th>
        <th class="right">SL</th>
        <th>Đơn vị</th>
        <th class="right">Đơn giá</th>
        <th class="right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr>
        <td colspan="4" class="right"><b>TỔNG</b></td>
        <td class="right"><b>${money(total)}</b></td>
      </tr>
    </tbody>
  </table>

  <p class="muted">© 2025 HẢI VÕ</p>
</body>
</html>
`;
}

/*************************
 * SNAPSHOT
 *************************/
async function snapshotTonKho() {
  try {
    setNotice("Đang chụp snapshot TonKho...");
    const r = await api("snapshotTonKho");
    setNotice(`Đã chụp TonKho: ${r.count} dòng ✅`);
  } catch (e) {
    setNotice(e.message, true);
  }
}

/*************************
 * EVENTS
 *************************/
$("btnAdd").onclick = addProduct;
$("btnReset").onclick = resetForm;
$("btnRefresh").onclick = loadAll;
$("btnSnapshot").onclick = snapshotTonKho;

qSearch.oninput = () => renderTable();

$("btnClearFilters").onclick = () => {
  FILTER_LOAI = "";
  FILTER_BRAND = "";
  qSearch.value = "";
  renderFilters();
  renderTable();
};

fAnh.oninput = () => updatePreview(fAnh.value);

$("btnCloseDetail").onclick = () => showModal(modalDetail, false);
$("btnSaveDetail").onclick = saveDetail;
$("btnDelete").onclick = deleteCurrent;

$("btnDoIO").onclick = doIO;

$("btnOpenOemPopup").onclick = openOemPopup;
$("btnCloseOem").onclick = () => showModal(modalOem, false);

$("btnOpenQuote").onclick = openQuoteModal;
$("btnCloseQuote").onclick = () => showModal(modalQuote, false);
$("btnPrintQuote").onclick = printAndSaveQuote;

// close modals by click outside
[modalDetail, modalOem, modalQuote].forEach(m => {
  m.addEventListener("click", (ev) => {
    if (ev.target === m) showModal(m, false);
  });
});

/*************************
 * START
 *************************/
loadAll().catch(e => setNotice(e.message, true));
