(function () {
  "use strict";

  const config = window.H5_CONFIG;
  const screen = document.getElementById("screen");
  const submitMask = document.getElementById("submitMask");
  const state = { route: "home", spotId: null, entryType: null, selectedFile: null };
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  const allowedExtensions = /\.(jpe?g|png|webp|heic|heif)$/i;
  const maxFileSize = 10 * 1024 * 1024;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function assetSlot(src, className = "") {
    return `<div class="asset-slot ${className}"><img src="${escapeHtml(src)}" alt="" aria-hidden="true" hidden /></div>`;
  }

  function hydrateAssets() {
    document.querySelectorAll(".asset-slot img").forEach((image) => {
      const reveal = () => { image.hidden = false; };
      const fallback = () => { image.hidden = true; };
      if (image.complete) image.naturalWidth > 0 ? reveal() : fallback();
      else {
        image.addEventListener("load", reveal, { once: true });
        image.addEventListener("error", fallback, { once: true });
      }
    });
  }

  function renderHome() {
    screen.innerHTML = `
      <section class="screen screen-home" data-screen="home">
        <div class="p1-design">
          <img src="${escapeHtml(config.assets.home)}" alt="6000年渭南一朵花" />
          <div class="p1-petals" aria-hidden="true">
            <img class="p1-petals-layer" src="${escapeHtml(config.assets.homePetals)}" alt="" />
          </div>
          <button class="p1-hotspot p1-hotspot-tour" type="button" data-nav="overview" aria-label="游渭南"><img src="${escapeHtml(config.assets.homeTourButton)}" alt="" /></button>
          <button class="p1-hotspot p1-hotspot-prize" type="button" data-nav="entry" aria-label="抽大奖"><img src="${escapeHtml(config.assets.homePrizeButton)}" alt="" /></button>
        </div>
      </section>`;
  }

  function renderOverview() {
    screen.innerHTML = `
      <section class="screen" data-screen="overview">
        <div class="page-body">
          <h1 class="page-title">游渭南</h1>
          ${assetSlot(config.assets.overview, "overview-art")}
          <div class="spot-grid">
            ${config.spots.map((spot) => `
              <button class="spot-card" type="button" data-spot="${escapeHtml(spot.id)}" aria-label="${escapeHtml(spot.name)}">
                ${assetSlot(spot.asset)}
                <span class="spot-card-copy"><strong>${escapeHtml(spot.name)}</strong></span>
              </button>`).join("")}
          </div>
        </div>
      </section>`;
  }

  function renderDetail() {
    const spot = config.spots.find((item) => item.id === state.spotId) || config.spots[0];
    screen.innerHTML = `
      <section class="screen" data-screen="detail" data-spot-id="${escapeHtml(spot.id)}">
        <h1 class="detail-page-name">${escapeHtml(spot.name)}</h1>
        <div class="detail-title-wrap"><div class="detail-title-card"><p>${escapeHtml(spot.story[0])}</p></div></div>
        ${assetSlot(spot.asset, "detail-hero")}
        <div class="content-stack"><article class="content-card"><p>${escapeHtml(spot.story[1])}</p></article></div>
        <div class="detail-actions"><button class="primary-button" type="button" data-action="join-from-spot">我来啦！<br />我要打卡！</button></div>
      </section>`;
  }

  function renderEntry() {
    screen.innerHTML = `
      <section class="screen" data-screen="entry">
        <div class="page-body">
          <h1 class="page-title">抽大奖</h1>
          ${assetSlot(config.assets.prize, "prize-art")}
          <div class="choice-list">
            <button class="choice-card" type="button" data-entry-type="photo"><span><strong>普通打卡照片</strong></span></button>
            <button class="choice-card" type="button" data-entry-type="social_share"><span><strong>社交媒体发布截图</strong></span></button>
          </div>
        </div>
      </section>`;
  }

  function renderForm() {
    if (!state.entryType) state.entryType = "photo";
    screen.innerHTML = `
      <section class="screen" data-screen="form">
        <div class="page-body">
          <h1 class="page-title">抽大奖</h1>
          ${assetSlot(config.assets.form, "form-art")}
          <div class="status-banner" id="statusBanner" role="alert"></div>
          <form class="form-card" id="submissionForm" novalidate>
            <input type="hidden" name="entryType" value="${escapeHtml(state.entryType)}" />
            <div class="form-group upload-first">
              <label class="upload-zone" id="uploadZone" for="photo"><span class="upload-icon">+</span><span class="upload-copy"><strong id="fileName">点击上传图片</strong><small id="fileMeta"></small></span></label>
              <input class="visually-hidden" id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" />
              <p class="field-error" data-error-for="photo"></p>
            </div>
            <div class="form-group"><label class="field-label" for="name">您的姓名</label><input id="name" name="name" type="text" maxlength="30" autocomplete="name" /><p class="field-error" data-error-for="name"></p></div>
            <div class="form-group"><label class="field-label" for="phone">联系电话</label><input id="phone" name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" /><p class="field-error" data-error-for="phone"></p></div>
            <button class="primary-button submit-button" id="submitButton" type="submit">抽大奖</button>
          </form>
        </div>
      </section>`;
    document.getElementById("photo").addEventListener("change", handleFileChange);
    document.getElementById("submissionForm").addEventListener("submit", handleSubmit);
  }

  function renderSuccess(code) {
    screen.innerHTML = `<section class="screen" data-screen="success"><div class="success-screen"><div class="success-card"><span class="success-mark">✓</span><h1>抽大奖</h1><strong class="success-code">${escapeHtml(code)}</strong><button class="primary-button" type="button" data-nav="overview">游渭南</button></div></div></section>`;
  }

  function render() {
    if (state.route === "overview") renderOverview();
    else if (state.route === "detail") renderDetail();
    else if (state.route === "entry") renderEntry();
    else if (state.route === "form") renderForm();
    else renderHome();
    hydrateAssets();
    screen.focus({ preventScroll: true });
  }

  function routeFromHash() {
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const [route, value] = raw.split("/");
    if (route === "spot" && config.spots.some((spot) => spot.id === value)) {
      state.route = "detail";
      state.spotId = value;
    } else if (["home", "overview", "entry", "form"].includes(route)) state.route = route;
    else state.route = "home";
  }

  function navigate(route, value = "") {
    location.hash = route === "detail" ? `#/spot/${value}` : `#/${route}`;
  }

  function setFieldError(name, message) {
    const node = document.querySelector(`[data-error-for="${name}"]`);
    if (node) node.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
    const banner = document.getElementById("statusBanner");
    if (banner) { banner.textContent = ""; banner.className = "status-banner"; }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  function updateFileUI() {
    const zone = document.getElementById("uploadZone");
    const name = document.getElementById("fileName");
    const meta = document.getElementById("fileMeta");
    if (!zone || !name || !meta) return;
    zone.classList.toggle("has-file", Boolean(state.selectedFile));
    name.textContent = state.selectedFile?.name || "点击上传图片";
    meta.textContent = state.selectedFile ? formatFileSize(state.selectedFile.size) : "";
  }

  function handleFileChange(event) {
    clearErrors();
    const file = event.currentTarget.files?.[0];
    state.selectedFile = null;
    if (!file) return updateFileUI();
    const allowed = allowedTypes.has(file.type) || (!file.type && allowedExtensions.test(file.name));
    if (!allowed || file.size <= 0 || file.size > maxFileSize) {
      event.currentTarget.value = "";
      return updateFileUI();
    }
    state.selectedFile = file;
    updateFileUI();
  }

  function localSubmitTestMode() {
    if (!["127.0.0.1", "localhost"].includes(location.hostname)) return "";
    return new URLSearchParams(location.search).get("testSubmit") || "";
  }

  function validateForm(form) {
    clearErrors();
    let valid = true;
    if (!form.elements.name.value.trim() || form.elements.name.value.trim().length > 30) { setFieldError("name", "您的姓名"); valid = false; }
    if (!/^1[3-9]\d{9}$/.test(form.elements.phone.value.trim())) { setFieldError("phone", "联系电话"); valid = false; }
    if (!state.selectedFile && !localSubmitTestMode()) { setFieldError("photo", "点击上传图片"); valid = false; }
    return valid;
  }

  async function submitFormData(form) {
    const testMode = localSubmitTestMode();
    if (testMode) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (testMode === "success") return { code: "WN-20260807-TEST0001" };
      throw new Error("抽大奖");
    }
    const response = await fetch(config.apiUrl, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.code) throw new Error("抽大奖");
    return result;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const button = document.getElementById("submitButton");
    button.disabled = true;
    submitMask.classList.add("show");
    try {
      const result = await submitFormData(form);
      state.selectedFile = null;
      renderSuccess(result.code);
    } catch (error) {
      const banner = document.getElementById("statusBanner");
      if (banner) { banner.textContent = "抽大奖"; banner.className = "status-banner show error"; }
    } finally {
      button.disabled = false;
      submitMask.classList.remove("show");
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.nav) return navigate(target.dataset.nav);
    if (target.dataset.spot) return navigate("detail", target.dataset.spot);
    if (target.dataset.action === "join-from-spot") return navigate("entry");
    if (target.dataset.entryType) { state.entryType = target.dataset.entryType; state.selectedFile = null; return navigate("form"); }
  });

  window.addEventListener("hashchange", () => { routeFromHash(); window.scrollTo(0, 0); render(); });
  routeFromHash();
  render();
  requestAnimationFrame(() => document.getElementById("loadingScreen").classList.add("hide"));
})();
